import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { config } from './config.js';
import { mockRawResult } from './mock-result.js';

const execFileAsync = promisify(execFile);

export async function scanBuffer(fileName, buffer) {
  if (config.scannerMode === 'mock' && !config.production) return mockRawResult;
  const directory = await mkdtemp(path.join(tmpdir(), 'dependency-guard-'));
  const target = path.join(directory, fileName);
  try {
    await writeFile(target, buffer, { flag: 'wx', mode: 0o600 });
    const { stdout } = await execFileAsync(config.scannerPath,
      ['scan', '--format=json', '--all-packages', '-L', target], {
        timeout: config.scanTimeoutMs, maxBuffer: 20 * 1024 * 1024,
        windowsHide: true, shell: false, env: { PATH: process.env.PATH }
      });
    return JSON.parse(stdout);
  } catch (error) {
    if (error.code === 'ENOENT') throw Object.assign(new Error('محرك OSV-Scanner غير مثبت على الخادم.'), { status: 503 });
    if (error.killed) throw Object.assign(new Error('انتهت مهلة الفحص.'), { status: 504 });
    // OSV-Scanner returns a non-zero code when vulnerabilities are found, while stdout remains valid JSON.
    if (error.stdout) {
      try { return JSON.parse(error.stdout); } catch { /* handled below */ }
    }
    throw Object.assign(new Error('تعذر إكمال الفحص. تحقق من صحة ملف المكتبات.'), { status: 422 });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
