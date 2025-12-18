import { createRequire } from 'module'
const require = createRequire(import.meta.url)

try {
  const registry = require('./handlers.cjs')
  const h = registry && registry['create-subscription-session']
  const handler = h && (h.default || h)
  if (typeof handler === 'function') {
    export default handler
  }
} catch (e) {
  // fallback: try to require server copy directly
  const fallback = require('../server/api/create-subscription-session.cjs')
  export default (fallback && (fallback.default || fallback))
}
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const mod = require('./create-subscription-session.cjs')
const handler = mod && (mod.default || mod)
export default handler
