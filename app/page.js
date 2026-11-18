"use client";

import { useEffect, useState } from "react";

const TOOL_CONFIG = {
  get_netflix_show: {
    label: "Search Netflix Titles",
    fieldLabel: "Movie or TV show title",
    helper: "Enter part or all of a title (for example: Blood & Water, Stranger Things, Inception).",
    inputName: "title",
    inputType: "text",
    defaultValue: "Blood & Water",
  },
  get_trending_movie: {
    label: "Search 2026 Trending Movie",
    fieldLabel: "2026 movie title",
    helper: "Enter part or all of a movie title (for example: Project Hail Mary, Spider-Man, Odyssey).",
    inputName: "title",
    inputType: "text",
    defaultValue: "Project Hail Mary",
  },
  get_top_trending_movies: {
    label: "Top Trending 2026 Movies",
    fieldLabel: "How many movies (1 to 10)",
    helper: "Enter a whole number from 1 to 10.",
    inputName: "count",
    inputType: "number",
    defaultValue: "5",
  },
  get_lecture: {
    label: "Course Lecture Lookup",
    fieldLabel: "Lecture number (1 to 19)",
    helper: "Enter a lecture number from 1 to 19.",
    inputName: "number",
    inputType: "number",
    defaultValue: "12",
  },
};

const SAMPLE_QUESTIONS = [
  "What is the Netflix show Blood & Water about?",
  "What is the release date and vote average of Project Hail Mary?",
  "Show me the top 3 trending movies of 2026.",
  "When is Lecture 12 of 100xEngineers Cohort 8?",
];

