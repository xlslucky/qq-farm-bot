import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFarmState, useLogs, useSettings, clearLogs, triggerAction } from '@/hooks/useApi';
import { useBotStatus } from '@/hooks/useApi';
import type { Settings } from '@/types';
import {
  Home,
  Users,
  FileText,
  Settings as SettingsIcon,
  RefreshCw,
  Trash2,
  Power,
  PowerOff,
  Sprout,
  Heart,
  Coins,
  Sparkles,
  Sun,
  Backpack,
  Search,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
dayjs.extend(duration);
import { cn } from './lib/utils';

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString();
}

function formatRemainTime(sec: number): string {
  if (sec <= 0) return '00:00:00';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

interface RoleLevel {
  level: number;
  exp: number;
}

function getLevelExp(roleLevels: RoleLevel[], level: number, totalExp: number): { current: number; required: number } {
  const currentLevelExp = roleLevels.find(r => r.level === level)?.exp || 0;
  const nextLevelExp = roleLevels.find(r => r.level === level + 1)?.exp || (currentLevelExp + 10000);
  return {
    current: totalExp - currentLevelExp,
    required: nextLevelExp - currentLevelExp,
  };
}

function getCurrentPhase(plant: any) {
  if (!plant || !plant.phases) return null;
  const phases = plant.phases;
  if (!phases || phases.length === 0) return null;
  const now = Date.now();

  for (let i = phases.length - 1; i >= 0; i--) {
    const beginTime = Number(phases[i].begin_time) * 1000
    if (beginTime > 0 && beginTime <= now) {
      return phases[i];
    }
  }
  return phases[0];
}

function getPhaseList(plant: any, plantConfig: any): { name: string; progress: number; isCurrent: boolean; isPast: boolean }[] {
  if (!plant?.phases || plant.phases.length === 0) return [];
  
  const phaseNames: string[] = [];
  if (plantConfig?.grow_phases) {
    plantConfig.grow_phases.split(';').filter((p: string) => p).forEach((p: string) => {
      const [name, hours] = p.split(':');
      if (parseInt(hours) > 0) phaseNames.push(name);
    });
  }
  phaseNames.push('成熟');
  
  if (phaseNames.length === 0) return [];
  
  const now = Date.now();
  const serverTimeSec = Math.floor(now / 1000);
  const result: { name: string; progress: number; isCurrent: boolean; isPast: boolean }[] = [];
  
  for (let i = 0; i < phaseNames.length; i++) {
    const beginTime = Number(plant.phases[i]?.begin_time);
    const nextBeginTime = Number(plant.phases[i + 1]?.begin_time) || (beginTime > 0 ? beginTime + 3600 : 0);
    
    if (beginTime === 0 || nextBeginTime === 0) {
      result.push({ name: phaseNames[i], progress: 0, isCurrent: false, isPast: false });
      continue;
    }
    
    const isPast = serverTimeSec >= nextBeginTime;
    const isCurrent = serverTimeSec >= beginTime && serverTimeSec < nextBeginTime;
    let progress = 0;
    
    if (isPast) {
      progress = 100;
    } else if (isCurrent) {
      const duration = nextBeginTime - beginTime;
      progress = duration > 0 ? Math.round((serverTimeSec - beginTime) / duration * 100) : 100;
    }
    
    result.push({ name: phaseNames[i], progress, isCurrent, isPast });
  }
  
  return result;
}

function LandCard({ land, plantsData }: { land: any; plantsData: Record<number, any> }) {
  const plantName = land.plant?.name || '空地';
  const plantConfig = plantsData[land.plant?.id];
  const phaseList = getPhaseList(land.plant, plantConfig);
  const isMature = phaseList.length > 0 && phaseList[phaseList.length - 1].isPast;
  const isWithered = land.plant?.phases?.some((p: any) => p.phase === 7);
  const landLevel = Number(land.level) || 1;

  const landLevelStyles: Record<number, { bg: string; border: string; label: string; tag: string }> = {
    1: { bg: 'bg-amber-50 dark:bg-amber-900/50', border: 'border-amber-200 dark:border-amber-700', label: '普通', tag: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' },
    2: { bg: 'bg-rose-50 dark:bg-rose-900/50', border: 'border-rose-200 dark:border-rose-700', label: '红土', tag: 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300' },
    3: { bg: 'bg-zinc-100 dark:bg-zinc-700/50', border: 'border-zinc-300 dark:border-zinc-600', label: '黑土', tag: 'bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200' },
    4: { bg: 'bg-yellow-100 dark:bg-yellow-700/50', border: 'border-yellow-300 dark:border-yellow-600', label: '金土', tag: 'bg-yellow-200 text-yellow-700 dark:bg-yellow-700/50 dark:text-yellow-200' },
  };
  const levelStyle = landLevelStyles[landLevel] || landLevelStyles[1];

  const growPhasesList: { name: string; hours: number }[] = (plantConfig?.grow_phases?.split(';').filter((t: string) => t).map((txt: string) => {
    const parts = txt.split(':');
    return { name: parts[0], hours: parseInt(parts[1]) || 0 };
  }) || [])

  return (
    <div className={cn(
      "p-2 rounded-xl text-xs transition-all hover:scale-[1.02] border-2 overflow-visible",
      isWithered ? 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600' : isMature ? 'bg-green-100 dark:bg-green-900/40 border-green-300 dark:border-green-700' : `${levelStyle.bg} ${levelStyle.border}`
    )}>
      <div className="flex justify-between items-center mb-1.5">
        <div className="flex items-center gap-1 truncate">
          <span className={cn("text-[9px] px-1.5 py-0.5 rounded font-medium shrink-0", levelStyle.tag)}>
            {levelStyle.label} #{land.id.toString().padStart(2, '0')}
          </span>
          <span className="font-semibold truncate text-foreground">{plantName}</span>
        </div>
        {land.plant?.mutant_config_ids?.length ? (
          <span 
            className="text-purple-500 cursor-help shrink-0" 
            title={land.plant.mutant_config_ids.map((m: any) => getMutantLabel(m) + (getMutantEffect(m) || '')).join(' ')}
          >
            {land.plant.mutant_config_ids.map((m: any) => getMutantLabel(m)).filter(Boolean).join('')}
          </span>
        ) : <div className="w-4" />}
      </div>
      
      {land.plant ? (
        <>
          {growPhasesList.length > 0 ? (
          <div className="flex h-2.5 bg-white/50 dark:bg-white/20 rounded-full overflow-hidden">
            {
              growPhasesList.map((phaseConfig: { name: string; hours: number }, index: number) => {
                const plantPhase = land.plant.phases[land.plant.phases.length - growPhasesList.length + index];
                const phaseSec = phaseConfig.hours;
                const beginTimeSec = plantPhase ? Number(plantPhase.begin_time) : 0;
                const endTimeSec = beginTimeSec + phaseSec;
                const now = dayjs();
                const isPast = !plantPhase || beginTimeSec > 0 && now.unix() > endTimeSec;
                const isCurrent = beginTimeSec > 0 && now.unix() >= beginTimeSec && now.unix() <= endTimeSec;
                
                let progress = 0;
                if (isPast) progress = 100;
                else if (isCurrent) {
                  const total = phaseSec;
                  const elapsed = now.unix() - beginTimeSec;
                  progress = Math.round((elapsed / total) * 100);
                }
                
                return (
                  <div key={index} className="flex-1 flex">
                    <div 
                      className={cn('h-full rounded-full', isPast ? 'bg-gradient-to-r from-emerald-400 to-green-500' : isCurrent ? 'bg-gradient-to-r from-blue-400 to-cyan-500' : 'bg-gray-200 dark:bg-gray-600')}
                      style={{ width: `${progress}%` }}
                    />
                    <div className={cn('flex-1', !isPast && !isCurrent ? 'bg-gray-200 dark:bg-gray-600' : '')} />
                  </div>
                );
              })
            }
          </div>
          ) : (
            <div className="text-xs text-center text-muted-foreground py-2">生长数据未知</div>
          )}
          
          {growPhasesList.length > 0 && (
          <div className="flex justify-between text-[9px] mt-1">
            {
              growPhasesList.map((phaseConfig: { name: string; hours: number }, index: number) => {
                const plantPhase = land.plant.phases[land.plant.phases.length - growPhasesList.length + index];
                const phaseSec = phaseConfig.hours;
                const beginTimeSec = plantPhase ? Number(plantPhase.begin_time) : 0;
                const endTimeSec = beginTimeSec + phaseSec;
                const now = dayjs();
                const isPast = !plantPhase || beginTimeSec > 0 && now.unix() > endTimeSec;
                const isCurrent = beginTimeSec > 0 && now.unix() >= beginTimeSec && now.unix() <= endTimeSec;
                
                let timeStr = '';
                if (isCurrent) {
                  timeStr = formatRemainTime(endTimeSec - now.unix());
                }
                
                return (
                  <span key={index} className="flex-1 text-center">
                    <span className={cn(isCurrent ? 'text-blue-600 dark:text-blue-400 font-semibold' : isPast ? 'text-green-600 dark:text-green-400' : 'text-foreground/60')}>
                      {phaseConfig.name}
                    </span>
                    {isCurrent && <div className="text-[8px] text-blue-500 dark:text-blue-300 font-mono">{timeStr}</div>}
                  </span>
                );
              })
            }
          </div>
          )}
          
          {(() => {
            const lastPhase = growPhasesList[growPhasesList.length - 1];
            if (!lastPhase || !land.plant) return null;
            const lastPlantPhase = land.plant.phases[land.plant.phases.length - 1];
            if (!lastPlantPhase) return null;
            const matureTimeSec = Number(lastPlantPhase.begin_time) + lastPhase.hours;
            const nowSec = dayjs().unix();
            const remainSec = matureTimeSec - nowSec;
            
            return (
              <div className="flex justify-between items-center text-[10px] mt-1">
                  <div className="flex gap-2">
                    <span className="text-amber-500 dark:text-amber-400">💰 {plantConfig?.fruit?.count || 0}</span>
                    <span className="text-purple-500 dark:text-purple-400">⚡ {plantConfig?.exp || 0}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={cn(
                      "font-mono font-medium mr-1",
                      isWithered ? 'text-gray-500 dark:text-gray-400' : remainSec <= 0 ? 'text-green-600 dark:text-green-400' : 'text-orange-500 dark:text-orange-400'
                    )}>
                      {isWithered ? '🥀 枯萎' : remainSec <= 0 ? '✨ 可收获' : `⏱ ${formatRemainTime(remainSec)}`}
                    </span>
                    {!isWithered && (
                      <>
                        <button
                          onClick={() => {
                            if (confirm(`确认对 ${land.plant?.name || '这块地'} 施普通肥？`)) {
                              triggerAction('fertilize', { fertilizerId: 1011, landIds: [land.id] });
                            }
                          }}
                          className="text-[9px] px-1.5 py-0.5 bg-amber-100 text-amber-600 rounded-full dark:bg-amber-900/50 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-800/50"
                        >
                          普肥
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`确认对 ${land.plant?.name || '这块地'} 施有机肥？`)) {
                              triggerAction('fertilize', { fertilizerId: 1012, landIds: [land.id] });
                            }
                          }}
                          className="text-[9px] px-1.5 py-0.5 bg-purple-100 text-purple-600 rounded-full dark:bg-purple-900/50 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-800/50"
                        >
                          有机
                        </button>
                      </>
                    )}
                  </div>
              </div>
            );
          })()}
          
          <div className="mt-1 flex gap-1.5 flex-wrap">
            {land.plant.dry_num > 0 && (
              <span className="text-[9px] px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded-full dark:bg-blue-900/50 dark:text-blue-400">💧 缺水</span>
            )}
            {(land.plant.weed_owners?.length || 0) > 0 && (
              <span className="text-[9px] px-1.5 py-0.5 bg-yellow-100 text-yellow-600 rounded-full dark:bg-yellow-900/50 dark:text-yellow-400">🌿 有草</span>
            )}
            {(land.plant.insect_owners?.length || 0) > 0 && (
              <span className="text-[9px] px-1.5 py-0.5 bg-red-100 text-red-600 rounded-full dark:bg-red-900/50 dark:text-red-400">🐛 有虫</span>
            )}
          </div>

        </>
      ) : (
        <div className="flex items-center justify-center py-3">
          <div className="text-center">
            <Sprout className="h-5 w-5 mx-auto text-muted-foreground/50" />
            <p className="text-[10px] text-muted-foreground mt-1">空地</p>
          </div>
        </div>
      )}
    </div>
  );
}

