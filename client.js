/**
 * QQ经典农场 挂机脚本 - 入口文件
 *
 * 模块结构:
 *   src/config.js   - 配置常量与枚举
 *   src/utils.js    - 通用工具函数
 *   src/proto.js    - Protobuf 加载与类型管理
 *   src/network.js  - WebSocket 连接/消息编解码/登录/心跳
 *   src/farm.js     - 自己农场操作与巡田循环
 *   src/friend.js   - 好友农场操作与巡查循环
 *   src/decode.js   - PB解码/验证工具模式
 */

const { CONFIG } = require('./src/config');
const { loadProto } = require('./src/proto');
const { connect, cleanup, getWs } = require('./src/network');
const { startFarmCheckLoop, stopFarmCheckLoop, refreshBackpack, fertilize, harvest } = require('./src/farm');
const { startFriendCheckLoop, stopFriendCheckLoop } = require('./src/friend');
const { initTaskSystem, cleanupTaskSystem } = require('./src/task');
const { initStatusBar, cleanupStatusBar, setStatusPlatform } = require('./src/status');
const { startSellLoop, stopSellLoop, debugSellFruits } = require('./src/warehouse');
const { processInviteCodes } = require('./src/invite');
const { verifyMode, decodeMode } = require('./src/decode');
const { emitRuntimeHint, sleep } = require('./src/utils');
const { getQQFarmCodeByScan } = require('./src/qqQrLogin');
const { initFileLogger } = require('./src/logger');
const { startApiServer } = require('./src/webApi');
const { farmState, setStopSellLoop } = require('./src/state');

initFileLogger();

// ============ 帮助信息 ============
function showHelp() {
    console.log(`
QQ经典农场 挂机脚本
====================

用法:
  node client.js --code <登录code> [--wx] [--interval <秒>] [--friend-interval <秒>]
  node client.js --qr [--interval <秒>] [--friend-interval <秒>]
  node client.js --verify
  node client.js --decode <数据> [--hex] [--gate] [--type <消息类型>]

参数:
  --code              小程序 login() 返回的临时凭证 (必需)
  --qr                启动后使用QQ扫码获取登录code（仅QQ平台）
  --wx                使用微信登录 (默认为QQ小程序)
  --interval          自己农场巡查完成后等待秒数, 默认1秒, 最低1秒
  --friend-interval   好友巡查完成后等待秒数, 默认1秒, 最低1秒
  --verify            验证proto定义
  --decode            解码PB数据 (运行 --decode 无参数查看详细帮助)

自己农场自动化 (默认全部开启):
  --no-auto-harvest   关闭自动收获
  --no-auto-remove    关闭自动铲除
  --no-auto-plant     关闭自动种植
  --no-auto-fertilize 关闭自动施肥
  --no-auto-weed      关闭自动除草
  --no-auto-pest      关闭自动除虫
  --no-auto-water     关闭自动浇水
  --no-auto-upgrade   关闭自动升级土地
  --no-auto-unlock    关闭自动解锁土地

 好友农场自动化 (默认全部开启):
  --no-auto-friend    关闭好友巡查
  --no-auto-help      关闭帮忙操作
  --no-auto-steal     关闭自动偷菜

其他自动化 (默认全部开启):
  --no-auto-sell     关闭自动出售仓库果实

功能:
  - 自动收获成熟作物 → 购买种子 → 种植 → 施肥
  - 自动除草、除虫、浇水
  - 自动铲除枯死作物
  - 自动巡查好友农场: 帮忙浇水/除草/除虫 + 偷菜
  - 自动领取任务奖励 (支持分享翻倍)
  - 每分钟自动出售仓库果实
  - 启动时读取 share.txt 处理邀请码 (仅微信)
  - 心跳保活

邀请码文件 (share.txt):
  每行一个邀请链接，格式: ?uid=xxx&openid=xxx&share_source=xxx&doc_id=xxx
  启动时会尝试通过 SyncAll API 同步这些好友
`);
}

