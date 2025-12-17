import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const mod = require('./create-subscription-session.cjs')
const handler = mod && (mod.default || mod)
export default handler
