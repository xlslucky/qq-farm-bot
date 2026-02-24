# AGENTS.md - Development Guide for AI Agents

## Project Overview

QQ Farm bot in Node.js (CommonJS). Automates farming: harvest, plant, weed, pest control, water, visit friends.

- **Entry**: `client.js`
- **Source**: `src/`
- **Modules**: config.js, utils.js, proto.js, network.js, farm.js, friend.js, task.js, status.js, warehouse.js, decode.js

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
# 目录结构要求：proto/ 和 gameConfig/ 放在 bundle.js 上一级目录
cd dist && node bundle.js --code <login_code>

# QQ QR scan
node client.js --qr

# WeChat
node client.js --code <login_code> --wx

# Custom intervals (seconds)
node client.js --code <code> --interval 30 --friend-interval 5
```

### Debug Modes
```bash
# Verify proto
node client.js --verify

# Decode PB
node client.js --decode <data> [--hex] [--gate] [--type <msg_type>]
```

### Testing
**No test framework configured.** Add Jest or Mocha:
```bash
npx jest --testPathPattern=filename
# or
npx mocha --grep "test name" tests/
```

---

## Code Style

### Language
- **JavaScript (CommonJS)** - `require()` / `module.exports`
- **Comments**: Chinese (Simplified)
- **No TypeScript**

### Naming
- Functions/Variables: `camelCase` (`getAllLands`, `isCheckingFarm`)
- Constants: `UPPER_SNAKE_CASE` (`NORMAL_FERTILIZER_ID`)
- Enums/Config: `PascalCase` (`PlantPhase`, `CONFIG`)
- Files: `snake_case.js`
- State vars: prefix with `is`, `has` (`isCheckingFarm`)

### Imports
```javascript
const WebSocket = require('ws');
const EventEmitter = require('events');
const { CONFIG } = require('./config');
const { sendMsgAsync } = require('./src/network');
const { getPlantingRecommendation } = require('../tools/calc-exp-yield');
```

### Formatting
- 4 spaces indent
- Space after commas, around operators
- Always semicolons
- Same-line opening brace

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

### Logging
```javascript
const { log, logWarn, sleep } = require('./src/utils');
log('农场', `已收获 ${count} 块地`);
logWarn('商店', `金币不足!`);
```

### Async Patterns
- Use `async/await`
- 10s timeout for network requests
- 50ms delay between batch operations

### Protobuf
Use `Long` for 64-bit ints:
```javascript
const { toLong, toNum } = require('./src/utils');
const body = types.HarvestRequest.encode(types.HarvestRequest.create({
    land_ids: landIds,
    host_gid: toLong(state.gid),
})).finish();
const reply = types.HarvestReply.decode(replyBody);
const gid = toNum(reply.gid);
```

### Module Pattern
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
networkEvents.emit('landsChanged', lands);
networkEvents.on('landsChanged', onLandsChangedPush);
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

### Batch Ops
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

1. **64-bit overflow**: Always use `toLong()` / `toNum()`
2. **Timeouts**: Check `ws.readyState` before sending
3. **QQ push**: `LandsNotify` may not work in QQ, only `ItemNotify`
4. **Rate limiting**: 50ms delay between batch ops
5. **Memory leaks**: Clean up timers/listeners in cleanup

---

## Dependencies

`axios`, `long`, `protobufjs`, `qrcode-terminal`, `ws`
