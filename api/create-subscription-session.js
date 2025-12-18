import { createRequire } from 'module'
const require = createRequire(import.meta.url)

let handler = null

// Try bundled registry first (api/handlers.cjs)
try {
  const registry = require('./handlers.cjs')
  const h = registry && registry['create-subscription-session']
  handler = h && (h.default || h)
} catch (e) {
  // ignore - registry may not be present in some builds
}

// Then try local sibling .cjs file
if (!handler) {
  try {
    const mod = require('./create-subscription-session.cjs')
    handler = mod && (mod.default || mod)
  } catch (e) {
    // ignore
  }
}

// Finally try server copy (server/api/...)
if (!handler) {
  try {
    const mod = require('../server/api/create-subscription-session.cjs')
    handler = mod && (mod.default || mod)
  } catch (e) {
    // ignore
  }
}

// If still missing, export a clear 404 handler so requests don't crash silently
if (!handler) {
  handler = (req, res) => {
    res.statusCode = 404
    res.end('NOT_FOUND')
  }
}

export default handler
