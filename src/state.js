/**
 * Shared state management for bot and web API
 */

const { EventEmitter } = require('events');
const axios = require('axios');
const { CONFIG } = require('./config');
let stopSellLoop = null;

function setStopSellLoop(fn) {
    stopSellLoop = fn;
}

class FarmState extends EventEmitter {
    constructor() {
        super();
        this.user = null;
        this.lands = [];
        this.friends = [];
        this.logs = [];
        this.operationLimits = [];
        this.backpack = [];
        this.settings = {
            farmCheckInterval: CONFIG.farmCheckInterval / 1000,
            friendCheckInterval: CONFIG.friendCheckInterval / 1000,
            forceLowestLevelCrop: CONFIG.forceLowestLevelCrop,
            platform: CONFIG.platform,
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
        };
        this.isConnected = false;
        this.serverTime = 0;
        this.syncUrl = null;
        this.triggerRefresh = false;
    }

    setSyncUrl(url) {
        this.syncUrl = url;
    }

    triggerRefreshNow() {
        this.triggerRefresh = true;
    }

    clearRefreshTrigger() {
        this.triggerRefresh = false;
    }

    async syncState() {
        if (!this.syncUrl) return;
        try {
            const state = this.getState();
            // console.log('[syncState] syncing backpack:', state.backpack?.length);
            await axios.post(this.syncUrl, state, { timeout: 2000 });
        } catch (e) {
            // silent fail
        }
    }

    setUser(user) {
        this.user = user;
        this.emit('userUpdate', user);
        this.syncState();
    }

    setLands(lands) {
        this.lands = lands;
        this.emit('landsUpdate', lands);
        this.syncState();
    }

    setFriends(friends) {
        this.friends = friends;
        this.emit('friendsUpdate', friends);
        this.syncState();
    }

    addLog(log) {
        const timestamp = log.timestamp || Date.now();
        const logKey = `${timestamp}:${log.tag}:${log.message}`;
        
        // Skip if same log already exists in recent logs (within 2 seconds)
        const recentLog = this.logs.find(l => `${l.timestamp}:${l.tag}:${l.message}` === logKey);
        if (recentLog && (timestamp - recentLog.timestamp) < 2000) {
            return;
        }
        
        const logWithTimestamp = {
            ...log,
            timestamp,
        };
        this.logs.unshift(logWithTimestamp);
        if (this.logs.length > 1000) {
            this.logs = this.logs.slice(0, 1000);
        }
        this.emit('logUpdate', logWithTimestamp);
        this.syncState();
    }

    setOperationLimits(limits) {
        this.operationLimits = limits;
        this.emit('operationLimitsUpdate', limits);
        this.syncState();
    }

    setBackpack(backpack) {
        this.backpack = backpack;
        this.emit('backpackUpdate', backpack);
        this.syncState();
    }

    setConnected(connected) {
        this.isConnected = connected;
        this.emit('connectionUpdate', connected);
        this.syncState();
    }

    setServerTime(time) {
        this.serverTime = time;
    }

    updateSettings(settings) {
        this.settings = { ...this.settings, ...settings };
        
        // 直接更新 CONFIG，确保设置实时生效
        if (settings.farmCheckInterval != null) {
            CONFIG.farmCheckInterval = settings.farmCheckInterval * 1000;
        }
        if (settings.friendCheckInterval != null) {
            CONFIG.friendCheckInterval = settings.friendCheckInterval * 1000;
        }
        if (settings.forceLowestLevelCrop != null) {
            CONFIG.forceLowestLevelCrop = settings.forceLowestLevelCrop;
        }
        if (settings.platform != null) {
            CONFIG.platform = settings.platform;
        }
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
        
        // 发送 settingsUpdate 到机器人
        const { getIo } = require('./webApi');
        const io = getIo();
        if (io) {
            io.emit('settingsUpdate', settings);
        }
        
        if (settings.autoSell != null) {
            if (!settings.autoSell && CONFIG.autoSell && stopSellLoop) {
                stopSellLoop();
            }
            CONFIG.autoSell = settings.autoSell;
        }
        
        this.emit('settingsUpdate', this.settings);
    }

    getState() {
        return {
            user: this.user,
            lands: this.lands,
            friends: this.friends,
            logs: this.logs.slice(0, 100),
            operationLimits: this.operationLimits,
            backpack: this.backpack,
            isConnected: this.isConnected,
            serverTime: this.serverTime,
            settings: this.settings,
        };
    }

    clearLogs() {
        this.logs = [];
        this.emit('logsCleared');
    }
}

const farmState = new FarmState();

module.exports = { farmState, FarmState, setStopSellLoop };
