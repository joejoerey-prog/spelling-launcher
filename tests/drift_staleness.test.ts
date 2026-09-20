import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

describe('Drift & Staleness Guard (scripts/check-drift.sh)', () => {
  const repoRoot = path.resolve(__dirname, '..');
  const checkDriftScript = path.join(repoRoot, 'scripts', 'check-drift.sh');

  const tempDir = path.join(repoRoot, 'node_modules', '.temp-drift-test');
  const dummyBinPath = path.join(tempDir, 'dummy-spellcheck-cli');
  const dummyManifestPath = path.join(tempDir, 'dummy.version.json');

  let currentSha = '';
  let version = '';

  beforeAll(() => {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Get current SHA
    try {
      currentSha = execSync('git rev-parse --short HEAD', { cwd: repoRoot, encoding: 'utf-8' }).trim();
    } catch {
      currentSha = 'unknown';
    }

    // Get version
    const cargoToml = fs.readFileSync(path.join(repoRoot, 'crates/spellcheck-cli/Cargo.toml'), 'utf-8');
    const versionMatch = cargoToml.match(/^version\s*=\s*"([^"]+)"/m);
    version = versionMatch ? versionMatch[1] : '0.1.0';
  });

  afterAll(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('passes cleanly when Raycast CLI and manifest match current spellcore HEAD', () => {
    // Create valid mock manifest, using formatted JSON to ensure grep works on separate lines
    fs.writeFileSync(dummyManifestPath, JSON.stringify({
      version: version,
      git_sha: currentSha,
    }, null, 2));

    // Create valid mock binary
    // Note: The script checks TARGET which defaults to aarch64-apple-darwin.
    // We pass TARGET environment variable in the test to match what we generate here.
    const expectedOutput = `spellcheck-cli ${version} (release, ${currentSha}, mock-target)`;
    fs.writeFileSync(dummyBinPath, `#!/usr/bin/env bash\necho "${expectedOutput}"\n`);
    fs.chmodSync(dummyBinPath, '755');

    const output = execSync(`bash "${checkDriftScript}"`, {
      cwd: repoRoot,
      env: {
        ...process.env,
        CI: '', // ensure it doesn't take the CI early exit
        CLI_BIN_PATH: dummyBinPath,
        MANIFEST_PATH: dummyManifestPath,
        TARGET: 'mock-target',
      },
      encoding: 'utf-8',
    });
    expect(output).toContain('=== Drift Check Passed ===');
    expect(output).toContain('No drift detected');
  });

  it('deliberately staleness-checks when spellcore is ahead of staged binary and asserts check fails', () => {
    const staleSha = '0000000';
    // Create stale mock manifest
    fs.writeFileSync(dummyManifestPath, JSON.stringify({
      version: version,
      git_sha: staleSha,
    }, null, 2));

    // Binary still returns stale output
    const staleOutput = `spellcheck-cli ${version} (release, ${staleSha}, mock-target)`;
    fs.writeFileSync(dummyBinPath, `#!/usr/bin/env bash\necho "${staleOutput}"\n`);
    fs.chmodSync(dummyBinPath, '755');

    try {
      execSync(`bash "${checkDriftScript}"`, {
        cwd: repoRoot,
        env: {
          ...process.env,
          CI: '',
          CLI_BIN_PATH: dummyBinPath,
          MANIFEST_PATH: dummyManifestPath,
          TARGET: 'mock-target',
        },
        encoding: 'utf-8',
        stdio: 'pipe',
      });
      expect.fail('Expected check-drift.sh to exit with error when staged binary is stale');
    } catch (err: any) {
      expect(err.status).toBe(1);
      const output = (err.stdout?.toString() || '') + (err.stderr?.toString() || '');
      expect(output).toContain('DRIFT DETECTED');
      expect(output).toContain(staleSha);
      expect(output).toContain(currentSha);
      expect(output).toContain('./scripts/sync-raycast-cli.sh');
    }
  });

  it('fails with clear error if binary is missing', () => {
    try {
      execSync(`bash "${checkDriftScript}"`, {
        cwd: repoRoot,
        env: {
          ...process.env,
          CI: '',
          CLI_BIN_PATH: '/path/does/not/exist/spellcheck-cli',
        },
        encoding: 'utf-8',
        stdio: 'pipe',
      });
      expect.fail('Expected check-drift.sh to fail when binary is missing');
    } catch (err: any) {
      expect(err.status).toBe(1);
      const output = (err.stdout?.toString() || '') + (err.stderr?.toString() || '');
      expect(output).toContain('Raycast staged binary not found');
      expect(output).toContain('./scripts/sync-raycast-cli.sh');
    }
  });
});
