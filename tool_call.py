"""Part 1: your first tool call.  Run: python tool_call.py
The steps are in README.md. Each one adds a few lines to the bottom of this file."""
import csv, io, json, os, sys
import requests
from dotenv import load_dotenv

load_dotenv()
if not os.environ.get("GROQ_API_KEY"):
    raise SystemExit("No GROQ_API_KEY found. Make a file called .env next to tool_call.py with one line: GROQ_API_KEY=your key")

# ---------- THE SHEET (given) ----------
# Plain code, no model: one lecture of the course sheet, looked up by its number.
SHEET = "https://docs.google.com/spreadsheets/d/1Kg6T-dJWaYx_JCPiRk3u0nBuAQcsCVRDPj1NFKP4WzM/gviz/tq?tqx=out:csv&headers=0&gid=368290478"

def get_lecture(number):
    for row in csv.reader(io.StringIO(requests.get(SHEET).text)):
        if row[1].startswith(f"{number}. "):
            return {"date": row[0], "title": row[1], "type": row[2], "tools": row[3]}
    return {"error": f"There is no lecture {number}. Lectures run from 1 to 19."}

def get_book(number):
    for row in csv.reader(open("books.csv")):
        if row[0] == str(number):
            return {"number": row[0], "title": row[1], "author": row[2], "topic": row[3], "status": row[4]}
    return {"error": f"There is no book {number}. Books run from 1 to 5."}

# ---------- THE MODEL (given) ----------
# One message to Groq, one message back. Nothing is added that you do not send.
def ask_model(messages, tools=None):
    body = {"model": "openai/gpt-oss-120b", "messages": messages}
    if tools:
        body["tools"] = tools
    r = requests.post("https://api.groq.com/openai/v1/chat/completions",
                      headers={"Authorization": "Bearer " + os.environ["GROQ_API_KEY"]}, json=body)
    r.raise_for_status()
    return r.json()["choices"][0]["message"]

# ---------- YOUR SERVER (yours to write) ----------
# python tool_call.py                      asks the question below
# python tool_call.py "What is an API?"    asks your own
question = " ".join(sys.argv[1:]) or "When is Lecture 12 of 100xEngineers Cohort 8, and what is it about?"
messages = [{"role": "user", "content": question}]

# Step 2. The card: fill in the two empty strings.
card = {"type": "function", "function": {
    "name": "get_lecture",
    "description": "Get the date, title, type, and tools for a lecture, class, or session of the 100xEngineers Cohort 8 course (from 1 to 19). Only use this for 100xEngineers Cohort 8 lectures.",  # Use it when
    "parameters": {"type": "object",
                   "properties": {"number": {"type": "integer",
                                             "description": "The lecture or session number, from 1 to 19."}},  # It needs
                   "required": ["number"]},
}}

book_card = {"type": "function", "function": {
    "name": "get_book",
    "description": "Get the title, author, topic, and reading status of a book from my personal reading list by its book number (1 to 5).",
    "parameters": {"type": "object",
                   "properties": {"number": {"type": "integer",
                                             "description": "The book number on my reading list, from 1 to 5."}},
                   "required": ["number"]},
}}

reply = ask_model(messages, [card, book_card])

# Step 3, 4, 5. Loop while the model asks for a tool, run it, and hand the result back.
while reply.get("tool_calls"):
    messages.append(reply)
    for call in reply["tool_calls"]:
        name = call["function"]["name"]
        args = json.loads(call["function"]["arguments"])
        print("The model asked for:", name, args)
        if name == "get_lecture":
            result = get_lecture(**args)
        elif name == "get_book":
            result = get_book(**args)
        messages.append({"role": "tool", "tool_call_id": call["id"], "content": json.dumps(result)})
    reply = ask_model(messages, [card, book_card])

print("\n" + reply["content"])
