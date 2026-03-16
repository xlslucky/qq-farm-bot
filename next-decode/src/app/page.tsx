"use client";

import { useState } from "react";
import { Code2, Play, Copy, Check, Loader2, Sun } from "lucide-react";
import { formatRemainTime, formatHourMinute, type MatureGroup } from "@/lib/schedule";

function MatureSchedulePanel({ groups }: { groups: MatureGroup[] }) {
  if (groups.length === 0) return null;

  const harvestable = groups.filter(g => g.time <= 0);
  const upcoming = groups.filter(g => g.time > 0);

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center gap-2 px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
        <Sun className="w-5 h-5 text-orange-500" />
        <h2 className="font-medium text-zinc-900 dark:text-zinc-100">成熟时间表</h2>
      </div>
      <div className="p-6 space-y-4">
        <div className="font-mono text-sm space-y-1">
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
            <div className="text-xs px-3 py-1.5 rounded-full font-medium font-mono bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400 inline-block mb-2">
              可收获 - {harvestable.reduce((sum, g) => sum + g.lands.length, 0)}块
            </div>
            <div className="flex gap-2 flex-wrap">
              {harvestable.map((group, idx) => (
                group.lands.map((land, i) => (
                  <div key={`${idx}-${i}`} className="text-xs bg-muted/60 px-3 py-2 rounded-lg">
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
            <div className="text-xs px-3 py-1.5 rounded-full font-medium font-mono bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 inline-block mb-2">
              {formatRemainTime(group.time)} - {group.lands.length}块
            </div>
            <div className="flex gap-2 flex-wrap">
              {group.lands.map((land, i) => (
                <div key={i} className="text-xs bg-muted/60 px-3 py-2 rounded-lg">
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

export default function Home() {
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
    <div className="min-h-screen bg-zinc-50 dark:bg-black p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Code2 className="w-8 h-8 text-blue-500" />
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Protobuf 解码工具
          </h1>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                输入数据
              </label>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="输入 hex 字符串或 base64 字符串..."
                className="w-full h-32 px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
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
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6">
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-6">
          <MatureSchedulePanel groups={matureGroups} />

          {output && (
            <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
                <h2 className="font-medium text-zinc-900 dark:text-zinc-100">解析结果</h2>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? "已复制" : "复制"}
                </button>
              </div>
              <pre className="p-6 text-sm font-mono text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap overflow-auto max-h-[500px]">
                {output}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}