export default function HomePage() {
  const [mcpUrl, setMcpUrl] = useState("Loading...");
  const [tools, setTools] = useState([]);
  const [toolsError, setToolsError] = useState("");

  const [selectedTool, setSelectedTool] = useState("get_netflix_show");
  const [toolInput, setToolInput] = useState("Blood & Water");
  const [toolLoading, setToolLoading] = useState(false);
  const [toolError, setToolError] = useState("");
  const [toolResult, setToolResult] = useState(null);

  const [question, setQuestion] = useState(SAMPLE_QUESTIONS[0]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiReply, setAiReply] = useState(null);

  useEffect(() => {
    async function loadTools() {
      try {
        const res = await fetch("/api/mcp");
        const data = await res.json();
        setMcpUrl(data.mcpUrl || "");
        if (!res.ok) {
          setToolsError(data.error || "Could not load MCP tool cards.");
          return;
        }
        setTools(data.tools || []);
      } catch (err) {
        setToolsError(err.message || "Could not load MCP tool cards.");
      }
    }
    loadTools();
  }, []);

  function chooseTool(toolName) {
    setSelectedTool(toolName);
    setToolInput(TOOL_CONFIG[toolName].defaultValue);
    setToolError("");
    setToolResult(null);
  }

  async function handleToolSubmit(event) {
    event.preventDefault();
    setToolLoading(true);
    setToolError("");
    setToolResult(null);

    const cfg = TOOL_CONFIG[selectedTool];
    const args =
      cfg.inputType === "number"
        ? { [cfg.inputName]: Number(toolInput) }
        : { [cfg.inputName]: toolInput.trim() };

    try {
      const res = await fetch("/api/mcp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "call_tool",
          name: selectedTool,
          arguments: args,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setToolError(data.error || "MCP tool call failed.");
      } else {
        setToolResult(data.result);
      }
    } catch (err) {
      setToolError(err.message || "Network error calling MCP server.");
    } finally {
      setToolLoading(false);
    }
  }

  async function handleAskAi(event) {
    event.preventDefault();
    setAiLoading(true);
    setAiError("");
    setAiReply(null);

    try {
      const res = await fetch("/api/mcp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ask_ai",
          question,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAiError(data.error || "AI request failed.");
      } else {
        setAiReply(data);
      }
    } catch (err) {
      setAiError(err.message || "Network error calling AI route.");
    } finally {
      setAiLoading(false);
    }
  }

  const activeConfig = TOOL_CONFIG[selectedTool];

  return (
    <>
      <header className="page-header">
        <h1>Movie &amp; Course MCP Explorer</h1>
        <p>
          Next.js frontend connected to your FastMCP server (<code>{mcpUrl}</code>) for{" "}
          <code>netflix_titles.csv</code>, <code>Treanding_movies_26.csv</code>, and course lectures.
        </p>
      </header>

      <main className="page-main">
        <section className="panel" aria-labelledby="direct-mcp-heading">
          <h2 id="direct-mcp-heading">1. Call MCP Tools Directly</h2>
          <p className="panel-intro">
            Pick a tool, type an argument, and call your MCP server directly over HTTP.
          </p>

          <div className="button-row" role="group" aria-label="Choose MCP tool">
            {Object.entries(TOOL_CONFIG).map(([name, cfg]) => (
              <button
                key={name}
                type="button"
                className={selectedTool === name ? "btn-active" : ""}
                aria-pressed={selectedTool === name}
                onClick={() => chooseTool(name)}
              >
                {cfg.label}
              </button>
            ))}
          </div>

          <search>
            <form onSubmit={handleToolSubmit} aria-labelledby="direct-mcp-heading">
              <div className="field">
                <label htmlFor="tool-arg-input">{activeConfig.fieldLabel}</label>
                <input
                  id="tool-arg-input"
                  name={activeConfig.inputName}
                  type={activeConfig.inputType}
                  min={activeConfig.inputType === "number" ? 1 : undefined}
                  max={selectedTool === "get_top_trending_movies" ? 10 : selectedTool === "get_lecture" ? 19 : undefined}
                  value={toolInput}
                  onChange={(e) => setToolInput(e.target.value)}
                  aria-describedby="tool-arg-help"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                />
                <span id="tool-arg-help" className="hint">
                  {activeConfig.helper}
                </span>
              </div>

              <button type="submit" disabled={toolLoading}>
                {toolLoading ? "Calling MCP server..." : `Run ${selectedTool}`}
              </button>
            </form>
          </search>

          <div role="status" aria-live="polite">
            {toolError && (
              <div className="status-box status-error">
                <strong>Error:</strong> {toolError}
              </div>
            )}

            {toolResult && toolResult.error && (
              <div className="status-box status-error">
                <strong>Not found:</strong> {toolResult.error}
              </div>
            )}

            {toolResult && !toolResult.error && (
              <div className="results-grid">
                {Array.isArray(toolResult.results) &&
                  toolResult.results.map((item, idx) => (
                    <article className="result-card" key={item.id || item.show_id || idx}>
                      <h3>{item.title}</h3>
                      {item.type && (
                        <p className="meta-line">
                          {item.type} · {item.release_year} · {item.rating || "NR"} · {item.duration}
                        </p>
                      )}
                      {item.listed_in && <p className="meta-line">Genres: {item.listed_in}</p>}
                      {item.director && <p className="meta-line">Director: {item.director}</p>}
                      {item.rank && (
                        <p className="meta-line">
                          Rank #{item.rank} · Release: {item.release_date} · Popularity: {item.popularity} · Vote Avg:{" "}
                          {item.vote_average}
                        </p>
                      )}
                      <p>{item.description || item.overview}</p>
                    </article>
                  ))}

                {Array.isArray(toolResult.movies) &&
                  toolResult.movies.map((movie) => (
                    <article className="result-card" key={movie.rank}>
                      <h3>
                        #{movie.rank} — {movie.title}
                      </h3>
                      <p className="meta-line">
                        Release: {movie.release_date} · Popularity: {movie.popularity} · Vote Avg: {movie.vote_average}
                      </p>
                      <p>{movie.overview}</p>
                    </article>
                  ))}

                {toolResult.date && (
                  <article className="result-card">
                    <h3>{toolResult.title}</h3>
                    <p className="meta-line">
                      Date: {toolResult.date} · Type: {toolResult.type}
                    </p>
                    <p>Tools: {toolResult.tools}</p>
                  </article>
                )}

                <div className="code-wrap">
                  <div className="code-label" id="raw-mcp-json-label">
                    Raw MCP Tool Output
                  </div>
                  <pre role="region" aria-labelledby="raw-mcp-json-label" tabIndex={0}>
                    <code>{JSON.stringify(toolResult, null, 2)}</code>
                  </pre>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="panel" aria-labelledby="ai-assistant-heading">
          <h2 id="ai-assistant-heading">2. Ask AI (Groq + MCP Tool Cards)</h2>
          <p className="panel-intro">
            The model reads your MCP tool cards, picks the right tool, runs it on the MCP server, and writes an answer.
          </p>

          <div className="button-row" role="group" aria-label="Sample questions">
            {SAMPLE_QUESTIONS.map((sample) => (
              <button key={sample} type="button" onClick={() => setQuestion(sample)}>
                {sample}
              </button>
            ))}
          </div>

          <search>
            <form onSubmit={handleAskAi} aria-labelledby="ai-assistant-heading">
              <div className="field">
                <label htmlFor="ai-question-input">Your question</label>
                <input
                  id="ai-question-input"
                  name="question"
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  aria-describedby="ai-question-help"
                  required
                />
                <span id="ai-question-help" className="hint">
                  Requires GROQ_API_KEY in .env (local) or Vercel Environment Variables.
                </span>
              </div>

              <button type="submit" disabled={aiLoading}>
                {aiLoading ? "Thinking with MCP..." : "Ask AI"}
              </button>
            </form>
          </search>

          <div role="status" aria-live="polite">
            {aiError && (
              <div className="status-box status-error">
                <strong>Notice:</strong> {aiError}
              </div>
            )}

            {aiReply && (
              <div className="results-grid">
                {aiReply.toolCalls && aiReply.toolCalls.length > 0 && (
                  <div className="status-box">
                    <strong>MCP tools called:</strong>{" "}
                    {aiReply.toolCalls.map((c) => `${c.name}(${JSON.stringify(c.args)})`).join(", ")}
                  </div>
                )}
                <div className="answer-box">{aiReply.answer}</div>
              </div>
            )}
          </div>
        </section>

        <section className="panel" aria-labelledby="cards-heading">
          <h2 id="cards-heading">3. Live MCP Tool Cards ({tools.length})</h2>
          <p className="panel-intro">
            Fetched live via <code>tools/list</code> from your FastMCP server.
          </p>

          {toolsError && (
            <div className="status-box status-error" role="status">
              <strong>Error:</strong> {toolsError}
            </div>
          )}

          <div className="results-grid">
            {tools.map((tool) => (
              <article className="result-card" key={tool.name}>
                <h3>{tool.name}</h3>
                <p>{tool.description}</p>
                <div className="code-wrap">
                  <pre role="region" aria-label={`Schema for ${tool.name}`} tabIndex={0}>
                    <code>{JSON.stringify(tool.inputSchema, null, 2)}</code>
                  </pre>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="page-footer">
        <p>Built with Next.js App Router + FastMCP ({mcpUrl})</p>
      </footer>
    </>
  );
}
