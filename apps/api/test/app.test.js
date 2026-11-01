import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';

test('trusts the configured number of reverse proxy hops', () => {
  const app = createApp({ trustProxyHops: 1 });
  assert.equal(app.get('trust proxy'), 1);
});

test('does not trust forwarded headers without an explicit proxy hop count', () => {
  const app = createApp({ trustProxyHops: 0 });
  assert.equal(app.get('trust proxy'), false);
});
