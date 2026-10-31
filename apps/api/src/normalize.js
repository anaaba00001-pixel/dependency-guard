const rank = { critical: 4, high: 3, medium: 2, low: 1, unknown: 0 };

function cvssNumber(vulnerability) {
  for (const item of vulnerability.severity ?? []) {
    const direct = Number.parseFloat(item.score);
    if (Number.isFinite(direct)) return direct;
    const match = String(item.score).match(/(?:^|\/)S:([0-9.]+)/);
    if (match) return Number.parseFloat(match[1]);
  }
  return null;
}

export function severityOf(vulnerability) {
  const label = String(vulnerability.database_specific?.severity ?? '').toLowerCase();
  if (rank[label] !== undefined) return label;
  const score = cvssNumber(vulnerability);
  if (score === null) return 'unknown';
  if (score >= 9) return 'critical';
  if (score >= 7) return 'high';
  if (score >= 4) return 'medium';
  if (score > 0) return 'low';
  return 'unknown';
}

function fixedVersions(vulnerability, ecosystem) {
  const versions = new Set();
  for (const affected of vulnerability.affected ?? []) {
    if (affected.package?.ecosystem && affected.package.ecosystem !== ecosystem) continue;
    for (const range of affected.ranges ?? []) {
      for (const event of range.events ?? []) if (event.fixed) versions.add(event.fixed);
    }
  }
  return [...versions];
}

function officialUrl(vulnerability) {
  const refs = vulnerability.references ?? [];
  return refs.find(ref => ref.type === 'ADVISORY')?.url
    ?? refs.find(ref => /^https:\/\//.test(ref.url ?? ''))?.url
    ?? `https://osv.dev/vulnerability/${encodeURIComponent(vulnerability.id)}`;
}

export function normalizeResult(raw, meta = {}) {
  const seen = new Set();
  const vulnerabilities = [];
  let packageCount = 0;
  for (const result of raw.results ?? []) {
    packageCount += result.packages?.length ?? 0;
    for (const entry of result.packages ?? []) {
      const pkg = entry.package ?? {};
      for (const vulnerability of entry.vulnerabilities ?? []) {
        const key = `${pkg.ecosystem}:${pkg.name}:${pkg.version}:${vulnerability.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const severity = severityOf(vulnerability);
        const fixes = fixedVersions(vulnerability, pkg.ecosystem);
        vulnerabilities.push({
          id: vulnerability.id,
          cve: (vulnerability.aliases ?? []).find(alias => alias.startsWith('CVE-')) ?? null,
          package: pkg.name ?? 'غير معروف', version: pkg.version ?? 'غير معروف',
          ecosystem: pkg.ecosystem ?? 'غير معروف', severity,
          summary: vulnerability.summary ?? vulnerability.details?.split('\n')[0] ?? 'لا يتوفر وصف مختصر.',
          impactAr: severity === 'critical' || severity === 'high'
            ? 'قد تسمح الثغرة بتأثير أمني كبير؛ يلزم التحقق والتحديث بأولوية.'
            : 'يجب مراجعة مدى قابلية استغلال الثغرة ضمن سياق المشروع.',
          fixedVersions: fixes,
          updateCommand: fixes[0] ? updateHint(pkg.ecosystem, pkg.name, fixes[0]) : null,
          url: officialUrl(vulnerability)
        });
      }
    }
  }
  vulnerabilities.sort((a, b) => rank[b.severity] - rank[a.severity]);
  const counts = { critical: 0, high: 0, medium: 0, low: 0, unknown: 0 };
  vulnerabilities.forEach(item => { counts[item.severity] += 1; });
  return {
    id: meta.id, projectName: meta.projectName, fileName: meta.fileName,
    scannedAt: meta.scannedAt ?? new Date().toISOString(), packageCount,
    vulnerabilityCount: vulnerabilities.length, counts, vulnerabilities
  };
}

function updateHint(ecosystem, name, version) {
  if (ecosystem === 'npm') return `npm install ${name}@${version}`;
  if (ecosystem === 'PyPI') return `pip install "${name}==${version}"`;
  if (ecosystem === 'Go') return `go get ${name}@v${version.replace(/^v/, '')}`;
  if (ecosystem === 'crates.io') return `cargo update -p ${name} --precise ${version}`;
  return `حدّث ${name} إلى الإصدار ${version} بعد اختبار التوافق.`;
}
