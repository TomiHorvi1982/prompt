import React, { useState } from "react";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from "recharts";
import { 
  TrendingUp, 
  Sparkles, 
  ArrowLeftRight, 
  BookOpen, 
  Activity, 
  Layers,
  ChevronRight,
  Maximize2
} from "lucide-react";
import { OptimizationStep } from "../types";

interface Props {
  history: OptimizationStep[];
}

export function OptimizationHistoryChart({ history }: Props) {
  const [metric, setMetric] = useState<"complexity" | "wordCount" | "length">("complexity");
  const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(null);
  const [compareStepIndex, setCompareStepIndex] = useState<number | null>(null);

  if (history.length === 0) {
    return null;
  }

  // Active indices for inspection
  const activeInspectIdx = selectedStepIndex !== null ? selectedStepIndex : history.length - 1;
  const inspectedStep = history[activeInspectIdx];
  const compareStep = compareStepIndex !== null ? history[compareStepIndex] : null;

  // Format data for Recharts
  const chartData = history.map((step) => ({
    ...step,
    // Add display names for better legend / tooltip
    "Komplexita (%)": step.complexity,
    "Počet slov": step.wordCount,
    "Počet znaků": step.length,
  }));

  const getMetricLabel = () => {
    switch (metric) {
      case "complexity": return "Komplexita (%)";
      case "wordCount": return "Počet slov";
      case "length": return "Počet znaků";
    }
  };

  const getMetricColor = () => {
    switch (metric) {
      case "complexity": return "#06b6d4"; // cyan
      case "wordCount": return "#10b981"; // emerald
      case "length": return "#a855f7"; // purple
    }
  };

  const handleChartClick = (state: any) => {
    if (state && state.activeTooltipIndex !== undefined) {
      setSelectedStepIndex(state.activeTooltipIndex);
    }
  };

  return (
    <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4.5 space-y-4 shadow-xl" id="optimization-history-container">
      {/* Header and Toggles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-900">
        <div className="flex items-center gap-2">
          <Activity className="w-4.5 h-4.5 text-cyan-400" />
          <div>
            <h4 className="text-xs font-bold text-slate-200 uppercase font-mono tracking-wider">
              Historie Optimalizace Prompťáka
            </h4>
            <span className="text-[10px] text-slate-500 font-sans block">
              Sledujte vývoj parametrů promptu během iterací
            </span>
          </div>
        </div>

        {/* Metric Selector Tabs */}
        <div className="flex bg-slate-900/60 p-1 rounded-xl border border-slate-800/80 shrink-0">
          <button
            type="button"
            onClick={() => setMetric("complexity")}
            className={`px-2.5 py-1 text-[9px] font-bold font-mono rounded-lg transition-all cursor-pointer ${
              metric === "complexity"
                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                : "text-slate-400 hover:text-slate-200 border border-transparent"
            }`}
          >
            Komplexita
          </button>
          <button
            type="button"
            onClick={() => setMetric("wordCount")}
            className={`px-2.5 py-1 text-[9px] font-bold font-mono rounded-lg transition-all cursor-pointer ${
              metric === "wordCount"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "text-slate-400 hover:text-slate-200 border border-transparent"
            }`}
          >
            Slova
          </button>
          <button
            type="button"
            onClick={() => setMetric("length")}
            className={`px-2.5 py-1 text-[9px] font-bold font-mono rounded-lg transition-all cursor-pointer ${
              metric === "length"
                ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                : "text-slate-400 hover:text-slate-200 border border-transparent"
            }`}
          >
            Znaky
          </button>
        </div>
      </div>

      {/* Main Graph Stage */}
      <div className="h-[140px] w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            onClick={handleChartClick}
            margin={{ top: 5, right: 5, left: -25, bottom: 0 }}
            style={{ cursor: 'pointer' }}
          >
            <defs>
              <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={getMetricColor()} stopOpacity={0.25}/>
                <stop offset="95%" stopColor={getMetricColor()} stopOpacity={0.0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#0f172a" vertical={false} />
            <XAxis 
              dataKey="label" 
              stroke="#475569" 
              fontSize={8} 
              tickLine={false}
              axisLine={false}
              dy={5}
            />
            <YAxis 
              stroke="#475569" 
              fontSize={8} 
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload as OptimizationStep;
                  return (
                    <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl shadow-2xl text-[10px] space-y-1 font-mono">
                      <div className="text-cyan-400 font-bold border-b border-slate-900 pb-1 mb-1 flex justify-between items-center gap-4">
                        <span>{data.label}</span>
                        <span className="text-slate-500 text-[8px]">{data.timestamp}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                        <span className="text-slate-500">Komplexita:</span>
                        <span className="text-cyan-300 text-right font-bold">{data.complexity}%</span>
                        
                        <span className="text-slate-500">Počet slov:</span>
                        <span className="text-emerald-400 text-right font-bold">{data.wordCount}</span>
                        
                        <span className="text-slate-500">Počet znaků:</span>
                        <span className="text-purple-400 text-right font-bold">{data.length}</span>
                      </div>
                      <div className="text-[8px] text-slate-500 pt-1 text-center border-t border-slate-900 mt-1">
                        Kliknutím zvolíte krok pro inspekci
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area 
              type="monotone" 
              dataKey={getMetricLabel()} 
              stroke={getMetricColor()} 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorMetric)" 
              activeDot={{ r: 5, stroke: '#020617', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Interactive Step Navigation Cards */}
      <div className="grid grid-cols-2 gap-2" id="optimization-step-indicator-cards">
        <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-2.5">
          <div className="text-[8px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-1">
            Zvolený krok pro inspekci
          </div>
          <select
            value={activeInspectIdx}
            onChange={(e) => setSelectedStepIndex(Number(e.target.value))}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1 px-1.5 text-[10px] font-mono text-cyan-400 focus:outline-hidden"
          >
            {history.map((step, idx) => (
              <option key={idx} value={idx}>
                Krok #{idx}: {step.label}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-2.5">
          <div className="text-[8px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-1">
            Srovnat s jiným krokem (Diff)
          </div>
          <select
            value={compareStepIndex !== null ? compareStepIndex : ""}
            onChange={(e) => setCompareStepIndex(e.target.value !== "" ? Number(e.target.value) : null)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1 px-1.5 text-[10px] font-mono text-purple-400 focus:outline-hidden"
          >
            <option value="">-- Žádné srovnání --</option>
            {history.map((step, idx) => {
              if (idx === activeInspectIdx) return null;
              return (
                <option key={idx} value={idx}>
                  Srovnat s #{idx}: {step.label}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Step Detail Panel */}
      {inspectedStep && (
        <div className="bg-slate-900/30 border border-slate-850 rounded-xl p-3 space-y-2.5" id="step-detail-panel">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-cyan-950/80 text-cyan-400 flex items-center justify-center font-mono text-[10px] font-bold border border-cyan-800/30">
                {inspectedStep.stepIndex}
              </span>
              <div>
                <span className="text-[11px] font-bold text-slate-200 font-sans block leading-none">
                  {inspectedStep.label}
                </span>
                <span className="text-[8px] font-mono text-slate-500">
                  {inspectedStep.timestamp}
                </span>
              </div>
            </div>

            <div className="flex gap-1.5">
              <span className="text-[9px] font-mono bg-cyan-950/40 text-cyan-400 px-2 py-0.5 rounded-md border border-cyan-900/30">
                Komplexita: {inspectedStep.complexity}%
              </span>
              <span className="text-[9px] font-mono bg-emerald-950/40 text-emerald-400 px-2 py-0.5 rounded-md border border-emerald-900/30">
                Slov: {inspectedStep.wordCount}
              </span>
            </div>
          </div>

          {/* Prompt comparison view or single prompt inspection */}
          {compareStep ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2" id="prompt-comparison-box">
              {/* Comparative Step */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[8px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                  <span>Srovnávací Krok: {compareStep.label}</span>
                  <span>{compareStep.wordCount} slov</span>
                </div>
                <div className="bg-slate-950 rounded-lg p-2 max-h-[140px] overflow-y-auto border border-slate-900 text-[10px] font-mono text-slate-400 whitespace-pre-wrap leading-relaxed select-all">
                  {compareStep.prompt}
                </div>
              </div>

              {/* Inspected Step */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[8px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                  <span>Zvolený Krok: {inspectedStep.label}</span>
                  <span className="text-cyan-400">{inspectedStep.wordCount} slov</span>
                </div>
                <div className="bg-slate-950 rounded-lg p-2 max-h-[140px] overflow-y-auto border border-cyan-900/20 text-[10px] font-mono text-slate-300 whitespace-pre-wrap leading-relaxed select-all">
                  {inspectedStep.prompt}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[8px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                <span>Obsah Promptu v tomto kroku</span>
                <span>{inspectedStep.length} znaků</span>
              </div>
              <div className="bg-slate-950 rounded-lg p-2.5 max-h-[120px] overflow-y-auto border border-slate-900 text-[10px] font-mono text-slate-300 whitespace-pre-wrap leading-relaxed select-all scrollbar-thin">
                {inspectedStep.prompt}
              </div>
            </div>
          )}

          {/* Quick analysis summary */}
          <div className="text-[9px] text-slate-500 leading-relaxed font-sans bg-slate-950/40 p-2 rounded-lg border border-slate-900">
            {history.length > 1 ? (
              <p>
                📈 Od prvotního zadání vzrostla komplexita o{" "}
                <span className="text-cyan-400 font-bold font-mono">
                  {inspectedStep.complexity - history[0].complexity}%
                </span>{" "}
                a počet slov se změnil o{" "}
                <span className="text-emerald-400 font-bold font-mono">
                  {inspectedStep.wordCount - history[0].wordCount} slov
                </span>
                . Každý krok upřesnění formuje strukturované instruování, omezuje nejasnosti a vylepšuje kvalitu generování.
              </p>
            ) : (
              <p>
                Začněte optimalizovat zadání přidáním upřesňujících pravidel nebo využitím estetických presetů k nastartování historie.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
