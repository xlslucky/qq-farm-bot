# AGENTS.md - Development Guide for AI Agents

## Project Overview

QQ Farm bot in Node.js (CommonJS) with React web dashboard. Automates farming: harvest, plant, weed, pest control, water, visit friends.

- **Entry**: `client.js`
- **Source**: `src/` (CommonJS modules)
- **Web**: `web/` (React + TypeScript + TailwindCSS)

---

## Build, Run & Test Commands

### Main Project (Node.js)
```bash
npm install
npm run build                    # Bundle with esbuild

# Run
node client.js --code <login_code>
node client.js --qr              # QQ QR scan login
node client.js --code <code> --wx    # WeChat login
node client.js --code <code> --bark <bark_key>  # Bark push

# Web dashboard
npm run web

# Debug
node client.js --verify          # Verify proto definitions
node client.js --decode <data> [--hex] [--type <msg_type>]
```

### Web Frontend (React + TypeScript)
```bash
cd web
npm install
npm run dev                      # Development server
npm run build                    # TypeScript check + Vite build
npm run lint                     # ESLint
npx eslint src/App.tsx           # Lint single file
```

### Testing
**No test framework configured.** To add:
```bash
npm install --save-dev jest
npm test                         # Run all tests
npx jest src/farm.test.js        # Run single test file
```

---

## Code Style

### Main Project (JavaScript/CommonJS)
- **Indent**: 4 spaces (no tabs)
- **Semicolons**: Always
- **Comments**: Chinese (Simplified)
- **Imports**: `const { x } = require('./module')`

**Naming**:
- Functions/Variables: `camelCase` (`getAllLands`, `isCheckingFarm`)
- Constants: `UPPER_SNAKE_CASE` (`NORMAL_FERTILIZER_ID`)
- Enums/Config: `PascalCase` (`PlantPhase`, `CONFIG`)
- Files: `snake_case.js`
- State variables: prefix `is`, `has`, `should`

### Web Frontend (TypeScript/React)
- **Indent**: 2 spaces (no tabs)
- **Imports**: `import { x } from '@/module'` (use `@/` path alias)
- **Components**: Functional components with hooks
- **Styling**: TailwindCSS with `cn()` utility for conditional classes

**Naming**:
- Components: `PascalCase` (`LandCard`, `Dashboard`)
- Hooks: `use` prefix (`useFarmState`, `useBotStatus`)
- Types: `PascalCase` (`RoleLevel`, `PlantData`)

---

## Error Handling & Async Patterns

```javascript
// Main project - always use async/await with try/catch
async function checkFarm() {
    try {
        const landsReply = await getAllLands();
    } catch (err) {
        logWarn('巡田', `检查失败: ${err.message}`);
    } finally {
        isCheckingFarm = false;
    }
}

// Network timeout: 10s
// Batch operations: 50ms delay between items
// Always check ws.readyState before sending
```

### Protobuf 64-bit Integers
Always use `toLong()` / `toNum()` for 64-bit numbers:
```javascript
const { toLong, toNum } = require('./src/utils');
const body = types.HarvestRequest.encode({
    land_ids: landIds,
    host_gid: toLong(state.gid),
}).finish();
const gid = toNum(reply.gid);
```

---

## Module Patterns

### Callback Registration
```javascript
let onUpdate = null;
function setCallback(callback) { onUpdate = callback; }
module.exports = { setCallback };
```

### State Management (state.js)
```javascript
const farmState = {
    lands: [],
    setLands(lands) { this.lands = lands; },
};
module.exports = { farmState };
```

### Event Emitter
```javascript
const networkEvents = new EventEmitter();
networkEvents.emit('landsChanged', lands);
networkEvents.on('landsChanged', handler);
```

---

## Common Issues

1. **64-bit overflow**: Always use `toLong()` / `toNum()`
2. **WebSocket**: Check `ws.readyState === WebSocket.OPEN` before sending
3. **Rate limiting**: Add 50ms delay between batch operations
4. **Web build**: Run `cd web && npm run build` after UI changes

---

## Key Files

| File | Purpose |
|------|---------|
| `client.js` | Entry point, CLI args, main loop |
| `src/config.js` | Constants, CONFIG object, enums |
| `src/farm.js` | Farm operations (harvest, plant, etc.) |
| `src/friend.js` | Friend farm operations |
| `src/network.js` | WebSocket, protobuf messaging |
| `src/state.js` | Shared state for web API |
| `web/src/App.tsx` | Main React component (dashboard UI) |

---

## Dependencies

**Main**: `axios`, `long`, `protobufjs`, `ws`, `express`, `socket.io`
**Web**: `react`, `tailwindcss`, `vite`, `dayjs`, `lucide-react`