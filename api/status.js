module.exports = function handler(req, res) {
  console.log('[status] handler chamado', { method: req.method, url: req.url });
  res.setHeader('Content-Type', 'application/json')
  res.status(200).json({ ok: true, env: process.env.VERCEL_ENV || null })
}
