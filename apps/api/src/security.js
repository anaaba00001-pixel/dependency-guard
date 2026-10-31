import path from 'node:path';

export const allowedFiles = new Set([
  'package-lock.json', 'requirements.txt', 'pnpm-lock.yaml', 'yarn.lock',
  'Pipfile.lock', 'poetry.lock', 'pdm.lock', 'pylock.toml', 'uv.lock',
  'Cargo.lock', 'go.mod', 'composer.lock', 'Gemfile.lock'
]);

export function validateUpload(file) {
  if (!file) throw Object.assign(new Error('يرجى اختيار ملف مكتبات.'), { status: 400 });
  const name = path.basename(file.originalname);
  if (name !== file.originalname || !allowedFiles.has(name)) {
    throw Object.assign(new Error('نوع الملف غير مدعوم أو اسمه غير آمن.'), { status: 415 });
  }
  if (!file.buffer?.length) throw Object.assign(new Error('الملف فارغ.'), { status: 400 });
  if (file.buffer.includes(0)) throw Object.assign(new Error('يجب أن يكون الملف نصيًا.'), { status: 415 });
  return name;
}

export function safeProjectName(value) {
  const name = String(value ?? '').trim().slice(0, 80);
  return name || 'مشروع بدون اسم';
}
