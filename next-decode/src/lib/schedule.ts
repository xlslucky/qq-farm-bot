const LAND_LEVEL_LABELS: Record<string, string> = { '1': '普通', '2': '红土', '3': '黑土', '4': '金土' };

function getCurrentSec() {
    return Math.floor(Date.now() / 1000);
}

export function formatRemainTime(sec: number): string {
    if (sec <= 0) return '可收获';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) {
        return `${h}小时${m}分钟`;
    }
    return `${m}分${s.toString().padStart(2, '0')}秒`;
}

export function formatHourMinute(sec: number): string {
    if (sec <= 0) return '00.00';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return `${h.toString().padStart(2, '0')}.${m.toString().padStart(2, '0')}`;
}

export interface MatureInfo {
    landId: string;
    landName: string;
    remainSec: number;
    matureSec: number;
    landLevel: number;
    landLevelLabel: string;
}

export interface MatureGroup {
    time: number;
    lands: MatureInfo[];
}

export function getMatureInfo(land: any): MatureInfo | null {
    if (!land.plant) return null;
    const plantPhases = land.plant.phases;
    if (!plantPhases || plantPhases.length === 0) return null;
    const maturePhase = plantPhases.find((p: any) => p.phase === 6);
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
        landLevelLabel: LAND_LEVEL_LABELS[String(landLevel)] || '普通',
    };
}

export function groupMatureTimes(infos: MatureInfo[]): MatureGroup[] {
    if (infos.length === 0) return [];
    const groups: MatureGroup[] = [];
    let currentGroup: MatureInfo[] = [];
    let groupTime = 0;

    for (const info of infos) {
        const isHarvestable = info.remainSec <= 0;
        if (currentGroup.length === 0) {
            currentGroup.push(info);
            groupTime = info.remainSec;
        } else {
            const currentIsHarvestable = currentGroup[0].remainSec <= 0;
            if (isHarvestable && currentIsHarvestable) {
                currentGroup.push(info);
            } else if (!isHarvestable && !currentIsHarvestable && Math.abs(info.remainSec - groupTime) <= 600) {
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

export function getMatureGroups(lands: any[]): MatureGroup[] {
    const unlockedLands = lands.filter((l: any) => l.unlocked);
    const matureInfos = unlockedLands
        .map((land) => getMatureInfo(land))
        .filter(Boolean)
        .sort((a, b) => a!.remainSec - b!.remainSec) as MatureInfo[];
    return groupMatureTimes(matureInfos);
}

export function buildMatureSchedule(lands: any[]): string {
    const groups = getMatureGroups(lands);

    if (groups.length === 0) return '';

    let output = '\n========== 成熟时间表 ==========\n';
    for (const group of groups) {
        const status = group.time <= 0 ? '可收获' : formatRemainTime(group.time);
        output += `\n[${status}] - ${group.lands.length}块土地\n`;
        for (const land of group.lands) {
            const remain = land.remainSec <= 0 ? '可收获' : formatRemainTime(land.remainSec);
            output += `  ${land.landLevelLabel}#${String(land.landId).padStart(2, '0')} | ${land.landName} | ${remain}\n`;
        }
    }
    const harvestable = lands.filter((l: any) => l.plant?.phases?.some((p: any) => p.phase === 6));
    output += `\n可收获: ${harvestable.length}块\n`;

    return output;
}