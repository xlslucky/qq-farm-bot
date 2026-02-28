/**
 * Web API Server - Express server to expose bot state to frontend
 */

const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { spawn } = require('child_process');
const path = require('path');
const { farmState } = require('./state');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
    path: '/socket.io',
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));

let botProcess = null;
let botRunning = false;

app.get('/api/state', (req, res) => {
    res.json(farmState.getState());
});

app.post('/api/sync', (req, res) => {
    const { user, lands, friends, operationLimits, backpack, isConnected, serverTime, logs } = req.body;
    if (user) farmState.setUser(user);
    if (lands) farmState.setLands(lands);
    if (friends) farmState.setFriends(friends);
    if (operationLimits) farmState.setOperationLimits(operationLimits);
    if (backpack) farmState.setBackpack(backpack);
    if (typeof isConnected === 'boolean') farmState.setConnected(isConnected);
    if (serverTime) farmState.setServerTime(serverTime);
    if (logs) {
        logs.forEach(log => farmState.addLog(log));
    }
    io.emit('state', farmState.getState());
    io.emit('botStatus', { running: botRunning });
    res.json({ success: true });
});

app.get('/api/status', (req, res) => {
    res.json({
        running: botRunning,
        pid: botProcess ? botProcess.pid : null,
    });
});

app.post('/api/start-bot', (req, res) => {
    const { code, platform, interval, friendInterval, ...autoSettings } = req.body;
    
    console.log('[Web] Received start-bot request:', { code: code?.substring(0,8), platform, interval, friendInterval, autoSettings });
    
    if (botRunning) {
        return res.json({ success: false, message: 'Bot already running' });
    }

    const args = ['client.js', '--code', code, '--api', '--sync-url', 'http://localhost:3001/api/sync'];
    if (platform === 'wx') args.push('--wx');
    if (interval) args.push('--interval', String(interval));
    if (friendInterval) args.push('--friend-interval', String(friendInterval));

    // Add auto settings as command line arguments (only when false to override defaults)
    if (autoSettings.autoHarvest === false) args.push('--no-auto-harvest');
    if (autoSettings.autoRemove === false) args.push('--no-auto-remove');
    if (autoSettings.autoPlant === false) args.push('--no-auto-plant');
    if (autoSettings.autoFertilize === false) args.push('--no-auto-fertilize');
    if (autoSettings.autoWeed === false) args.push('--no-auto-weed');
    if (autoSettings.autoPest === false) args.push('--no-auto-pest');
    if (autoSettings.autoWater === false) args.push('--no-auto-water');
    if (autoSettings.autoUpgrade === false) args.push('--no-auto-upgrade');
    if (autoSettings.autoUnlock === false) args.push('--no-auto-unlock');
    if (autoSettings.autoFriendVisit === false) args.push('--no-auto-friend');
    if (autoSettings.autoHelp === false) args.push('--no-auto-help');
    if (autoSettings.autoSteal === false) args.push('--no-auto-steal');
    if (autoSettings.autoSell === false) args.push('--no-auto-sell');

    console.log(`[Web] Starting bot: node ${args.join(' ')}`);

    botProcess = spawn('node', args, {
        cwd: path.join(__dirname, '..'),
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false,
    });

    botRunning = true;
    farmState.setConnected(false);
    io.emit('botStatus', { running: true });

    botProcess.stdout.on('data', (data) => {
        const msg = data.toString();
        console.log(`[Bot] ${msg}`);
        io.emit('botLog', msg);
    });

    botProcess.stderr.on('data', (data) => {
        const msg = data.toString();
        console.error(`[Bot Error] ${msg}`);
        io.emit('botError', msg);
    });

    botProcess.on('error', (err) => {
        console.error(`[Web] Bot process error: ${err.message}`);
        botRunning = false;
        botProcess = null;
        io.emit('botError', err.message);
    });

    botProcess.on('exit', (code) => {
        console.log(`[Web] Bot exited with code ${code}`);
        botRunning = false;
        botProcess = null;
        farmState.setConnected(false);
        io.emit('botStatus', { running: false });
    });

    res.json({ success: true, message: 'Bot started' });
});

app.post('/api/stop-bot', (req, res) => {
    if (!botRunning || !botProcess) {
        return res.json({ success: false, message: 'Bot not running' });
    }

    botProcess.kill('SIGINT');
    res.json({ success: true, message: 'Bot stopping...' });
});

app.post('/api/refresh-data', async (req, res) => {
    if (!botRunning || !botProcess) {
        return res.json({ success: false, message: '请先启动 Bot' });
    }

    // 触发 bot 立即刷新数据
    const { fetchFarmData } = require('./farm');
    const { fetchFriends } = require('./friend');
    try {
        await fetchFarmData();
        await fetchFriends();
    } catch (err) {
        console.error('refresh error:', err.message);
    }
    res.json({ success: true });
});

