# CLARITY — Project Context for AI Agents

## READ THIS ENTIRE FILE BEFORE WRITING A SINGLE LINE OF CODE.

---

## What We Are Building

We are building a prototype called **Clarity** — a second intelligence layer that sits on top of ChatGPT's responses and makes them evaluable, transparent, and personalised.

This is not a chatbot. This is not a RAG system. This is not a memory database.

It is a **post-processing layer** that takes ChatGPT's raw output and transforms it into something the user can actually evaluate and act on with confidence.

---

## Why We Are Building This

### The Problem

ChatGPT was trained using RLHF (Reinforcement Learning from Human Feedback). Human raters preferred responses that were:
- Confident and authoritative
- Comprehensive (covered all angles)
- Agreeable (didn't push back)
- Well-formatted and polished

So ChatGPT learned to produce responses that LOOK correct — regardless of whether they ARE correct for the user's specific situation.

This creates three failure modes:

**1. Context Gap**
ChatGPT gives a correct general answer that misses the user's specific situation. The output looks complete. The gap only surfaces during implementation — too late.

Example: Rameez asks about declining retail margins. ChatGPT gives a thorough answer about traditional retail. His client uses quick commerce. The answer was useless for his situation. He found out in the client meeting.

**2. Sycophancy Trap**
ChatGPT changes its answer when challenged. If it changed so easily — was the first answer ever right? Destroys trust in both the original and the correction.

**3. Direction Gap**
ChatGPT gives multiple options instead of one committed answer. Optimises for comprehensiveness over usefulness. User gets option paralysis, not direction.

### The Root Cause

ChatGPT was designed to satisfy users in the moment — not to serve their judgment in the long run.

Users cannot evaluate AI outputs because:
- The output looks identical whether right or wrong
- Reasoning is hidden — only conclusions are shown
- All claims presented with equal confidence — no signal for what to verify
- No assumptions surfaced — user doesn't know what the AI didn't know

### What The Brief Requires

We are solving this for a Product Management course. The brief requires:

1. Help users evaluate output quality (correctness, completeness, reasoning quality, usefulness, uncertainty)
2. Support human judgment — NOT replace it
3. Confidence calibration — avoid overconfidence AND excessive skepticism
4. Make AI reasoning legible — why was output generated, what assumptions were made, what is missing

**Explicitly NOT allowed:**
- Basic hallucination detection
- Fact-checking alone
- Generic trust scores
- Cosmetic UI improvements

---

## The Target User

**Name:** Rameez Suleman
**Age:** 31
**Role:** Business Coach, Mid-size Consultancy, Bengaluru
**ChatGPT usage:** 3-4x daily for client analysis, research, email drafting

**His problem:**
He scans ChatGPT outputs in 25 seconds. Judges quality by surface signals — length, formatting, confident tone. Cannot distinguish a correct answer from a plausible wrong one. Both look identical.

Has been underprepared in client meetings because ChatGPT gave him a correct-looking answer that missed his client's specific context.

**His unmet need:**
"I don't need it to be right all the time. I need to know when it might not be right for MY situation."

---

## The Solution: Clarity

### What Clarity Is

Clarity intercepts ChatGPT's raw response and runs a second LLM call that transforms it into a three-part structured response:

```
PART 1 — PERSONALISED RECOMMENDATION
Based on what I know about you:
[Context extracted from conversation history]

My recommendation: [ONE clear, committed answer]
[One line explaining why it fits their situation]

PART 2 — ASSUMPTIONS
What I assumed:
→ [Assumption 1] (if wrong — [what changes])
→ [Assumption 2] (if wrong — [what changes])

PART 3 — ALTERNATIVES
Other options if your situation differs:
→ [Option A] — if [specific condition]
→ [Option B] — if [specific condition]
→ [Option C] — if [specific condition]
```

### What Makes This NOT Cosmetic

The content inside the structure is dynamically generated for every specific query. Not templated. Not boilerplate. The LLM reads the raw ChatGPT response and the conversation history, and generates specific, query-relevant content for each part.

Before Clarity: User has ChatGPT's answer
After Clarity: User has the answer + what was assumed + what changes if assumptions are wrong + alternatives for different situations

The information available to the user fundamentally changes. That is not cosmetic.

### What Happens When User Counter-Replies

This is critical. The system must handle multi-turn conversation properly.

**Scenario 1 — User corrects an assumption:**
```
User: "Actually my budget is ₹40K not ₹80K"
```
Clarity detects this is a correction to a previous assumption. Re-runs the full Clarity structure with the corrected context. Does NOT just append to the previous response. Generates a completely fresh structured response based on the new information.

**Scenario 2 — User asks a follow-up:**
```
User: "Tell me more about the Samsung S25"
```
Clarity detects this is a deeper dive on the primary recommendation. Maintains context from previous turn. Generates a focused response about that specific option while keeping the assumption and alternative framework visible.

**Scenario 3 — User challenges the recommendation:**
```
User: "I don't think Samsung is right for me"
```
Clarity does NOT capitulate sycophantically. It maintains its reasoning. Responds:
"My recommendation stands based on [reasons]. However if [specific concern] is what's driving your hesitation — [Option B] from the alternatives section addresses that. Can you tell me what specifically doesn't feel right?"

This directly addresses the sycophancy problem. Clarity holds its position with reasoning rather than immediately agreeing.

**Scenario 4 — User provides new context:**
```
User: "I forgot to mention I also need this for video editing"
```
Clarity detects new context that changes the recommendation. Acknowledges the update. Regenerates the full structure with the new context incorporated. Shows what changed and why.

### When Clarity Activates

NOT on every message. Clarity is intelligent about when to fire.

**ACTIVATE Clarity when:**
- Query contains decision language: "should I", "what is the best", "which one", "recommend", "is it worth"
- Answer depends on user's specific situation
- Query is in a high-stakes domain: professional work, health, finance, career

**DO NOT activate Clarity when:**
- Simple factual queries: "What is the capital of France"
- Definitional queries: "What is photosynthesis"
- Historical queries: "When was India independent"
- Casual conversation

Detection method: keyword matching + domain classification. Simple if-then logic. Not ML.

---

## On User Context and Memory

**For the prototype:**
- Clarity extracts context from the current session only.
- "Based on what I know about you" builds as the conversation progresses.
- New chat = starts fresh, context builds over the session.
- **UI Requirement:** Show a visible "memory panel" that updates as facts are shared. This makes context-building visible to the evaluator and demonstrates the concept even without access to a real memory database.

**For production (described in deck, not built in prototype):**
- Clarity connects to ChatGPT's stored memory database.
- Retrieves user facts stored across all previous conversations.
- Ensures stored context is applied to every relevant query.
- Fixes the core problem: facts shared once are never ignored again.

---

## What The Prototype Must Demonstrate

The prototype has one job: show the difference between ChatGPT today and ChatGPT with Clarity. Self-explanatory without a presenter. Evaluator reads it alone.

**Three screens:**

**Screen 1 — The Problem**
Normal chat interface. User asks a question. Gets ChatGPT's typical response — vague, multiple options, no personal context. Label: "ChatGPT today"

**Screen 2 — With Clarity**
Same question. Clarity activates. Three-part structured response appears. Personal context used. One clear recommendation. Assumptions visible. Alternatives ranked. Label: "ChatGPT with Clarity"

**Screen 3 — Counter-reply handling**
User responds to the Clarity output — either correcting an assumption or challenging the recommendation. System handles it correctly — either updates the recommendation or holds its position with reasoning. This demonstrates the depth of the solution.

---

## Technical Constraints

- This is a prototype for a PM course project
- Deadline: June 3, 2026
- Must be demonstrable — not just a mockup
- **LLM Architecture (Hybrid Approach):**
  - Use **Groq API** (e.g., Llama 3) for the raw response generation (Call 1) to ensure extremely fast base responses.
  - Use **Claude API** for the Clarity layer (Calls 2 and 3) because we need its superior prompt adherence, reasoning, and structured output capabilities.
- Simple frontend — React or plain HTML
- Simple backend — Python FastAPI or Node.js
- No database required — conversation history stored in memory/session
- Must be deployable — Render or Vercel

---

## What Success Looks Like

An evaluator opens the prototype and within 60 seconds understands:
1. What the problem is (ChatGPT gives vague, context-free responses)
2. What Clarity does (makes it personalised, transparent, evaluable)
3. Why it matters (user can now exercise judgment instead of blind trust)
4. That it handles follow-up correctly (not just a one-shot demo)

---

## What To Avoid

- Do NOT build a RAG system with a vector database — not needed
- Do NOT build a memory persistence system — session memory is enough
- Do NOT add confidence scores or percentages — explicitly rejected
- Do NOT make it look like a generic chatbot — it must look like a specific product
- Do NOT hardcode the Clarity content — it must be dynamically generated
- Do NOT let it capitulate when challenged — Clarity holds its reasoning
