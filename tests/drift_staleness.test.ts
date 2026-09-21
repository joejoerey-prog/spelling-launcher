import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

describe('Drift & Staleness Guard (scripts/check-drift.sh)', () => {
  const repoRoot = path.resolve(__dirname, '..');
  const checkDriftScript = path.join(repoRoot, 'scripts', 'check-drift.sh');

  // We mock a binary and manifest in node_modules to avoid relying on external repos
  const mockRaycastDir = path.join(repoRoot, 'node_modules', '.mock-raycast');
  const mockBinPath = path.join(mockRaycastDir, 'spellcheck-cli');
  const mockManifestPath = path.join(mockRaycastDir, 'spellcheck-cli.version.json');

  let validSha = '';
  let validVersion = '';

  beforeAll(() => {
    fs.mkdirSync(mockRaycastDir, { recursive: true });

    validSha = execSync('git rev-parse --short HEAD', { cwd: repoRoot }).toString().trim();
    const cargoToml = fs.readFileSync(path.join(repoRoot, 'crates', 'spellcheck-cli', 'Cargo.toml'), 'utf8');
    validVersion = cargoToml.match(/version = "([^"]+)"/)[1];

    const mockBinContent = `#!/usr/bin/env bash\nif [[ "$1" == "--version" ]]; then echo "spellcheck-cli ${validVersion} (release, ${validSha}, aarch64-apple-darwin)"; fi`;
    fs.writeFileSync(mockBinPath, mockBinContent);
    fs.chmodSync(mockBinPath, '755');

    fs.writeFileSync(mockManifestPath, JSON.stringify({
      version: validVersion,
      git_sha: validSha,
      target: "aarch64-apple-darwin"
    }, null, 2));
  });

  afterAll(() => {
    fs.rmSync(mockRaycastDir, { recursive: true, force: true });
  });

  it('passes cleanly when Raycast CLI and manifest match current spellcore HEAD', () => {
    const output = execSync(`bash "${checkDriftScript}"`, {
      cwd: repoRoot,
      env: { ...process.env, CLI_BIN_PATH: mockBinPath, MANIFEST_PATH: mockManifestPath, CI: '' },
      encoding: 'utf-8',
    });
    expect(output).toContain('=== Drift Check Passed ===');
    expect(output).toContain('No drift detected');
  });

  it('deliberately staleness-checks when spellcore is ahead of staged binary and asserts check fails', () => {
    const validManifest = JSON.parse(fs.readFileSync(mockManifestPath, 'utf-8'));
    const staleSha = '0000000';
    const staleManifestPath = path.join(repoRoot, 'node_modules', '.stale-cli.version.json');
    fs.writeFileSync(
      staleManifestPath,
      JSON.stringify({
        ...validManifest,
        git_sha: staleSha,
      }, null, 2)
    );

    try {
      execSync(`bash "${checkDriftScript}"`, {
        cwd: repoRoot,
        env: {
          ...process.env,
          CLI_BIN_PATH: mockBinPath,
          MANIFEST_PATH: staleManifestPath,
          CI: '',
        },
        encoding: 'utf-8',
        stdio: 'pipe',
      });
      expect.fail('Expected check-drift.sh to exit with error when staged binary is stale');
    } catch (err) {
      expect(err.status).toBe(1);
      const output = (err.stdout?.toString() || '') + (err.stderr?.toString() || '');
      expect(output).toContain('DRIFT DETECTED');
      expect(output).toContain(staleSha);
      expect(output).toContain(validManifest.git_sha);
    } finally {
      if (fs.existsSync(staleManifestPath)) {
        fs.unlinkSync(staleManifestPath);
      }
    }
  });

  it('fails with clear error if binary is missing', () => {
    try {
      execSync(`bash "${checkDriftScript}"`, {
        cwd: repoRoot,
        env: {
          ...process.env,
          CLI_BIN_PATH: '/path/does/not/exist/spellcheck-cli',
          MANIFEST_PATH: mockManifestPath,
          CI: '',
        },
        encoding: 'utf-8',
        stdio: 'pipe',
      });
      expect.fail('Expected check-drift.sh to fail when binary is missing');
    } catch (err) {
      expect(err.status).toBe(1);
      const output = (err.stdout?.toString() || '') + (err.stderr?.toString() || '');
      expect(output).toContain('Raycast staged binary not found');
    }
  });
});
