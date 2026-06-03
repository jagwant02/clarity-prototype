from flask import Flask, request, jsonify
from flask_cors import CORS
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

app = Flask(__name__)
CORS(app)

@app.route("/chat", methods=["POST"])
def chat():
    data = request.json
    message = data.get("message")
    session_id = data.get("session_id", "default")
    
    session = get_session(session_id)
    
    # Add user message to history
    add_message(session_id, "user", message)
    
    # Check if this is a follow-up to a Clarity response
    is_follow_up = (
        session.get("clarity_active") and 
        session.get("last_clarity_output") is not None
    )
    
    if is_follow_up:
        # Detect type of follow-up
        reply_type = detect_reply_type(
            message,
            session.get("last_clarity_output")
        )
        
        counter_response = handle_counter_reply(
            message,
            reply_type,
            session
        )
        
        add_message(
            session_id, 
            "assistant", 
            counter_response["text"]
        )
        
        return jsonify({
            "clarity_activated": True,
            "response_type": "counter_reply",
            "reply_type": reply_type,
            "content": counter_response
        })
    
    # New query — check if Clarity should activate
    activate = should_activate_clarity(message)
    
    # Generate raw response
    raw_response = generate_raw_response(
        message,
        session["conversation_history"]
    )
    
    if not activate:
        add_message(session_id, "assistant", raw_response)
        update_session(session_id, {
            "clarity_active": False,
            "last_clarity_output": None
        })
        return jsonify({
            "clarity_activated": False,
            "response_type": "plain",
            "content": {"text": raw_response}
        })
    
    # Extract user context from history
    user_context = extract_user_context(
        message,
        session["conversation_history"]
    )
    
    # Generate Clarity output
    clarity_output = generate_clarity_output(
        raw_response,
        user_context,
        message
    )
    
    # Update session
    update_session(session_id, {
        "clarity_active": True,
        "last_clarity_output": clarity_output,
        "user_context": user_context
    })
    
    add_message(
        session_id, 
        "assistant", 
        clarity_output.get("raw_text", "")
    )
    
    return jsonify({
        "clarity_activated": True,
        "response_type": "clarity",
        "raw_response": raw_response,
        "content": clarity_output
    })

@app.route("/session/<session_id>", methods=["GET"])
def get_session_state(session_id):
    return jsonify(get_session(session_id))

@app.route("/session/<session_id>", methods=["DELETE"])
def delete_session(session_id):
    clear_session(session_id)
    return jsonify({"status": "cleared"})

@app.route("/session/new", methods=["POST"])
def new_session():
    session_id = create_session()
    return jsonify({"session_id": session_id})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000, debug=True)
