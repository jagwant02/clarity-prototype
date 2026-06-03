# CLARITY — Implementation Plan

## Read context.md and architecture.md first.

---

## Tech Stack

```
Frontend:  React + Tailwind CSS
Backend:   Python FastAPI
AI:        Claude API (Anthropic)
Storage:   In-memory (no database)
Deploy:    Render (backend) + Vercel (frontend)
```

---

## File Structure

```
clarity/
├── backend/
│   ├── main.py              # FastAPI app + all endpoints
│   ├── clarity_processor.py # Core Clarity logic
│   ├── prompts.py           # All Claude prompts
│   ├── session_manager.py   # In-memory session handling
│   ├── activation.py        # When to activate Clarity
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── ChatInterface.jsx
│   │   │   ├── ClarityCard.jsx
│   │   │   ├── ComparisonView.jsx
│   │   │   ├── MessageBubble.jsx
│   │   │   └── CounterReplyBadge.jsx
│   │   ├── hooks/
│   │   │   └── useChat.js
│   │   └── utils/
│   │       └── api.js
│   └── package.json
│
└── README.md
```

---

## Phase 1 — Backend Core (Day 1 Morning)

### Step 1: Setup

```bash
mkdir clarity && cd clarity
mkdir backend && cd backend
python -m venv venv
source venv/bin/activate
pip install fastapi uvicorn anthropic groq python-dotenv
```

Create `.env`:
```
ANTHROPIC_API_KEY=your_key_here
GROQ_API_KEY=your_groq_key_here
```

### Step 2: session_manager.py

```python
# In-memory session storage
# Each session has conversation history, 
# last clarity output, and extracted user context

from datetime import datetime
import uuid

sessions = {}  # Global in-memory store

def create_session() -> str:
    session_id = str(uuid.uuid4())
    sessions[session_id] = {
        "conversation_history": [],
        "clarity_active": False,
        "last_clarity_output": None,
        "user_context": [],
        "turn_count": 0
    }
    return session_id

def get_session(session_id: str) -> dict:
    if session_id not in sessions:
        sessions[session_id] = {
            "conversation_history": [],
            "clarity_active": False,
            "last_clarity_output": None,
            "user_context": [],
            "turn_count": 0
        }
    return sessions[session_id]

def update_session(session_id: str, updates: dict):
    if session_id in sessions:
        sessions[session_id].update(updates)

def add_message(session_id: str, role: str, content: str):
    session = get_session(session_id)
    session["conversation_history"].append({
        "role": role,
        "content": content,
        "timestamp": datetime.now().isoformat()
    })

def clear_session(session_id: str):
    if session_id in sessions:
        del sessions[session_id]
```

### Step 3: activation.py

```python
DECISION_KEYWORDS = [
    "should i", "what is the best", "which one",
    "recommend", "is it worth", "what would you",
    "help me choose", "which is better", "what do you think",
    "how should i", "what should i", "suggest", 
    "what laptop", "what phone", "best option"
]

HIGH_STAKES_DOMAINS = [
    "health", "medical", "symptoms", "diet", "supplement",
    "vitamin", "medicine", "invest", "money", "salary",
    "career", "job", "switch", "client", "business",
    "strategy", "meeting", "presentation", "legal", "contract"
]

CORRECTION_PATTERNS = [
    "actually", "no my", "that's not right",
    "i meant", "correction", "not ₹", "i don't",
    "i'm not", "wrong", "incorrect", "mistaken"
]

CHALLENGE_PATTERNS = [
    "i don't think", "not sure about", "disagree",
    "why not", "what about", "but why", "however",
    "i was thinking", "actually i prefer", "i disagree"
]

NEW_CONTEXT_PATTERNS = [
    "i forgot", "also", "additionally", "one more",
    "i should add", "by the way", "oh and", "plus"
]

def should_activate_clarity(message: str) -> bool:
    msg = message.lower()
    has_decision = any(kw in msg for kw in DECISION_KEYWORDS)
    is_high_stakes = any(d in msg for d in HIGH_STAKES_DOMAINS)
    return has_decision or is_high_stakes

def detect_reply_type(message: str, last_clarity: dict) -> str:
    if not last_clarity:
        return "new_query"
    
    msg = message.lower()
    
    if any(p in msg for p in CORRECTION_PATTERNS):
        return "assumption_correction"
    
    if any(p in msg for p in CHALLENGE_PATTERNS):
        return "recommendation_challenge"
    
    if any(p in msg for p in NEW_CONTEXT_PATTERNS):
        return "new_context"
    
    return "follow_up_question"
```

