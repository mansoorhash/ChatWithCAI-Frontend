export default function mergeSessions(localArr = [], serverArr = []) {
  const map = new Map();
  for (const s of localArr) {
    if (!s) continue;
    if (!s.id) continue;
    map.set(s.id, s);
  }

  for (const s of serverArr) {
    if (!s) continue;
    if (!s.id) continue;

    const existing = map.get(s.id);
    if (!existing) {
      map.set(s.id, s);
      continue;
    }
    if ((s.lastUpdated || '') > (existing.lastUpdated || '')) {
      map.set(s.id, s);
    }
  }

  return Array.from(map.values()).sort((x, y) =>
    (y.lastUpdated || '').localeCompare(x.lastUpdated || '')
  );
}
