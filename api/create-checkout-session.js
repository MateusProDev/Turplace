import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const mod = require('./create-checkout-session.cjs')
const handler = mod && (mod.default || mod)
export default handler
