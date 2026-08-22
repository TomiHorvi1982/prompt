import React, { useState, useEffect, useRef, useMemo } from "react";
import * as d3 from "d3";
import { 
  ShieldAlert, 
  Search, 
  Sparkles, 
  Brain, 
  Layout, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  Compass, 
  ListOrdered,
  Gauge
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', "aren't", 'as', 'at',
  'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', "can't", 'cannot', 'could',
  "couldn't", 'did', "didn't", 'do', 'does', "doesn't", 'doing', "don't", 'down', 'during', 'each', 'few', 'for',
  'from', 'further', 'had', "hadn't", 'has', "hasn't", 'have', "haven't", 'having', 'he', "he'd", "he'll", "he's",
  'her', 'here', "here's", 'hers', 'herself', 'him', 'himself', 'his', 'how', "how's", 'i', "i'd", "i'll", "i'm",
  "i've", 'if', 'in', 'into', 'is', "isn't", 'it', "it's", 'its', 'itself', "let's", 'me', 'more', 'most', "mustn't",
  'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours',
  'ourselves', 'out', 'over', 'own', 'same', "shan't", 'she', "she'd", "she'll", "she's", 'should', "shouldn't",
  'so', 'some', 'such', 'than', 'that', "that's", 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there',
  "there's", 'these', 'they', "they'd", "they'll", "they're", "they've", 'this', 'those', 'through', 'to', 'too',
  'under', 'until', 'up', 'very', 'was', "wasn't", 'we', "we'd", "we'll", "we're", "we've", 'were', "weren't",
  'what', "what's", 'when', "when's", 'where', "where's", 'which', 'while', 'who', "who's", 'whom', 'why', "why's",
  'with', "won't", 'would', "wouldn't", 'you', "you'd", "you'll", "you're", "you've", 'your', 'yours', 'yourself',
  'yourselves', 'pro', 'na', 'se', 'ze', 'že', 's', 'z', 'v', 'k', 'o', 'u', 'i', 'a', 'aby', 'byl', 'byla', 'bylo',
  'jsou', 'jsem', 'jsi', 'jsme', 'jste', 'tento', 'tato', 'toto', 'tyto', 'tato', 'jak', 'jako', 'kde', 'kdy', 'kdo',
  'co', 'můj', 'tvůj', 'jeho', 'její', 'jejich', 'naše', 'vaše', 'když', 'nebo', 'ale', 'jen', 'než', 'tak', 'více'
]);

interface KeywordItem {
  word: string;
  count: number;
}

interface RiskItem {
  phrase: string;
  severity: "Low" | "Medium" | "High";
  description: string;
}

interface SemanticCategory {
  name: string;
  value: number;
  description: string;
}

interface AnalysisData {
  semanticCategories: SemanticCategory[];
  keywords: KeywordItem[];
  risks: RiskItem[];
  overallRiskScore: number;
}

interface TreemapNode {
  name: string;
  value?: number;
  category?: string;
  children?: TreemapNode[];
}