### Step 4: prompts.py

```python
RAW_RESPONSE_PROMPT = """
You are a helpful AI assistant.
Answer the user's question clearly and helpfully.
Be specific and direct.

Conversation history:
{history}

User's question: {query}
"""

CONTEXT_EXTRACTION_PROMPT = """
Read this conversation history.
Extract facts about the user relevant to their current query.

Include only explicitly stated facts:
- Profession or role
- Location  
- Budget (if mentioned)
- Preferences and constraints
- Goals
- Any domain-specific context (health conditions, business type, etc.)

Return as a simple numbered list.
If nothing relevant — return "No specific context available"

Conversation history:
{history}

Current query: {query}
"""

CLARITY_GENERATION_PROMPT = """
You are CLARITY. Transform this AI response into a 
three-part structured output.

PART 1 — PERSONALISED RECOMMENDATION

Based on what I know about you:
{user_context_formatted}

My recommendation: [ONE specific answer — no hedging]
[One sentence: why this fits their situation specifically]

---

PART 2 — ASSUMPTIONS

What I assumed:
→ [Assumption 1] (if wrong — [what specifically changes])
→ [Assumption 2] (if wrong — [what specifically changes])

Rules for assumptions:
- Maximum 3
- Only include if being wrong changes the recommendation
- Be specific — never generic
- Start each with "I assumed"

---

PART 3 — ALTERNATIVES

Other options if your situation differs:
→ [Option] — if [specific condition]
→ [Option] — if [specific condition]
→ [Option] — if [specific condition]

Rules for alternatives:
- Maximum 3
- Each must have a specific condition
- Ranked by likelihood

---

ABSOLUTE RULES:
1. Never say "it depends" without completing the sentence
2. Never list options equally — always rank them
3. Never use hedge words: might, could, perhaps, potentially
4. Keep total response under 300 words
5. Return ONLY the three parts — no other text

Raw AI response to transform: {raw_response}
User context facts: {user_context}
User's query: {query}
"""

COUNTER_REPLY_CORRECTION_PROMPT = """
The user has corrected one of your assumptions.
Previous recommendation: {previous_recommendation}
Previous assumptions: {previous_assumptions}
User's correction: {user_message}

Regenerate the full Clarity structure with the corrected information.
Start with: "Thanks for clarifying. Updated recommendation:"

Then provide the full three-part Clarity structure 
incorporating the correction.

At the end add one line:
"What changed: [specific explanation of what the 
correction changed and why]"
"""

COUNTER_REPLY_CHALLENGE_PROMPT = """
The user is challenging your recommendation.
Your recommendation: {recommendation}
Your reasoning: {reasoning}
User's challenge: {user_message}

IMPORTANT: Do NOT simply agree with the user.
Do NOT abandon your recommendation unless they 
provided genuinely new information.

Respond by:
1. Acknowledging their specific concern
2. Explaining why your recommendation still stands 
   (if it does) with clear reasoning
3. OR explaining what in their message changes 
   your reasoning (if something genuinely does)
4. Asking ONE specific clarifying question if needed

Keep response under 150 words.
Be direct. Be honest. Do not capitulate sycophantically.
"""

COUNTER_REPLY_NEW_CONTEXT_PROMPT = """
The user has provided new information.
Previous recommendation: {previous_recommendation}
New information from user: {user_message}
Full conversation history: {history}

Acknowledge the new information.
Regenerate the full Clarity structure incorporating it.

Start with: "Good to know — [one line on what this changes]"

Then provide full three-part Clarity structure.

End with: "What changed: [specific explanation]"
"""

COUNTER_REPLY_FOLLOWUP_PROMPT = """
The user wants more detail on something from your response.
Previous Clarity output: {previous_clarity}
User's follow-up question: {user_message}

Provide a focused, detailed answer about what they asked.
Do NOT regenerate the full Clarity structure.
Keep the context and recommendation from the previous turn.
Answer in under 200 words.
"""
```

