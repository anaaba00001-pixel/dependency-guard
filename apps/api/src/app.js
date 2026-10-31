import crypto from 'node:crypto';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import multer from 'multer';
import { config } from './config.js';
import { normalizeResult } from './normalize.js';
import { scanBuffer } from './scanner.js';
import { Semaphore } from './semaphore.js';
import { safeProjectName, validateUpload } from './security.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { files: 1, fileSize: config.maxUploadBytes } });
const scans = new Map();
const semaphore = new Semaphore(config.maxConcurrentScans);

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }));
  app.use(cors({ origin: config.webOrigin.split(',').map(value => value.trim()), methods: ['GET', 'POST'] }));
  app.use('/api', rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false }));

  app.get('/api/health', (_req, res) => res.json({ status: 'ok', scannerMode: config.scannerMode }));
  app.get('/api/scans', (_req, res) => res.json([...scans.values()].slice(-10).reverse()));
  app.get('/api/scans/:id', (req, res) => {
    const scan = scans.get(req.params.id);
    if (!scan) return res.status(404).json({ error: 'نتيجة الفحص غير موجودة.' });
    res.json(scan);
  });
  app.post('/api/scans', upload.single('manifest'), async (req, res, next) => {
    try {
      const fileName = validateUpload(req.file);
      const meta = { id: crypto.randomUUID(), projectName: safeProjectName(req.body.projectName), fileName };
      const raw = await semaphore.run(() => scanBuffer(fileName, req.file.buffer));
      const result = normalizeResult(raw, meta);
      scans.set(result.id, result);
      while (scans.size > 50) scans.delete(scans.keys().next().value);
      res.status(201).json(result);
    } catch (error) { next(error); }
  });
  app.use((error, _req, res, _next) => {
    if (error instanceof multer.MulterError) {
      return res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ error: 'الملف أكبر من الحد المسموح أو الطلب غير صالح.' });
    }
    console.error(error.status ? error.message : error);
    res.status(error.status ?? 500).json({ error: error.status ? error.message : 'حدث خطأ داخلي غير متوقع.' });
  });
  return app;
}
