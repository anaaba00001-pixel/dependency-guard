import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { scanBuffer, scannerArgs } from '../src/scanner.js';

const fixtureUrl = new URL('./fixtures/package-lock.json', import.meta.url);

test('passes a valid package-lock.json to the v2.7 source scan command', async () => {
  const fixture = await readFile(fixtureUrl);
  let observed;
  const result = await scanBuffer('package-lock.json', fixture, {
    scannerPath: '/usr/local/bin/osv-scanner',
    execute: async (executable, args, options) => {
      const target = args.at(-1).slice('--lockfile='.length);
      const parsed = JSON.parse(await readFile(target, 'utf8'));
      observed = { executable, args, options, parsed };
      return { stdout: JSON.stringify({ results: [] }), stderr: '' };
    }
  });

  assert.equal(observed.executable, '/usr/local/bin/osv-scanner');
  assert.deepEqual(observed.args.slice(0, -1), ['scan', 'source', '--format=json', '--all-packages']);
  assert.match(observed.args.at(-1), /^--lockfile=.*package-lock\.json$/);
  assert.equal(observed.parsed.lockfileVersion, 3);
  assert.equal(observed.parsed.packages['node_modules/lodash'].version, '4.17.21');
  assert.equal(observed.options.shell, false);
  assert.deepEqual(result, { results: [] });
});

test('records OSV-Scanner stderr and exit metadata on a real failure', async () => {
  const fixture = await readFile(fixtureUrl);
  const entries = [];
  await assert.rejects(
    scanBuffer('package-lock.json', fixture, {
      scannerPath: 'osv-scanner',
      logger: { error: entry => entries.push(entry) },
      execute: async () => { throw Object.assign(new Error('process exited'), { code: 128, stderr: 'invalid lockfile syntax' }); }
    }),
    error => error.status === 422
  );
  assert.equal(entries.length, 1);
  assert.equal(entries[0].event, 'osv_scanner_failed');
  assert.equal(entries[0].code, 128);
  assert.equal(entries[0].stderr, 'invalid lockfile syntax');
});

test('returns an actionable error when OSV-Scanner finds no packages', async () => {
  const fixture = await readFile(fixtureUrl);
  await assert.rejects(
    scanBuffer('package-lock.json', fixture, {
      execute: async () => {
        throw Object.assign(new Error('process exited'), {
          code: 128,
          stderr: 'No package sources found, --help for usage information.'
        });
      },
      logger: { error: () => {} }
    }),
    error => error.status === 422 && error.message.includes('لم يعثر محرك الفحص على حزم')
  );
});

test('scanner arguments stay compatible with the pinned OSV-Scanner CLI', () => {
  assert.deepEqual(scannerArgs('/tmp/package-lock.json'), [
    'scan', 'source', '--format=json', '--all-packages', '--lockfile=/tmp/package-lock.json'
  ]);
});
