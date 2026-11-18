"""Part 2: the same tool on the sheet's side, as an MCP server.  Run: python mcp_server.py
The steps are in README.md."""
import csv, io, socket
from typing import Annotated
import requests
from fastmcp import FastMCP

SHEET = "https://docs.google.com/spreadsheets/d/1Kg6T-dJWaYx_JCPiRk3u0nBuAQcsCVRDPj1NFKP4WzM/gviz/tq?tqx=out:csv&headers=0&gid=368290478"

mcp = FastMCP("100x curriculum")

# Step 1 & 2. Move get_lecture here from tool_call.py, put @mcp.tool above it, and add docstring and type hint.
@mcp.tool
def get_lecture(number: Annotated[int, "The lecture or session number, from 1 to 19."]) -> dict:
    """Get the date, title, type, and tools for a lecture, class, or session of the 100xEngineers Cohort 8 course (from 1 to 19). Only use this for 100xEngineers Cohort 8 lectures."""
    for row in csv.reader(io.StringIO(requests.get(SHEET).text)):
        if row[1].startswith(f"{number}. "):
            return {"date": row[0], "title": row[1], "type": row[2], "tools": row[3]}
    return {"error": f"There is no lecture {number}. Lectures run from 1 to 19."}

@mcp.tool
def get_book(number: Annotated[int, "The book number on my reading list, from 1 to 5."]) -> dict:
    """Get the title, author, topic, and reading status of a book from my personal reading list by its book number (1 to 5)."""
    for row in csv.reader(open("books.csv")):
        if row[0] == str(number):
            return {"number": row[0], "title": row[1], "author": row[2], "topic": row[3], "status": row[4]}
    return {"error": f"There is no book {number}. Books run from 1 to 5."}


# Any app can now reach it at http://localhost:8000/mcp
if __name__ == "__main__":
    if socket.socket().connect_ex(("127.0.0.1", 8000)) == 0:
        raise SystemExit("Port 8000 is already in use, probably by a server you started earlier. "
                         "Stop it with Ctrl+C in its terminal, or run: kill $(lsof -t -i:8000)")
    mcp.run(transport="http", port=8000)
