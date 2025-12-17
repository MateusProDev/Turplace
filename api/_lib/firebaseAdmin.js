import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const mod = require('./firebaseAdmin.cjs')
// export same shape
export default (mod && (mod.default || mod))
