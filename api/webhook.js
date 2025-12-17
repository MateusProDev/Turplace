import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const mod = require('./webhook.cjs')
const handler = mod && (mod.default || mod)
export default handler
