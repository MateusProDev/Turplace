const { createRequire } = require('module')
const require = createRequire(import.meta.url)

module.exports = async function handler(req, res) {
  console.log('[...slug] handler chamado', { url: req.url, slug: req.query && req.query.slug });
  const slug = req.query.slug || []
  const parts = Array.isArray(slug) ? slug : [slug]
  const base = parts.join('/') || 'index'

  console.log('[...slug] invoked for base=', base)
  // Try the centralized handlers registry first (bundled in api/)
  try {
    const registry = require('./handlers.cjs')
    if (registry && registry[base]) {
      const fn = registry[base] && (registry[base].default || registry[base])
      if (typeof fn === 'function') return await fn(req, res)
    }
  } catch (err) {
    console.warn('[...slug] handlers.cjs load error', err && err.code ? err.code : String(err))
  }

  // runtime/environment info for debugging
  try {
    console.log('[...slug] process.cwd=', process.cwd())
    console.log('[...slug] node version=', process.version)
    console.log('[...slug] req.url=', req.url, 'method=', req.method, 'host=', req.headers && req.headers.host)
  } catch (e) {
    console.warn('[...slug] runtime info error', e && e.message)
  }

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
  console.log('[...slug] candidate list:', candidates)

  for (const p of candidates) {
    try {
      console.log('[...slug] trying require', p)
      // attempt to resolve first to get clearer diagnostics
      try {
        const resolved = require.resolve(p)
        console.log('[...slug] require.resolve OK', p, resolved)
      } catch (rsErr) {
        console.log('[...slug] require.resolve FAILED', p, rsErr && rsErr.code ? rsErr.code : rsErr && rsErr.message)
      }
      const mod = require(p)
      const fn = mod && (mod.default || mod.handler || mod)
      if (typeof fn === 'function') {
        // Support sync or async handlers
        console.log('[...slug] loaded module', p)
        return await fn(req, res)
      }
    } catch (err) {
      // If not found, try next candidate
      console.error('[...slug] require error for', p, err && err.code ? `${err.code}` : String(err))
      if (err && err.code === 'MODULE_NOT_FOUND') continue
      // Unexpected error -> return 500 with stack
      console.error('[...slug] Unexpected error loading', p, err)
      res.status(500).json({ error: String(err), stack: err.stack || null })
      return
    }
  }

  res.status(404).send('NOT_FOUND')
}
