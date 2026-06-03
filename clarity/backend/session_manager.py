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
