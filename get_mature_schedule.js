const fs = require('fs');
const path = require('path');

const LAND_LEVEL_LABELS = { 1: '普通', 2: '红土', 3: '黑土', 4: '金土' };

function getCurrentSec() {
    return Math.floor(Date.now() / 1000);
}

function getCurrentPhase(plant) {
    if (!plant || !plant.phases) return null;
    const phases = plant.phases;
    if (!phases || phases.length === 0) return null;
    const now = Date.now();

    for (let i = phases.length - 1; i >= 0; i--) {
        const beginTime = Number(phases[i].begin_time) * 1000;
        if (beginTime > 0 && beginTime <= now) {
            return phases[i];
        }
    }
    return phases[0];
}

function getMatureInfo(land) {
    if (!land.plant) return null;
    const plantPhases = land.plant.phases;
    if (!plantPhases || plantPhases.length === 0) return null;
    const maturePhase = plantPhases.find((p) => p.phase === 6);
    if (!maturePhase) return null;
    const matureSec = Number(maturePhase.begin_time);
    if (!matureSec) return null;
    const nowSec = getCurrentSec();
    const remainSec = matureSec - nowSec;
    const landLevel = Number(land.level) || 1;
    return {
        landId: land.id,
        landName: land.plant.name,
        remainSec,
        matureSec,
        landLevel,
        landLevelLabel: LAND_LEVEL_LABELS[landLevel] || '普通',
    };
}

function groupMatureTimes(infos) {
    if (infos.length === 0) return [];
    const groups = [];
    let currentGroup = [];
    let groupTime = 0;

    for (const info of infos) {
        if (currentGroup.length === 0) {
            currentGroup.push(info);
            groupTime = info.remainSec;
        } else {
            if (Math.abs(info.remainSec - groupTime) <= 600) {
                currentGroup.push(info);
            } else {
                groups.push({ time: groupTime, lands: currentGroup });
                currentGroup = [info];
                groupTime = info.remainSec;
            }
        }
    }
    if (currentGroup.length > 0) {
        groups.push({ time: groupTime, lands: currentGroup });
    }
    return groups;
}

function getMatureSchedule(lands) {
    const unlockedLands = lands.filter((l) => l.unlocked);
    const matureInfos = unlockedLands
        .map((land) => getMatureInfo(land))
        .filter(Boolean)
        .sort((a, b) => a.remainSec - b.remainSec);

    return groupMatureTimes(matureInfos);
}

function getHarvestableLands(lands) {
    return lands.filter((l) => {
        const phase = getCurrentPhase(l.plant);
        return phase?.phase === 6;
    });
}

module.exports = {
    getMatureSchedule,
    getHarvestableLands,
    getCurrentPhase,
    getMatureInfo,
    groupMatureTimes,
};

function formatRemainTime(sec) {
    if (sec <= 0) return '\x1b[32m可收获\x1b[0m';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) {
        return `${h}小时${m}分钟`;
    }
    return `${m}分${s.toString().padStart(2, '0')}秒`;
}

const LAND_COLORS = {
    1: '\x1b[33m',   // 黄色 (普通)
    2: '\x1b[31m',   // 红色 (红土)
    3: '\x1b[90m',   // 灰色 (黑土)
    4: '\x1b[93m',   // 亮黄色 (金土)
};
const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const BLUE = '\x1b[34m';
const GRAY = '\x1b[90m';

function main() {
    const args = process.argv.slice(2);
    let lands;

    if (args.includes('-sample')) {
        const nowSec = getCurrentSec();
        lands = [
            { id: 1, unlocked: true, level: 1, plant: { name: '小麦', phases: [{ phase: 6, begin_time: nowSec + 3600 }] } },
            { id: 2, unlocked: true, level: 1, plant: { name: '玉米', phases: [{ phase: 6, begin_time: nowSec + 7200 }] } },
            { id: 3, unlocked: true, level: 2, plant: { name: '水稻', phases: [{ phase: 6, begin_time: nowSec + 5400 }] } },
            { id: 4, unlocked: true, level: 1, plant: { name: '大豆', phases: [{ phase: 6, begin_time: nowSec + 9000 }] } },
            { id: 5, unlocked: true, level: 3, plant: { name: '胡萝卜', phases: [{ phase: 6, begin_time: nowSec + 3600 * 5 }] } },
        ];
    } else {
        const landsFile = path.join(__dirname, 'lands.json');
        if (!fs.existsSync(landsFile)) {
            console.error('找不到 lands.json，请先创建');
            process.exit(1);
        }
        const data = JSON.parse(fs.readFileSync(landsFile, 'utf-8'));
        lands = data.lands || data;
    }

    const schedule = getMatureSchedule(lands);

    console.log('\n成熟时间表:\n');
    console.log('='.repeat(60));

    if (schedule.length === 0) {
        console.log('没有正在生长的作物');
    } else {
        for (const group of schedule) {
            const statusColor = group.time <= 0 ? GREEN : BLUE;
            const status = group.time <= 0 ? '可收获' : formatRemainTime(group.time);
            console.log(`\n[${statusColor}${status}${RESET}] - ${group.lands.length}块土地`);
            for (const land of group.lands) {
                const remain = land.remainSec <= 0 ? '可收获' : formatRemainTime(land.remainSec);
                const color = LAND_COLORS[land.landLevel] || LAND_COLORS[1];
                const remainColor = land.remainSec <= 0 ? GREEN : GRAY;
                console.log(`  ${color}${land.landLevelLabel}${RESET}#${land.landId.toString().padStart(2, '0')} | ${land.landName} | ${remainColor}${remain}${RESET}`);
            }
        }
    }

    const harvestable = getHarvestableLands(lands);
    console.log('\n' + '='.repeat(60));
    console.log(`${GREEN}可收获: ${harvestable.length}块${RESET}`);

    console.log('\n使用方式:');
    console.log('  node get_mature_schedule.js');
    console.log('  node get_mature_schedule.js -sample');
}

main();