app.get('/api/game-data', (req, res) => {
    // 直接从 farmState 获取最新数据（bot 已同步）
    const state = farmState.getState();
    res.json({
        user: state.user,
        lands: state.lands,
        friends: state.friends,
        operationLimits: state.operationLimits,
        backpack: state.backpack,
        isConnected: state.isConnected,
        serverTime: state.serverTime,
    });
});

app.get('/api/logs', (req, res) => {
    const limit = parseInt(req.query.limit) || 100;
    res.json(farmState.logs.slice(0, limit));
});

app.post('/api/logs/clear', (req, res) => {
    farmState.clearLogs();
    res.json({ success: true });
});

app.get('/api/settings', (req, res) => {
    res.json(farmState.settings);
});

app.post('/api/settings', (req, res) => {
    const settings = req.body;
    farmState.updateSettings(settings);
    res.json(farmState.settings);
});

app.post('/api/action/harvest', (req, res) => {
    io.emit('action', { type: 'harvest', data: req.body });
    res.json({ success: true, message: 'Harvest action triggered' });
});

app.post('/api/action/water', (req, res) => {
    io.emit('action', { type: 'water', data: req.body });
    res.json({ success: true, message: 'Water action triggered' });
});

app.post('/api/action/weed', (req, res) => {
    io.emit('action', { type: 'weed', data: req.body });
    res.json({ success: true, message: 'Weed action triggered' });
});

app.post('/api/action/insecticide', (req, res) => {
    io.emit('action', { type: 'insecticide', data: req.body });
    res.json({ success: true, message: 'Insecticide action triggered' });
});

app.post('/api/action/plant', (req, res) => {
    io.emit('action', { type: 'plant', data: req.body });
    res.json({ success: true, message: 'Plant action triggered' });
});

app.post('/api/action/fertilize', (req, res) => {
    io.emit('action', { type: 'fertilize', fertilizerId: req.body.fertilizerId, landIds: req.body.landIds });
    res.json({ success: true, message: 'Fertilize action triggered' });
});

app.post('/api/action/check-farm', (req, res) => {
    io.emit('action', { type: 'checkFriends' });
    res.json({ success: true, message: 'Check friends action triggered' });
});

app.get('/api/game-config/plants', (req, res) => {
    try {
        const { getAllPlants } = require('./gameConfig');
        res.json(getAllPlants());
    } catch (e) {
        res.json([]);
    }
});

app.get('/api/game-config/items', (req, res) => {
    try {
        const { getAllItems } = require('./gameConfig');
        res.json(getAllItems());
    } catch (e) {
        res.json([]);
    }
});

io.on('connection', (socket) => {
    console.log('[Web] Client connected:', socket.id);
    socket.emit('state', farmState.getState());
    socket.emit('botStatus', { running: botRunning });

    socket.on('botConfig', (config) => {
        console.log('[Web] Received botConfig:', config);
        farmState.updateSettings(config);
    });

    socket.on('disconnect', () => {
        console.log('[Web] Client disconnected:', socket.id);
    });
});

farmState.on('userUpdate', (user) => {
    io.emit('userUpdate', user);
});

farmState.on('landsUpdate', (lands) => {
    io.emit('landsUpdate', lands);
});

farmState.on('friendsUpdate', (friends) => {
    io.emit('friendsUpdate', friends);
});

farmState.on('logUpdate', (log) => {
    io.emit('logUpdate', log);
});

farmState.on('operationLimitsUpdate', (limits) => {
    io.emit('operationLimitsUpdate', limits);
});

farmState.on('connectionUpdate', (connected) => {
    io.emit('connectionUpdate', connected);
});

farmState.on('settingsUpdate', (settings) => {
    io.emit('settingsUpdate', settings);
});

let apiServer = null;

function startApiServer(port = 3001) {
    if (apiServer || server.listening) {
        console.log(`[Web API] Server already running on port ${port}`);
        return;
    }
    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`[Web API] Port ${port} already in use, skipping server start`);
        }
    });
    apiServer = server.listen(port, () => {
        console.log(`[Web API] Server running on http://localhost:${port}`);
    });
}

function stopApiServer() {
    if (apiServer) {
        server.close();
        apiServer = null;
    }
}

function isApiServerRunning() {
    return apiServer !== null;
}

function getIo() {
    return io;
}

module.exports = { startApiServer, stopApiServer, isApiServerRunning, getIo, app, io };
