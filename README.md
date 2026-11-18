# Netflix & 2026 Trending Movies MCP Explorer

A simple tool-calling script, FastMCP server, and Next.js web app built on two local CSV datasets inside `data/`:

- `data/netflix_titles.csv` — Netflix movies and TV shows catalog
- `data/Treanding_movies_26.csv` — 2026 trending movies ranked by popularity

## Setup

1. Create a Python virtual environment and install dependencies:
   ```bash
   python3 -m venv .venv
   .venv/bin/pip install -r requirements.txt
   ```
2. Create a `.env` file in the project root with your Groq API key (optional for direct MCP calls, required for AI answers):
   ```env
   GROQ_API_KEY=your_key_here
   ```

## Part 1: Python Tool Calling (`tool_call.py`)

`tool_call.py` defines three dataset lookup functions and their tool cards (`netflix_card`, `trending_card`, `top_trending_card`):

- `get_netflix_show(title)` — search `data/netflix_titles.csv` by title
- `get_trending_movie(title)` — search `data/Treanding_movies_26.csv` by movie title
- `get_top_trending_movies(count)` — return the top `1` to `10` trending movies of 2026

Run it locally:

```bash
.venv/bin/python tool_call.py
.venv/bin/python tool_call.py "Show me the top 3 trending movies of 2026."
```

### Tool Card Tests

| Question | Should it ask for a tool? | Did it? |
|---|---|---|
| What is the Netflix show Blood & Water about? | Yes | Yes |
| What is the release date and vote average of Project Hail Mary in the 2026 trending movies dataset? | Yes | Yes |
| Show me the top 3 trending movies of 2026. | Yes | Yes |
| What is a JSON file? | No | No |
| Who directed The Dark Knight in 2008? | No | No |

## Part 2: FastMCP Server (`mcp_server.py`)

`mcp_server.py` exposes the same three functions as MCP tools using `@mcp.tool` and `Annotated` parameter descriptions.

Run locally:

```bash
.venv/bin/python mcp_server.py
.venv/bin/fastmcp list http://localhost:8000/mcp --input-schema
.venv/bin/fastmcp call http://localhost:8000/mcp get_netflix_show title="Blood & Water"
```

Deployed MCP Server:

- **Live MCP URL:** https://tinkeryard.fastmcp.app/mcp
- **GitHub Repository:** https://github.com/krnellutla/mcp-tool

Test the live server:

```bash
.venv/bin/fastmcp list https://tinkeryard.fastmcp.app/mcp --auth none
.venv/bin/fastmcp call https://tinkeryard.fastmcp.app/mcp get_netflix_show title="Blood & Water" --auth none
.venv/bin/fastmcp call https://tinkeryard.fastmcp.app/mcp get_trending_movie title="Project Hail Mary" --auth none
.venv/bin/fastmcp call https://tinkeryard.fastmcp.app/mcp get_top_trending_movies count=3 --auth none
```

## Part 3: Next.js Web App (Vercel-Ready)

The root Next.js app (`app/page.js`, `app/api/mcp/route.js`) connects to the deployed MCP server over Streamable HTTP:

- **Left pane:** Ask AI questions with Groq + MCP tool cards, or run individual MCP tools directly.
- **Right pane:** Displays structured result cards, raw JSON output from the MCP server, and live tool schemas (`tools/list`).

Run locally:

```bash
npm install
npm run dev
```

Deploy on Vercel by importing `https://github.com/krnellutla/mcp-tool`:

- Optional environment variable: `MCP_SERVER_URL` (defaults to `https://tinkeryard.fastmcp.app/mcp`)
- Optional environment variable: `GROQ_API_KEY` (enables the Ask AI pane)
