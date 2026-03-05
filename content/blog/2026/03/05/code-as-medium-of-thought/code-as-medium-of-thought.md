---
title: Code as a medium of thought
description: Was friction the learning?
date: 2026-03-05
tags: ["opinion"]
---

*This is a more coherent version of my earlier [thought dump](/blog/2026/02/26/death-of-my-craft/).*

---

Everyone keeps saying AI won't kill software engineering, just the boring parts. "The craft survives".
But I'm not entirely convinced we know what the craft actually is.

### Code is how you think, not just the product

I think code is a medium of thought for the software engineer. Before when we were are forced
to write it by hand you hit friction: the abstraction that won't cooperate, the data structure
that feels wrong, the *aha* moment when you fix that bug. That learning is encoded and compounded
into your intuition. The friction is where understanding forms.

I see many seasoned engineers use AI (LLM) code generation extremely well, because they amplify what
is already there. But what about those starting out? Intuition around "systems thinking" didn't
just appear out of thin air.

### Mathematicians don't lose their intuition to the calculator

A mathematician who uses a calculator still feels when an answer is wrong. They can estimate
and sense results that may be technically valid but non-obviously broken. That's intuition
accumulated through years of working with numbers. The calculator didn't erode that because
arithmetic was never really the foundation, the reasoning was.

The question I can't answer confidently is whether the same is true for software. Whether
writing code and grinding through implementation is the foundation or the arithmetic
underneath the whole thing. My current opinion is that it is an important formative part
of software engineering. But I've seen smart people argue otherwise and I can't
fully refute them either. (Ignoring the headlines by AI companies to justify their
token factories operating at a loss to investors.)

### Generating the answer is learning

[There's research](https://psycnet.apa.org/record/1980-20399-001) that makes me think the foundation is real and we're undermining it.
Producing an answer yourself, rather than reading or copying it, seems to measurably
improve how deeply it gets encoded into your brain. The struggle is not incidental to
the learning, it *is* the learning. When you skip straight to the output, you skip
past that understanding.

### Too early and the foundation never forms

[Calculator studies in school](https://news.vanderbilt.edu/2008/08/19/calculators-okay-in-math-class-if-students-know-the-facts-first-62879/) have shown that student who haven't yet built the
foundational reasoning and intuition around numbers and got access to calculators
saw their performance durably worsen. The students who were already proficient were fine,
the tool just amplified what existed.

The sequencing here is important, foundations first, then tools to apply those foundations
faster later.

### Use it or lose it

Humans are inherently lazy, this is just evident. We will offload work to whatever reduces 
effort and we do it faster than we notice the atrophy. This is how cognition works.
Skills you stop exercising degrade, and they degrade quietly in the background so
you don't notice until you need them.

I think this is happening now with LLM code generation, especially to those who haven't
been around long enough (including me) to build this deeply encoded intuition about
software and systems. Sure you can review the output, but do we know what we're actually
reviewing? People say test behaviours instead of reading the code, but how do you know
what behaviours to test? Your high-level logic may be behaviourally correct, but
architecturally a mess as well.

I do use LLMs, I love that it can generate boilerplate for me or write a bunch of tests
that would have taken ages to type. Or implement entire features that I know how it should
look. I try to put in the work to keep my understanding
by still trying to understand the output and verifying my mental model against the LLM.
But I know my level of curiosity and desire to understand isn't universally shared,
and often feels like a burden to the velocity culture I see evolving around me.

*Bonus: [CodeRabbit State of AI vs Human Code Gen](https://www.coderabbit.ai/blog/state-of-ai-vs-human-code-generation-report)*

### "AI, write this comment for me..."

My worry isn't just isolated to software engineering. It's human thinking as a whole.
I've seen comments online from people self proclaiming "I had AI write this comment,
AI raises the floor as it allows me to express my thoughts clearer and faster".

If you need AI to clearly articulate a thought, is that thought actually coherent in 
your own head? Clear writing is evidence of clear thinking. It's how you know the idea
holds together. If you can't write the comment, do you really understand what you're
saying? The tool is clumsily patching the gap in your thinking rather than assisting you.

### ...now what?

Perhaps I'm wrong about all of this. Maybe the next generation of software engineers
will develop intuition through entirely different means, through reading and critiquing
AI generated code rather than starting from a blank file. What I do know now is that
this experiment is being forced upon us either way, and we won't see the compounding
effects until 5-10 more years. Until then, I hope we still keep using our brains.