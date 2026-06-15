# MCP Inspector — SPEC.md

## 1. Concept & Vision

**What it does:** A visual, interactive inspector and testing playground for MCP (Model Context Protocol) servers. Developers connect to an MCP server, browse its tools/resources/prompts, invoke them with live request/response traces, and debug in a purpose-built UI.

**What it feels like:** DevTools for MCP — dark, precise, data-dense but navigable. Think Chrome DevTools Network tab meets Postman. No fluff, every pixel earns its place.

## 2. Design Language

**Aesthetic:** Dark IDE-native. Monospace for data, clean sans-serif for UI chrome. High-contrast panels. Color-coded by message role (user/assistant/tool).

**Color palette:**
- Background: `#0d1117`
- Surface: `#161b22`
- Border: `#30363d`
- Primary accent: `#58a6ff` (blue — connections, actions)
- Success: `#3fb950`
- Error: `#f85149`
- Warning: `#d29922`
- Text primary: `#e6edf3`
- Text muted: `#8b949e`

**Typography:**
- UI: `Inter` or system sans-serif
- Code/data: `JetBrains Mono` or `Fira Code`

**Motion:** Minimal. Panel transitions 150ms ease-out. No decorative animation. Loading states use subtle pulse.

## 3. Layout & Structure

```
┌─────────────────────────────────────────────────────────┐
│  HEADER: Logo + Connection Status + Settings            │
├──────────┬──────────────────────────┬───────────────────┤
│ SERVER   │  REQUEST BUILDER         │  RESPONSE TRACER  │
│ LIST     │  - Endpoint input        │  - Request/resp   │
│          │  - Tool selector         │    pairs          │
│ + Add    │  - JSON editor           │  - Diff viewer    │
│ server   │  - Send button           │  - Timing info    │
│          │                          │                   │
├──────────┴──────────────────────────┴───────────────────┤
│  TOOL BROWSER: Tabs for Tools | Resources | Prompts     │
│  Collapsible tree with icons, names, schemas            │
└─────────────────────────────────────────────────────────┘
```

**Responsive:** Single-column on mobile (tab-based navigation between panels). Desktop shows 3-column layout.

## 4. Features & Interactions

### Server Management
- Add server by name + MCP server command (e.g. `npx @modelcontextprotocol/server-filesystem ./data`)
- Store server configs in `~/.mcp-inspector/servers.json`
- One-click connect/disconnect per server
- Connection status indicator (green dot = connected, red = error, gray = idle)

### Tool Browser
- Fetch `tools/list` on connect — display in collapsible tree
- Show tool name, description, input schema
- Click tool → auto-fill Request Builder
- Filter tools by name

### Request Builder
- JSON editor with syntax highlighting (textarea with line numbers fallback)
- Tool selector dropdown
- Arguments auto-populated from tool schema
- "Send" button → invokes `tools/call`
- Loading state with abort option

### Response Tracer
- Chronological list of request/response pairs
- Each entry shows: timestamp, tool name, request JSON, response JSON, duration
- Expandable entries
- Color-coded: success (green border), error (red border)
- Copy button per entry
- Clear history button

### Resources Browser
- Fetch `resources/list` on connect
- Display resource URI + name + mimeType
- Click to `resources/read` and show content

### Prompts Browser
- Fetch `prompts/list` on connect
- Display prompt name + description
- Click to see prompt arguments and preview

### History
- All requests persisted to `~/.mcp-inspector/history.json`
- Searchable by tool name or request content

## 5. Component Inventory

### ServerCard
- States: idle, connecting, connected, error
- Shows: name, command preview, status dot, connect button, delete button

### ToolTreeItem
- States: default, selected, filtered-out
- Shows: tool icon, name, description snippet
- Click: select for building request

### RequestPanel
- States: empty, editing, loading, success, error
- JSONEditor sub-component with line numbers
- Send button: default → loading spinner → result

### TraceEntry
- States: collapsed, expanded
- Shows: timestamp, tool, duration badge, status color
- Expand: full request + response JSON

### StatusBadge
- `connected` (green), `disconnected` (gray), `error` (red), `loading` (yellow pulse)

## 6. Technical Approach

### Stack
- **Frontend:** React 18 + TypeScript + Vite
- **UI:** Tailwind CSS (dark theme)
- **Backend:** Node.js HTTP server that acts as MCP client
  - Uses `@modelcontextprotocol/sdk` to connect to servers
  - Exposes REST API for the React frontend
  - WebSocket for live trace streaming
- **State:** React Context + `useReducer`
- **Persistence:** `fs` to `~/.mcp-inspector/` directory

### Architecture

```
Browser (React SPA)
    │
    ▼ HTTP/WS
Node.js MCP Client Server (:3001)
    │
    ▼ stdio or HTTP
MCP Server (user's actual server)
```

### MCP Client Server

The backend Node process:
1. Spawns MCP server as child process via stdio (or connects via SSE if HTTP)
2. Proxies `tools/call`, `tools/list`, `resources/list`, `resources/read`, `prompts/list` to the connected server
3. Streams trace events to frontend via WebSocket
4. Persists history to `~/.mcp-inspector/history.json`

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/servers` | List saved server configs |
| POST | `/api/servers` | Add server config |
| DELETE | `/api/servers/:id` | Remove server config |
| POST | `/api/connect/:id` | Connect to server, return tools list |
| POST | `/api/disconnect` | Disconnect current server |
| GET | `/api/tools` | List tools from connected server |
| POST | `/api/tools/call` | Call a tool |
| GET | `/api/resources` | List resources |
| GET | `/api/resources/:uri` | Read a resource |
| GET | `/api/prompts` | List prompts |
| GET | `/api/history` | Get request history |
| WS | `/ws` | Live trace stream |

### Data Model

```typescript
interface ServerConfig {
  id: string;
  name: string;
  command: string; // e.g. "npx @modelcontextprotocol/server-filesystem ./data"
  args?: string[];
  env?: Record<string, string>;
}

interface TraceEntry {
  id: string;
  timestamp: string;
  serverId: string;
  tool: string;
  request: unknown;
  response: unknown;
  durationMs: number;
  status: 'success' | 'error';
}
```

### Build Commands
```bash
cd packages/client && npm install && npm run build
cd packages/server && npm install && npm run build
# Or for development:
npm run dev:server  # starts MCP client server on :3001
npm run dev:client  # starts Vite dev server on :5173
```

## 7. Acceptance Criteria

1. User can add an MCP server config and connect to it
2. Tool list loads and displays within 3 seconds of connection
3. User can invoke any tool and see the JSON request/response in the trace panel
4. Connection errors are surfaced with meaningful messages
5. Request history persists across page reloads
6. All UI panels are responsive and don't break on narrow viewports
7. The app works entirely locally — no cloud dependency
8. Production build is < 500KB gzipped JS