export const mockRawResult = {
  results: [{ source: { path: 'package-lock.json', type: 'lockfile' }, packages: [
    { package: { name: 'demo-critical-lib', version: '1.0.0', ecosystem: 'npm' }, vulnerabilities: [{
      id: 'GHSA-demo-0001', aliases: ['CVE-2026-10001'], summary: 'ثغرة تجريبية لتنفيذ الأوامر عن بعد.',
      database_specific: { severity: 'CRITICAL' }, affected: [{ package: { ecosystem: 'npm' }, ranges: [{ events: [{ introduced: '0' }, { fixed: '1.2.0' }] }] }]
    }] },
    { package: { name: 'demo-medium-lib', version: '2.1.0', ecosystem: 'npm' }, vulnerabilities: [{
      id: 'GHSA-demo-0002', summary: 'ثغرة تجريبية لكشف معلومات محدودة.', database_specific: { severity: 'MODERATE' }, severity: [{ score: '5.3' }]
    }] }
  ] }]
};
