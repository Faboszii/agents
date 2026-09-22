import { createMcpHandler } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  corpusMeta,
  getDocument,
  listDocuments,
  searchKnowledge,
} from "./search";

export interface Env {
  PUBLIC_ORIGIN: string;
  SERVICE_NAME: string;
  SERVICE_VERSION: string;
}

function createServer(env: Env) {
  const server = new McpServer({
    name: "NoéMI Knowledge",
    version: env.SERVICE_VERSION || "0.1.0",
  });

  server.registerTool(
    "search_knowledge",
    {
      description:
        "Search the Project NoéMI public knowledge corpus (Bible, governance, methodology, Phase 0, skills). Returns ranked markdown chunks.",
      inputSchema: {
        query: z.string().min(1).describe("Natural language or keyword query"),
        limit: z.number().int().min(1).max(20).optional(),
      },
    },
    async ({ query, limit }) => {
      const hits = searchKnowledge(query, limit ?? 5);
      const payload = hits.map((h) => ({
        id: h.id,
        source: h.source,
        title: h.title,
        excerpt: h.text.slice(0, 1200),
      }));
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              { query, count: payload.length, hits: payload },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.registerTool(
    "get_document",
    {
      description:
        "Fetch a corpus document by source path (e.g. docs/PROJECT_REFERENCE.md) or chunk id from search_knowledge.",
      inputSchema: {
        pathOrId: z
          .string()
          .min(1)
          .describe("Document path or chunk id returned by search_knowledge"),
      },
    },
    async ({ pathOrId }) => {
      const doc = getDocument(pathOrId);
      if (!doc) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ error: "not_found", pathOrId }),
            },
          ],
          isError: true,
        };
      }
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                id: doc.id,
                source: doc.source,
                title: doc.title,
                text: doc.text,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.registerTool(
    "list_documents",
    {
      description: "List corpus documents included in this knowledge MCP server.",
      inputSchema: {},
    },
    async () => {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              { meta: corpusMeta(), documents: listDocuments() },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  return server;
}

function serverCard(env: Env) {
  const origin = (env.PUBLIC_ORIGIN || "https://mcp.noemi.newpush.com").replace(
    /\/+$/,
    ""
  );
  return {
    $schema:
      "https://static.modelcontextprotocol.io/schemas/v1/server-card.schema.json",
    name: env.SERVICE_NAME || "com.newpush/noemi-knowledge-mcp",
    version: env.SERVICE_VERSION || "0.1.0",
    title: "NoéMI Knowledge MCP",
    description:
      "Searchable Project NoéMI public knowledge base (Bible, governance, methodology, Phase 0, skills) over Streamable HTTP.",
    websiteUrl: "https://noemi.newpush.com",
    repository: {
      url: "https://github.com/project-noemi/agents",
      source: "github",
      subfolder: "services/noemi-knowledge-mcp",
    },
    remotes: [
      {
        type: "streamable-http",
        url: `${origin}/mcp`,
        supportedProtocolVersions: ["2025-06-18", "2025-03-26"],
      },
    ],
  };
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    if (
      url.pathname === "/.well-known/mcp/server-card.json" ||
      url.pathname === "/server-card"
    ) {
      return Response.json(serverCard(env), {
        headers: {
          "Cache-Control": "public, max-age=300",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    if (url.pathname === "/health" || url.pathname === "/") {
      return Response.json({
        status: "ok",
        service: env.SERVICE_NAME,
        version: env.SERVICE_VERSION,
        corpus: corpusMeta(),
        mcp: `${env.PUBLIC_ORIGIN}/mcp`,
        serverCard: `${env.PUBLIC_ORIGIN}/.well-known/mcp/server-card.json`,
      });
    }

    if (url.pathname === "/mcp" || url.pathname.startsWith("/mcp/")) {
      const handler = createMcpHandler(createServer(env));
      return handler(request, env, ctx);
    }

    return new Response("Not Found", { status: 404 });
  },
};
