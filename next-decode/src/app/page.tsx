"use client";

import { useState } from "react";
import { Code2, Play, Copy, Check, Loader2, Sun, Leaf } from "lucide-react";
import { formatRemainTime, formatHourMinute, type MatureGroup } from "@/lib/schedule";

function MatureSchedulePanel({ groups }: { groups: MatureGroup[] }) {
  const [copied, setCopied] = useState(false);

  if (groups.length === 0) return null;

  const harvestable = groups.filter(g => g.time <= 0);
  const upcoming = groups.filter(g => g.time > 0);

  const handleCopy = () => {
    const text = groups.map(group => {
      const timeStr = formatHourMinute(group.time);
      const landIds = group.lands.map(l => l.landId.toString().padStart(2, '0')).join('#');
      return `${timeStr} #${landIds}`;
    }).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center gap-2 px-4 sm:px-6 py-3 sm:py-4 border-b border-zinc-200 dark:border-zinc-800">
          <Sun className="w-5 h-5 text-orange-500" />
          <h2 className="font-medium text-zinc-900 dark:text-zinc-100">成熟时间表</h2>
        </div>
        <div className="p-3 sm:p-6 space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">时间 地块</span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2 py-1 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? "已复制" : "复制"}
            </button>
          </div>
          <div className="font-mono text-xs sm:text-sm space-y-1">
          {groups.map((group, idx) => {
            const timeStr = formatHourMinute(group.time);
            const landIds = group.lands.map(l => l.landId.toString().padStart(2, '0')).join('#');
            return (
              <div key={idx}>
                {timeStr} #{landIds}
              </div>
            );
          })}
        </div>

        {harvestable.length > 0 && (
          <div>
            <div className="text-xs px-2 sm:px-3 py-1 sm:py-1.5 rounded-full font-medium font-mono bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400 inline-block mb-1 sm:mb-2">
              可收获 - {harvestable.reduce((sum, g) => sum + g.lands.length, 0)}块
            </div>
            <div className="flex gap-1.5 sm:gap-2 flex-wrap">
              {harvestable.map((group, idx) => (
                group.lands.map((land, i) => (
                  <div key={`${idx}-${i}`} className="text-xs bg-muted/60 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                      land.landLevel === 1 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' :
                      land.landLevel === 2 ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300' :
                      land.landLevel === 3 ? 'bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200' :
                      'bg-yellow-200 text-yellow-700 dark:bg-yellow-800/50 dark:text-yellow-300'
                    }`}>
                      {land.landLevelLabel} #{land.landId.toString().padStart(2, '0')}
                    </span>
                    <span className="ml-2 font-medium">{land.landName}</span>
                  </div>
                ))
              ))}
            </div>
          </div>
        )}
        {upcoming.map((group, idx) => (
          <div key={idx}>
            <div className="text-xs px-2 sm:px-3 py-1 sm:py-1.5 rounded-full font-medium font-mono bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 inline-block mb-1 sm:mb-2">
              {formatRemainTime(group.time)} - {group.lands.length}块
            </div>
            <div className="flex gap-1.5 sm:gap-2 flex-wrap">
              {group.lands.map((land, i) => (
                <div key={i} className="text-xs bg-muted/60 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                    land.landLevel === 1 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' :
                    land.landLevel === 2 ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300' :
                    land.landLevel === 3 ? 'bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200' :
                    'bg-yellow-200 text-yellow-700 dark:bg-yellow-800/50 dark:text-yellow-300'
                  }`}>
                    {land.landLevelLabel} #{land.landId.toString().padStart(2, '0')}
                  </span>
                  <span className="ml-2 font-medium">{land.landName}</span>
                  <span className="ml-1 text-muted-foreground">{formatRemainTime(land.remainSec)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface PlantInfo {
  id: number;
  name: string;
  seed_id: number;
  land_level_need: number;
  fruit: { id: number; count: number };
  grow_phases: string;
  exp: number;
  seasons: number;
}

interface GrowStage {
  name: string;
  duration: number;
}

function PlantImage({ seedId, fruitId, name }: { seedId: number; fruitId: number; name: string }) {
  const [hasError, setHasError] = useState(false);
  const cropNum = fruitId - 40000;
  
  if (hasError) {
    return (
      <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center text-white text-lg flex-shrink-0">
        🌱
      </div>
    );
  }
  
  return (
    <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center text-white text-lg flex-shrink-0 overflow-hidden">
      <img 
        src={`/seed_images/${cropNum}.png`} 
        alt={name}
        className="w-full h-full object-cover"
        onError={() => setHasError(true)}
      />
    </div>
  );
}

function PlantCard({ plant, stages, totalSeconds, formatTime, price }: { 
  plant: PlantInfo; 
  stages: GrowStage[]; 
  totalSeconds: number;
  formatTime: (s: number) => string;
  price?: number;
}) {
  const colors = ['from-green-400', 'from-blue-400', 'from-yellow-400', 'from-orange-400', 'from-red-400', 'from-purple-400'];
  
  let cumulativePct = 0;
  const stageLayouts = stages.map((stage, idx) => {
    const pct = totalSeconds > 0 ? (stage.duration / totalSeconds) * 100 : 0;
    const startPct = cumulativePct;
    cumulativePct += pct;
    return { ...stage, pct, startPct };
  });

  const secondSeasonStages = plant.seasons > 1 ? stages.slice(2) : [];
  const secondTotalSeconds = secondSeasonStages.reduce((sum, s) => sum + s.duration, 0);
  let cumulativePct2 = 0;
  const stageLayouts2 = secondSeasonStages.map((stage, idx) => {
    const pct = secondTotalSeconds > 0 ? (stage.duration / secondTotalSeconds) * 100 : 0;
    const startPct = cumulativePct2;
    cumulativePct2 += pct;
    return { ...stage, pct, startPct };
  });
  
  return (
    <div className="text-xs bg-zinc-50 dark:bg-zinc-800 px-3 py-2 rounded-lg">
      <div className="flex items-start gap-2">
        <PlantImage seedId={plant.seed_id} fruitId={plant.fruit.id} name={plant.name} />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
            <span className="text-[10px] px-1 py-0.5 bg-zinc-200 dark:bg-zinc-700 rounded text-zinc-600 dark:text-zinc-300 mr-1">Lv.{plant.land_level_need}</span>
            <span className="text-[10px] px-1 py-0.5 bg-green-100 dark:bg-green-900/50 rounded text-green-700 dark:text-green-300 mr-1">{plant.seasons}季</span>
            {plant.name}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-[10px] text-zinc-500 dark:text-zinc-400">
            <span>果实: <span className="text-green-600 dark:text-green-400">¥{price ?? '?'}</span>×{plant.fruit.count}</span>
            <span>成熟: <span className="text-amber-600 dark:text-amber-400">{formatTime(totalSeconds)}</span>{plant.seasons > 1 && secondTotalSeconds > 0 && <span className="text-orange-500">+{formatTime(secondTotalSeconds)}={formatTime(totalSeconds + secondTotalSeconds)}</span>}</span>
            <span>经验: <span className="text-blue-500">{plant.exp}</span>×{plant.seasons}=<span className="text-blue-500 font-medium">{plant.exp * plant.seasons}</span></span>
          </div>
        </div>
      </div>
      {stages.length > 0 && (
        <div className="mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-700">
          <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mb-1">第1季({formatTime(totalSeconds)}):</div>
          <div className="flex h-4 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-700">
            {stageLayouts.map((stage, idx) => (
              <div 
                key={idx}
                className={`h-full bg-gradient-to-r ${colors[idx % colors.length]} to-transparent flex items-center justify-center`}
                style={{ width: `${stage.pct}%` }}
              >
                {stage.pct >= 5 && (
                  <span className="text-[8px] text-white font-medium drop-shadow-sm">{Math.round(stage.pct)}%</span>
                )}
              </div>
            ))}
          </div>
          <div className="relative mt-1 h-8">
            {stageLayouts.map((stage, idx) => (
              <div 
                key={idx}
                className="absolute text-center"
                style={{ left: `${stage.startPct}%`, width: `${stage.pct}%` }}
              >
                <div className="text-[9px] text-zinc-600 dark:text-zinc-400 truncate">{stage.name}</div>
                {stage.duration > 0 && (
                  <div className="text-[8px] text-zinc-400">{formatTime(stage.duration)}</div>
                )}
              </div>
            ))}
          </div>
          {plant.seasons > 1 && secondSeasonStages.length > 0 && (
            <>
              <div className="text-[10px] text-orange-500 dark:text-orange-400 mt-2 mb-1">第{plant.seasons}季({formatTime(secondTotalSeconds)}):</div>
              <div className="flex h-4 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-700">
                {stageLayouts2.map((_, idx) => {
                  const originalStage = stageLayouts[idx + 2];
                  if (!originalStage) return null;
                  return (
                    <div 
                      key={idx}
                      className={`h-full bg-gradient-to-r ${colors[(idx + 2) % colors.length]} to-transparent flex items-center justify-center`}
                      style={{ marginLeft: idx === 0 ? `${originalStage.startPct}%` : 0, width: `${originalStage.pct}%` }}
                    >
                      {originalStage.pct >= 5 && (
                        <span className="text-[8px] text-white font-medium drop-shadow-sm">{Math.round(originalStage.pct)}%</span>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="relative mt-1 h-8">
                {stageLayouts2.map((_, idx) => {
                  const originalStage = stageLayouts[idx + 2];
                  if (!originalStage) return null;
                  return (
                    <div 
                      key={idx}
                      className="absolute text-center"
                      style={{ left: `${originalStage.startPct}%`, width: `${originalStage.pct}%` }}
                    >
                      <div className="text-[9px] text-zinc-600 dark:text-zinc-400 truncate">{originalStage.name}</div>
                      {originalStage.duration > 0 && (
                        <div className="text-[8px] text-zinc-400">{formatTime(originalStage.duration)}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function SeedInfoPanel() {
  const [plants, setPlants] = useState<PlantInfo[]>([]);
  const [itemPrices, setItemPrices] = useState<Record<number, number>>({});
  const [search, setSearch] = useState("");
  const [loaded, setLoaded] = useState(false);

  const loadPlants = async () => {
    if (loaded) return;
    try {
      const [plantRes, itemRes] = await Promise.all([
        fetch("/gameConfig/Plant.json"),
        fetch("/gameConfig/ItemInfo.json"),
      ]);
      const plantData = await plantRes.json();
      const itemData = await itemRes.json();
      
      const prices: Record<number, number> = {};
      itemData.forEach((item: any) => {
        if (item.id >= 40000 && item.id < 50000) {
          prices[item.id] = item.price;
        }
      });
      
      setPlants(plantData);
      setItemPrices(prices);
      setLoaded(true);
    } catch (e) {
      console.error("加载数据失败", e);
    }
  };

  useState(() => {
    loadPlants();
  });

  const filtered = plants.filter(p => 
    p.name.includes(search) || p.seed_id.toString().includes(search)
  );

  const parseGrowPhases = (phases: string): GrowStage[] => {
    const stages: GrowStage[] = [];
    const parts = phases.split(';').filter(p => p);
    for (const part of parts) {
      const [name, time] = part.split(':');
      if (name && time) {
        stages.push({ name, duration: parseInt(time) });
      }
    }
    return stages;
  };

  const getTotalTime = (stages: GrowStage[]) => {
    return stages.reduce((sum, s) => sum + s.duration, 0);
  };

  const formatTime = (seconds: number) => {
    if (seconds >= 3600) {
      const hours = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      let str = `${hours}时`;
      if (mins > 0) str += `${mins}分`;
      return str;
    }
    if (seconds >= 60) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return secs > 0 ? `${mins}分${secs}秒` : `${mins}分`;
    }
    return `${seconds}秒`;
  };

  return (
    <div className="space-y-3 sm:space-y-6">
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-3 sm:p-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索种子名称或种子ID..."
          className="w-full px-3 py-2 mb-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[60vh] overflow-auto">
          {filtered.map((plant) => {
            const stages = parseGrowPhases(plant.grow_phases);
            const totalSeconds = getTotalTime(stages);
            const price = itemPrices[plant.fruit.id];
            return (
              <PlantCard key={plant.id} plant={plant} stages={stages} totalSeconds={totalSeconds} formatTime={formatTime} price={price} />
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [tab, setTab] = useState<"decode" | "seed">("decode");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [matureGroups, setMatureGroups] = useState<MatureGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isHex, setIsHex] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const handleDecode = async () => {
    if (!input.trim()) return;
    
    setIsLoading(true);
    setError("");
    setOutput("");
    setMatureGroups([]);

    try {
      const res = await fetch("/api/decode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: input.trim(), isHex }),
      });
      const data = await res.json();
      
      if (data.success) {
        setOutput(data.output);
        setMatureGroups(data.matureGroups || []);
      } else {
        setError(data.error || "解码失败");
      }
    } catch (e: any) {
      setError(`请求失败: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    setInput("");
    setOutput("");
    setError("");
    setMatureGroups([]);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black p-3 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
          <Code2 className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500" />
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            QQ农场工具
          </h1>
        </div>

        <div className="flex gap-2 mb-4 sm:mb-6">
          <button
            onClick={() => setTab("seed")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm ${
              tab === "seed" 
                ? "bg-green-500 text-white" 
                : "bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
            }`}
          >
            <Leaf className="w-4 h-4" />
            种子信息
          </button>
          <button
            onClick={() => setTab("decode")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm ${
              tab === "decode" 
                ? "bg-blue-500 text-white" 
                : "bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
            }`}
          >
            <Code2 className="w-4 h-4" />
            解码工具
          </button>
        </div>

        {tab === "decode" && (
          <>
            <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-4 sm:p-6 mb-4 sm:mb-6">
              <div className="flex items-center gap-4 mb-3 sm:mb-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1 sm:mb-2">
                    输入数据
                  </label>
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="输入 hex 字符串或 base64 字符串..."
                    className="w-full h-24 sm:h-32 px-3 sm:px-4 py-2 sm:py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 sm:gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={isHex}
                      onChange={(e) => setIsHex(e.target.checked)}
                      className="w-4 h-4 text-blue-500 rounded"
                    />
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">Hex 格式</span>
                  </label>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleClear}
                    className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                  >
                    清空
                  </button>
                  <button
                    onClick={handleDecode}
                    disabled={isLoading || !input.trim()}
                    className="flex items-center gap-2 px-5 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        解析中...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        解析
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
                <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
              </div>
            )}

            <div className="space-y-3 sm:space-y-6">
              <MatureSchedulePanel groups={matureGroups} />

              {output && (
                <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-zinc-200 dark:border-zinc-800">
                    <h2 className="font-medium text-zinc-900 dark:text-zinc-100">解析结果</h2>
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1 px-2 sm:px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copied ? "已复制" : "复制"}
                    </button>
                  </div>
                  <pre className="p-3 sm:p-6 text-xs sm:text-sm font-mono text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap overflow-auto max-h-[300px] sm:max-h-[500px]">
                    {output}
                  </pre>
                </div>
              )}
            </div>
          </>
        )}

        {tab === "seed" && <SeedInfoPanel />}
      </div>
    </div>
  );
}