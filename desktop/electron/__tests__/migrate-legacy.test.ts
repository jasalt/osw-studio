import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { migrateLegacyDir } from '../migrate-legacy';

let root: string;
const log = vi.fn();

function legacy(...parts: string[]) { return path.join(root, 'legacy', ...parts); }
function target(...parts: string[]) { return path.join(root, 'target', ...parts); }

function seedLegacy() {
  fs.mkdirSync(legacy('workspaces', 'w1'), { recursive: true });
  fs.writeFileSync(legacy('system.sqlite'), 'system-db');
  fs.writeFileSync(legacy('workspaces', 'w1', 'osws.sqlite'), 'workspace-db');
}

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'osw-migrate-'));
  log.mockClear();
});

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

describe('migrateLegacyDir', () => {
  it('copies legacy data recursively when the target does not exist', () => {
    seedLegacy();
    migrateLegacyDir(legacy(), target(), log);

    expect(fs.readFileSync(target('system.sqlite'), 'utf-8')).toBe('system-db');
    expect(fs.readFileSync(target('workspaces', 'w1', 'osws.sqlite'), 'utf-8')).toBe('workspace-db');
    expect(log).toHaveBeenCalledWith(expect.stringContaining('Migrated legacy data'));
  });

  it('copies when the target exists but is empty (old shells pre-created it)', () => {
    seedLegacy();
    fs.mkdirSync(target(), { recursive: true });

    migrateLegacyDir(legacy(), target(), log);

    expect(fs.readFileSync(target('system.sqlite'), 'utf-8')).toBe('system-db');
  });

  it('never overwrites a target that already has data', () => {
    seedLegacy();
    fs.mkdirSync(target(), { recursive: true });
    fs.writeFileSync(target('system.sqlite'), 'current-db');

    migrateLegacyDir(legacy(), target(), log);

    expect(fs.readFileSync(target('system.sqlite'), 'utf-8')).toBe('current-db');
    expect(fs.existsSync(target('workspaces'))).toBe(false);
    expect(log).not.toHaveBeenCalled();
  });

  it('does nothing when there is no legacy data', () => {
    migrateLegacyDir(legacy(), target(), log);

    expect(fs.existsSync(target())).toBe(false);
    expect(log).not.toHaveBeenCalled();
  });

  it('logs and does not throw when migration fails', () => {
    seedLegacy();
    // Target path occupied by a FILE — readdir/copy into it must fail
    fs.writeFileSync(target(), 'not-a-directory');

    expect(() => migrateLegacyDir(legacy(), target(), log)).not.toThrow();
    expect(log).toHaveBeenCalledWith(expect.stringContaining('migration failed'));
  });
});
