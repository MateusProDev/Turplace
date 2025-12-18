import { createRequire } from 'module'
const require = createRequire(import.meta.url)

let handler = null
try {
	const registry = require('./handlers.cjs')
	const h = registry && registry['dev/apply-plan']
	handler = h && (h.default || h)
} catch (e) {}

if (!handler) {
	try {
		const mod = require('./dev/apply-plan.cjs')
		handler = mod && (mod.default || mod)
	} catch (e) {}
}

if (!handler) {
	try {
		const mod = require('../server/api/dev/apply-plan.cjs')
		handler = mod && (mod.default || mod)
	} catch (e) {}
}

if (!handler) {
	handler = (req, res) => { res.statusCode = 404; res.end('NOT_FOUND') }
}

export default handler
