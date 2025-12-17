import { createRequire } from 'module'
const require = createRequire(import.meta.url)

export default async function handler(req, res) {
  const slug = req.query.slug || []
  const parts = Array.isArray(slug) ? slug : [slug]
  const base = parts.join('/') || 'index'

  const candidates = [
    `../server/api/${base}.js`,
    `../server/api/${base}.cjs`,
    `../server/api/${base}/index.js`,
    `../server/api/${base}/index.cjs`,
    `./${base}.js`,
    `./${base}.cjs`,
    `./${base}/index.js`,
    `./${base}/index.cjs`
  ]

  for (const p of candidates) {
    try {
      const mod = require(p)
      const fn = mod && (mod.default || mod.handler || mod)
      if (typeof fn === 'function') {
        // Support sync or async handlers
        return await fn(req, res)
      }
    } catch (err) {
      // If not found, try next candidate
      if (err && err.code === 'MODULE_NOT_FOUND') continue
      // Unexpected error
      console.error('Error loading', p, err)
      res.status(500).json({ error: String(err) })
      return
    }
  }

  res.status(404).send('NOT_FOUND')
}
