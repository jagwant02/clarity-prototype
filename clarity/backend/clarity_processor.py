import os
from dotenv import load_dotenv
from groq import Groq
from prompts import (
    RAW_RESPONSE_PROMPT,
    CONTEXT_EXTRACTION_PROMPT, 
    CLARITY_GENERATION_PROMPT,
    COUNTER_REPLY_CORRECTION_PROMPT,
    COUNTER_REPLY_CHALLENGE_PROMPT,
    COUNTER_REPLY_NEW_CONTEXT_PROMPT,
    COUNTER_REPLY_FOLLOWUP_PROMPT
)

load_dotenv()
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def call_groq(prompt: str, max_tokens: int = 1000) -> str:
    chat_completion = groq_client.chat.completions.create(
        messages=[{"role": "user", "content": prompt}],
        model="llama-3.3-70b-versatile",
        max_tokens=max_tokens
    )
    return chat_completion.choices[0].message.content

def call_llm(prompt: str, max_tokens: int = 1000) -> str:
    # Use Groq exclusively
    return call_groq(prompt, max_tokens)

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
    result = call_llm(prompt, max_tokens=500)
    
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
    
    clarity_text = call_llm(prompt)
    
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
        response_text = call_llm(prompt)
        parsed = parse_clarity_output(response_text, session.get("user_context", []))
        return {
            "type": "correction_update",
            "show_badge": True,
            "badge_text": "Updated based on your correction",
            **parsed
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
        response_text = call_llm(prompt)
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
        response_text = call_llm(prompt)
        parsed = parse_clarity_output(response_text, session.get("user_context", []))
        return {
            "type": "context_update",
            "show_badge": True,
            "badge_text": "Updated with new information",
            **parsed
        }
    
    else:  # follow_up_question
        prompt = COUNTER_REPLY_FOLLOWUP_PROMPT.format(
            previous_clarity=last_clarity.get("raw_text", ""),
            user_message=message
        )
        response_text = call_llm(prompt)
        return {
            "type": "follow_up",
            "text": response_text,
            "show_badge": False
        }
