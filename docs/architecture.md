# CLARITY — Architecture

## Read context.md first. Do not start here.

---

## System Overview

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND (React)                  │
│  Chat Interface + Clarity Display + Comparison View  │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP
┌──────────────────────▼──────────────────────────────┐
│                 BACKEND (FastAPI)                    │
│                                                      │
│  ┌─────────────┐    ┌──────────────┐                │
│  │  /chat      │    │  /clarity    │                │
│  │  endpoint   │───▶│  endpoint    │                │
│  └─────────────┘    └──────┬───────┘                │
│                            │                         │
│  ┌─────────────────────────▼──────────────────────┐ │
│  │           CLARITY PROCESSOR                    │ │
│  │                                                │ │
│  │  1. Activation Check                          │ │
│  │  2. Context Extractor                         │ │
│  │  3. Clarity Generator (Claude API)            │ │
│  │  4. Counter-Reply Handler                     │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │         SESSION MEMORY (in-memory)             │ │
│  │  conversation_history: []                      │ │
│  │  assumptions_made: []                          │ │
│  │  current_recommendation: {}                    │ │
│  └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│              HYBRID LLM LAYER                        │
│  Groq API: Primary Engine for all tasks              │
│  Claude API: Fallback only (if Groq fails)           │
└─────────────────────────────────────────────────────┘
```

---

## Component 1 — Activation Check

**Purpose:** Decide whether to run Clarity or return a plain response.

**Input:** User message string

**Logic:**
```python
DECISION_KEYWORDS = [
    "should i", "what is the best", "which one",
    "recommend", "is it worth", "what would you",
    "help me choose", "which is better", "what do you think",
    "how should i", "what should i"
]

HIGH_STAKES_DOMAINS = [
    "health", "medical", "symptoms", "diet", "supplement",
    "invest", "money", "salary", "career", "job",
    "client", "business", "strategy", "meeting", "presentation",
    "legal", "contract"
]

def should_activate_clarity(message: str) -> bool:
    message_lower = message.lower()
    
    has_decision_language = any(
        kw in message_lower for kw in DECISION_KEYWORDS
    )
    
    is_high_stakes = any(
        domain in message_lower for domain in HIGH_STAKES_DOMAINS
    )
    
    return has_decision_language or is_high_stakes
```

**Output:** Boolean — True means run Clarity, False means plain response

---

## Component 2 — Context Extractor

**Purpose:** Extract what we know about the user from conversation history to populate "Based on what I know about you."

**Input:** conversation_history (list of message objects)

**Logic:**
The context extractor does NOT use a database. It uses a Claude API call to read the conversation history and extract relevant user facts.

```python
CONTEXT_EXTRACTION_PROMPT = """
Read this conversation history carefully.

Extract all facts about the user that are relevant 
to answering their current query. Include:
- Their profession or role
- Their location
- Their stated preferences
- Their budget (if mentioned)
- Their constraints or requirements
- Their goals
- Any health conditions (if mentioned)
- Any previous decisions they've shared

Only extract facts explicitly stated — do not infer.
If nothing relevant exists — return empty list.

Return as a simple list of facts.
Each fact one line.

Conversation history:
{history}

Current query:
{query}
"""
```

**Output:** List of relevant user facts as strings

Example output:
```
["Business consultant in Bengaluru",
 "Uses Samsung devices",
 "Budget mentioned: ₹60-80K",
 "Preparing for client meeting today",
 "Client is in retail sector"]
```

---

## Component 3 — Clarity Generator

**Purpose:** Transform raw AI response into three-part Clarity structure.

**Input:**
- raw_response (string) — what the AI said
- user_context (list) — extracted user facts
- current_query (string) — what the user asked
- conversation_history (list) — full conversation

**The Master Clarity Prompt:**

```python
CLARITY_PROMPT = """
You are CLARITY — a layer that makes AI responses 
transparent, personalised, and evaluable.

You will receive:
- A raw AI response
- Facts we know about the user
- The user's current query

Your job is to transform the raw response into 
this EXACT three-part structure:

---

PART 1 — PERSONALISED RECOMMENDATION

Based on what I know about you:
[List the relevant user facts here — 2-3 lines maximum.
If no user facts available — skip this line entirely
and go straight to the recommendation]

My recommendation: [ONE specific, committed answer]
[One sentence explaining WHY this fits their situation]

---

PART 2 — ASSUMPTIONS

What I assumed:
→ [Specific assumption 1]
   (if wrong — [exactly what changes about the recommendation])
→ [Specific assumption 2]  
   (if wrong — [exactly what changes about the recommendation])

Maximum 3 assumptions.
Only include assumptions where being wrong 
CHANGES the recommendation significantly.
Do NOT include generic disclaimers.
Every assumption must be specific to THIS response.

---

PART 3 — ALTERNATIVES

Other options if your situation differs:
→ [Option A] — if [specific condition that makes this better]
→ [Option B] — if [specific condition that makes this better]
→ [Option C] — if [specific condition that makes this better]

Maximum 3 alternatives.
Each must be specific — not generic.
Each must have a clear condition.

---

RULES:
1. Never hedge. Never say "it depends" without saying what it depends on.
2. Always give ONE primary recommendation — not a list of equal options.
3. The assumption section is honest — not defensive.
4. The alternatives section is ranked by likelihood of fit.
5. Do not add any text outside the three parts.
6. Keep each part concise — total response under 250 words.

Raw AI response: {raw_response}
User facts: {user_context}
Current query: {query}
"""
```

---

## Component 4 — Counter-Reply Handler

**Purpose:** Handle follow-up messages after a Clarity response has been given. This is the most important component for demonstrating depth.

**Input:**
- new_message (string) — user's follow-up
- previous_clarity_output (dict) — the Clarity response just shown
- conversation_history (list)
- assumptions_made (list) — assumptions from the last Clarity response

**Four reply types to detect and handle:**

### Reply Type 1 — Assumption Correction
User corrects one of the stated assumptions.

**Detection:**
```python
CORRECTION_PATTERNS = [
    "actually", "no my", "that's not right", 
    "i meant", "correction", "not ₹", "not in",
    "i don't", "i'm not", "that's wrong"
]
```

**Handling:**
Regenerate full Clarity structure with corrected assumption.
Acknowledge the correction explicitly:
```
"Thanks for clarifying. Updated based on your correction:

