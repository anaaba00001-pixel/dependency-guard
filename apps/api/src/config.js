import path from 'node:path';

try { process.loadEnvFile?.(); } catch { /* Environment variables may be provided by the host. */ }

const integer = (name, fallback) => {
  const value = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

export const config = Object.freeze({
  port: integer('PORT', 8080),
  webOrigin: process.env.WEB_ORIGIN ?? 'http://localhost:5173',
  scannerPath: process.env.OSV_SCANNER_PATH ?? 'osv-scanner',
  scannerMode: process.env.SCANNER_MODE === 'mock' ? 'mock' : 'real',
  scanTimeoutMs: integer('SCAN_TIMEOUT_MS', 120_000),
  maxUploadBytes: integer('MAX_UPLOAD_BYTES', 5 * 1024 * 1024),
  maxConcurrentScans: integer('MAX_CONCURRENT_SCANS', 2),
  production: process.env.NODE_ENV === 'production',
  staticDir: path.resolve(process.cwd(), process.env.STATIC_DIR ?? '../web/dist')
});