export function performDeepAnalysis(prompt: string): AnalysisData {
  const cleanPrompt = prompt.toLowerCase().trim();
  
  if (!cleanPrompt) {
    return {
      semanticCategories: [
        { name: "Prázdný vstup", value: 100, description: "Zadejte prompt pro spuštění analýzy." }
      ],
      keywords: [],
      risks: [],
      overallRiskScore: 0
    };
  }

  // 1. Semantic Categories Scoring
  const categories = [
    {
      name: "Styling & UI",
      keywords: ["style", "css", "color", "design", "aesthetic", "ui", "layout", "font", "typograf", "vzhled", "barv", "border", "padding", "margin", "theme", "dark", "light", "pozadí", "modern", "flat", "neumorph"],
      weight: 0,
      description: "Požadavky na vzhled, barvy, rozvržení a vizuální styl rozhraní."
    },
    {
      name: "Funkční logika",
      keywords: ["create", "make", "build", "implement", "add", "develop", "vytvoř", "přidej", "naprogramuj", "funkce", "klik", "tlačítk", "state", "click", "handle", "event", "react", "hook", "useeffect", "usestate"],
      weight: 0,
      description: "Instrukce k chování komponent, logice aplikace, reakcím na kliknutí a stavům."
    },
    {
      name: "Formátování dat",
      keywords: ["list", "table", "json", "format", "output", "markdown", "tabulk", "seznam", "výstup", "struktura", "pole", "array", "object", "objekt", "xml", "csv", "text"],
      weight: 0,
      description: "Specifikace uspořádání výstupu, tabulky, JSON formáty či strukturovaná data."
    },
    {
      name: "Systémová pravidla",
      keywords: ["ignore", "system", "override", "bypass", "translate", "instrukce", "prompt", "zapomeň", "vysvětli", "describe", "explain", "analyz", "role", "act as", "chovej se jako"],
      weight: 0,
      description: "Definice rolí, systémových kontrol, chování asistenta nebo bezpečnostních nastavení."
    },
    {
      name: "Externí integrace",
      keywords: ["data", "api", "fetch", "firebase", "sql", "d3", "chart", "map", "storage", "databáz", "server", "endpoint", "recharts", "auth", "přihláš", "model"],
      weight: 0,
      description: "Požadavky na databáze, externí API, pokročilé grafy, ukládání a autentizaci."
    }
  ];

  let totalScore = 0;
  categories.forEach(cat => {
    cat.keywords.forEach(kw => {
      const regex = new RegExp(kw, 'gi');
      const matches = cleanPrompt.match(regex);
      if (matches) {
        cat.weight += matches.length * 8;
      }
    });
    // Give a baseline weight
    if (cat.weight === 0 && cleanPrompt.length > 5) {
      // Find matches in general
      cat.weight = 1;
    }
    totalScore += cat.weight;
  });

  if (totalScore === 0) {
    totalScore = 1;
  }

  // Normalize semantic categories to total 100
  const semanticCategories = categories.map(cat => ({
    name: cat.name,
    value: Math.max(5, Math.round((cat.weight / totalScore) * 100)),
    description: cat.description
  })).filter(c => c.value > 5);

  // Fallback if none matches
  if (semanticCategories.length === 0) {
    semanticCategories.push({
      name: "Obecné instrukce",
      value: 100,
      description: "Standardní popisný text bez vyhraněné kategorie."
    });
  }

  // 2. Keyword Density Analysis
  const words = cleanPrompt
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, " ")
    .split(/\s+/);
  
  const keywordMap: { [key: string]: number } = {};
  words.forEach(w => {
    const cleaned = w.trim().replace(/[^a-zA-Zá-žÁ-Ž0-9]/g, "");
    if (cleaned.length > 2 && !STOP_WORDS.has(cleaned)) {
      keywordMap[cleaned] = (keywordMap[cleaned] || 0) + 1;
    }
  });

  const keywords = Object.keys(keywordMap)
    .map(word => ({ word, count: keywordMap[word] }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8); // Top 8 keywords

  // 3. Prompt Injection Risk Analysis
  const riskCheckers = [
    {
      phrase: "ignore previous instructions",
      severity: "High" as const,
      description: "Pokus o přepsání systémových instrukcí (System Prompt Hijacking)."
    },
    {
      phrase: "forget your system prompt",
      severity: "High" as const,
      description: "Pokus o smazání ochranných filtrů a systémových instrukcí."
    },
    {
      phrase: "system prompt",
      severity: "Medium" as const,
      description: "Hledání nebo snaha o vypsání utajených konfigurací systému."
    },
    {
      phrase: "you are now in developer mode",
      severity: "High" as const,
      description: "Typický 'jailbreak' vzorec (např. DAN) snažící se obejít filtry."
    },
    {
      phrase: "act as a developer",
      severity: "Medium" as const,
      description: "Snaha o navození developerského režimu pro obejití bezpečnostních pravidel."
    },
    {
      phrase: "jailbreak",
      severity: "High" as const,
      description: "Explicitní snaha o prolomení bezpečnostních mantinelů."
    },
    {
      phrase: "override",
      severity: "Medium" as const,
      description: "Snaha o přepsání bezpečnostních limitů asistenta."
    },
    {
      phrase: "bypass",
      severity: "High" as const,
      description: "Pokus o obejití vestavěných bezpečnostních a formátovacích pravidel."
    }
  ];

  const detectedRisks: RiskItem[] = [];
  let riskScoreSum = 0;

  riskCheckers.forEach(checker => {
    if (cleanPrompt.includes(checker.phrase)) {
      detectedRisks.push(checker);
      riskScoreSum += checker.severity === "High" ? 45 : 20;
    }
  });

  const overallRiskScore = Math.min(100, riskScoreSum);

  return {
    semanticCategories,
    keywords,
    risks: detectedRisks,
    overallRiskScore
  };
}