// ============ 参数解析 ============
function parseArgs(args) {
    const options = {
        code: '',
        qrLogin: false,
        deleteAccountMode: false,
        name: '',
        certId: '',
        certType: 0,
        syncUrl: null,
    };

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--code' && args[i + 1]) {
            options.code = args[++i];
        }
        if (args[i] === '--qr') {
            options.qrLogin = true;
        }
        if (args[i] === '--wx') {
            CONFIG.platform = 'wx';
        }
        if (args[i] === '--interval' && args[i + 1]) {
            const sec = parseInt(args[++i]);
            CONFIG.farmCheckInterval = Math.max(sec, 1) * 1000;
        }
        if (args[i] === '--friend-interval' && args[i + 1]) {
            const sec = parseInt(args[++i]);
            CONFIG.friendCheckInterval = Math.max(sec, 1) * 1000;
        }
        if (args[i] === '--api') {
            options.enableApi = true;
        }
        if (args[i] === '--sync-url' && args[i + 1]) {
            options.syncUrl = args[++i];
        }
        if (args[i] === '--no-auto-harvest') CONFIG.autoHarvest = false;
        if (args[i] === '--no-auto-remove') CONFIG.autoRemove = false;
        if (args[i] === '--no-auto-plant') CONFIG.autoPlant = false;
        if (args[i] === '--no-auto-fertilize') CONFIG.autoFertilize = false;
        if (args[i] === '--no-auto-weed') CONFIG.autoWeed = false;
        if (args[i] === '--no-auto-pest') CONFIG.autoPest = false;
        if (args[i] === '--no-auto-water') CONFIG.autoWater = false;
        if (args[i] === '--no-auto-upgrade') CONFIG.autoUpgrade = false;
        if (args[i] === '--no-auto-unlock') CONFIG.autoUnlock = false;
        if (args[i] === '--no-auto-friend') CONFIG.autoFriendVisit = false;
        if (args[i] === '--no-auto-help') CONFIG.autoHelp = false;
        if (args[i] === '--no-auto-steal') CONFIG.autoSteal = false;
        if (args[i] === '--no-auto-sell') CONFIG.autoSell = false;
    }
    return options;
}

