# NoéMI Knowledge MCP (`mcp.noemi.newpush.com`)

Remote **Model Context Protocol** server that exposes a searchable public
knowledge corpus for Project NoéMI (Bible, governance, methodology, Phase 0,
`skills-dist`).

This is a **real** MCP transport (Streamable HTTP at `/mcp`) on a **separate
origin** from the marketing site — so `/.well-known/mcp/server-card.json` is
honest (Decision 217 withdrawn theater; this replaces it).

## Tools

| Tool | Purpose |
| --- | --- |
| `search_knowledge` | Ranked markdown chunks for a query |
| `get_document` | Full text by path or chunk id |
| `list_documents` | Corpus inventory |

## Local development

```bash
cd services/noemi-knowledge-mcp
npm install
npm run build:corpus
npx wrangler dev
# MCP: http://127.0.0.1:8787/mcp
# Card: http://127.0.0.1:8787/.well-known/mcp/server-card.json
```

Requires Node **24+**. Secrets via Infisical / `wrangler` login — never commit tokens.

## Deploy

```bash
# Cloudflare account with Workers deploy permission (not DNS-Edit-only)
npx wrangler login   # or CLOUDFLARE_API_TOKEN with Workers Scripts:Edit
npm run deploy
```

### DNS (zone `newpush.com`)

1. **Hostname:** `mcp.noemi.newpush.com` → Worker route / Custom Domain for `noemi-knowledge-mcp`.
2. **DNS-AID (optional, after live):**  
   `_mcp._agents.noemi` HTTPS/SVCB → `mcp.noemi.newpush.com` (extend `website/scripts/publish-dns-aid.sh`).

### Marketing site follow-up

Add an `api-catalog` / Link entry pointing at  
`https://mcp.noemi.newpush.com/.well-known/mcp/server-card.json` once DNS is live.

## Security

- Corpus is **curated public** docs only: Bible (`PROJECT_REFERENCE`), governance, methodology, Phase 0 baseline, and `skills-dist` skill markdown.
- Explicitly **excluded**: `MACHINE_IDENTITY.md`, identity registers, and other internal admin-architecture docs.
- No secrets / PII. No auth on v0.1 (read-only). Add Cloudflare Access / OAuth later if needed.
