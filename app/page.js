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
    label: "Search 2026 Movie",
    fieldLabel: "2026 movie title",
    helper: "Enter part or all of a movie title (for example: Project Hail Mary, Spider-Man, Odyssey).",
    inputName: "title",
    inputType: "text",
    defaultValue: "Project Hail Mary",
  },
  get_top_trending_movies: {
    label: "Top 2026 Movies",
    fieldLabel: "How many movies (1 to 10)",
    helper: "Enter a whole number from 1 to 10.",
    inputName: "count",
    inputType: "number",
    defaultValue: "5",
  },
};

const HERO_DATASETS = [
  {
    title: "Netflix Catalog",
    meta: "netflix_titles.csv · 8,800+ movies & shows",
    tool: "get_netflix_show",
    value: "Blood & Water",
    question: "What is the Netflix show Blood & Water about?",
  },
  {
    title: "Search 2026 Movies",
    meta: "Treanding_movies_26.csv · Search any 2026 movie",
    tool: "get_trending_movie",
    value: "Project Hail Mary",
    question: "What is the release date and vote average of Project Hail Mary?",
  },
  {
    title: "Top 2026 Trending",
    meta: "Treanding_movies_26.csv · Ranked by popularity",
    tool: "get_top_trending_movies",
    value: "3",
    question: "Show me the top 3 trending movies of 2026.",
  },
];

const SAMPLE_QUESTIONS = [
  "What is the Netflix show Blood & Water about?",
  "What is the release date and vote average of Project Hail Mary?",
  "Show me the top 3 trending movies of 2026.",
  "Who directed the Netflix movie Dick Johnson Is Dead and what is its duration?",
];