interface PlantData {
  id: number;
  name: string;
  exp: number;
  fruit: { id: number; count: number };
  grow_phases?: string;
}

function Dashboard() {
  const { state, loading, refetch } = useFarmState();
  const [refreshing, setRefreshing] = useState(false);
  const [plantsData, setPlantsData] = useState<Record<number, PlantData>>({});
  const [roleLevels, setRoleLevels] = useState<RoleLevel[]>([]);

  useEffect(() => {
    Promise.all([
      fetch('/gameConfig/Plant.json').then(r => r.json()),
      fetch('/gameConfig/RoleLevel.json').then(r => r.json()),
    ])
      .then(([plantData, roleData]) => {
        const map: Record<number, PlantData> = {};
        plantData.forEach((p: PlantData) => { map[p.id] = p; });
        setPlantsData(map);
        setRoleLevels(roleData);
      })
      .catch(() => {});
  }, []);

  const { user, lands, isConnected, backpack } = state || {};
  const unlockedLands = lands?.filter((l: any) => l.unlocked) || [];

  const notifiedRef = useRef<Set<string>>(new Set());
  
  useEffect(() => {
    if (!lands || !plantsData || !unlockedLands.length) return;
    
    const checkMaturing = () => {
      const nowSec = dayjs().unix();
      const threshold = 600;
      
      const candidates: {landId: number; name: string; remainSec: number}[] = [];
      
      for (const land of unlockedLands) {
        if (!land.plant || !land.plant.phases || land.plant.phases.length === 0) continue;
        
        const plantName = land.plant.name;
        const plantConfig = Object.values(plantsData).find((p: PlantData) => p.name === plantName);
        if (!plantConfig?.grow_phases) continue;
        
        const growPhasesList = plantConfig.grow_phases.split(';').filter((t: string) => t).map((txt: string) => {
          const parts = txt.split(':');
          return { hours: parseInt(parts[1]) || 0 };
        });
        if (growPhasesList.length === 0) continue;
        
        const lastPhase = growPhasesList[growPhasesList.length - 1];
        const plantPhases = land.plant.phases;
        const lastPlantPhase = plantPhases[plantPhases.length - 1];
        if (!lastPlantPhase) continue;
        
        const matureSec = Number(lastPlantPhase.begin_time) + lastPhase.hours;
        const remainSec = matureSec - nowSec;
        
        if (remainSec > 0 && remainSec <= threshold) {
          candidates.push({ landId: land.id, name: plantName, remainSec });
        }
      }
      
      if (candidates.length > 0) {
        candidates.sort((a, b) => a.remainSec - b.remainSec);
        
        const groupKey = candidates.map(c => `${c.landId}`).join(',');
        if (!notifiedRef.current.has(groupKey)) {
          notifiedRef.current.add(groupKey);
          if (Notification.permission === 'granted') {
            const list = candidates.map(c => `#${c.landId} ${c.name}`).join(', ');
            new Notification('作物即将成熟', {
              body: `${list} 剩余 ${formatRemainTime(candidates[0].remainSec)}`,
              icon: '/favicon.ico'
            });
          }
        }
      }
    };
    
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
    
    const timer = setTimeout(checkMaturing, 3000);
    return () => clearTimeout(timer);
  }, [lands, plantsData, unlockedLands.length]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleBatchFertilizeClick = (type: 'normal' | 'organic') => {
    const input = prompt('请输入分钟数（小于此分钟数成熟的作物将被施肥）:', '10');
    if (!input) return;
    const minutes = parseInt(input);
    if (isNaN(minutes) || minutes <= 0) {
      alert('请输入有效的分钟数');
      return;
    }
    
    const threshold = minutes * 60;
    const nowSec = dayjs().unix();
    const candidates: {landId: number; name: string; remainSec: number}[] = [];
    
    for (const land of unlockedLands) {
      if (!land.plant || !land.plant.phases || land.plant.phases.length === 0) continue;
      
      const plantName = land.plant.name;
      const plantConfig = Object.values(plantsData).find((p: PlantData) => p.name === plantName);
      if (!plantConfig?.grow_phases) continue;
      
      const growPhasesList = plantConfig.grow_phases.split(';').filter((t: string) => t).map((txt: string) => {
        const parts = txt.split(':');
        return { hours: parseInt(parts[1]) || 0 };
      });
      if (growPhasesList.length === 0) continue;
      
      const lastPhase = growPhasesList[growPhasesList.length - 1];
      const plantPhases = land.plant.phases;
      const lastPlantPhase = plantPhases[plantPhases.length - 1];
      if (!lastPlantPhase) continue;
      
      const matureSec = Number(lastPlantPhase.begin_time) + lastPhase.hours;
      const remainSec = matureSec - nowSec;
      
      if (remainSec > 0 && remainSec <= threshold) {
        candidates.push({ landId: land.id, name: plantName, remainSec });
      }
    }
    
    if (candidates.length === 0) {
      alert(`没有小于 ${minutes} 分钟成熟的作物`);
      return;
    }
    
    candidates.sort((a, b) => a.remainSec - b.remainSec);
    const fertilizerName = type === 'normal' ? '普通肥' : '有机肥';
    
    const totalFertilizer = candidates.length;
    const totalTimeSec = candidates.reduce((sum, c) => sum + c.remainSec, 0);
    const avgTimeSec = Math.round(totalTimeSec / candidates.length);
    
    const list = candidates.map(c => `#${c.landId} ${c.name} (${formatRemainTime(c.remainSec)})`).join('\n');
    const confirmMsg = `确认给以下 ${candidates.length} 块地施${fertilizerName}？\n\n汇总：共 ${totalFertilizer} 份化肥，总剩余 ${formatRemainTime(totalTimeSec)}，平均 ${formatRemainTime(avgTimeSec)}\n\n${list}`;
    
    if (confirm(confirmMsg)) {
      triggerAction('fertilize', { fertilizerId: type === 'normal' ? 1011 : 1012, landIds: candidates.map(c => c.landId) });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Sprout className="h-12 w-12 mx-auto text-primary animate-pulse" />
          <p className="mt-3 text-muted-foreground">正在加载中...</p>
        </div>
      </div>
    );
  }

  if (!state?.user) {
    return (
      <div className="text-center py-12">
        <div className="mb-4">
          <Sprout className="h-16 w-16 mx-auto text-muted-foreground/30" />
        </div>
        <p className="text-muted-foreground text-lg">等待连接...</p>
        <p className="text-sm text-muted-foreground mt-2">请先运行 bot: node client.js --code xxx</p>
      </div>
    );
  }

  const formatSec = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getItemCount = (id: number) => backpack?.find((i: any) => i.id === id)?.count || 0;

  const getMatureInfo = (land: any) => {
    if (!land.plant) return null;
    const isWithered = land.plant.phases?.some((p: any) => p.phase === 7);
    if (isWithered) return null;
    const plantName = land.plant.name;
    const plantConfig = Object.values(plantsData).find((p: PlantData) => p.name === plantName);
    if (!plantConfig?.grow_phases) return null;
    const growPhasesList = plantConfig.grow_phases.split(';').filter((t: string) => t).map((txt: string) => {
      const parts = txt.split(':');
      return { hours: parseInt(parts[1]) || 0 };
    });
    if (growPhasesList.length === 0) return null;
    const lastPhase = growPhasesList[growPhasesList.length - 1];
    const plantPhases = land.plant.phases;
    if (!plantPhases || plantPhases.length === 0) return null;
    const lastPlantPhase = plantPhases[plantPhases.length - 1];
    if (!lastPlantPhase) return null;
    const matureSec = Number(lastPlantPhase.begin_time) + lastPhase.hours;
    const nowSec = dayjs().unix();
    const remainSec = matureSec - nowSec;
    const landLevel = Number(land.level) || 1;
    const landLevelLabels: Record<number, string> = { 1: '普通', 2: '红土', 3: '黑土', 4: '金土' };
    return { landId: land.id, landName: land.plant.name, remainSec, matureSec, landLevel, landLevelLabel: landLevelLabels[landLevel] || '普通' };
  };

  const matureInfos = unlockedLands.map(getMatureInfo).filter(Boolean).sort((a, b) => a!.remainSec - b!.remainSec) as { landId: number; landName: string; remainSec: number; matureSec: number; landLevel: number; landLevelLabel: string }[];

  const groupMatureTimes = (infos: typeof matureInfos) => {
    if (infos.length === 0) return [];
    const groups: { time: number; lands: typeof infos }[] = [];
    let currentGroup: typeof infos = [];
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
  };

  const matureGroups = groupMatureTimes(matureInfos);

  const harvestable = unlockedLands.filter((l: any) => getCurrentPhase(l.plant)?.phase === 6);
  const needWater = unlockedLands.filter((l: any) => l.plant?.dry_num > 0);
  const needWeed = unlockedLands.filter((l: any) => (l.plant?.weed_owners?.length || 0) > 0);
  const needBug = unlockedLands.filter((l: any) => (l.plant?.insect_owners?.length || 0) > 0);

  const levelExp = getLevelExp(roleLevels, user?.level || 1, user?.exp || 0);
  const toNextLevel = levelExp.required - levelExp.current;
  const landCount = unlockedLands.length;
  const avgExpPerLand = landCount > 0 ? Math.ceil(toNextLevel / landCount) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-3 h-3 rounded-full status-dot",
            isConnected ? 'bg-green-400 shadow-lg shadow-green-400/50' : 'bg-red-400 shadow-lg shadow-red-400/50'
          )} />
          <span className="text-sm text-muted-foreground">
            {isConnected ? '🟢 已连接' : '🔴 未连接'}
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} className="rounded-full">
          <RefreshCw className={cn("h-4 w-4", refreshing && 'animate-spin')} />
        </Button>
      </div>

      <div className="flex gap-4">
        <Card className="overflow-hidden flex-1">
          <div className="h-1.5 bg-gradient-to-r from-green-400 via-emerald-500 to-teal-400" />
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-pink-200 dark:from-primary/30 dark:to-pink-800/30 flex items-center justify-center">
                  <span className="text-xl">🌸</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{user?.name}</p>
                    <span className="text-xs text-purple-500">Lv.{user?.level}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Sparkles className="h-3 w-3 text-purple-500 shrink-0" />
                    <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden max-w-[100px]">
                      <div 
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all"
                        style={{ width: `${Math.min(100, (levelExp.current / levelExp.required) * 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-purple-600 dark:text-purple-400 font-mono">{levelExp.current}/{levelExp.required}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    升级还需 <span className="text-purple-600 dark:text-purple-400 font-medium">{toNextLevel.toLocaleString()}</span> 经验
                    {landCount > 0 && <span className="ml-2">（{landCount}块地平均 {avgExpPerLand.toLocaleString()}/块）</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="flex items-center gap-1.5">
                  <Coins className="h-4 w-4 text-amber-500" />
                  <span className="text-muted-foreground">金币</span>
                  <span className="font-medium text-amber-600 dark:text-amber-400">{user?.gold?.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Backpack className="h-4 w-4 text-amber-500" />
                  <span className="text-muted-foreground">背包</span>
                  <span className="font-medium text-amber-600 dark:text-amber-400">{backpack?.length || 0}</span>
                </div>
                {getItemCount(1002) > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-pink-500">✦</span>
                    <span className="text-muted-foreground">点劵</span>
                    <span className="font-medium text-pink-500">{getItemCount(1002).toLocaleString()}</span>
                  </div>
                )}
                {getItemCount(1011) > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-amber-600">◈</span>
                    <span className="text-muted-foreground">普肥</span>
                    <span className="font-medium text-amber-600 font-mono">{formatSec(getItemCount(1011))}</span>
                  </div>
                )}
                {getItemCount(1012) > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-purple-600">◇</span>
                    <span className="text-muted-foreground">有机</span>
                    <span className="font-medium text-purple-600 font-mono">{formatSec(getItemCount(1012))}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="w-64 shrink-0">
          <CardContent className="p-3 flex items-center justify-between gap-2">
            <div className={cn(
              "flex-1 py-1.5 rounded-lg text-center",
              harvestable.length > 0 ? 'bg-green-100 dark:bg-green-900/50' : 'bg-muted/50'
            )}>
              <div className={cn("text-lg font-bold", harvestable.length > 0 ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground')}>{harvestable.length}</div>
              <div className={cn("text-[10px]", harvestable.length > 0 ? 'text-green-700 dark:text-green-400' : 'text-muted-foreground')}>可收获</div>
            </div>
            <div className={cn(
              "flex-1 py-1.5 rounded-lg text-center",
              needWater.length > 0 ? 'bg-blue-100 dark:bg-blue-900/50' : 'bg-muted/50'
            )}>
              <div className={cn("text-lg font-bold", needWater.length > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground')}>{needWater.length}</div>
              <div className={cn("text-[10px]", needWater.length > 0 ? 'text-blue-700 dark:text-blue-400' : 'text-muted-foreground')}>缺水</div>
            </div>
            <div className={cn(
              "flex-1 py-1.5 rounded-lg text-center",
              needWeed.length > 0 ? 'bg-yellow-100 dark:bg-yellow-900/50' : 'bg-muted/50'
            )}>
              <div className={cn("text-lg font-bold", needWeed.length > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-muted-foreground')}>{needWeed.length}</div>
              <div className={cn("text-[10px]", needWeed.length > 0 ? 'text-yellow-700 dark:text-yellow-400' : 'text-muted-foreground')}>有草</div>
            </div>
            <div className={cn(
              "flex-1 py-1.5 rounded-lg text-center",
              needBug.length > 0 ? 'bg-red-100 dark:bg-red-900/50' : 'bg-muted/50'
            )}>
              <div className={cn("text-lg font-bold", needBug.length > 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground')}>{needBug.length}</div>
              <div className={cn("text-[10px]", needBug.length > 0 ? 'text-red-700 dark:text-red-400' : 'text-muted-foreground')}>有虫</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {matureGroups.length > 0 && (
          <Card className="lg:w-1/4">
            <CardHeader className="pb-2 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sun className="h-4 w-4 text-orange-500" />
                成熟时间表
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="space-y-2">
              {matureGroups.map((group, idx) => {
                const minTime = Math.min(...group.lands.map(l => l.remainSec));
                return (
                <div key={idx} className="flex items-center gap-2 flex-wrap">
                  <span className={cn(
                    "text-xs px-3 py-1.5 rounded-full font-medium font-mono",
                    minTime <= 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300'
                  )}>
                    {minTime <= 0 ? '✨ 可收获' : formatRemainTime(minTime)}
                  </span>
                  <div className="flex gap-1 flex-wrap">
                    {group.lands.map((land, i) => {
                      const levelStyle = {
                        1: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
                        2: 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300',
                        3: 'bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200',
                        4: 'bg-yellow-200 text-yellow-700 dark:bg-yellow-800/50 dark:text-yellow-300',
                      }[land.landLevel] || 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300';
                      return (
                        <div key={i} className="text-xs bg-muted/60 px-2 py-1 rounded-lg space-y-0.5">
                          <div className="flex items-center gap-1">
                            <span className={cn("text-[9px] px-1 py-0.5 rounded font-medium", levelStyle)}>
                              {land.landLevelLabel} #{land.landId.toString().padStart(2, '0')}
                            </span>
                            <span className="font-medium">{land.landName}</span>
                          </div>
                          <div className={cn("text-[10px] font-mono", land.remainSec <= 0 ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground')}>
                            {land.remainSec <= 0 ? '✨ 可收获' : formatRemainTime(land.remainSec)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )})}
            </div>
          </CardContent>
        </Card>
        )}

        <Card className="lg:flex-1">
          <CardHeader className="pb-2 px-4">
            <CardTitle className="text-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sprout className="h-4 w-4 text-green-500" />
                我的土地 ({unlockedLands.length})
              </div>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" className="h-7 text-xs px-2 rounded-full" onClick={() => handleBatchFertilizeClick('normal')}>
                  批量普肥
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-xs px-2 rounded-full" onClick={() => handleBatchFertilizeClick('organic')}>
                  批量有机
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {unlockedLands.map((land: any) => (
              <LandCard key={land.id} land={land} plantsData={plantsData} />
            ))}
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}

function Friends() {
  const { state, loading } = useFarmState();
  const [search, setSearch] = useState('');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Users className="h-12 w-12 mx-auto text-primary animate-pulse" />
          <p className="mt-3 text-muted-foreground">正在加载好友...</p>
        </div>
      </div>
    );
  }

  const friends = state?.friends || [];
  const filteredFriends = search.trim()
    ? friends.filter((f: any) => f.name?.includes(search) || f.remark?.includes(search))
    : friends;
  const sortedFriends = [...filteredFriends].sort((a: any, b: any) => (b.level || 0) - (a.level || 0));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Heart className="h-5 w-5 text-pink-500" />
          好友列表 ({sortedFriends.length}/{friends.length})
        </h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-8 w-32 rounded-full bg-muted/50 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
        {sortedFriends.map((friend: any, index: number) => (
          <Card key={friend.gid} className="overflow-hidden hover:shadow-md transition-shadow">
            <CardContent className="p-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground w-4">{index + 1}</span>
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/50 dark:to-pink-900/50 flex items-center justify-center shrink-0">
                  {friend.avatar_url ? (
                    <img src={friend.avatar_url} alt="" className="w-7 h-7 rounded-full" />
                  ) : (
                    <span className="text-sm">🌸</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-purple-500 font-medium shrink-0">Lv.{friend.level}</span>
                    <p className="text-sm font-semibold truncate">{friend.name}</p>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <span className="text-amber-500">
                      💰{friend.gold?.toLocaleString() || 0}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-1 mt-1 flex-wrap">
                {friend.plant?.steal_plant_num > 0 && (
                  <span className="text-[10px] text-green-600 bg-green-50 dark:bg-green-900/30 px-1 rounded" title="可偷">🎁{friend.plant.steal_plant_num}</span>
                )}
                {friend.plant?.dry_num > 0 && (
                  <span className="text-[10px] text-blue-500" title="干旱">💧{friend.plant.dry_num}</span>
                )}
                {friend.plant?.weed_num > 0 && (
                  <span className="text-[10px] text-yellow-500" title="杂草">🌿{friend.plant.weed_num}</span>
                )}
                {friend.plant?.insect_num > 0 && (
                  <span className="text-[10px] text-red-500" title="害虫">🐛{friend.plant.insect_num}</span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {sortedFriends.length === 0 && friends.length > 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            没有找到匹配的好友
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function getMutantLabel(mutant: any): string | null {
  const map: Record<number, string> = {
    1: '❄️',
    2: '❤️',
    3: '🌑',
    4: '💧',
  };
  const low = mutant?.low ?? mutant;
  return map[low] || null;
}

function getMutantEffect(mutant: any): string | null {
  const map: Record<number, string> = {
    1: '售价x3',
    2: '数量x3',
    3: '售价x2',
    4: '数量x2',
  };
  const low = mutant?.low ?? mutant;
  return map[low] || null;
}

function BackpackPanel() {
  const { state, loading } = useFarmState();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await triggerAction('refresh-backpack');
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Backpack className="h-12 w-12 mx-auto text-primary animate-pulse" />
          <p className="mt-3 text-muted-foreground">正在加载背包...</p>
        </div>
      </div>
    );
  }

  const items = state?.backpack || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Backpack className="h-5 w-5 text-amber-500" />
          背包 ({items.length})
        </h2>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} className="rounded-full">
          <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            背包为空
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {[
            { name: '果食', type: 6 },
            { name: '种子', type: 5 },
            { name: '道具', type: 0 },
          ].map(({ name, type }) => {
            const catItems = type === 0 
              ? items.filter((i: any) => i.type !== 6 && i.type !== 5 && ![1001, 1002, 1011, 1012, 1101].includes(i.id))
              : items.filter((i: any) => i.type === type);
            const sortedItems = [...catItems].sort((a, b) => a.id - b.id || a.uid - b.uid);
            if (sortedItems.length === 0) return null;
            return (
              <div key={name}>
                <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  {name}
                  <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full">{sortedItems.length}</span>
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1.5">
                  {sortedItems.map((item: any) => (
                    <Card key={item.uid || item.id} className="overflow-hidden bg-card/80 hover:bg-card transition-colors">
                      <CardContent className="p-2 space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className="font-medium text-xs truncate" title={item.name}>{item.name}</p>
                          <span className="text-xs bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded shrink-0">
                            x{item.count}
                          </span>
                        </div>
                        {item.mutant_types?.length > 0 && (
                          <div className="flex flex-wrap gap-0.5">
                            {item.mutant_types.map((m: any, idx: number) => {
                              const label = getMutantLabel(m);
                              const effect = getMutantEffect(m);
                              if (!label || !effect) return null;
                              return (
                                <span key={idx} className="text-[10px] bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 px-1 py-0.5 rounded shrink-0 group relative cursor-help">
                                  {label}
                                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-1.5 py-1 bg-purple-600 text-white text-[10px] rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                                    {effect}
                                  </span>
                                </span>
                              );
                            })}
                          </div>
                        )}
                        {type === 0 && (
                          <pre className="text-[9px] text-muted-foreground bg-muted/50 p-1 rounded whitespace-pre-wrap break-all">
{JSON.stringify(item, null, 1)}
                          </pre>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Logs() {
  const { logs } = useLogs(100);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-500" />
          运行日志
        </h2>
        <Button variant="outline" size="sm" onClick={() => clearLogs()} className="rounded-full">
          <Trash2 className="h-4 w-4 mr-1" />
          清空
        </Button>
      </div>

      <Card>
        <ScrollArea className="h-[calc(100vh-240px)]">
          <div className="p-4 space-y-1.5">
            {logs.map((log: any) => (
              <div key={`${log.timestamp}-${log.tag}-${log.message}`} className="text-sm flex items-start gap-2">
                <span className="text-muted-foreground text-xs shrink-0">[{formatTime(log.timestamp)}]</span>
                <span className="font-medium text-primary shrink-0">{log.tag}</span>
                <span className="text-foreground">{log.message}</span>
              </div>
            ))}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
}

function SettingsPage() {
  const { settings, updateSettings } = useSettings();

  if (!settings) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <SettingsIcon className="h-12 w-12 mx-auto text-primary animate-pulse" />
          <p className="mt-3 text-muted-foreground">正在加载设置...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <SettingsIcon className="h-5 w-5 text-purple-500" />
        偏好设置
      </h2>

      <Card className="p-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm">农场巡查</p>
              <p className="text-xs text-muted-foreground">秒</p>
            </div>
            <input
              type="number"
              className="w-16 h-8 rounded-full border border-input bg-background px-2 text-center text-sm"
              value={settings.farmCheckInterval}
              onChange={(e) => updateSettings({ farmCheckInterval: parseInt(e.target.value) || 1 })}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm">好友巡查</p>
              <p className="text-xs text-muted-foreground">秒</p>
            </div>
            <input
              type="number"
              className="w-16 h-8 rounded-full border border-input bg-background px-2 text-center text-sm"
              value={settings.friendCheckInterval}
              onChange={(e) => updateSettings({ friendCheckInterval: parseInt(e.target.value) || 10 })}
            />
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm">固定种白萝卜</span>
          <input
            type="checkbox"
            className="w-4 h-4 rounded accent-primary"
            checked={settings.forceLowestLevelCrop}
            onChange={(e) => updateSettings({ forceLowestLevelCrop: e.target.checked })}
          />
        </div>
      </Card>

      <div className="text-sm font-medium text-muted-foreground px-1">自己农场</div>

      <Card className="p-4">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          {[
            { key: 'autoHarvest', label: '🌾 自动收获' },
            { key: 'autoRemove', label: '🧹 自动铲除' },
            { key: 'autoPlant', label: '🌱 自动种植' },
            { key: 'autoFertilize', label: '✨ 自动施肥' },
            { key: 'autoWeed', label: '🌿 自动除草' },
            { key: 'autoPest', label: '🐛 自动除虫' },
            { key: 'autoWater', label: '💧 自动浇水' },
            { key: 'autoUpgrade', label: '⬆️ 自动升级' },
            { key: 'autoUnlock', label: '🔓 自动解锁' },
            { key: 'autoSell', label: '💰 自动出售' },
          ].map((item) => (
            <label key={item.key} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 rounded accent-primary"
                checked={settings[item.key as keyof Settings] as boolean}
                onChange={(e) => updateSettings({ [item.key]: e.target.checked })}
              />
              <span className="text-sm">{item.label}</span>
            </label>
          ))}
        </div>
      </Card>

      <div className="text-sm font-medium text-muted-foreground px-1">好友农场</div>

      <Card className="p-4">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          {[
            { key: 'autoFriendVisit', label: '👥 好友巡查' },
            { key: 'autoHelp', label: '🤝 帮忙操作' },
            { key: 'autoSteal', label: '🎁 自动偷菜' },
          ].map((item) => (
            <label key={item.key} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 rounded accent-primary"
                checked={settings[item.key as keyof Settings] as boolean}
                onChange={(e) => updateSettings({ [item.key]: e.target.checked })}
              />
              <span className="text-sm">{item.label}</span>
            </label>
          ))}
        </div>
      </Card>
    </div>
  );
}

function StartPage() {
  const { running, loading, startBot, stopBot, refetch, logs, error } = useBotStatus();
  const [code, setCode] = useState('');
  const [platform, setPlatform] = useState('qq');
  const [botInterval, setBotInterval] = useState(1);
  const [friendInterval, setFriendInterval] = useState(10);
  const [starting, setStarting] = useState(false);
  const [message, setMessage] = useState('');
  const [autoSettings, setAutoSettings] = useState({
    autoHarvest: true,
    autoRemove: true,
    autoPlant: true,
    autoFertilize: false,
    autoWeed: true,
    autoPest: true,
    autoWater: true,
    autoUpgrade: true,
    autoUnlock: true,
    autoSell: false,
    autoFriendVisit: false,
    autoHelp: false,
    autoSteal: false,
  });

  const handleStart = async () => {
    if (!code.trim()) {
      setMessage('请输入登录凭证');
      return;
    }
    setStarting(true);
    setMessage('');
    const result = await startBot(code, platform, botInterval, friendInterval, autoSettings);
    if (result.success) {
      setMessage('🤖 Bot 启动中...');
      const checkRunning = setInterval(() => {
        fetch('/api/status').then(r => r.json()).then(data => {
          if (data.running) {
            clearInterval(checkRunning);
          }
        }).catch(() => {});
      }, 500);
    } else {
      setStarting(false);
      setMessage(result.message || '启动失败');
    }
  };

  const handleStop = async () => {
    await stopBot();
    setMessage('Bot 已停止');
    setTimeout(() => refetch(), 1000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Sprout className="h-12 w-12 mx-auto text-primary animate-pulse" />
          <p className="mt-3 text-muted-foreground">正在加载...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <Card className="overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-green-400 via-emerald-500 to-teal-400" />
        <CardHeader>
          <CardTitle className="text-center flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/50 dark:to-emerald-900/50 flex items-center justify-center float-animation">
              <Sprout className="h-8 w-8 text-green-500" />
            </div>
            启动农场助手
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="code">登录凭证 (Code)</Label>
            <Input
              id="code"
              placeholder="从小程序获取的 login code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={running || starting}
            />
          </div>

          <div className="space-y-2">
            <Label>选择平台</Label>
            <div className="flex gap-4">
              <label className={cn(
                "flex-1 flex items-center justify-center gap-2 p-3 rounded-xl cursor-pointer transition-all",
                platform === 'qq' ? 'bg-blue-100 dark:bg-blue-900/50 border-2 border-blue-400' : 'bg-muted border-2 border-transparent'
              )}>
                <input
                  type="radio"
                  name="platform"
                  value="qq"
                  checked={platform === 'qq'}
                  onChange={(e) => setPlatform(e.target.value)}
                  disabled={running}
                  className="sr-only"
                />
                🐧 QQ
              </label>
              <label className={cn(
                "flex-1 flex items-center justify-center gap-2 p-3 rounded-xl cursor-pointer transition-all",
                platform === 'wx' ? 'bg-green-100 dark:bg-green-900/50 border-2 border-green-400' : 'bg-muted border-2 border-transparent'
              )}>
                <input
                  type="radio"
                  name="platform"
                  value="wx"
                  checked={platform === 'wx'}
                  onChange={(e) => setPlatform(e.target.value)}
                  disabled={running}
                  className="sr-only"
                />
                💚 微信
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="interval">巡查间隔</Label>
              <div className="relative">
                <Input
                  id="interval"
                  type="number"
                  value={botInterval}
                  onChange={(e) => setBotInterval(parseInt(e.target.value) || 10)}
                  disabled={running}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">秒</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="friendInterval">好友间隔</Label>
              <div className="relative">
                <Input
                  id="friendInterval"
                  type="number"
                  value={friendInterval}
                  onChange={(e) => setFriendInterval(parseInt(e.target.value) || 10)}
                  disabled={running}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">秒</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">自己农场</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {[
                { key: 'autoHarvest', label: '🌾 自动收获' },
                { key: 'autoRemove', label: '🧹 自动铲除' },
                { key: 'autoPlant', label: '🌱 自动种植' },
                { key: 'autoFertilize', label: '✨ 自动施肥' },
                { key: 'autoWeed', label: '🌿 自动除草' },
                { key: 'autoPest', label: '🐛 自动除虫' },
                { key: 'autoWater', label: '💧 自动浇水' },
                { key: 'autoUpgrade', label: '⬆️ 自动升级' },
                { key: 'autoUnlock', label: '🔓 自动解锁' },
                { key: 'autoSell', label: '💰 自动出售' },
              ].map((item) => (
                <label key={item.key} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded accent-primary"
                    checked={autoSettings[item.key as keyof typeof autoSettings]}
                    onChange={(e) => setAutoSettings({ ...autoSettings, [item.key]: e.target.checked })}
                    disabled={running}
                  />
                  <span className="text-sm">{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">好友农场</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {[
                { key: 'autoFriendVisit', label: '👥 好友巡查' },
                { key: 'autoHelp', label: '🤝 帮忙操作' },
                { key: 'autoSteal', label: '🎁 自动偷菜' },
              ].map((item) => (
                <label key={item.key} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded accent-primary"
                    checked={autoSettings[item.key as keyof typeof autoSettings]}
                    onChange={(e) => setAutoSettings({ ...autoSettings, [item.key]: e.target.checked })}
                    disabled={running}
                  />
                  <span className="text-sm">{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          {message && (
            <p className="text-sm text-center text-muted-foreground">{message}</p>
          )}

          {error && (
            <p className="text-sm text-center text-red-500">{error}</p>
          )}

          {logs.length > 0 && (
            <div className="bg-muted/50 p-3 rounded-xl text-xs max-h-32 overflow-y-auto">
              {logs.map((log, i) => (
                <div key={i}>{log}</div>
              ))}
            </div>
          )}

          {running ? (
            <Button className="w-full" variant="destructive" onClick={handleStop}>
              <PowerOff className="h-4 w-4 mr-2" />
              停止 Bot
            </Button>
          ) : (
            <Button className="w-full" onClick={handleStart} disabled={starting}>
              <Power className="h-4 w-4 mr-2" />
              {starting ? '启动中...' : '✨ 启动 Bot'}
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <div className="h-1.5 bg-gradient-to-r from-purple-400 to-pink-400" />
        <CardHeader>
          <CardTitle className="text-base">📖 使用说明</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>1. 在 QQ/微信 小程序中获取登录凭证 (login code)</p>
          <p>2. 将 code 粘贴到上方输入框</p>
          <p>3. 选择平台 (QQ 或 微信)</p>
          <p>4. 点击启动按钮即可开始挂机</p>
          <p className="text-xs mt-3 bg-muted/50 p-2 rounded-lg">💡 提示: 巡查间隔建议 10 秒，好友间隔建议 5-10 秒</p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function App() {
  const { running, loading: botLoading } = useBotStatus();

  if (botLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/50 dark:to-emerald-900/50 flex items-center justify-center mx-auto float-animation">
            <Sprout className="h-10 w-10 text-green-500" />
          </div>
          <p className="mt-4 text-muted-foreground">正在初始化...</p>
        </div>
      </div>
    );
  }

  if (!running) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
          <div className="container mx-auto px-2 py-4">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
                🌾
              </div>
              QQ 农场助手
            </h1>
          </div>
        </header>
        <main className="container mx-auto px-2 py-6">
          <StartPage />
        </main>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
        <div className="container mx-auto px-2 py-4">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
              🌾
            </div>
            QQ 农场助手
          </h1>
        </div>
      </header>

      <main className="container mx-auto px-2 py-6">
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-4">
            <TabsTrigger value="dashboard">
              <Home className="h-4 w-4 mr-2" />
              主页
            </TabsTrigger>
            <TabsTrigger value="backpack">
              <Backpack className="h-4 w-4 mr-2" />
              背包
            </TabsTrigger>
            <TabsTrigger value="friends">
              <Users className="h-4 w-4 mr-2" />
              好友
            </TabsTrigger>
            <TabsTrigger value="logs">
              <FileText className="h-4 w-4 mr-2" />
              日志
            </TabsTrigger>
            <TabsTrigger value="settings">
              <SettingsIcon className="h-4 w-4 mr-2" />
              设置
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <Dashboard />
          </TabsContent>

          <TabsContent value="backpack">
            <BackpackPanel />
          </TabsContent>

          <TabsContent value="friends">
            <Friends />
          </TabsContent>

          <TabsContent value="logs">
            <Logs />
          </TabsContent>

          <TabsContent value="settings">
            <SettingsPage />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
