// Server-side probe. Set STATUS_URL to a public HTTPS health endpoint if available.
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const target = process.env.STATUS_URL || 'https://peargram.online';
  let url;
  try {
    url = new URL(target);
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error('HTTPS required');
  } catch (_) {
    return res.status(500).json({ error: 'Invalid STATUS_URL' });
  }
  const start = Date.now();
  try {
    // Manual redirects prevent leaking server-side headers or following unexpected URLs.
    const response = await fetch(url, { method: 'GET', redirect: 'manual', signal: AbortSignal.timeout(8000), headers: { 'User-Agent': 'Peargram-Status/1.0' } });
    const ok = response.status >= 200 && response.status < 400;
    return res.status(200).json({ status: ok ? 'operational' : 'issue', httpStatus: response.status, latency: Date.now() - start, checkedAt: new Date().toISOString(), target: url.origin, checkType: process.env.STATUS_URL ? 'health endpoint' : 'website' });
  } catch (_) {
    return res.status(200).json({ status: 'unreachable', httpStatus: null, latency: null, checkedAt: new Date().toISOString(), target: url.origin, checkType: process.env.STATUS_URL ? 'health endpoint' : 'website' });
  }
};
