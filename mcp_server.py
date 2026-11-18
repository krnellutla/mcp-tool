"""MCP server exposing Netflix titles and 2026 trending movies tools. Run: python mcp_server.py"""
import csv, socket
from typing import Annotated
from fastmcp import FastMCP

mcp = FastMCP("Netflix and Trending Movies")

@mcp.tool
def get_netflix_show(title: Annotated[str, "Part or all of the Netflix movie or TV show title to look up."]) -> dict:
    """Search the Netflix titles dataset by title to get type (Movie or TV Show), director, release year, rating, duration, genres, and description."""
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

@mcp.tool
def get_trending_movie(title: Annotated[str, "Part or all of the 2026 trending movie title to search for."]) -> dict:
    """Search the 2026 trending movies dataset by movie title to get rank, release date, popularity, vote average, and overview."""
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

@mcp.tool
def get_top_trending_movies(count: Annotated[int, "How many top trending movies to return, from 1 to 10."]) -> dict:
    """Get the top N trending movies of 2026 sorted by popularity rank (from 1 to 10)."""
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


# Any app can now reach it at http://localhost:8000/mcp
if __name__ == "__main__":
    if socket.socket().connect_ex(("127.0.0.1", 8000)) == 0:
        raise SystemExit("Port 8000 is already in use, probably by a server you started earlier. "
                         "Stop it with Ctrl+C in its terminal, or run: kill $(lsof -t -i:8000)")
    mcp.run(transport="http", port=8000)