export default function HomePage() {
  const [mcpUrl, setMcpUrl] = useState("Connecting...");
  const [tools, setTools] = useState([]);
  const [toolsLoading, setToolsLoading] = useState(true);
  const [toolsError, setToolsError] = useState("");

  // Left pane: AI Answering state
  const [question, setQuestion] = useState(SAMPLE_QUESTIONS[0]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiReply, setAiReply] = useState(null);

  // Left pane: Direct MCP Tool Runner state
  const [selectedTool, setSelectedTool] = useState("get_netflix_show");
  const [toolInput, setToolInput] = useState("Blood & Water");
  const [toolLoading, setToolLoading] = useState(false);
  const [toolError, setToolError] = useState("");
  const [directNotice, setDirectNotice] = useState("");

  // Right pane: Unified Output Inspector synced with latest AI or Direct run
  const [activeOutput, setActiveOutput] = useState(null);

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
      } finally {
        setToolsLoading(false);
      }
    }
    loadTools();
  }, []);

  function chooseTool(toolName) {
    setSelectedTool(toolName);
    setToolInput(TOOL_CONFIG[toolName].defaultValue);
    setToolError("");
    setDirectNotice("");
  }

  async function runDirectTool(toolName, rawValue) {
    setToolLoading(true);
    setToolError("");
    setDirectNotice("");

    const cfg = TOOL_CONFIG[toolName];
    const args =
      cfg.inputType === "number"
        ? { [cfg.inputName]: Number(rawValue) }
        : { [cfg.inputName]: String(rawValue).trim() };

    try {
      const res = await fetch("/api/mcp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "call_tool",
          name: toolName,
          arguments: args,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setToolError(data.error || "MCP tool call failed.");
      } else {
        setDirectNotice(`Ran ${toolName}(${JSON.stringify(args)}) — see output on the right.`);
        setActiveOutput({
          source: `Direct Tool: ${toolName}`,
          items: [{ name: toolName, args, result: data.result }],
        });
      }
    } catch (err) {
      setToolError(err.message || "Network error calling MCP server.");
    } finally {
      setToolLoading(false);
    }
  }

  async function handleToolSubmit(event) {
    event.preventDefault();
    await runDirectTool(selectedTool, toolInput);
  }

  async function handleDatasetPreset(preset) {
    setQuestion(preset.question);
    setSelectedTool(preset.tool);
    setToolInput(preset.value);
    await runDirectTool(preset.tool, preset.value);
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
        setActiveOutput({
          source: "Synced with AI Answer",
          items: data.toolCalls || [],
          noToolsMessage:
            "The model answered directly from general knowledge without calling an MCP tool.",
        });
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
      <header className="hero-banner">
        <div className="hero-inner">
          <div className="hero-top-row">
            <span className="hero-eyebrow">Movies &amp; Shows · FastMCP Workspace</span>
            <div className="status-badge" role="status">
              <span
                className={
                  toolsError
                    ? "status-dot offline"
                    : toolsLoading
                    ? "status-dot"
                    : "status-dot online"
                }
                aria-hidden="true"
              />
              <span>
                {toolsError
                  ? "MCP Offline"
                  : toolsLoading
                  ? "Connecting to MCP..."
                  : `MCP Online · ${tools.length} Tools Ready`}
              </span>
              {mcpUrl && <span className="status-url">{mcpUrl}</span>}
            </div>
          </div>

          <h1>Netflix &amp; 2026 Movies MCP Explorer</h1>
          <p className="hero-subtitle">
            Ask questions or run tools on the left to read answers, and inspect live structured
            MCP data cards and JSON payloads on the right. Click any dataset below to try it now:
          </p>

          <div className="hero-datasets" role="group" aria-label="Quick dataset presets">
            {HERO_DATASETS.map((ds) => (
              <button
                key={ds.title}
                type="button"
                className="hero-dataset-btn"
                onClick={() => handleDatasetPreset(ds)}
              >
                <span className="hero-dataset-title">{ds.title}</span>
                <span className="hero-dataset-meta">{ds.meta}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="workspace-grid">
        {/* LEFT COLUMN: Answering & Query Pane */}
        <div className="pane-left">
          <section className="panel" aria-labelledby="ai-assistant-heading">
            <h2 id="ai-assistant-heading">Ask AI (Answering Pane)</h2>
            <p className="panel-intro">
              The model reads your MCP tool cards, calls the matching tool, and writes the answer here.
            </p>

            <div className="button-row" role="group" aria-label="Sample questions">
              {SAMPLE_QUESTIONS.map((sample) => (
                <button
                  key={sample}
                  type="button"
                  className="chip-btn"
                  onClick={() => setQuestion(sample)}
                >
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
                <article className="answer-box">
                  <h3>AI Answer</h3>
                  {aiReply.toolCalls && aiReply.toolCalls.length > 0 && (
                    <div className="tool-tag-list">
                      {aiReply.toolCalls.map((c, index) => (
                        <span className="tool-tag" key={`${c.name}-${index}`}>
                          {c.name}({JSON.stringify(c.args)})
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="answer-text">{aiReply.answer}</div>
                </article>
              )}
            </div>
          </section>

          <section className="panel" aria-labelledby="direct-mcp-heading">
            <h2 id="direct-mcp-heading">Call MCP Tools Directly</h2>
            <p className="panel-intro">
              Test individual tools directly over HTTP (no Groq key needed) and view output on the right.
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
                    max={selectedTool === "get_top_trending_movies" ? 10 : undefined}
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
              {directNotice && <div className="status-box">{directNotice}</div>}
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN: MCP Output & Tool Cards Inspector */}
        <div className="pane-right">
          <section className="panel" aria-labelledby="output-heading">
            <div className="output-header">
              <h2 id="output-heading">MCP Output</h2>
              {activeOutput && <span className="source-pill">{activeOutput.source}</span>}
            </div>
            <p className="panel-intro">
              Structured cards and raw JSON returned by the FastMCP server for your latest request.
            </p>

            <div role="status" aria-live="polite">
              {!activeOutput && (
                <div className="empty-output">
                  Ask a question or run a tool on the left (or click a dataset in the hero) to inspect
                  structured MCP results here.
                </div>
              )}

              {activeOutput && activeOutput.items.length === 0 && (
                <div className="empty-output">
                  {activeOutput.noToolsMessage || "No MCP tool calls were made for this reply."}
                </div>
              )}

              {activeOutput &&
                activeOutput.items.map((item, groupIdx) => {
                  const payload = item.result || {};
                  return (
                    <div className="results-grid" key={`${item.name}-${groupIdx}`}>
                      {payload.error && (
                        <div className="status-box status-error">
                          <strong>Not found:</strong> {payload.error}
                        </div>
                      )}

                      {Array.isArray(payload.results) &&
                        payload.results.map((entry, idx) => (
                          <article className="result-card" key={entry.id || entry.show_id || idx}>
                            <h3>{entry.title}</h3>
                            {entry.type && (
                              <p className="meta-line">
                                {entry.type} · {entry.release_year} · {entry.rating || "NR"} ·{" "}
                                {entry.duration}
                              </p>
                            )}
                            {entry.listed_in && (
                              <p className="meta-line">Genres: {entry.listed_in}</p>
                            )}
                            {entry.director && (
                              <p className="meta-line">Director: {entry.director}</p>
                            )}
                            {entry.rank && (
                              <p className="meta-line">
                                Rank #{entry.rank} · Release: {entry.release_date} · Popularity:{" "}
                                {entry.popularity} · Vote Avg: {entry.vote_average}
                              </p>
                            )}
                            <p>{entry.description || entry.overview}</p>
                          </article>
                        ))}

                      {Array.isArray(payload.movies) &&
                        payload.movies.map((movie) => (
                          <article className="result-card" key={movie.rank}>
                            <h3>
                              #{movie.rank} — {movie.title}
                            </h3>
                            <p className="meta-line">
                              Release: {movie.release_date} · Popularity: {movie.popularity} · Vote
                              Avg: {movie.vote_average}
                            </p>
                            <p>{movie.overview}</p>
                          </article>
                        ))}

                      <div className="code-wrap">
                        <div className="code-label" id={`raw-mcp-json-label-${groupIdx}`}>
                          Raw MCP Tool Output ({item.name})
                        </div>
                        <pre
                          role="region"
                          aria-labelledby={`raw-mcp-json-label-${groupIdx}`}
                          tabIndex={0}
                        >
                          <code>{JSON.stringify(payload, null, 2)}</code>
                        </pre>
                      </div>
                    </div>
                  );
                })}
            </div>
          </section>

          <section className="panel" aria-label="Live MCP Tool Cards">
            <details className="schema-details" open>
              <summary>Live MCP Tool Cards ({tools.length})</summary>
              <p className="panel-intro">
                Schemas fetched via <code>tools/list</code> from your FastMCP server.
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
            </details>
          </section>
        </div>
      </main>

      <footer className="page-footer">
        <p>Built with Next.js App Router + FastMCP ({mcpUrl})</p>
      </footer>
    </>
  );
}