interface DeepAnalysisViewProps {
  prompt: string;
}

export default function DeepAnalysisView({ prompt }: DeepAnalysisViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 400, height: 260 });
  const [hoveredNode, setHoveredNode] = useState<{ name: string; value: number; category: string } | null>(null);

  // Run deep analysis
  const analysis = useMemo(() => performDeepAnalysis(prompt), [prompt]);

  // Handle Container Resizing using ResizeObserver (Anti-Slop & Responsive Guidelines)
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width } = entries[0].contentRect;
      // Maintain proper aspect ratio and clamp width
      setDimensions({
        width: Math.max(280, width),
        height: 250
      });
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Render the D3.js Treemap
  useEffect(() => {
    if (!svgRef.current || !analysis) return;

    // Clear previous SVG content
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const { width, height } = dimensions;

    // Construct hierarchical data structure for the treemap
    const treemapData: TreemapNode = {
      name: "Analysis",
      children: [
        {
          name: "Sémantika",
          children: analysis.semanticCategories.map(c => ({
            name: `${c.name} (${c.value}%)`,
            value: c.value,
            category: "semantic"
          }))
        },
        {
          name: "Klíčová slova",
          children: analysis.keywords.length > 0 
            ? analysis.keywords.map(k => ({
                name: `"${k.word}"`,
                value: k.count * 15,
                category: "keyword"
              }))
            : [{ name: "Žádná klíčová slova", value: 15, category: "keyword" }]
        },
        {
          name: "Bezpečnost",
          children: [
            {
              name: analysis.overallRiskScore > 0 
                ? `Riziko (${analysis.overallRiskScore}%)` 
                : "Prompt bezpečný",
              value: analysis.overallRiskScore > 0 ? analysis.overallRiskScore : 25,
              category: "risk"
            }
          ]
        }
      ]
    };

    // Create D3 hierarchy and layout
    const rootNode = d3.hierarchy<TreemapNode>(treemapData)
      .sum(d => d.value || 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    const root = d3.treemap<TreemapNode>()
      .size([width, height])
      .paddingOuter(4)
      .paddingTop(16)
      .paddingInner(3)
      .round(true)(rootNode);

    // Color definitions matched to cyberpunk design token aesthetics
    const getColor = (category: string | undefined) => {
      switch (category) {
        case "semantic":
          return "rgba(6, 182, 212, 0.25)"; // Cyan transparent
        case "keyword":
          return "rgba(16, 185, 129, 0.2)"; // Emerald transparent
        case "risk":
          return analysis.overallRiskScore > 0 
            ? "rgba(244, 63, 94, 0.35)"  // Rose transparent for high risk
            : "rgba(132, 204, 22, 0.15)"; // Lime transparent for safe
        default:
          return "rgba(30, 41, 59, 0.4)";  // Slate transparent fallback
      };
    };

    const getBorderColor = (category: string | undefined) => {
      switch (category) {
        case "semantic":
          return "rgba(6, 182, 212, 0.6)";
        case "keyword":
          return "rgba(16, 185, 129, 0.5)";
        case "risk":
          return analysis.overallRiskScore > 0 
            ? "rgba(244, 63, 94, 0.8)" 
            : "rgba(132, 204, 22, 0.4)";
        default:
          return "rgba(71, 85, 105, 0.4)";
      }
    };

    // Render tree categories headers
    const nodes = root.descendants();
    const leafNodes = nodes.filter(d => !d.children);
    const parentNodes = nodes.filter(d => d.depth === 1);

    // Group for the entire treemap elements
    const g = svg.append("g");

    // Render parent boundaries / headers
    parentNodes.forEach(p => {
      g.append("text")
        .attr("x", p.x0 + 6)
        .attr("y", p.y0 + 12)
        .attr("fill", p.name === "Bezpečnost" && analysis.overallRiskScore > 0 ? "#f43f5e" : "#94a3b8")
        .attr("font-size", "9px")
        .attr("font-weight", "bold")
        .attr("font-family", "monospace")
        .text((p.data.name || "").toUpperCase());
    });

    // Render individual leaf rectangles
    const cell = g.selectAll("g.cell")
      .data(leafNodes)
      .enter()
      .append("g")
      .attr("class", "cell")
      .attr("transform", d => `translate(${d.x0},${d.y0})`);

    cell.append("rect")
      .attr("width", d => Math.max(0, d.x1 - d.x0))
      .attr("height", d => Math.max(0, d.y1 - d.y0))
      .attr("fill", d => getColor(d.data.category))
      .attr("stroke", d => getBorderColor(d.data.category))
      .attr("stroke-width", 1)
      .attr("rx", 4)
      .style("transition", "all 0.2s ease")
      .style("cursor", "pointer")
      .on("mouseenter", function(event, d) {
        d3.select(this)
          .attr("fill", d.data.category === "risk" && analysis.overallRiskScore > 0 
            ? "rgba(244, 63, 94, 0.5)" 
            : d.data.category === "semantic" 
            ? "rgba(6, 182, 212, 0.45)" 
            : "rgba(16, 185, 129, 0.4)")
          .attr("stroke-width", 1.5);
        setHoveredNode({
          name: d.data.name,
          value: d.data.value || 0,
          category: d.data.category || ""
        });
      })
      .on("mouseleave", function(event, d) {
        d3.select(this)
          .attr("fill", getColor(d.data.category))
          .attr("stroke-width", 1);
        setHoveredNode(null);
      });

    // Add labels to cells if they fit
    cell.append("text")
      .attr("x", 6)
      .attr("y", 16)
      .attr("fill", d => {
        if (d.data.category === "risk" && analysis.overallRiskScore > 0) return "#fda4af";
        if (d.data.category === "semantic") return "#e2e8f0";
        return "#cbd5e1";
      })
      .attr("font-size", "9px")
      .attr("font-family", "sans-serif")
      .attr("font-weight", "500")
      .text(d => {
        const w = d.x1 - d.x0;
        const name = d.data.name;
        if (name.length * 6 > w) {
          return name.substring(0, Math.floor(w / 6)) + "..";
        }
        return name;
      });

  }, [dimensions, analysis]);

  return (
    <div className="space-y-4 animate-in fade-in duration-300" id="deep-prompt-analysis">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Detail Panel 1: Semantic Analysis */}
        <div className="bg-[#090f1d]/90 rounded-2xl p-4 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <Compass className="w-4 h-4 text-cyan-400" />
              <h4 className="text-xs font-bold text-slate-200 uppercase font-mono tracking-wider">
                Sémantické složení
              </h4>
            </div>
            
            <div className="space-y-2">
              {analysis.semanticCategories.map((cat, idx) => (
                <div key={idx} className="bg-slate-900/40 p-2 rounded-xl border border-slate-800/60 text-[11px]">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-slate-300">{cat.name}</span>
                    <span className="text-cyan-400 font-bold font-mono bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-900/30">
                      {cat.value}%
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-normal">{cat.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-900 text-[10px] text-slate-400 font-mono">
            FOCUS: {analysis.semanticCategories[0]?.name || "Neurčeno"}
          </div>
        </div>

        {/* Detail Panel 2: Keyword Density & D3 Container */}
        <div className="bg-[#090f1d]/90 rounded-2xl p-4 border border-slate-800 lg:col-span-2 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-emerald-400 animate-pulse" />
              <div>
                <h4 className="text-xs font-bold text-slate-200 uppercase font-mono tracking-wider">
                  D3.js Hierarchický Treemap
                </h4>
                <span className="text-[9px] text-slate-500 font-sans block">
                  Vizuální vyhodnocení váhy instrukcí v promptu
                </span>
              </div>
            </div>
            {hoveredNode ? (
              <div className="text-[10px] bg-slate-900 px-2 py-0.5 rounded border border-slate-800 font-mono flex items-center gap-1.5 animate-pulse">
                <span className="text-slate-400">{hoveredNode.name}:</span>
                <span className="text-cyan-400 font-bold">{hoveredNode.value} pts</span>
              </div>
            ) : (
              <span className="text-[9px] text-slate-500 font-mono">Přejeďte myší pro detail</span>
            )}
          </div>

          {/* D3 Treemap SVG Stage */}
          <div ref={containerRef} className="w-full bg-slate-950/40 rounded-xl border border-slate-900 overflow-hidden relative p-1 flex-1 flex items-center justify-center min-h-[250px]">
            <svg 
              ref={svgRef} 
              width={dimensions.width} 
              height={dimensions.height}
              className="mx-auto block"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Detail Panel 3: Keyword Density List */}
        <div className="bg-[#090f1d]/90 rounded-2xl p-4 border border-slate-800">
          <div className="flex items-center gap-2 mb-3">
            <ListOrdered className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs font-bold text-slate-200 uppercase font-mono tracking-wider">
              Hustota klíčových slov
            </h4>
          </div>

          {analysis.keywords.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-500 font-mono">
              Zadejte delší prompt pro analýzu klíčových slov.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {analysis.keywords.map((kw, idx) => (
                <div key={idx} className="flex items-center justify-between bg-slate-950/60 p-2 rounded-xl border border-slate-900 text-xs">
                  <span className="font-mono text-slate-300">"{kw.word}"</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] text-slate-500">Výskyt:</span>
                    <span className="font-bold text-emerald-400 bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-900/20 font-mono">
                      {kw.count}x
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail Panel 4: Prompt Injection Risks */}
        <div className="bg-[#090f1d]/90 rounded-2xl p-4 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className={`w-4 h-4 ${analysis.overallRiskScore > 0 ? "text-rose-500 animate-bounce" : "text-emerald-400"}`} />
                <h4 className="text-xs font-bold text-slate-200 uppercase font-mono tracking-wider">
                  Analýza bezpečnostních rizik (Prompt Injection)
                </h4>
              </div>
              <div className="flex items-center gap-1">
                <Gauge className="w-3.5 h-3.5 text-slate-400" />
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                  analysis.overallRiskScore > 40 
                    ? "bg-rose-950/60 text-rose-400 border border-rose-900/40" 
                    : analysis.overallRiskScore > 0 
                    ? "bg-amber-950/60 text-amber-400 border border-amber-900/40"
                    : "bg-emerald-950/60 text-emerald-400 border border-emerald-900/40"
                }`}>
                  RIZIKO: {analysis.overallRiskScore > 40 ? "VYSOKÉ" : analysis.overallRiskScore > 0 ? "STŘEDNÍ" : "NÍZKÉ"}
                </span>
              </div>
            </div>

            {analysis.risks.length === 0 ? (
              <div className="py-5 flex flex-col items-center justify-center space-y-1.5 bg-emerald-950/5 border border-emerald-900/20 rounded-xl">
                <CheckCircle2 className="w-7 h-7 text-emerald-400/80" />
                <span className="text-xs font-semibold text-slate-300">Prompt je bezpečný</span>
                <span className="text-[10px] text-slate-500 text-center px-4 font-sans max-w-[280px]">
                  Nebyly detekovány žádné vzorce pro přepsání systémových instrukcí.
                </span>
              </div>
            ) : (
              <div className="space-y-2">
                {analysis.risks.map((risk, idx) => (
                  <div key={idx} className="bg-rose-950/10 border border-rose-950 p-2.5 rounded-xl text-xs flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="font-bold text-rose-300">Detekován vzor:</span>
                        <span className="font-mono bg-rose-950 text-rose-300 px-1 py-0.2 rounded text-[10px]">
                          "{risk.phrase}"
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-normal">{risk.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="text-[9px] text-slate-500 font-mono mt-3 text-right">
            D3 SecureEngine v1.1 • Skóre: {analysis.overallRiskScore}/100
          </div>
        </div>
      </div>
    </div>
  );
}
