import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { config } from './config.js';
import { mockRawResult } from './mock-result.js';

const execFileAsync = promisify(execFile);

export function scannerArgs(target) {
  return ['scan', 'source', '--format=json', '--all-packages', '--lockfile', target];
}

function diagnostic(error, fileName, scannerPath) {
  return {
    event: 'osv_scanner_failed',
    fileName,
    scannerPath,
    code: error.code ?? null,
    signal: error.signal ?? null,
    killed: Boolean(error.killed),
    message: error.message,
    stderr: String(error.stderr ?? '').slice(0, 8_000),
    stdoutPreview: String(error.stdout ?? '').slice(0, 1_000)
  };
}

export async function scanBuffer(fileName, buffer, options = {}) {
  if (config.scannerMode === 'mock' && !config.production) return mockRawResult;
  const execute = options.execute ?? execFileAsync;
  const logger = options.logger ?? console;
  const scannerPath = options.scannerPath ?? config.scannerPath;
  const directory = await mkdtemp(path.join(tmpdir(), 'dependency-guard-'));
  const target = path.join(directory, fileName);
  try {
    await writeFile(target, buffer, { flag: 'wx', mode: 0o600 });
    const { stdout } = await execute(scannerPath, scannerArgs(target), {
        timeout: config.scanTimeoutMs, maxBuffer: 20 * 1024 * 1024,
        windowsHide: true, shell: false, env: { PATH: process.env.PATH }
      });
    try {
      return JSON.parse(stdout);
    } catch (error) {
      logger.error(diagnostic(error, fileName, scannerPath));
      throw Object.assign(new Error('أعاد محرك الفحص نتيجة غير صالحة.'), { status: 502 });
    }
  } catch (error) {
    if (error.status) throw error;
    // OSV-Scanner returns a non-zero code when vulnerabilities are found, while stdout remains valid JSON.
    if (error.stdout) {
      try { return JSON.parse(error.stdout); } catch { /* handled below */ }
    }
    logger.error(diagnostic(error, fileName, scannerPath));
    if (error.code === 'ENOENT') throw Object.assign(new Error('محرك OSV-Scanner غير مثبت على الخادم.'), { status: 503 });
    if (error.killed || error.code === 'ETIMEDOUT') throw Object.assign(new Error('انتهت مهلة الفحص.'), { status: 504 });
    if (String(error.stderr ?? '').includes('No package sources found')) {
      throw Object.assign(new Error('لم يعثر محرك الفحص على حزم داخل الملف. ارفع ملف قفل يحتوي على اعتماديات مثبّتة.'), { status: 422 });
    }
    throw Object.assign(new Error('تعذر إكمال الفحص. تحقق من صحة ملف المكتبات.'), { status: 422 });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
