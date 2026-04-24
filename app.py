from flask import Flask, request, jsonify, render_template
from groq import Groq
from dotenv import load_dotenv
import json
import os

load_dotenv()

app = Flask(__name__)

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

CHAT_HISTORY_FILE = "chats.json"
LONG_TERM_FILE = "long_term.json"


def load_json_file(filename, default):
    if os.path.exists(filename):
        try:
            with open(filename, "r") as f:
                return json.load(f)
        except:
            return default
    return default


chats = load_json_file(CHAT_HISTORY_FILE, {})
long_term_memory = load_json_file(LONG_TERM_FILE, [])

current_chat_id = "default"

if current_chat_id not in chats:
    chats[current_chat_id] = []


def save_chats():
    with open(CHAT_HISTORY_FILE, "w") as f:
        json.dump(chats, f, indent=2)


def chat_with_ai(prompt):
    conversation = chats[current_chat_id]
    recent_convo = conversation[-10:]

    messages = []

    if long_term_memory:
        memory_text = "\n".join(long_term_memory)
        messages.append({
            "role": "system",
            "content": f"""
        You are a helpful AI assistant.

        IMPORTANT:
        - Keep answers concise and easy to read
        - Use short paragraphs (1–2 lines max)
        - Use bullet points when possible
        - Avoid long walls of text
        - Explain clearly like you're chatting, not writing an essay

        User info:
        {memory_text}
        """
        })

    for msg in recent_convo:
        if msg.startswith("User:"):
            messages.append({"role": "user", "content": msg.replace("User: ", "")})
        else:
            messages.append({"role": "assistant", "content": msg.replace("AI: ", "")})

    messages.append({"role": "user", "content": prompt})

    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=messages
    )

    reply = response.choices[0].message.content

    conversation.append(f"User: {prompt}")
    conversation.append(f"AI: {reply}")

    chats[current_chat_id] = conversation
    save_chats()

    return reply


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/chat", methods=["POST"])
def chat():
    user_input = request.json.get("message")

    if user_input.lower().startswith("remember:"):
        fact = user_input.replace("remember:", "").strip()
        long_term_memory.append(fact)

        with open(LONG_TERM_FILE, "w") as f:
            json.dump(long_term_memory, f, indent=2)

        return jsonify({"reply": "Memory saved!"})

    reply = chat_with_ai(user_input)
    return jsonify({"reply": reply})


@app.route("/get_messages")
def get_messages():
    return jsonify(chats.get(current_chat_id, []))


if __name__ == "__main__":
    app.run(debug=True)
