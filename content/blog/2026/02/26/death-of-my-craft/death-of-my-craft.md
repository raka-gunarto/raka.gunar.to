---
title: 3000 commits behind origin/main in 6 days
description: 
date: 2026-02-26
---

I feel like I'm watching the death of the craft that I've admired and wanted to master since I was young.

A week ago I forked the popular project "OpenClaw" to add a sandboxing backend using `bwrap` for my autonomous AI agent container hardening project. The fork is already 3000 commits behind. How is that rate of change sustainable? How does anyone understand what's going on in that codebase?

I'm seeing linkedin posts asking if we are "optimizing for humans" by keeping PRs small with a screenshot of a 175 commits in a PR. I think small PRs force critical thinking on the author's part about what they are changing and why and force them to clearly encode their intent.

You may say this is probably how every software engineer felt when a new layer of abstraction (newer higher level languages) popped up every once in a while. I say this is not the same. Every previous abstraction raised the floor; you didn't need to hand-write assembly, but you still had to understand memory / data flow / failure modes / etc. The abstractions compressed the _how_, not the _what_ or _why_.

Now people are prompting "implement an auth system, make no mistakes" and get a two thousand line diff to "review". The person who built it probably can't tell you what happens when that token expires, or how they are protecting the token, or whatever invariants they were relying on. 

Are we just accepting a future that it's fine to just _sort of kind of think we know_ how this software functions underneath?