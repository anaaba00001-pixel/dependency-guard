import test from 'node:test';
import assert from 'node:assert/strict';
import { validateUpload } from '../src/security.js';

test('accepts known lockfiles', () => {
  assert.equal(validateUpload({ originalname: 'requirements.txt', buffer: Buffer.from('flask==2.0.0') }), 'requirements.txt');
});

test('rejects paths and executable names', () => {
  assert.throws(() => validateUpload({ originalname: '../package-lock.json', buffer: Buffer.from('{}') }));
  assert.throws(() => validateUpload({ originalname: 'payload.js', buffer: Buffer.from('alert(1)') }));
});
