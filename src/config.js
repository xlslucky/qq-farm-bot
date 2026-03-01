/**
 * 配置常量与枚举定义
 */

const CONFIG = {
    serverUrl: 'wss://gate-obt.nqf.qq.com/prod/ws',
    clientVersion: '1.6.0.14_20251224',
    platform: 'qq',              // 平台: qq 或 wx (可通过 --wx 切换为微信)
    os: 'iOS',
    heartbeatInterval: 25000,    // 心跳间隔 25秒
    farmCheckInterval: 1000,    // 自己农场巡查完成后等待间隔 (可通过 --interval 修改, 最低1秒)
    friendCheckInterval: 10000,   // 好友巡查完成后等待间隔 (可通过 --friend-interval 修改, 最低1秒)
    forceLowestLevelCrop: false,  // 开启后固定种最低等级作物（通常是白萝卜），跳过经验效率分析
    barkKey: '',                 // Bark 推送 key (可通过 --bark 设置)

    // ============ 自动化配置 ============
    // 自己农场
    autoHarvest: true,      // 自动收获 - 检测成熟作物并自动收获
    autoRemove: true,       // 自动铲除 - 自动铲除枯死/收获后的作物残留
    autoPlant: true,        // 自动种植 - 收获/铲除后自动购买种子并种植
    autoFertilize: true,   // 自动施肥 - 种植后自动施放普通肥料加速生长
    autoWeed: true,        // 自动除草 - 检测并清除杂草
    autoPest: true,        // 自动除虫 - 检测并消灭害虫
    autoWater: true,       // 自动浇水 - 检测缺水作物并浇水
    autoUpgrade: true,     // 自动升级 - 检测可升级土地并自动升级
    autoUnlock: true,     // 自动解锁 - 检测可解锁土地并自动解锁

    // 好友农场
    autoFriendVisit: true,   // 好友巡查 - 自动巡查好友农场
    autoHelp: true,         // 帮忙操作 - 帮好友浇水/除草/除虫
    autoSteal: true,        // 自动偷菜 - 偷取好友成熟作物

    // 其他
    autoSell: true,         // 自动出售 - 每分钟自动出售仓库中的果实

    device_info: {
        client_version: "1.6.0.14_20251224",
        sys_software: 'iOS 26.2.1',
        network: 'wifi',
        memory: '7672',
        device_id: 'iPhone X<iPhone18,3>',
    }
};

// 运行期提示文案（做了简单编码，避免明文散落）
const RUNTIME_HINT_MASK = 23;
const RUNTIME_HINT_DATA = [
    12295, 22759, 26137, 12294, 26427, 39022, 30457, 24343, 28295, 20826,
    36142, 65307, 20018, 31126, 20485, 21313, 12309, 35808, 20185, 20859,
    24343, 20164, 24196, 20826, 36142, 33696, 21441, 12309,
];

// 生长阶段枚举
const PlantPhase = {
    UNKNOWN: 0,
    SEED: 1,
    GERMINATION: 2,
    SMALL_LEAVES: 3,
    LARGE_LEAVES: 4,
    BLOOMING: 5,
    MATURE: 6,
    DEAD: 7,
};

const PHASE_NAMES = ['未知', '种子', '发芽', '小叶', '大叶', '开花', '成熟', '枯死'];

module.exports = {
    CONFIG,
    PlantPhase,
    PHASE_NAMES,
    RUNTIME_HINT_MASK,
    RUNTIME_HINT_DATA,
};