### Step 5: clarity_processor.py

```python
import anthropic
from groq import Groq
import os
from prompts import (
    RAW_RESPONSE_PROMPT,
    CONTEXT_EXTRACTION_PROMPT, 
    CLARITY_GENERATION_PROMPT,
    COUNTER_REPLY_CORRECTION_PROMPT,
    COUNTER_REPLY_CHALLENGE_PROMPT,
    COUNTER_REPLY_NEW_CONTEXT_PROMPT,
    COUNTER_REPLY_FOLLOWUP_PROMPT
)

claude_client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def call_claude(prompt: str, max_tokens: int = 1000) -> str:
    message = claude_client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=max_tokens,
        messages=[{"role": "user", "content": prompt}]
    )
    return message.content[0].text

def call_groq(prompt: str, max_tokens: int = 1000) -> str:
    chat_completion = groq_client.chat.completions.create(
        messages=[{"role": "user", "content": prompt}],
        model="llama3-8b-8192",
        max_tokens=max_tokens
    )
    return chat_completion.choices[0].message.content

def format_history(history: list) -> str:
    formatted = []
    for msg in history[-10:]:  # Last 10 messages only
        role = "User" if msg["role"] == "user" else "Assistant"
        formatted.append(f"{role}: {msg['content']}")
    return "\n".join(formatted)

def generate_raw_response(query: str, history: list) -> str:
    prompt = RAW_RESPONSE_PROMPT.format(
        history=format_history(history),
        query=query
    )
    return call_groq(prompt)

def extract_user_context(query: str, history: list) -> list:
    prompt = CONTEXT_EXTRACTION_PROMPT.format(
        history=format_history(history),
        query=query
    )
    result = call_claude(prompt, max_tokens=500)
    
    # Parse numbered list into array
    lines = result.strip().split('\n')
    context = []
    for line in lines:
        line = line.strip()
        if line and line != "No specific context available":
            # Remove numbering if present
            if line[0].isdigit() and '. ' in line:
                line = line.split('. ', 1)[1]
            context.append(line)
    return context

def generate_clarity_output(
    raw_response: str,
    user_context: list,
    query: str
) -> dict:
    
    context_formatted = "\n".join(
        [f"- {fact}" for fact in user_context]
    ) if user_context else "No previous context about you yet."
    
    prompt = CLARITY_GENERATION_PROMPT.format(
        raw_response=raw_response,
        user_context=user_context,
        user_context_formatted=context_formatted,
        query=query
    )
    
    clarity_text = call_claude(prompt)
    
    # Parse into structured dict
    return parse_clarity_output(clarity_text, user_context)

def parse_clarity_output(text: str, user_context: list) -> dict:
    # Split into parts
    parts = text.split("---")
    
    result = {
        "raw_text": text,
        "part1": {
            "user_context": user_context,
            "full_text": parts[0].strip() if len(parts) > 0 else text
        },
        "part2": {
            "full_text": parts[1].strip() if len(parts) > 1 else ""
        },
        "part3": {
            "full_text": parts[2].strip() if len(parts) > 2 else ""
        }
    }
    
    # Extract recommendation from part 1
    lines = result["part1"]["full_text"].split('\n')
    for line in lines:
        if line.startswith("My recommendation:"):
            result["part1"]["recommendation"] = line.replace(
                "My recommendation:", ""
            ).strip()
            break
    
    # Extract assumptions from part 2
    assumptions = []
    for line in result["part2"]["full_text"].split('\n'):
        if line.strip().startswith('→'):
            assumptions.append(line.strip()[1:].strip())
    result["part2"]["assumptions"] = assumptions
    
    # Extract alternatives from part 3
    alternatives = []
    for line in result["part3"]["full_text"].split('\n'):
        if line.strip().startswith('→'):
            alternatives.append(line.strip()[1:].strip())
    result["part3"]["alternatives"] = alternatives
    
    return result

def handle_counter_reply(
    message: str,
    reply_type: str,
    session: dict
) -> dict:
    
    last_clarity = session.get("last_clarity_output", {})
    history = session.get("conversation_history", [])
    
    if reply_type == "assumption_correction":
        prompt = COUNTER_REPLY_CORRECTION_PROMPT.format(
            previous_recommendation=last_clarity.get(
                "part1", {}
            ).get("recommendation", ""),
            previous_assumptions=last_clarity.get(
                "part2", {}
            ).get("assumptions", []),
            user_message=message
        )
        response_text = call_claude(prompt)
        return {
            "type": "correction_update",
            "text": response_text,
            "show_badge": True,
            "badge_text": "Updated based on your correction"
        }
    
    elif reply_type == "recommendation_challenge":
        prompt = COUNTER_REPLY_CHALLENGE_PROMPT.format(
            recommendation=last_clarity.get(
                "part1", {}
            ).get("recommendation", ""),
            reasoning=last_clarity.get(
                "part1", {}
            ).get("full_text", ""),
            user_message=message
        )
        response_text = call_claude(prompt)
        return {
            "type": "challenge_response",
            "text": response_text,
            "show_badge": False
        }
    
    elif reply_type == "new_context":
        prompt = COUNTER_REPLY_NEW_CONTEXT_PROMPT.format(
            previous_recommendation=last_clarity.get(
                "part1", {}
            ).get("recommendation", ""),
            user_message=message,
            history=format_history(history)
        )
        response_text = call_claude(prompt)
        return {
            "type": "context_update",
            "text": response_text,
            "show_badge": True,
            "badge_text": "Updated with new information"
        }
    
    else:  # follow_up_question
        prompt = COUNTER_REPLY_FOLLOWUP_PROMPT.format(
            previous_clarity=last_clarity.get("raw_text", ""),
            user_message=message
        )
        response_text = call_claude(prompt)
        return {
            "type": "follow_up",
            "text": response_text,
            "show_badge": False
        }
```

