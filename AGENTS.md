# AGENTS.md - Development Guide for AI Agents

## Project Overview

QQ Farm bot in Node.js (CommonJS). Automates farming: harvest, plant, weed, pest control, water, visit friends.

- **Entry**: `client.js`
- **Source**: `src/`
- **Modules**: config.js, utils.js, proto.js, network.js, farm.js, friend.js, task.js, status.js, warehouse.js, decode.js, state.js, logger.js, webApi.js

---

## Build, Run & Test Commands

### Install & Build
```bash
npm install
npm run build
```

### Run
```bash
# Run source (development)
node client.js --code <login_code>

# Run bundled (after npm run build)
# Note: proto/ and gameConfig/ must be in parent dir of bundle.js
cd dist && node bundle.js --code <login_code>

# QQ QR scan login
node client.js --qr

# WeChat login
node client.js --code <login_code> --wx

# Bark push notification
node client.js --code <login_code> --bark <bark_key>

# Custom intervals (seconds)
node client.js --code <code> --interval 30 --friend-interval 5

# Web dashboard
npm run web
```

### Debug Modes
```bash
# Verify proto definitions
node client.js --verify

# Decode protobuf data
node client.js --decode <data> [--hex] [--gate] [--type <msg_type>]
```

### Lint & TypeCheck
**No linting configured.** Add ESLint if needed:
```bash
npx eslint src/ --fix
# Single file
npx eslint src/farm.js --fix
```

### Testing
**No test framework configured.** To add and run tests:
```bash
# Install Jest
npm install --save-dev jest

# Add to package.json: "test": "jest"

# Run all tests
npm test

# Run single test file
npx jest src/farm.test.js

# Run tests matching pattern
npx jest --testPathPattern=farm
```

---

## Code Style

### Language
- **JavaScript (CommonJS)** - use `require()` / `module.exports`
- **Comments**: Chinese (Simplified)
- **No TypeScript**

### Naming Conventions
- Functions/Variables: `camelCase` (`getAllLands`, `isCheckingFarm`)
- Constants: `UPPER_SNAKE_CASE` (`NORMAL_FERTILIZER_ID`, `CONFIG.farmCheckInterval`)
- Enums/Config Objects: `PascalCase` (`PlantPhase`, `PHASE_NAMES`, `CONFIG`)
- Files: `snake_case.js`
- State variables: prefix with `is`, `has`, `should` (`isCheckingFarm`, `hasBackpack`)

### Imports
```javascript
const WebSocket = require('ws');
const EventEmitter = require('events');
const { CONFIG, PlantPhase } = require('./config');
const { sendMsgAsync, networkEvents } = require('./src/network');
const { getPlantingRecommendation } = require('../tools/calc-exp-yield');
```

### Formatting
- 4 spaces indent (no tabs)
- Space after commas, around operators
- Always use semicolons
- Opening brace on same line

### Logging
```javascript
const { log, logWarn, sleep } = require('./src/utils');
log('农场', `已收获 ${count} 块地`);
logWarn('商店', `金币不足!`);

// Bark 推送 (需设置 CONFIG.barkKey 或 --bark <key>)
pushNotification('推送', '农场已启动');
```

---

## Error Handling & Async Patterns

### Error Handling
```javascript
async function checkFarm() {
    try {
        const landsReply = await getAllLands();
    } catch (err) {
        logWarn('巡田', `检查失败: ${err.message}`);
    } finally {
        isCheckingFarm = false;
    }
}
```

### Async Patterns
- Use `async/await` consistently
- 10s timeout for network requests
- 50ms delay between batch operations
- Check `ws.readyState` before sending messages

### Protobuf (64-bit integers)
Always use `Long` for 64-bit ints:
```javascript
const { toLong, toNum } = require('./src/utils');
const body = types.HarvestRequest.encode(types.HarvestRequest.create({
    land_ids: landIds,
    host_gid: toLong(state.gid),
})).finish();
const reply = types.HarvestReply.decode(replyBody);
const gid = toNum(reply.gid);
```

---

## Module Patterns

### Callback Registration Pattern
```javascript
let onOperationLimitsUpdate = null;
function setOperationLimitsCallback(callback) {
    onOperationLimitsUpdate = callback;
}
module.exports = { setOperationLimitsCallback };
```

### Event Handling
```javascript
const EventEmitter = require('events');
const networkEvents = new EventEmitter();
// Emit
networkEvents.emit('landsChanged', lands);
// Listen
networkEvents.on('landsChanged', onLandsChangedPush);
```

### State Management (state.js)
```javascript
const farmState = {
    lands: [],
    backpack: [],
    operationLimits: null,
    setLands(lands) { this.lands = lands; },
    // ...
};
module.exports = { farmState };
```

---

## Common Patterns

### Farm Loop
```javascript
async function farmCheckLoop() {
    while (farmLoopRunning) {
        await checkFarm();
        if (!farmLoopRunning) break;
        await sleep(CONFIG.farmCheckInterval);
    }
}
```

### Batch Operations
```javascript
for (const landId of landIds) {
    try {
        await plantSeeds(seedId, [landId]);
        successCount++;
    } catch (e) { break; }
    if (landIds.length > 1) await sleep(50);
}
```

---

## Common Issues

1. **64-bit overflow**: Always use `toLong()` / `toNum()` for large numbers
2. **WebSocket timeouts**: Check `ws.readyState === WebSocket.OPEN` before sending
3. **QQ push**: `LandsNotify` may not work in QQ, only `ItemNotify`
4. **Rate limiting**: Always add 50ms delay between batch operations
5. **Memory leaks**: Clean up timers and event listeners in cleanup phase

---

## Dependencies

`axios`, `long`, `protobufjs`, `qrcode-terminal`, `ws`, `express`, `socket.io`
