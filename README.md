# MCP Inspector

A visual, interactive inspector and testing playground for MCP (Model Context Protocol) servers. Connect, probe, and debug MCP servers with a live request/response trace UI.

## Quick Start

```bash
# Install dependencies
npm install

# Start the MCP client server (backend)
npm run dev:server

# In another terminal, start the frontend dev server
npm run dev:client
```

Then open `http://localhost:5173`.

## How It Works

```
Browser (React SPA) ←→ MCP Client Server (:3001) ←→ Your MCP Server (stdio)
```

The backend Node.js server acts as an MCP client, connecting to your actual MCP server via stdio or HTTP. The React frontend communicates with it via REST + WebSocket.

## Adding a Server

1. Click **+ add** in the Servers panel
2. Enter a name and the MCP server command (e.g. `npx @modelcontextprotocol/server-filesystem ./data`)
3. Click **Connect**
4. Tools, resources, and prompts will load automatically

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS (dark theme)
- **Backend:** Node.js + Express + WebSocket + `@modelcontextprotocol/sdk`
- **Persistence:** `~/.mcp-inspector/` (servers config + request history)

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/servers` | List saved server configs |
| POST | `/api/servers` | Add server config |
| DELETE | `/api/servers/:id` | Remove server config |
| POST | `/api/connect/:id` | Connect to server |
| POST | `/api/disconnect` | Disconnect |
| GET | `/api/tools` | List tools |
| POST | `/api/tools/call` | Call a tool |
| GET | `/api/resources` | List resources |
| GET | `/api/resources/:uri` | Read a resource |
| GET | `/api/prompts` | List prompts |
| GET | `/api/history` | Get request history |
| WS | `/ws` | Live trace stream |