### Step 6: main.py

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from session_manager import (
    get_session, add_message, 
    update_session, clear_session, create_session
)
from activation import should_activate_clarity, detect_reply_type
from clarity_processor import (
    generate_raw_response,
    extract_user_context,
    generate_clarity_output,
    handle_counter_reply
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

class ChatRequest(BaseModel):
    message: str
    session_id: str = "default"

@app.post("/chat")
async def chat(request: ChatRequest):
    session = get_session(request.session_id)
    
    # Add user message to history
    add_message(request.session_id, "user", request.message)
    
    # Check if this is a follow-up to a Clarity response
    is_follow_up = (
        session.get("clarity_active") and 
        session.get("last_clarity_output") is not None
    )
    
    if is_follow_up:
        # Detect type of follow-up
        reply_type = detect_reply_type(
            request.message,
            session.get("last_clarity_output")
        )
        
        counter_response = handle_counter_reply(
            request.message,
            reply_type,
            session
        )
        
        add_message(
            request.session_id, 
            "assistant", 
            counter_response["text"]
        )
        
        return {
            "clarity_activated": True,
            "response_type": "counter_reply",
            "reply_type": reply_type,
            "content": counter_response
        }
    
    # New query — check if Clarity should activate
    activate = should_activate_clarity(request.message)
    
    # Generate raw response
    raw_response = generate_raw_response(
        request.message,
        session["conversation_history"]
    )
    
    if not activate:
        add_message(request.session_id, "assistant", raw_response)
        update_session(request.session_id, {
            "clarity_active": False,
            "last_clarity_output": None
        })
        return {
            "clarity_activated": False,
            "response_type": "plain",
            "content": {"text": raw_response}
        }
    
    # Extract user context from history
    user_context = extract_user_context(
        request.message,
        session["conversation_history"]
    )
    
    # Generate Clarity output
    clarity_output = generate_clarity_output(
        raw_response,
        user_context,
        request.message
    )
    
    # Update session
    update_session(request.session_id, {
        "clarity_active": True,
        "last_clarity_output": clarity_output,
        "user_context": user_context
    })
    
    add_message(
        request.session_id, 
        "assistant", 
        clarity_output.get("raw_text", "")
    )
    
    return {
        "clarity_activated": True,
        "response_type": "clarity",
        "raw_response": raw_response,  # For comparison view
        "content": clarity_output
    }

@app.get("/session/{session_id}")
async def get_session_state(session_id: str):
    return get_session(session_id)

@app.delete("/session/{session_id}")
async def delete_session(session_id: str):
    clear_session(session_id)
    return {"status": "cleared"}

@app.post("/session/new")
async def new_session():
    session_id = create_session()
    return {"session_id": session_id}
```

---

## Phase 2 — Frontend (Day 1 Afternoon)

### App.jsx

```jsx
import { useState } from "react"
import ChatInterface from "./components/ChatInterface"
import ComparisonView from "./components/ComparisonView"

export default function App() {
  const [showComparison, setShowComparison] = useState(false)
  const [lastRawResponse, setLastRawResponse] = useState(null)
  const [lastClarityResponse, setLastClarityResponse] = useState(null)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 
                      flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            ChatGPT
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
            <span className="text-sm text-indigo-600 font-medium">
              Clarity Active
            </span>
          </div>
        </div>
        {lastRawResponse && (
          <button
            onClick={() => setShowComparison(!showComparison)}
            className="px-4 py-2 text-sm bg-indigo-50 text-indigo-600 
                       rounded-lg border border-indigo-200 
                       hover:bg-indigo-100 transition-colors"
          >
            {showComparison ? "Hide comparison" : "See without Clarity"}
          </button>
        )}
      </div>

      {/* Main content */}
      <div className="flex h-[calc(100vh-73px)]">
        {showComparison ? (
          <ComparisonView
            rawResponse={lastRawResponse}
            clarityResponse={lastClarityResponse}
          />
        ) : (
          <ChatInterface
            onClarityResponse={(raw, clarity) => {
              setLastRawResponse(raw)
              setLastClarityResponse(clarity)
            }}
          />
        )}
      </div>
    </div>
  )
}
```

### ClarityCard.jsx

```jsx
import { useState } from "react"

