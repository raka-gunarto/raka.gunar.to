/**
 * Blog Reactions Worker
 *
 * Cloudflare Worker using KV to store per-post emoji reactions.
 * Each IP address (hashed for privacy) can only have one reaction per post.
 *
 * KV keys:
 *   counts:{slug}         → JSON object { "👍": 3, "❤️": 1, ... }
 *   ip:{slug}:{ipHash}    → the emoji string the IP chose
 */

const ALLOWED_EMOJIS = ["👍", "❤️", "🔥", "😂", "🤔", "😢"];

/**
 * SHA-256 hash of a string, returned as hex.
 */
async function hashIP(ip) {
	const encoder = new TextEncoder();
	const data = encoder.encode(ip);
	const hashBuffer = await crypto.subtle.digest("SHA-256", data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Build a CORS-aware JSON response.
 */
function jsonResponse(body, status, origin, allowedOrigin) {
	const headers = {
		"Content-Type": "application/json",
		"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type",
	};

	// In development allow any origin; in production restrict to the blog domain
	if (allowedOrigin === "*" || origin === allowedOrigin) {
		headers["Access-Control-Allow-Origin"] = origin || "*";
	} else if (allowedOrigin) {
		headers["Access-Control-Allow-Origin"] = allowedOrigin;
	}

	return new Response(JSON.stringify(body), { status, headers });
}

/**
 * Normalise a slug so we get consistent KV keys.
 * Strips trailing slashes and lowercases.
 */
function normaliseSlug(raw) {
	if (!raw) return null;
	return raw.replace(/\/+$/, "").toLowerCase();
}

/**
 * GET /api/reactions?slug=/blog/2026/...
 *
 * Returns: { counts: { "👍": 3, ... }, userReaction: "👍" | null }
 */
async function handleGet(request, env) {
	const url = new URL(request.url);
	const slug = normaliseSlug(url.searchParams.get("slug"));
	const origin = request.headers.get("Origin");
	const allowedOrigin = env.ALLOWED_ORIGIN || "*";

	if (!slug) {
		return jsonResponse({ error: "Missing slug parameter" }, 400, origin, allowedOrigin);
	}

	// Fetch counts
	const countsRaw = await env.REACTIONS.get(`counts:${slug}`);
	const counts = countsRaw ? JSON.parse(countsRaw) : {};

	// Determine if the current IP already reacted
	const ip = request.headers.get("CF-Connecting-IP") || "unknown";
	const ipHash = await hashIP(ip);
	const userReaction = await env.REACTIONS.get(`ip:${slug}:${ipHash}`);

	return jsonResponse({ counts, userReaction: userReaction || null }, 200, origin, allowedOrigin);
}

/**
 * POST /api/reactions
 * Body: { "slug": "/blog/2026/...", "emoji": "👍" }
 *
 * Toggle behaviour:
 *   - No existing reaction     → add reaction
 *   - Same emoji               → remove reaction (toggle off)
 *   - Different emoji          → swap to new emoji
 */
async function handlePost(request, env) {
	const origin = request.headers.get("Origin");
	const allowedOrigin = env.ALLOWED_ORIGIN || "*";

	let body;
	try {
		body = await request.json();
	} catch {
		return jsonResponse({ error: "Invalid JSON body" }, 400, origin, allowedOrigin);
	}

	const slug = normaliseSlug(body.slug);
	const emoji = body.emoji;

	if (!slug) {
		return jsonResponse({ error: "Missing slug" }, 400, origin, allowedOrigin);
	}
	if (!ALLOWED_EMOJIS.includes(emoji)) {
		return jsonResponse({ error: "Invalid emoji" }, 400, origin, allowedOrigin);
	}

	const ip = request.headers.get("CF-Connecting-IP") || "unknown";
	const ipHash = await hashIP(ip);

	const countsKey = `counts:${slug}`;
	const ipKey = `ip:${slug}:${ipHash}`;

	// Get current state
	const [countsRaw, existingReaction] = await Promise.all([
		env.REACTIONS.get(countsKey),
		env.REACTIONS.get(ipKey),
	]);

	const counts = countsRaw ? JSON.parse(countsRaw) : {};

	if (existingReaction === emoji) {
		// Toggle off — remove reaction
		counts[emoji] = Math.max((counts[emoji] || 0) - 1, 0);
		if (counts[emoji] === 0) delete counts[emoji];
		await Promise.all([
			env.REACTIONS.put(countsKey, JSON.stringify(counts)),
			env.REACTIONS.delete(ipKey),
		]);
		return jsonResponse({ counts, userReaction: null }, 200, origin, allowedOrigin);
	}

	if (existingReaction) {
		// Swap — decrement old, increment new
		counts[existingReaction] = Math.max((counts[existingReaction] || 0) - 1, 0);
		if (counts[existingReaction] === 0) delete counts[existingReaction];
	}

	// Add new reaction
	counts[emoji] = (counts[emoji] || 0) + 1;

	await Promise.all([
		env.REACTIONS.put(countsKey, JSON.stringify(counts)),
		env.REACTIONS.put(ipKey, emoji),
	]);

	return jsonResponse({ counts, userReaction: emoji }, 200, origin, allowedOrigin);
}

export default {
	async fetch(request, env) {
		const origin = request.headers.get("Origin");
		const allowedOrigin = env.ALLOWED_ORIGIN || "*";

		// Handle CORS preflight
		if (request.method === "OPTIONS") {
			return jsonResponse(null, 204, origin, allowedOrigin);
		}

		const url = new URL(request.url);

		if (url.pathname === "/api/reactions") {
			if (request.method === "GET") {
				return handleGet(request, env);
			}
			if (request.method === "POST") {
				return handlePost(request, env);
			}
			return jsonResponse({ error: "Method not allowed" }, 405, origin, allowedOrigin);
		}

		return jsonResponse({ error: "Not found" }, 404, origin, allowedOrigin);
	},
};
