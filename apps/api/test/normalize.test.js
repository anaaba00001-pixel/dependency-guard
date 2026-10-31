import test from 'node:test';
import assert from 'node:assert/strict';
import { mockRawResult } from '../src/mock-result.js';
import { normalizeResult, severityOf } from '../src/normalize.js';

test('normalizes packages, vulnerabilities, severity and fixes', () => {
  const result = normalizeResult(mockRawResult, { id: 'scan-1', projectName: 'تجريبي', fileName: 'package-lock.json' });
  assert.equal(result.packageCount, 2);
  assert.equal(result.vulnerabilityCount, 2);
  assert.equal(result.counts.critical, 1);
  assert.equal(result.counts.medium, 1);
  assert.deepEqual(result.vulnerabilities[0].fixedVersions, ['1.2.0']);
});

test('maps CVSS numbers to severity', () => {
  assert.equal(severityOf({ severity: [{ score: '9.8' }] }), 'critical');
  assert.equal(severityOf({ severity: [{ score: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:L/A:N' }] }), 'unknown');
});
