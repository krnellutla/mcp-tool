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

def get_netflix_show(title):
    matches = []
    with open("data/netflix_titles.csv", encoding="utf-8") as f:
        for row in csv.reader(f):
            if row[0] == "show_id":
                continue
            if title.lower() in row[2].lower():
                matches.append({
                    "show_id": row[0],
                    "type": row[1],
                    "title": row[2],
                    "director": row[3],
                    "release_year": row[7],
                    "rating": row[8],
                    "duration": row[9],
                    "listed_in": row[10],
                    "description": row[11],
                })
                if len(matches) == 5:
                    break
    if matches:
        return {"results": matches}
    return {"error": f"No Netflix show or movie found matching '{title}'."}

def get_trending_movie(title):
    matches = []
    with open("data/Treanding_movies_26.csv", encoding="utf-8") as f:
        for row in csv.reader(f):
            if row[1] == "id":
                continue
            if title.lower() in row[2].lower():
                matches.append({
                    "rank": int(row[0]) + 1,
                    "id": row[1],
                    "title": row[2],
                    "release_date": row[6],
                    "popularity": row[5],
                    "vote_average": row[10],
                    "overview": row[4],
                })
                if len(matches) == 5:
                    break
    if matches:
        return {"results": matches}
    return {"error": f"No trending 2026 movie found matching '{title}'."}

def get_top_trending_movies(count):
    if count < 1:
        count = 1
    if count > 10:
        count = 10
    movies = []
    with open("data/Treanding_movies_26.csv", encoding="utf-8") as f:
        for row in csv.reader(f):
            if row[1] == "id":
                continue
            movies.append({
                "rank": int(row[0]) + 1,
                "title": row[2],
                "release_date": row[6],
                "popularity": row[5],
                "vote_average": row[10],
                "overview": row[4],
            })
            if len(movies) == count:
                break
    return {"movies": movies}

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

netflix_card = {"type": "function", "function": {
    "name": "get_netflix_show",
    "description": "Search the Netflix titles dataset by title to get type (Movie or TV Show), director, release year, rating, duration, genres, and description.",
    "parameters": {"type": "object",
                   "properties": {"title": {"type": "string",
                                            "description": "Part or all of the Netflix movie or TV show title to look up."}},
                   "required": ["title"]},
}}

trending_card = {"type": "function", "function": {
    "name": "get_trending_movie",
    "description": "Search the 2026 trending movies dataset by movie title to get rank, release date, popularity, vote average, and overview.",
    "parameters": {"type": "object",
                   "properties": {"title": {"type": "string",
                                            "description": "Part or all of the 2026 trending movie title to search for."}},
                   "required": ["title"]},
}}

top_trending_card = {"type": "function", "function": {
    "name": "get_top_trending_movies",
    "description": "Get the top N trending movies of 2026 sorted by popularity rank (from 1 to 10).",
    "parameters": {"type": "object",
                   "properties": {"count": {"type": "integer",
                                            "description": "How many top trending movies to return, from 1 to 10."}},
                   "required": ["count"]},
}}

all_cards = [card, netflix_card, trending_card, top_trending_card]
reply = ask_model(messages, all_cards)

# Step 3, 4, 5. Loop while the model asks for a tool, run it, and hand the result back.
while reply.get("tool_calls"):
    messages.append(reply)
    for call in reply["tool_calls"]:
        name = call["function"]["name"]
        args = json.loads(call["function"]["arguments"])
        print("The model asked for:", name, args)
        if name == "get_lecture":
            result = get_lecture(**args)
        elif name == "get_netflix_show":
            result = get_netflix_show(**args)
        elif name == "get_trending_movie":
            result = get_trending_movie(**args)
        elif name == "get_top_trending_movies":
            result = get_top_trending_movies(**args)
        messages.append({"role": "tool", "tool_call_id": call["id"], "content": json.dumps(result)})
    reply = ask_model(messages, all_cards)

print("\n" + reply["content"])
