/**
 * Reactions widget – vanilla JS, no dependencies.
 *
 * Usage: include this script on post pages.  It looks for:
 *   <div id="reactions" data-slug="{{ page.url }}"></div>
 *
 * Configure the worker URL below.
 */

(function () {
	const WORKER_URL = "https://blog-reactions.rakagunarto.workers.dev";
	const EMOJIS = ["👍", "❤️", "🔥", "😂", "🤔", "😢"];

	const container = document.getElementById("reactions");
	if (!container) return;

	const slug = container.dataset.slug;
	if (!slug) return;

	let currentUserReaction = null;
	let currentCounts = {};
	let busy = false;

	// ---- Render ----

	function render() {
		container.innerHTML = "";

		const heading = document.createElement("p");
		heading.className = "reactions-heading";
		heading.textContent = "React to this post";
		container.appendChild(heading);

		const btnRow = document.createElement("div");
		btnRow.className = "reactions-row";

		EMOJIS.forEach((emoji) => {
			const btn = document.createElement("button");
			btn.className = "reaction-btn";
			if (emoji === currentUserReaction) {
				btn.classList.add("active");
			}
			btn.setAttribute("aria-label", `React with ${emoji}`);
			btn.type = "button";

			const emojiSpan = document.createElement("span");
			emojiSpan.className = "reaction-emoji";
			emojiSpan.textContent = emoji;

			const countSpan = document.createElement("span");
			countSpan.className = "reaction-count";
			const count = currentCounts[emoji] || 0;
			countSpan.textContent = count > 0 ? count : "";

			btn.appendChild(emojiSpan);
			btn.appendChild(countSpan);

			btn.addEventListener("click", () => handleClick(emoji));

			btnRow.appendChild(btn);
		});

		container.appendChild(btnRow);
	}

	// ---- Fetch current state ----

	async function fetchReactions() {
		try {
			const res = await fetch(
				`${WORKER_URL}/api/reactions?slug=${encodeURIComponent(slug)}`
			);
			if (!res.ok) return;
			const data = await res.json();
			currentCounts = data.counts || {};
			currentUserReaction = data.userReaction || null;
		} catch {
			// Silently fail – widget just won't show counts
		}
		render();
	}

	// ---- Handle click ----

	async function handleClick(emoji) {
		if (busy) return;
		busy = true;

		// Optimistic update
		const prevCounts = { ...currentCounts };
		const prevReaction = currentUserReaction;

		if (currentUserReaction === emoji) {
			// Toggle off
			currentCounts[emoji] = Math.max((currentCounts[emoji] || 0) - 1, 0);
			if (currentCounts[emoji] === 0) delete currentCounts[emoji];
			currentUserReaction = null;
		} else {
			if (currentUserReaction) {
				// Swap
				currentCounts[currentUserReaction] = Math.max(
					(currentCounts[currentUserReaction] || 0) - 1,
					0
				);
				if (currentCounts[currentUserReaction] === 0)
					delete currentCounts[currentUserReaction];
			}
			currentCounts[emoji] = (currentCounts[emoji] || 0) + 1;
			currentUserReaction = emoji;
		}
		render();

		try {
			const res = await fetch(`${WORKER_URL}/api/reactions`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ slug, emoji }),
			});
			if (!res.ok) throw new Error("Request failed");
			const data = await res.json();
			currentCounts = data.counts || {};
			currentUserReaction = data.userReaction || null;
		} catch {
			// Rollback on failure
			currentCounts = prevCounts;
			currentUserReaction = prevReaction;
		}

		render();
		busy = false;
	}

	// ---- Init ----
	fetchReactions();
})();
