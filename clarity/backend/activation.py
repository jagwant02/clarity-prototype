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
