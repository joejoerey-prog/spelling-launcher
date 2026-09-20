import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

describe('Drift & Staleness Guard (scripts/check-drift.sh)', () => {
  const repoRoot = path.resolve(__dirname, '..');
  const checkDriftScript = path.join(repoRoot, 'scripts', 'check-drift.sh');
  const raycastManifest = path.resolve(repoRoot, '../spelling-launcher-raycast/assets/spellcheck-cli.version.json');

  it('passes cleanly when Raycast CLI and manifest match current spellcore HEAD', () => {
    const output = execSync(`bash "${checkDriftScript}"`, {
      cwd: repoRoot,
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    const result = output.toString();
    if (process.env.CI && !fs.existsSync(path.dirname(raycastManifest))) {
      expect(result).toContain('=== Standalone CLI Check Passed ===');
    } else {
      expect(result).toContain('=== Drift Check Passed ===');
      expect(result).toContain('No drift detected');
    }
  }, 25000);

  it('deliberately staleness-checks when spellcore is ahead of staged binary and asserts check fails', () => {
    if (process.env.CI && !fs.existsSync(raycastManifest)) {
      // Skip this test in CI when the external Raycast repo isn't checked out
      return;
    }

    // Read the current valid manifest
    const validManifest = JSON.parse(fs.readFileSync(raycastManifest, 'utf-8'));
    
    // Create a temporary mock manifest with an older/stale commit SHA (simulating spellcore moving forward)
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
      // Execute check-drift.sh with the stale manifest
      execSync(`bash "${checkDriftScript}"`, {
        cwd: repoRoot,
        env: {
          ...process.env,
          MANIFEST_PATH: staleManifestPath,
        },
        encoding: 'utf-8',
        stdio: 'pipe',
      });
      // Should not reach here
      expect.fail('Expected check-drift.sh to exit with error when staged binary is stale');
    } catch (err: any) {
      if (err.name === 'AssertionError') { throw err; } // Let expect.fail propagate
      // Assert that check-drift failed
      expect(err.status).toBe(1);
      const output = (err.stdout?.toString() || '') + (err.stderr?.toString() || '');

      // Assert error output names DRIFT DETECTED, both SHAs, and fix command
      expect(output).toContain('DRIFT DETECTED');
      expect(output).toContain(staleSha); // Staged binary SHA
      expect(output).toContain(validManifest.git_sha); // Current spellcore SHA
      expect(output).toContain('./scripts/sync-raycast-cli.sh'); // Remediation command
    } finally {
      if (fs.existsSync(staleManifestPath)) {
        fs.unlinkSync(staleManifestPath);
      }
    }
  });

  it('fails with clear error if binary is missing', () => {
    try {
      const result = execSync(`bash "${checkDriftScript}"`, {
        cwd: repoRoot,
        env: {
          ...process.env,
          CLI_BIN_PATH: '/path/does/not/exist/spellcheck-cli',
        },
        encoding: 'utf-8',
        stdio: 'pipe',
      });
      if (process.env.CI && !fs.existsSync(path.dirname(raycastManifest))) {
        expect(result).toContain('=== Standalone CLI Check Passed ===');
      } else {
        expect.fail('Expected check-drift.sh to fail when binary is missing');
      }
    } catch (err: any) {
      if (err.name === 'AssertionError') { throw err; }
      expect(err.status).toBe(1);
      const output = (err.stdout?.toString() || '') + (err.stderr?.toString() || '');
      expect(output).toContain('Raycast staged binary not found');
      expect(output).toContain('./scripts/sync-raycast-cli.sh');
    }
  });
});