[Full new Clarity structure with corrected context]"
```

### Reply Type 2 — Recommendation Challenge
User disagrees with the recommendation.

**Detection:**
```python
CHALLENGE_PATTERNS = [
    "i don't think", "not sure about", "disagree",
    "why not", "what about", "but", "however",
    "i was thinking more", "actually i prefer"
]
```

**Handling — CRITICAL — Do NOT capitulate:**
```python
CHALLENGE_RESPONSE_PROMPT = """
The user is challenging your recommendation.
Your recommendation was: {recommendation}
Your reasoning was: {reasoning}
The user said: {challenge}

Do NOT simply agree with the user.
Do NOT abandon your recommendation without reason.

Instead:
1. Acknowledge their concern specifically
2. Explain why your recommendation still stands IF it does
3. OR explain what new information in their challenge 
   changes your reasoning IF it genuinely does
4. Ask one specific clarifying question if needed

Never say "you're right, I should have said X" 
unless they provided genuinely new information.
"""
```

### Reply Type 3 — Follow-Up Question
User wants more detail on something in the response.

**Detection:** Any question about a specific element already mentioned.

**Handling:**
Give a focused detailed response about that element.
Do not regenerate the full Clarity structure.
Keep the context from the previous turn.

### Reply Type 4 — New Context Added
User provides new information that wasn't there before.

**Detection:**
```python
NEW_CONTEXT_PATTERNS = [
    "i forgot to mention", "also", "additionally",
    "one more thing", "i should add", "by the way"
]
```

**Handling:**
Acknowledge the new context explicitly.
Regenerate full Clarity structure incorporating it.
Show what changed:
```
"Good to know — that changes my recommendation.

[New Clarity structure]

What changed: [Specific explanation of what new context changed and why]"
```

---

## Session Memory Structure

```python
session = {
    "conversation_history": [
        {
            "role": "user" | "assistant",
            "content": "string",
            "timestamp": "datetime"
        }
    ],
    "clarity_active": True | False,
    "last_clarity_output": {
        "recommendation": "string",
        "reasoning": "string", 
        "assumptions": ["string"],
        "alternatives": ["string"]
    },
    "user_context": ["string"],  # extracted facts
    "turn_count": 0
}
```

---

## API Endpoints

### POST /chat
**Purpose:** Main endpoint. Handles all user messages.

**Request:**
```json
{
    "message": "string",
    "session_id": "string"
}
```

**Logic:**
```
1. Load session from memory
2. Add user message to conversation_history
3. Run activation check
4. If Clarity active AND this is a follow-up:
   → Run counter-reply handler
5. If Clarity should activate (new query):
   → Generate raw response (Claude API call 1)
   → Extract user context (Claude API call 2)
   → Generate Clarity output (Claude API call 3)
6. If Clarity should NOT activate:
   → Generate plain response (Claude API call 1)
7. Add response to conversation_history
8. Return response
```

**Response:**
```json
{
    "clarity_activated": true | false,
    "response_type": "clarity" | "plain" | "counter_reply",
    "content": {
        "part1": {
            "user_context": ["string"],
            "recommendation": "string",
            "reasoning": "string"
        },
        "part2": {
            "assumptions": [
                {
                    "assumption": "string",
                    "if_wrong": "string"
                }
            ]
        },
        "part3": {
            "alternatives": [
                {
                    "option": "string",
                    "condition": "string"
                }
            ]
        }
    }
}
```

### GET /session/{session_id}
**Purpose:** Get current session state for debugging.

### DELETE /session/{session_id}
**Purpose:** Clear session (reset conversation).

---

## Frontend Components

### ChatInterface
Main chat window. Handles input and displays messages.
Shows different styling for:
- User messages (right aligned, indigo bubble)
- Plain AI responses (left aligned, grey bubble)
- Clarity responses (left aligned, structured card)

### ClarityCard
Displays the three-part Clarity structure.
Part 1: White card with indigo left border
Part 2: Collapsed by default — tap to expand
Part 3: Collapsed by default — tap to expand

### MemoryPanel
Sidebar panel showing "Based on what I know about you".
Dynamically updates as user context facts are extracted.
Makes the invisible memory process visible to evaluators.

### ThinkingIndicator
Visual component shown while Claude generates the Clarity structure.
Builds trust by showing the AI "working process" in the background.

### ComparisonView
Side-by-side panel showing:
Left: What ChatGPT gives today (plain response)
Right: What Clarity gives (structured response)
Toggle button to switch between views

### CounterReplyBadge
Small visual indicator when Clarity updates due to a correction:
"Updated based on your correction"

---

## Hybrid API Usage

Requires two API keys: `GROQ_API_KEY` and `ANTHROPIC_API_KEY`.

**Groq (e.g., Llama 3 70B)**
- Used for: Primary generation for ALL calls (Raw response, Context, Clarity)
- Why: Extreme low latency and highly cost-effective/free tier usage

**Claude (claude-sonnet-4-20250514)**
- Used for: Fallback ONLY
- Why: If Groq hits a rate limit or fails to parse a complex query, the system automatically falls back to Claude to ensure the user still gets a response.

All calls include conversation history for context continuity.
