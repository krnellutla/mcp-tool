import { NextResponse } from "next/server";

const MCP_URL = process.env.MCP_SERVER_URL || "https://tinkeryard.fastmcp.app/mcp";

function parseMcpResponse(text) {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) {
    return JSON.parse(trimmed);
  }
  const lines = trimmed.split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line.startsWith("data:")) {
      const jsonText = line.slice(5).trim();
      if (jsonText) {
        return JSON.parse(jsonText);
      }
    }
  }
  throw new Error("Could not parse MCP response.");
}

async function callMcpRpc(method, params = {}) {
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
  };

  // Start an MCP session first so both stateless and stateful MCP servers work.
  const initRes = await fetch(MCP_URL, {
    method: "POST",
    headers,
    cache: "no-store",
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-03-26",
        capabilities: {},
        clientInfo: { name: "nextjs-mcp-client", version: "1.0.0" },
      },
    }),
  });

  if (!initRes.ok) {
    throw new Error(`MCP initialize failed (${initRes.status})`);
  }

  const sessionId = initRes.headers.get("mcp-session-id");
  const rpcHeaders = { ...headers };
  if (sessionId) {
    rpcHeaders["mcp-session-id"] = sessionId;
    await fetch(MCP_URL, {
      method: "POST",
      headers: rpcHeaders,
      cache: "no-store",
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "notifications/initialized",
      }),
    });
  }

  const res = await fetch(MCP_URL, {
    method: "POST",
    headers: rpcHeaders,
    cache: "no-store",
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 2,
      method,
      params,
    }),
  });

  if (!res.ok) {
    throw new Error(`MCP request failed (${res.status})`);
  }

  const text = await res.text();
  const data = parseMcpResponse(text);
  if (data.error) {
    throw new Error(data.error.message || "MCP server error");
  }
  return data.result;
}

function extractToolResult(mcpResult) {
  if (mcpResult && mcpResult.structuredContent) {
    return mcpResult.structuredContent;
  }
  if (mcpResult && mcpResult.content && mcpResult.content[0] && mcpResult.content[0].text) {
    try {
      return JSON.parse(mcpResult.content[0].text);
    } catch {
      return { text: mcpResult.content[0].text };
    }
  }
  return mcpResult;
}

async function askGroq(messages, tools) {
  const apiKey = process.env.GROQ_API_KEY;
  const body = {
    model: "openai/gpt-oss-120b",
    messages,
  };
  if (tools && tools.length > 0) {
    body.tools = tools;
  }

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data.choices[0].message;
}

export async function GET() {
  try {
    const result = await callMcpRpc("tools/list");
    return NextResponse.json({
      mcpUrl: MCP_URL,
      tools: result.tools || [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Could not load MCP tools.", mcpUrl: MCP_URL },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    if (body.action === "call_tool") {
      const mcpResult = await callMcpRpc("tools/call", {
        name: body.name,
        arguments: body.arguments || {},
      });
      return NextResponse.json({
        result: extractToolResult(mcpResult),
      });
    }

    if (body.action === "ask_ai") {
      if (!process.env.GROQ_API_KEY) {
        return NextResponse.json(
          {
            error:
              "GROQ_API_KEY is not set. Add GROQ_API_KEY in .env (local) or Vercel Environment Variables, or use the Direct MCP Tool Caller.",
          },
          { status: 400 }
        );
      }

      const question = (body.question || "").trim();
      if (!question) {
        return NextResponse.json({ error: "Please enter a question." }, { status: 400 });
      }

      const listResult = await callMcpRpc("tools/list");
      const cards = (listResult.tools || []).map((tool) => ({
        type: "function",
        function: {
          name: tool.name,
          description: tool.description || "",
          parameters: tool.inputSchema || { type: "object", properties: {} },
        },
      }));

      const messages = [{ role: "user", content: question }];
      const toolCalls = [];
      let reply = await askGroq(messages, cards);
      let steps = 0;

      while (reply.tool_calls && reply.tool_calls.length > 0 && steps < 5) {
        steps += 1;
        messages.push(reply);
        for (const call of reply.tool_calls) {
          const toolName = call.function.name;
          const toolArgs = JSON.parse(call.function.arguments || "{}");
          const mcpResult = await callMcpRpc("tools/call", {
            name: toolName,
            arguments: toolArgs,
          });
          const parsedResult = extractToolResult(mcpResult);
          toolCalls.push({ name: toolName, args: toolArgs, result: parsedResult });
          messages.push({
            role: "tool",
            tool_call_id: call.id,
            content: JSON.stringify(parsedResult),
          });
        }
        reply = await askGroq(messages, cards);
      }

      return NextResponse.json({
        answer: reply.content || "",
        toolCalls,
      });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Request failed." },
      { status: 500 }
    );
  }
}
