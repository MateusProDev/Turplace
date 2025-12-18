import { createRequire } from 'module'
const require = createRequire(import.meta.url)

let handler = null
try {
	const registry = require('./handlers.cjs')
	const h = registry && registry['webhook']
	handler = h && (h.default || h)
} catch (e) {}

if (!handler) {
	try {
		const mod = require('./webhook.cjs')
		handler = mod && (mod.default || mod)
	} catch (e) {}
}

if (!handler) {
	try {
		const mod = require('../server/api/webhook.cjs')
		handler = mod && (mod.default || mod)
	} catch (e) {}
}

if (!handler) {
	handler = (req, res) => { res.statusCode = 404; res.end('NOT_FOUND') }
}

export default handler