// ============ 主函数 ============
async function main() {
    const args = process.argv.slice(2);
    const options = parseArgs(args);
    let usedQrLogin = false;

    // 设置状态同步
    if (options.syncUrl) {
        farmState.setSyncUrl(options.syncUrl);
    }

    // 注册停止出售循环的回调
    setStopSellLoop(stopSellLoop);

    // 加载 proto 定义
    await loadProto();

    // 启动 Web API 服务器
    if (options.enableApi) {
        startApiServer(3001);
    }

    // 连接到同步服务器并监听设置更新
    if (options.syncUrl) {
        const syncUrl = options.syncUrl.replace('/api/sync', '');
        const { io } = require('socket.io-client');
        const socket = io(syncUrl, {
            path: '/socket.io',
            transports: ['websocket', 'polling'],
        });
        socket.on('connect', () => {
            console.log('[Sync] Connected to API server');
            socket.emit('botConfig', {
                farmCheckInterval: CONFIG.farmCheckInterval / 1000,
                friendCheckInterval: CONFIG.friendCheckInterval / 1000,
                forceLowestLevelCrop: CONFIG.forceLowestLevelCrop,
                autoHarvest: CONFIG.autoHarvest,
                autoRemove: CONFIG.autoRemove,
                autoPlant: CONFIG.autoPlant,
                autoFertilize: CONFIG.autoFertilize,
                autoWeed: CONFIG.autoWeed,
                autoPest: CONFIG.autoPest,
                autoWater: CONFIG.autoWater,
                autoUpgrade: CONFIG.autoUpgrade,
                autoUnlock: CONFIG.autoUnlock,
                autoFriendVisit: CONFIG.autoFriendVisit,
                autoHelp: CONFIG.autoHelp,
                autoSteal: CONFIG.autoSteal,
                autoSell: CONFIG.autoSell,
            });
        });
        socket.on('settingsUpdate', (settings) => {
            if (settings.farmCheckInterval != null) CONFIG.farmCheckInterval = settings.farmCheckInterval * 1000;
            if (settings.friendCheckInterval != null) CONFIG.friendCheckInterval = settings.friendCheckInterval * 1000;
            if (settings.forceLowestLevelCrop != null) CONFIG.forceLowestLevelCrop = settings.forceLowestLevelCrop;
            if (settings.autoHarvest != null) CONFIG.autoHarvest = settings.autoHarvest;
            if (settings.autoRemove != null) CONFIG.autoRemove = settings.autoRemove;
            if (settings.autoPlant != null) CONFIG.autoPlant = settings.autoPlant;
            if (settings.autoFertilize != null) CONFIG.autoFertilize = settings.autoFertilize;
            if (settings.autoWeed != null) CONFIG.autoWeed = settings.autoWeed;
            if (settings.autoPest != null) CONFIG.autoPest = settings.autoPest;
            if (settings.autoWater != null) CONFIG.autoWater = settings.autoWater;
            if (settings.autoUpgrade != null) CONFIG.autoUpgrade = settings.autoUpgrade;
            if (settings.autoUnlock != null) CONFIG.autoUnlock = settings.autoUnlock;
            if (settings.autoFriendVisit != null) CONFIG.autoFriendVisit = settings.autoFriendVisit;
            if (settings.autoHelp != null) CONFIG.autoHelp = settings.autoHelp;
            if (settings.autoSteal != null) CONFIG.autoSteal = settings.autoSteal;
            if (settings.autoSell != null) CONFIG.autoSell = settings.autoSell;
        });
        socket.on('action', async (action) => {
            console.log('[Sync] Received action:', action);
            if (action.type === 'refreshBackpack') {
                await refreshBackpack();
            } else if (action.type === 'fertilize') {
                const { fertilizerId, landIds } = action;
                const { getUserState } = require('./src/network');
                const state = getUserState();
                if (!state.gid) {
                    console.log('[Sync] Not logged in, skipping fertilize');
                    return;
                }
                if (!landIds || !Array.isArray(landIds)) {
                    console.log('[Sync] Invalid landIds:', landIds);
                    return;
                }
                for (const landId of landIds) {
                    await new Promise(r => setTimeout(r, 50));
                    const result = await fertilize([landId], fertilizerId);
                    console.log(`[Sync] Fertilized ${result} lands`);
                    // 施完肥等待一下再检查是否成熟
                    await new Promise(r => setTimeout(r, 50));
                    const { getAllLands } = require('./src/farm');
                    const landsReply = await getAllLands();
                    const harvestable = landsReply.lands.filter((l) => {
                        if (!l.plant || !l.plant.phases || l.plant.phases.length === 0) return false;
                        const phase = l.plant.phases[l.plant.phases.length - 1];
                        return phase && phase.phase === 6;
                    }).map((l) => l.id);
                    if (harvestable.length > 0) {
                        console.log(`[Sync] Harvesting mature lands: ${harvestable.join(',')}`);
                        try {
                            await harvest(harvestable);
                        } catch (e) {
                            console.log(`[Sync] Harvest error (may not be mature yet): ${e.message}`);
                        }
                    }
                }
            }
        });
    } else {
        console.log('[Sync] No syncUrl provided, skipping socket connection');
    }

    // 验证模式
    if (args.includes('--verify')) {
        await verifyMode();
        return;
    }

    // 解码模式
    if (args.includes('--decode')) {
        await decodeMode(args);
        return;
    }

    // 正常挂机模式

    // QQ 平台支持扫码登录: 显式 --qr，或未传 --code 时自动触发
    if (!options.code && CONFIG.platform === 'qq' && (options.qrLogin || !args.includes('--code'))) {
        console.log('[扫码登录] 正在获取二维码...');
        options.code = await getQQFarmCodeByScan();
        usedQrLogin = true;
        console.log(`[扫码登录] 获取成功，code=${options.code.substring(0, 8)}...`);
    }

    if (!options.code) {
        if (CONFIG.platform === 'wx') {
            console.log('[参数] 微信模式仍需通过 --code 传入登录凭证');
        }
        showHelp();
        process.exit(1);
    }
    if (options.deleteAccountMode && (!options.name || !options.certId)) {
        console.log('[参数] 注销账号模式必须提供 --name 和 --cert-id');
        showHelp();
        process.exit(1);
    }

    // 扫码阶段结束后清屏，避免状态栏覆盖二维码区域导致界面混乱
    if (usedQrLogin && process.stdout.isTTY) {
        process.stdout.write('\x1b[2J\x1b[H');
    }

    // 初始化状态栏
    initStatusBar();
    setStatusPlatform(CONFIG.platform);
    emitRuntimeHint(true);

    const platformName = CONFIG.platform === 'wx' ? '微信' : 'QQ';
    console.log(`[启动] ${platformName} code=${options.code.substring(0, 8)}... 农场${CONFIG.farmCheckInterval / 1000}s 好友${CONFIG.friendCheckInterval / 1000}s`);

    // 连接并登录，登录成功后启动各功能模块
    connect(options.code, async () => {
        // 处理邀请码 (仅微信环境)
        await processInviteCodes();
        
        startFarmCheckLoop();
        startFriendCheckLoop();
        initTaskSystem();
        
        // 启动时立即检查一次背包
        if (CONFIG.autoSell) {
            setTimeout(() => debugSellFruits(), 5000);
            startSellLoop(60000);  // 每分钟自动出售仓库果实
        }
    });

    // 退出处理
    process.on('SIGINT', () => {
        cleanupStatusBar();
        console.log('\n[退出] 正在断开...');
        stopFarmCheckLoop();
        stopFriendCheckLoop();
        cleanupTaskSystem();
        stopSellLoop();
        cleanup();
        const ws = getWs();
        if (ws) ws.close();
        process.exit(0);
    });
}

main().catch(err => {
    console.error('启动失败:', err);
    process.exit(1);
});