export default function ClarityCard({ content }) {
  const [assumptionsOpen, setAssumptionsOpen] = useState(false)
  const [alternativesOpen, setAlternativesOpen] = useState(false)

  return (
    <div className="bg-white rounded-xl border border-gray-200 
                    overflow-hidden max-w-2xl">
      
      {/* Clarity indicator */}
      <div className="px-4 py-2 bg-indigo-50 border-b 
                      border-indigo-100 flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
        <span className="text-xs font-semibold text-indigo-600 
                         uppercase tracking-wide">
          Clarity
        </span>
      </div>

      {/* Part 1 — Personalised recommendation */}
      <div className="p-5 border-l-4 border-indigo-500">
        {content.part1.user_context?.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-semibold text-gray-400 
                          uppercase tracking-wide mb-2">
              Based on what I know about you
            </p>
            {content.part1.user_context.map((fact, i) => (
              <p key={i} className="text-sm text-gray-600">
                · {fact}
              </p>
            ))}
          </div>
        )}
        <p className="text-base text-gray-900 font-medium leading-relaxed">
          {content.part1.full_text
            ?.split('\n')
            .filter(line => line.startsWith('My recommendation:') || 
                           (!line.startsWith('Based on') && 
                            !line.startsWith('·') && 
                            line.trim()))
            .join('\n')}
        </p>
      </div>

      {/* Part 2 — Assumptions (collapsed) */}
      <div className="border-t border-gray-100">
        <button
          onClick={() => setAssumptionsOpen(!assumptionsOpen)}
          className="w-full px-5 py-3 flex items-center 
                     justify-between text-left hover:bg-gray-50 
                     transition-colors"
        >
          <span className="text-sm font-medium text-gray-700">
            What I assumed
          </span>
          <span className="text-gray-400 text-lg">
            {assumptionsOpen ? '−' : '+'}
          </span>
        </button>
        
        {assumptionsOpen && (
          <div className="px-5 pb-4 space-y-3">
            {content.part2.assumptions?.map((assumption, i) => (
              <div key={i} className="flex gap-3">
                <span className="text-amber-500 font-bold 
                                 mt-0.5 flex-shrink-0">→</span>
                <p className="text-sm text-gray-700">{assumption}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Part 3 — Alternatives (collapsed) */}
      <div className="border-t border-gray-100">
        <button
          onClick={() => setAlternativesOpen(!alternativesOpen)}
          className="w-full px-5 py-3 flex items-center 
                     justify-between text-left hover:bg-gray-50 
                     transition-colors"
        >
          <span className="text-sm font-medium text-gray-700">
            Other options if your situation differs
          </span>
          <span className="text-gray-400 text-lg">
            {alternativesOpen ? '−' : '+'}
          </span>
        </button>
        
        {alternativesOpen && (
          <div className="px-5 pb-4 space-y-3">
            {content.part3.alternatives?.map((alt, i) => (
              <div key={i} className="flex gap-3">
                <span className="text-green-500 font-bold 
                                 mt-0.5 flex-shrink-0">→</span>
                <p className="text-sm text-gray-700">{alt}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

---

## Phase 3 — Testing Scenarios (Day 2 Morning)

Test these exact scenarios in order. Each one demonstrates a different capability.

### Scenario 1 — Basic Clarity activation
```
Input: "What phone should I buy?"
Expected: Clarity activates, three-part structure shown
Check: Part 1 has recommendation, Part 2 has assumptions, 
       Part 3 has alternatives
```

### Scenario 2 — Context from conversation history
```
First message: "I'm a business consultant in Bengaluru 
                and I use Samsung devices"
Second message: "What phone should I buy?"
Expected: Part 1 references consultant role and Samsung 
          ecosystem in "based on what I know about you"
```

### Scenario 3 — Assumption correction
```
After Clarity response about phone:
Input: "Actually my budget is ₹40K not ₹80K"
Expected: Response starts with "Thanks for clarifying"
          Full structure regenerated with new budget
          Badge shows "Updated based on your correction"
```

### Scenario 4 — Recommendation challenge (no capitulation)
```
After Clarity recommends Samsung S25:
Input: "I don't think Samsung is right for me"
Expected: System does NOT immediately agree
          Explains reasoning for recommendation
          Asks what specifically feels wrong
          Does NOT say "you're right, let me change that"
```

### Scenario 5 — No Clarity on factual query
```
Input: "What is the capital of France?"
Expected: Plain response — no Clarity structure
          No three-part format
```

### Scenario 6 — Health domain
```
Input: "Should I take creatine for my workouts?"
Expected: Full Clarity activates
          Assumptions include health conditions
          Alternatives reference different supplement options
```

---

## Phase 4 — Deployment (Day 2 Afternoon)

### Backend — Render

```bash
# Create render.yaml in backend/
cat > render.yaml << EOF
services:
  - type: web
    name: clarity-backend
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn main:app --host 0.0.0.0 --port 10000
    envVars:
      - key: ANTHROPIC_API_KEY
        sync: false
EOF
```

### Frontend — Vercel

```bash
cd frontend
# Update api.js with Render backend URL
vercel deploy
```

---

## Requirements.txt

```
fastapi==0.104.1
uvicorn==0.24.0
anthropic==0.20.0
groq==0.5.0
python-dotenv==1.0.0
pydantic==2.5.0
```

---

## Package.json (Frontend)

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "tailwindcss": "^3.3.0",
    "vite": "^5.0.0"
  }
}
```

---

## Common Issues and Fixes

**Issue: Clarity not activating on expected queries**
Fix: Add more keywords to DECISION_KEYWORDS in activation.py

**Issue: Claude returning extra text outside the three parts**
Fix: Add "Return ONLY the three parts — no other text" to prompt
     and parse the raw_text more aggressively

**Issue: Assumptions are too generic**
Fix: Add specific examples of good vs bad assumptions to the prompt

**Issue: System capitulates when challenged**
Fix: Check COUNTER_REPLY_CHALLENGE_PROMPT — 
     ensure "Do NOT simply agree" instruction is prominent

**Issue: Context not being extracted from history**
Fix: Check format_history function — 
     ensure last 10 messages are being passed correctly

**Issue: CORS errors in frontend**
Fix: Check CORS middleware in main.py — 
     ensure your frontend URL is in allow_origins
```
