import React, { useState, useEffect } from "react";
import posthog from 'posthog-js';
import { 
  Sparkles, 
  Check, 
  Copy, 
  Plus, 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  Cloud, 
  CloudCheck, 
  Smartphone, 
  ArrowRight, 
  Trash2, 
  Info, 
  Brain,
  BookOpen, 
  Layers, 
  CheckCircle,
  Globe,
  PlusCircle,
  X,
  Compass,
  FileText,
  Cpu,
  Terminal,
  Database,
  Layers3,
  Zap,
  ChevronDown,
  ChevronUp,
  BarChart3
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { OptimizationHistoryChart } from "./components/OptimizationHistoryChart";
import DeepAnalysisView from "./components/DeepAnalysisView";

import { Question, CatalogPrompt, Citation, SynthesizedPrompt, SavedPromptSession, LocalEngine, OptimizationStep } from "./types";
import { AESTHETIC_PRESETS, STARTER_TEMPLATES } from "./data";
import { 
  localGenerateQuestions, 
  localSearchCatalog, 
  localSynthesizePrompt, 
  localRefinePrompt,
  getNeuralPredictions,
  PredictionCandidate,
  calculateComplexity,
  getCommaPredictions,
  CommaSuggestions
} from "./lib/localModel";

export default function App() {
  // Device Frame State (Simulate high-tech iPhone Frame on Desktop)
  const [useDeviceFrame, setUseDeviceFrame] = useState(true);

  // Connection & iCloud State
  const [offlineMode, setOfflineMode] = useState(false);
  const [iCloudSyncing, setICloudSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>("Synced just now");
  const [isOnline, setIsOnline] = useState(true);

  // App core variables
  const [originalPrompt, setOriginalPrompt] = useState("");
  const [currentPillar, setCurrentPillar] = useState<1 | 2 | 3>(1);

  // Pillar 1: Context Questions
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  // Pillar 2: Sourced catalog templates
  const [catalog, setCatalog] = useState<CatalogPrompt[]>([]);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);

  // Pillar 3: Synthesis & Polish
  const [synthesized, setSynthesized] = useState<SynthesizedPrompt | null>(null);
  const [synthesizing, setSynthesizing] = useState(false);
  const [manualEdits, setManualEdits] = useState("");
  const [refining, setRefining] = useState(false);

  // "+" Aesthetic Layout State
  const [referenceAesthetics, setReferenceAesthetics] = useState("");
  const [customAestheticText, setCustomAestheticText] = useState("");
  const [selectedPresetId, setSelectedPresetId] = useState("");
  const [showAestheticModal, setShowAestheticModal] = useState(false);

  // Saved Prompts list (iCloud Sync Simulation)
  const [savedSessions, setSavedSessions] = useState<SavedPromptSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Dynamic Optimization History (Recharts Data Source)
  const [optimizationHistory, setOptimizationHistory] = useState<OptimizationStep[]>([]);
  const [inspectStepIndex, setInspectStepIndex] = useState<number | null>(null);
  const [compareStepIndex, setCompareStepIndex] = useState<number | null>(null);

  // Collapsible panel (roletka) states
  const [isStarterTemplatesOpen, setIsStarterTemplatesOpen] = useState(false);
  const [isICloudSavedOpen, setIsICloudSavedOpen] = useState(false);
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  const [showDeepAnalysis, setShowDeepAnalysis] = useState(false);

  // Local Neural Core / Models list state
  const [localEngines, setLocalEngines] = useState<LocalEngine[]>([
    {
      id: "gemma-2b",
      name: "Gemma 2 2B (Google)",
      size: "1.6 GB",
      parameters: "2.1B parameters",
      description: "Extrémně přesný model pro strukturování promptů a logických instrukcí.",
      accuracy: "94.2%",
      speed: "58 tok/s",
      downloaded: false,
      downloading: false,
      progress: 0,
      active: false
    },
    {
      id: "llama-1b",
      name: "Llama 3.2 1B (Meta)",
      size: "1.2 GB",
      parameters: "1.2B parameters",
      description: "Ultrarychlý model optimalizovaný pro energeticky úsporný běh na mobilních čipech Apple Silicon.",
      accuracy: "88.7%",
      speed: "74 tok/s",
      downloaded: false,
      downloading: false,
      progress: 0,
      active: false
    },
    {
      id: "phi-3",
      name: "Phi-3 Mini 3.8B (Microsoft)",
      size: "2.2 GB",
      parameters: "3.8B parameters",
      description: "Vysoce analytický model s hlubokým logickým uvažováním vhodný pro náročné syntézy.",
      accuracy: "96.5%",
      speed: "42 tok/s",
      downloaded: false,
      downloading: false,
      progress: 0,
      active: false
    }
  ]);

  const [activeEngineId, setActiveEngineId] = useState<string>("default-cloud");
  const [showEngineModal, setShowEngineModal] = useState(false);

  // Trigger downloading a larger local engine model
  const downloadEngineModel = (engineId: string) => {
    setLocalEngines(prev => prev.map(engine => {
      if (engine.id === engineId) {
        if (engine.downloaded || engine.downloading) return engine;
        posthog.capture('engine_model_downloaded', {
          engine_id: engineId,
          engine_name: engine.name,
          engine_size: engine.size,
        });
        // Start download simulation
        let currentProg = 0;
        const interval = setInterval(() => {
          currentProg += 10;
          setLocalEngines(currentEngines => currentEngines.map(e => {
            if (e.id === engineId) {
              if (currentProg >= 100) {
                clearInterval(interval);
                setTimeout(() => {
                  showToast(`${e.name} byl připojen a aktivován`);
                  setActiveEngineId(engineId);
                  triggerICloudSync();
                }, 150);
                return { ...e, downloading: false, downloaded: true, progress: 100 };
              }
              return { ...e, progress: currentProg };
            }
            return e;
          }));
        }, 150);

        return { ...engine, downloading: true, progress: 0 };
      }
      return engine;
    }));
  };

  // Switch between models
  const selectActiveEngine = (engineId: string) => {
    if (engineId === "default-cloud") {
      posthog.capture('engine_switched', { engine_id: 'default-cloud', engine_name: 'Standard Cloud Core' });
      setActiveEngineId("default-cloud");
      showToast("Aktivován standardní Cloud Engine");
      triggerICloudSync();
      return;
    }

    const engine = localEngines.find(e => e.id === engineId);
    if (engine && engine.downloaded) {
      posthog.capture('engine_switched', { engine_id: engineId, engine_name: engine.name });
      setActiveEngineId(engineId);
      showToast(`Aktivován model: ${engine.name}`);
      triggerICloudSync();
    } else if (engine) {
      // Auto trigger download if not downloaded yet
      downloadEngineModel(engineId);
    }
  };

  // Feedback notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedFinal, setCopiedFinal] = useState(false);

  // Live System Clock
  const [currentTime, setCurrentTime] = useState("");

  // Neural Predict Autocomplete States
  const [predictions, setPredictions] = useState<PredictionCandidate[]>([]);
  const [showPredictions, setShowPredictions] = useState(true);
  const [isPredictionModelDownloaded, setIsPredictionModelDownloaded] = useState(true);
  const [predictionModelDownloading, setPredictionModelDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  // Update predictions when originalPrompt changes
  useEffect(() => {
    if (isPredictionModelDownloaded && originalPrompt) {
      const preds = getNeuralPredictions(originalPrompt);
      setPredictions(preds);
    } else {
      setPredictions([]);
    }
  }, [originalPrompt, isPredictionModelDownloaded]);

  // Comma-triggered prediction states & debounce hook
  const [commaPredictions, setCommaPredictions] = useState<CommaSuggestions | null>(null);
  const [isCommaPredicting, setIsCommaPredicting] = useState(false);

  useEffect(() => {
    const hasTrailingComma = /,\s*$/.test(originalPrompt);
    
    if (hasTrailingComma) {
      setIsCommaPredicting(true);
      setCommaPredictions(null);

      const timer = setTimeout(() => {
        const suggestions = getCommaPredictions(originalPrompt);
        setCommaPredictions(suggestions);
        setIsCommaPredicting(false);
      }, 600);

      return () => clearTimeout(timer);
    } else {
      setCommaPredictions(null);
      setIsCommaPredicting(false);
    }
  }, [originalPrompt]);

  const applyCommaSuggestion = (suggestion: string) => {
    setOriginalPrompt(prev => {
      const lastCommaIndex = prev.lastIndexOf(',');
      if (lastCommaIndex !== -1) {
        const base = prev.substring(0, lastCommaIndex + 1);
        return base + " " + suggestion;
      }
      return prev + (prev.endsWith(" ") ? "" : " ") + suggestion;
    });
    setCommaPredictions(null);
  };

  // Simulate downloading the small 2.4 MB on-device neural prediction module
  const downloadPredictionModule = () => {
    if (predictionModelDownloading) return;
    setPredictionModelDownloading(true);
    setDownloadProgress(0);
    
    const interval = setInterval(() => {
      setDownloadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsPredictionModelDownloaded(true);
            setPredictionModelDownloading(false);
            showToast("NeuralPredict Mini Model Downloaded");
          }, 300);
          return 100;
        }
        return prev + 10;
      });
    }, 120);
  };

  // Update clock
  useEffect(() => {
    const updateTime = () => {
      const date = new Date();
      let hours = date.getHours();
      const minutes = date.getMinutes().toString().padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12;
      setCurrentTime(`${hours}:${minutes} ${ampm}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  // Monitor physical internet connection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Sync state to LocalStorage (iCloud Drive Space) with animation
  const triggerICloudSync = () => {
    setICloudSyncing(true);
    setTimeout(() => {
      setICloudSyncing(false);
      const now = new Date();
      setLastSyncTime(`Synced at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
      showToast("iCloud Synced Across iOS & macOS");
    }, 1250);
  };

  // Load Saved Sessions from LocalStorage
  useEffect(() => {
    const stored = localStorage.getItem("prompt_architect_sessions");
    if (stored) {
      setSavedSessions(JSON.parse(stored));
    } else {
      const sampleSessions: SavedPromptSession[] = [
        {
          id: "1",
          title: "Neural Fitness Planner",
          originalPrompt: "Create a personalized fitness planner for busy professionals.",
          finalPrompt: "# ROLE & CONTEXT\nAdopt the persona of an elite AI Health Specialist...",
          timestamp: "Yesterday, 4:20 PM"
        },
        {
          id: "2",
          title: "SaaS Conversational Engine",
          originalPrompt: "Write compelling landing page copy.",
          finalPrompt: "# ROLE: Expert AI Conversion Copywriter...",
          timestamp: "2 days ago"
        }
      ];
      localStorage.setItem("prompt_architect_sessions", JSON.stringify(sampleSessions));
      setSavedSessions(sampleSessions);
    }
  }, []);

  // Trigger auto iCloud sync on sessions update
  useEffect(() => {
    if (savedSessions.length > 0) {
      localStorage.setItem("prompt_architect_sessions", JSON.stringify(savedSessions));
    }
  }, [savedSessions]);

  // Toast utility helper
  const [lastToast, setLastToast] = useState("");
  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  // Apply predictive autocomplete to the prompt
  const applyPrediction = (pred: PredictionCandidate) => {
    posthog.capture('autocomplete_prediction_applied', {
      category: pred.category,
      confidence: pred.confidence,
    });
    setOriginalPrompt(pred.phrase);
    setPredictions([]);
    showToast(`Autocompleted: ${pred.category}`);
    triggerICloudSync();
  };

  // Capture tab or right arrow to apply autocomplete
  const handlePromptKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab" && predictions.length > 0 && isPredictionModelDownloaded) {
      e.preventDefault();
      applyPrediction(predictions[0]);
    }
  };

  // Pillar 1: Initialize detailed questioning
  const handleStartPrompt = async (selectedPrompt?: string) => {
    const promptToUse = selectedPrompt || originalPrompt;
    if (!promptToUse.trim()) {
      showToast("Please write or select a simple prompt first!");
      return;
    }

    posthog.capture('prompt_optimization_started', {
      prompt_length: promptToUse.length,
      word_count: promptToUse.trim().split(/\s+/).filter(Boolean).length,
      used_starter_template: !!selectedPrompt,
      mode: offlineMode || !isOnline ? 'offline' : 'cloud',
    });

    setLoadingQuestions(true);
    setLoadingCatalog(true);
    setSynthesized(null);
    setCurrentPillar(1);

    // Initialize Optimization History
    const initialStep: OptimizationStep = {
      stepIndex: 0,
      label: "Zadání",
      prompt: promptToUse,
      length: promptToUse.length,
      wordCount: promptToUse.trim().split(/\s+/).filter(Boolean).length,
      complexity: calculateComplexity(promptToUse),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
    setOptimizationHistory([initialStep]);

    // Dynamic sync state
    triggerICloudSync();

    const isOfflineActive = offlineMode || !isOnline;

    if (isOfflineActive) {
      setTimeout(() => {
        const localQs = localGenerateQuestions(promptToUse);
        setQuestions(localQs);
        setLoadingQuestions(false);

        const localCat = localSearchCatalog(promptToUse);
        setCatalog(localCat);
        setLoadingCatalog(false);
        showToast("Initialized offline models");
      }, 750);
    } else {
      try {
        const qRes = await fetch("/api/generate-questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: promptToUse })
        });
        const qData = await qRes.json();
        if (qData.error) throw new Error(qData.error);
        setQuestions(qData.questions || []);
      } catch (err: any) {
        console.warn("Backend error, falling back to local simulation:", err);
        const localQs = localGenerateQuestions(promptToUse);
        setQuestions(localQs);
      } finally {
        setLoadingQuestions(false);
      }

      try {
        const cRes = await fetch("/api/search-catalog", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: promptToUse })
        });
        const cData = await cRes.json();
        if (cData.error) throw new Error(cData.error);
        setCatalog(cData.catalog || []);
        setCitations(cData.citations || []);
      } catch (err: any) {
        console.warn("Backend catalog search error, using local simulation:", err);
        const localCat = localSearchCatalog(promptToUse);
        setCatalog(localCat);
      } finally {
        setLoadingCatalog(false);
      }
    }
  };

  // Auto-Fill All answers instantly
  const handleAutoFillAnswers = () => {
    if (questions.length === 0) return;
    const prefilled = questions.map(q => ({
      ...q,
      answer: q.answer || q.placeholder.replace("e.g., ", "")
    }));
    setQuestions(prefilled);
    posthog.capture('context_answers_auto_filled', {
      question_count: questions.length,
    });
    showToast("AI synthesized context answers!");
    triggerICloudSync();
  };

  // Handle manual answer updates
  const handleUpdateAnswer = (id: number, text: string) => {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, answer: text } : q));
  };

  // Toggle catalog selections
  const toggleCatalogSelection = (index: number) => {
    setCatalog(prev => prev.map((item, idx) => idx === index ? { ...item, selected: !item.selected } : item));
    triggerICloudSync();
  };

  const addOptimizationStep = (label: string, promptText: string) => {
    setOptimizationHistory(prev => {
      const stepIndex = prev.length;
      const newStep: OptimizationStep = {
        stepIndex,
        label,
        prompt: promptText,
        length: promptText.length,
        wordCount: promptText.trim().split(/\s+/).filter(Boolean).length,
        complexity: calculateComplexity(promptText),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      };
      return [...prev, newStep];
    });
  };

  // Pillar 3: Synthesis
  const handleSynthesizePrompt = async () => {
    const isOfflineActive = offlineMode || !isOnline;
    setSynthesizing(true);
    setCurrentPillar(3);

    const activeAnswers = questions.map(q => ({
      question: q.question,
      answer: q.answer || ""
    }));

    const selectedPrompts = catalog.filter(c => c.selected);

    if (isOfflineActive) {
      setTimeout(() => {
        const engineName = activeEngineId !== "default-cloud" 
          ? (localEngines.find(e => e.id === activeEngineId)?.name || "Local Engine")
          : "On-Device Rule Engine";

        const response = localSynthesizePrompt(
          originalPrompt,
          activeAnswers,
          selectedPrompts,
          referenceAesthetics
        );
        
        const enrichedExplanation = `⚡ [KOMPILACE: LOKÁLNÍ NEURÁLNÍ MODEL - ${engineName.toUpperCase()}]\n\n${response.explanation}\n\n*Běh lokalizován na hardware Vašeho zařízení s nulovou latencí a 100% soukromím dat (offline).*`;
        
        setSynthesized({
          ...response,
          explanation: enrichedExplanation
        });
        setSynthesizing(false);
        addOptimizationStep("Syntéza", response.finalPrompt);
        posthog.capture('prompt_synthesized', {
          mode: 'offline',
          engine: engineName,
          catalog_templates_used: selectedPrompts.length,
          context_answers_provided: activeAnswers.filter(a => a.answer).length,
          has_aesthetic: !!referenceAesthetics,
        });
        showToast(`Zpracováno lokálně modelem: ${engineName}!`);
        triggerICloudSync();
      }, 950);
    } else {
      try {
        const response = await fetch("/api/synthesize-prompt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            originalPrompt,
            answers: activeAnswers,
            selectedCatalogPrompts: selectedPrompts,
            referenceAesthetics
          })
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        setSynthesized(data);
        addOptimizationStep("Syntéza", data.finalPrompt);
        posthog.capture('prompt_synthesized', {
          mode: data.isOfflineFallback ? 'offline_fallback' : 'cloud',
          engine: 'default-cloud',
          catalog_templates_used: selectedPrompts.length,
          context_answers_provided: activeAnswers.filter(a => a.answer).length,
          has_aesthetic: !!referenceAesthetics,
        });
      } catch (err: any) {
        console.warn("Backend synthesis error, falling back to local engine:", err);
        const response = localSynthesizePrompt(
          originalPrompt,
          activeAnswers,
          selectedPrompts,
          referenceAesthetics
        );
        setSynthesized(response);
        addOptimizationStep("Syntéza", response.finalPrompt);
        posthog.capture('prompt_synthesized', {
          mode: 'offline_fallback',
          engine: 'local',
          catalog_templates_used: selectedPrompts.length,
          context_answers_provided: activeAnswers.filter(a => a.answer).length,
          has_aesthetic: !!referenceAesthetics,
        });
      } finally {
        setSynthesizing(false);
      }
    }
  };

  // Reload Icon: Polish & Recalculate dynamic prompt after manual adjustments
  const handleRefinePrompt = async () => {
    if (!synthesized) return;
    const currentEdits = manualEdits.trim();
    if (!currentEdits) {
      showToast("Enter custom optimization instructions first!");
      return;
    }

    const isOfflineActive = offlineMode || !isOnline;
    setRefining(true);
    const label = `Upřesnění ${optimizationHistory.length} ("${currentEdits.length > 12 ? currentEdits.substring(0, 12) + "..." : currentEdits}")`;

    if (isOfflineActive) {
      setTimeout(() => {
        const response = localRefinePrompt(synthesized.finalPrompt, currentEdits);
        setSynthesized(response);
        setRefining(false);
        addOptimizationStep(label, response.finalPrompt);
        setManualEdits("");
        posthog.capture('prompt_refined', {
          mode: 'offline',
          refinement_step: optimizationHistory.length,
        });
        showToast("Re-compiled & polished offline");
        triggerICloudSync();
      }, 850);
    } else {
      try {
        const response = await fetch("/api/refine-prompt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            finalPrompt: synthesized.finalPrompt,
            manualEdits: currentEdits
          })
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        setSynthesized(data);
        addOptimizationStep(label, data.finalPrompt);
        setManualEdits("");
        posthog.capture('prompt_refined', {
          mode: data.isOfflineFallback ? 'offline_fallback' : 'cloud',
          refinement_step: optimizationHistory.length,
        });
        showToast("Reprocessed manual directives!");
      } catch (err: any) {
        console.warn("Backend refinement failed, using offline compiler:", err);
        const response = localRefinePrompt(synthesized.finalPrompt, currentEdits);
        setSynthesized(response);
        addOptimizationStep(label, response.finalPrompt);
        setManualEdits("");
        posthog.capture('prompt_refined', {
          mode: 'offline_fallback',
          refinement_step: optimizationHistory.length,
        });
      } finally {
        setRefining(false);
      }
    }
  };

  // Save synthesized prompt to iCloud storage log
  const handleSaveToICloud = () => {
    if (!synthesized) return;
    const title = originalPrompt.length > 25 ? originalPrompt.substring(0, 25) + "..." : originalPrompt;
    const newSession: SavedPromptSession = {
      id: Date.now().toString(),
      title: title || "AI Neural Prompt",
      originalPrompt,
      finalPrompt: synthesized.finalPrompt,
      timestamp: "Just now",
      optimizationHistory: optimizationHistory
    };

    setSavedSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    posthog.capture('prompt_saved', {
      optimization_steps: optimizationHistory.length,
    });
    showToast("Backed up to iCloud Storage");
    triggerICloudSync();
  };

  // Load a historic session
  const handleLoadSession = (sess: SavedPromptSession) => {
    posthog.capture('prompt_session_loaded', {
      had_optimization_history: !!(sess.optimizationHistory && sess.optimizationHistory.length > 0),
    });
    setOriginalPrompt(sess.originalPrompt);
    setSynthesized({
      finalPrompt: sess.finalPrompt,
      explanation: "Restored from iCloud secure synchronization."
    });
    setCurrentPillar(3);
    setActiveSessionId(sess.id);

    if (sess.optimizationHistory && sess.optimizationHistory.length > 0) {
      setOptimizationHistory(sess.optimizationHistory);
    } else {
      // Reconstruct historical progression retrospectively
      const step0: OptimizationStep = {
        stepIndex: 0,
        label: "Zadání",
        prompt: sess.originalPrompt,
        length: sess.originalPrompt.length,
        wordCount: sess.originalPrompt.trim().split(/\s+/).filter(Boolean).length,
        complexity: calculateComplexity(sess.originalPrompt),
        timestamp: "Historical"
      };
      const step1: OptimizationStep = {
        stepIndex: 1,
        label: "Syntéza",
        prompt: sess.finalPrompt,
        length: sess.finalPrompt.length,
        wordCount: sess.finalPrompt.trim().split(/\s+/).filter(Boolean).length,
        complexity: calculateComplexity(sess.finalPrompt),
        timestamp: "Historical"
      };
      setOptimizationHistory([step0, step1]);
    }
    showToast(`Loaded: ${sess.title}`);
  };

  // Delete an iCloud session
  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    posthog.capture('prompt_session_deleted');
    setSavedSessions(prev => prev.filter(s => s.id !== id));
    if (activeSessionId === id) {
      setActiveSessionId(null);
    }
    showToast("Removed from iCloud");
    triggerICloudSync();
  };

  // Apply visual preset style
  const handleApplyPreset = (preset: any) => {
    posthog.capture('aesthetic_preset_applied', {
      preset_id: preset.id,
      preset_name: preset.name,
    });
    setSelectedPresetId(preset.id);
    setReferenceAesthetics(`${preset.name} - ${preset.description}`);
    setShowAestheticModal(false);
    showToast(`Injected Style: ${preset.name}`);
    triggerICloudSync();
  };

  // Copy helper
  const handleCopyText = (text: string, index?: number) => {
    navigator.clipboard.writeText(text);
    if (index !== undefined) {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } else {
      posthog.capture('prompt_copied', {
        prompt_length: text.length,
      });
      setCopiedFinal(true);
      setTimeout(() => setCopiedFinal(false), 2000);
    }
    showToast("Copied to clipboard!");
  };

  const answeredCount = questions.filter(q => q.answer && q.answer.trim() !== "").length;

  return (
    <div className="min-h-screen bg-[#030712] py-6 px-4 flex flex-col items-center justify-start text-[#e5e7eb] font-sans antialiased selection:bg-blue-600/30">
      
      {/* Upper Settings & Control Bar */}
      <div className="w-full max-w-lg mb-4 flex items-center justify-between text-xs px-2 text-slate-400">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setUseDeviceFrame(!useDeviceFrame)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all border ${
              useDeviceFrame 
                ? "bg-slate-900 text-cyan-400 border-cyan-500/30 shadow-md font-semibold" 
                : "bg-transparent text-slate-500 border-slate-800"
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Futuristic Device Shell</span>
          </button>
        </div>

        {/* Sync Indicator */}
        <div className="flex items-center gap-1.5 bg-slate-900/80 px-3 py-1.5 rounded-full border border-slate-800/80 shadow-md">
          <Cloud className={`w-3.5 h-3.5 text-cyan-400 ${iCloudSyncing ? "animate-bounce" : ""}`} />
          <span className="font-semibold text-[10px] text-slate-300">
            {iCloudSyncing ? "iCloud Synchronizing..." : "iCloud Live"}
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
        </div>
      </div>

      {/* Frame Container */}
      <div className={`transition-all duration-300 w-full ${useDeviceFrame ? "max-w-[412px] rounded-[52px] border-[12px] border-slate-800 bg-[#080d1a] shadow-2xl relative overflow-hidden h-[860px] border-t-slate-700 border-b-slate-900" : "max-w-lg min-h-[820px] rounded-3xl bg-[#080d1a] border border-slate-800 shadow-2xl relative overflow-hidden"}`}>
        
        {/* iOS High-Tech Status Bar */}
        <div className="bg-[#080d1a] h-12 pt-4 px-6 flex items-center justify-between select-none relative z-20 border-b border-slate-900/40">
          <span className="text-[14px] font-semibold text-slate-200 tracking-tight font-mono">{currentTime || "9:41 AM"}</span>
          
          {/* iOS Dynamic Island / Tech Notch */}
          {useDeviceFrame && (
            <div className="absolute left-1/2 transform -translate-x-1/2 top-3 w-[115px] h-[28px] bg-black rounded-full flex items-center justify-end px-3 border border-slate-800">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-900 border border-cyan-500 mr-1 animate-pulse"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-slate-950"></span>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-slate-300">
            {/* Offline Switch */}
            <button 
              onClick={() => {
                setOfflineMode(!offlineMode);
                showToast(`Offline mode: ${!offlineMode ? "Active" : "Inactive"}`);
                triggerICloudSync();
              }}
              className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${
                offlineMode 
                  ? "bg-amber-950/80 text-amber-400 border-amber-600/30" 
                  : "bg-cyan-950/80 text-cyan-400 border-cyan-600/30"
              }`}
              title="Toggle offline state simulation"
            >
              {offlineMode ? <WifiOff className="w-2.5 h-2.5" /> : <Wifi className="w-2.5 h-2.5" />}
              <span>{offlineMode ? "OFFLINE" : "LIVE ENGINE"}</span>
            </button>
            <span className="text-[11px] font-mono font-medium">99%</span>
            <div className="w-5 h-2.5 border border-slate-600 rounded-sm p-0.5 flex items-center justify-start bg-slate-900">
              <div className="h-full w-4 bg-cyan-500 rounded-2xs animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Real-time sync alert banner */}
        <AnimatePresence>
          {iCloudSyncing && (
            <motion.div 
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              className="absolute top-12 left-0 right-0 z-50 px-4"
            >
              <div className="bg-slate-950 text-cyan-400 text-[11px] py-2 px-3 rounded-2xl shadow-2xl flex items-center justify-between border border-cyan-500/20 cyber-neon-glow">
                <div className="flex items-center gap-2">
                  <Cpu className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                  <span>iCloud syncing with neural core...</span>
                </div>
                <span className="text-[9px] text-cyan-500 font-mono animate-pulse">SYNC</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CORE APP WRAPPER */}
        <div className="px-4 pb-20 pt-2 h-[calc(100%-48px)] overflow-y-auto no-scrollbar flex flex-col justify-between">
          
          <div>
            {/* futuristic Header Branding */}
            <div className="mt-2 mb-4 px-1 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-cyan-400 tracking-widest uppercase flex items-center gap-1 font-mono">
                  <Zap className="w-3 h-3 text-cyan-400" />
                  Future AI Architect Grid
                </span>
                <h1 className="text-2xl font-bold tracking-tight text-white mt-0.5 flex items-center gap-2">
                  Prompt Architect
                  <Sparkles className="w-5 h-5 text-cyan-400 fill-cyan-400/10" />
                </h1>
              </div>
              <span className="text-[11px] bg-slate-900 text-cyan-400 font-mono font-bold px-2.5 py-0.5 rounded-md border border-slate-800">
                PRO_v2.0
              </span>
            </div>

            {/* PILLAR STEP 0: Base Input Entry Point */}
            <div className="cyber-card rounded-3xl p-4 mb-4 relative border-slate-800 bg-[#0d1527]/70">
              <label className="block text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-2 font-mono">
                1. Input Core Directive
              </label>
              
              <div className="relative">
                {/* Background overlay for Ghost Auto-completion suggestion (Gmail style) */}
                {isPredictionModelDownloaded && predictions.length > 0 && originalPrompt.trim().length >= 2 && (
                  <div className="absolute top-0 left-0 right-0 bottom-0 p-3.5 pr-10 text-sm font-medium font-sans text-slate-600 pointer-events-none select-none whitespace-pre-wrap leading-normal">
                    <span className="opacity-0">{originalPrompt}</span>
                    <span>{predictions[0].completion}</span>
                  </div>
                )}

                <textarea
                  value={originalPrompt}
                  onChange={(e) => setOriginalPrompt(e.target.value)}
                  onKeyDown={handlePromptKeyDown}
                  placeholder="e.g. Vytvořit moderní SwiftUI, Create a high-converting SaaS..."
                  className="w-full text-sm bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 pr-10 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-hidden min-h-[85px] resize-none font-medium text-slate-100 placeholder-slate-500 relative z-10 bg-transparent"
                />
                
                {/* Floating Plus Button inside input container */}
                <button
                  type="button"
                  onClick={() => setShowAestheticModal(true)}
                  className="absolute right-2 bottom-3 p-1.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/50 shadow-md active:scale-90 transition-all flex items-center justify-center z-20"
                  title="Inject Visual Appearance Reference Preset"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Suggestions Overlay */}
              {isPredictionModelDownloaded && predictions.length > 0 && originalPrompt.trim().length >= 2 && (
                <div className="mt-2 space-y-1 bg-slate-950/90 border border-cyan-500/20 rounded-xl p-2 shadow-xl animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="flex items-center justify-between px-1.5 pb-1 text-[9px] text-slate-400 border-b border-slate-900">
                    <span className="font-bold flex items-center gap-1 font-mono">
                      <Terminal className="w-3 h-3 text-cyan-400" />
                      NeuralPredict Mini ({predictions[0].confidence}% Confidence)
                    </span>
                    <span className="font-mono text-[8px] text-slate-500 bg-slate-900 px-1.5 py-0.2 rounded-md">Tab key / click</span>
                  </div>
                  <div className="space-y-1 pt-1 max-h-[140px] overflow-y-auto no-scrollbar">
                    {predictions.map((pred, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => applyPrediction(pred)}
                        className="w-full text-left p-1.5 rounded-lg bg-slate-900/40 hover:bg-cyan-950/30 border border-slate-800/40 hover:border-cyan-500/30 transition-all flex items-center justify-between text-[11px] group"
                      >
                        <div className="flex flex-col pr-2 truncate">
                          <span className="text-[8px] font-bold text-cyan-400 font-mono tracking-wider uppercase">
                            {pred.category}
                          </span>
                          <span className="text-slate-300 group-hover:text-white transition-colors truncate">
                            {pred.phrase}
                          </span>
                        </div>
                        <span className="text-[9px] text-cyan-500 font-mono shrink-0 font-bold opacity-70 group-hover:opacity-100 pl-2">
                          Apply →
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Collapsible Model Core Selection & Predictor Panel (Roletka) */}
              <div className="mt-3 border-t border-slate-900/60 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModelSelectorOpen(!isModelSelectorOpen)}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-950/40 hover:bg-slate-950/80 border border-slate-900 hover:border-slate-800 transition-all text-[11px] font-mono text-slate-300 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Database className={`w-3.5 h-3.5 ${activeEngineId !== "default-cloud" ? "text-cyan-400 animate-pulse" : "text-slate-500"}`} />
                    <div className="text-left">
                      <span className="text-[9px] text-slate-500 block uppercase tracking-wider font-bold">AKTIVNÍ NEURONOVÝ MODEL</span>
                      <span className="text-cyan-400 font-semibold">
                        {activeEngineId === "default-cloud" ? "Standard Cloud Core" : (localEngines.find(e => e.id === activeEngineId)?.name || "Místní model")}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-500 text-[10px] bg-slate-900/80 px-2 py-1 rounded-lg border border-slate-800/40">
                    <span>{isModelSelectorOpen ? "Skrýt" : "Změnit model"}</span>
                    {isModelSelectorOpen ? <ChevronUp className="w-3.5 h-3.5 text-cyan-400" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {isModelSelectorOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-2.5 space-y-2">
                        {/* NeuralPredict Model Status Download Card */}
                        <div className="bg-slate-950/60 rounded-2xl p-2.5 border border-slate-900/60 text-[10px] flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Cpu className={`w-3.5 h-3.5 ${isPredictionModelDownloaded ? "text-cyan-400" : "text-slate-500"}`} />
                            <div>
                              <span className="font-bold text-slate-300 block">NeuralPredict Mini v1.0</span>
                              <span className="text-slate-500 text-[9px]">Size: 2.4 MB | Latency: 4ms | Offline Trained</span>
                            </div>
                          </div>
                          {isPredictionModelDownloaded ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[8px] font-bold text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-900/20">
                                On-Device Active
                              </span>
                              <button 
                                onClick={() => {
                                  setIsPredictionModelDownloaded(false);
                                  showToast("Predictor model offloaded");
                                }}
                                className="text-slate-500 hover:text-rose-400 text-[9px] underline ml-0.5 cursor-pointer"
                              >
                                Delete
                              </button>
                            </div>
                          ) : predictionModelDownloading ? (
                            <div className="w-24 text-right">
                              <div className="text-[8px] text-cyan-400 animate-pulse mb-0.5">Installing {downloadProgress}%</div>
                              <div className="w-full bg-slate-900 h-1 rounded-full overflow-hidden">
                                <div className="bg-cyan-400 h-full" style={{ width: `${downloadProgress}%` }} />
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={downloadPredictionModule}
                              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-[9px] px-2.5 py-1 rounded-md transition-all active:scale-95 cursor-pointer"
                            >
                              Install Free (2.4MB)
                            </button>
                          )}
                        </div>

                        {/* Local LLM Core Selection Card */}
                        <div className="bg-slate-950/60 rounded-2xl p-2.5 border border-slate-900/60 text-[10px] flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Database className={`w-3.5 h-3.5 ${activeEngineId !== "default-cloud" ? "text-cyan-400" : "text-slate-500"}`} />
                            <div>
                              <span className="font-bold text-slate-300 block">
                                Aktivní LLM: {activeEngineId === "default-cloud" ? "Standard Cloud Core" : (localEngines.find(e => e.id === activeEngineId)?.name || "Místní model")}
                              </span>
                              <span className="text-slate-500 text-[9px]">
                                {activeEngineId === "default-cloud" ? "Mód: Hybridní Cloud | Vyžaduje internet" : "Mód: Lokální offline běh (iOS / macOS)"}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowEngineModal(true)}
                            className="bg-slate-900 hover:bg-slate-850 text-cyan-400 border border-cyan-500/30 font-bold text-[9px] px-2 py-1 rounded-md transition-all active:scale-95 cursor-pointer flex items-center gap-1"
                          >
                            <span>Model Hub</span>
                            <ArrowRight className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Reference Aesthetic Pill */}
              {referenceAesthetics && (
                <div className="mt-3 flex items-center justify-between bg-cyan-950/40 border border-cyan-800/40 text-cyan-300 rounded-xl px-3 py-1.5 text-[11px] font-mono">
                  <span className="line-clamp-1">🎨 Style-Matrix: {referenceAesthetics}</span>
                  <button 
                    onClick={() => {
                      setReferenceAesthetics("");
                      setSelectedPresetId("");
                    }} 
                    className="text-cyan-500 hover:text-cyan-300 ml-1.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Actions Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                {/* Initialize Optimization */}
                <button
                  onClick={() => handleStartPrompt()}
                  disabled={loadingQuestions || !originalPrompt.trim()}
                  className="py-3 px-4 rounded-2xl text-slate-950 font-bold text-sm transition-all shadow-lg active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed bg-cyan-400 hover:bg-cyan-300 cyber-neon-glow"
                >
                  <Cpu className="w-4 h-4 text-slate-950 animate-pulse" />
                  <span>Compile AI Optimization</span>
                </button>

                {/* Toggle Deep Prompt Analysis */}
                <button
                  type="button"
                  onClick={() => {
                    posthog.capture('deep_analysis_toggled', { action: showDeepAnalysis ? 'hide' : 'show' });
                    setShowDeepAnalysis(!showDeepAnalysis);
                  }}
                  disabled={!originalPrompt.trim()}
                  className={`py-3 px-4 rounded-2xl font-bold text-sm transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed border ${
                    showDeepAnalysis 
                      ? "bg-purple-950/40 text-purple-300 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.15)]" 
                      : "bg-slate-900/60 text-cyan-400 border-slate-800/80 hover:border-cyan-500/40"
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>{showDeepAnalysis ? "Skrýt analýzu" : "Hloubková analýza"}</span>
                </button>
              </div>

              {/* Collapsible Deep Analysis View */}
              <AnimatePresence>
                {showDeepAnalysis && originalPrompt.trim() && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden mt-4 pt-4 border-t border-slate-800/60"
                  >
                    <DeepAnalysisView prompt={originalPrompt} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Inteligentní nápověda a predikce textu za čárkou */}
            <div className="cyber-card rounded-2xl p-4 mb-4 border-slate-800 bg-[#070b13]/80 relative overflow-hidden" id="comma-prediction-panel">
              {/* Decorative top ambient bar */}
              <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-80" />
              
              <div className="flex items-center gap-2 mb-3">
                <Brain className="w-4 h-4 text-cyan-400" />
                <div>
                  <h3 className="text-xs font-bold text-slate-200 uppercase font-mono tracking-wider">
                    Inteligentní nápověda & Predikce textu
                  </h3>
                  <span className="text-[9px] text-slate-500 font-sans block">
                    Kontextový našeptávač s neuronovou analýzou vět
                  </span>
                </div>
              </div>

              {isCommaPredicting ? (
                <div className="py-4 flex flex-col items-center justify-center space-y-2.5">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce animate-duration-500" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce animate-duration-500" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce animate-duration-500" style={{ animationDelay: '300ms' }}></span>
                  </div>
                  <span className="text-[10px] font-mono text-cyan-400 animate-pulse tracking-wide">
                    Zjišťuji pokračování věty za čárkou...
                  </span>
                </div>
              ) : commaPredictions ? (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-300">
                  <span className="text-[9px] font-bold text-slate-400 uppercase font-mono block tracking-wider px-0.5">
                    Vyberte pokračování pro vložení za čárku:
                  </span>
                  
                  <div className="grid grid-cols-1 gap-2">
                    {/* Option 1: Relevant */}
                    <button
                      type="button"
                      onClick={() => applyCommaSuggestion(commaPredictions.relevant)}
                      className="w-full text-left p-2.5 rounded-xl bg-slate-900/60 hover:bg-emerald-950/20 border border-slate-800 hover:border-emerald-500/40 transition-all cursor-pointer group flex items-start gap-2.5"
                    >
                      <span className="shrink-0 text-[8px] font-bold text-emerald-400 bg-emerald-950/50 px-1.5 py-0.5 rounded-md border border-emerald-900/30 uppercase font-mono mt-0.5">
                        Relevantní
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-300 group-hover:text-emerald-300 transition-colors leading-relaxed">
                          {commaPredictions.relevant}
                        </p>
                      </div>
                    </button>

                    {/* Option 2: Inspiring */}
                    <button
                      type="button"
                      onClick={() => applyCommaSuggestion(commaPredictions.inspiring)}
                      className="w-full text-left p-2.5 rounded-xl bg-slate-900/60 hover:bg-cyan-950/20 border border-slate-800 hover:border-cyan-500/40 transition-all cursor-pointer group flex items-start gap-2.5"
                    >
                      <span className="shrink-0 text-[8px] font-bold text-cyan-400 bg-cyan-950/50 px-1.5 py-0.5 rounded-md border border-cyan-900/30 uppercase font-mono mt-0.5">
                        Inspirativní
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-300 group-hover:text-cyan-300 transition-colors leading-relaxed">
                          {commaPredictions.inspiring}
                        </p>
                      </div>
                    </button>

                    {/* Option 3: Unusual */}
                    <button
                      type="button"
                      onClick={() => applyCommaSuggestion(commaPredictions.unusual)}
                      className="w-full text-left p-2.5 rounded-xl bg-slate-900/60 hover:bg-purple-950/20 border border-slate-800 hover:border-purple-500/40 transition-all cursor-pointer group flex items-start gap-2.5"
                    >
                      <span className="shrink-0 text-[8px] font-bold text-purple-400 bg-purple-950/50 px-1.5 py-0.5 rounded-md border border-purple-900/30 uppercase font-mono mt-0.5">
                        Neobvyklé
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-300 group-hover:text-purple-300 transition-colors leading-relaxed">
                          {commaPredictions.unusual}
                        </p>
                      </div>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-900 text-center">
                  <p className="text-[10px] text-slate-400 leading-relaxed font-sans">
                    💡 <span className="font-semibold text-slate-300">Tip pro predikci:</span> Napište do promptu <span className="text-cyan-400 font-mono font-bold">čárku ( , )</span> a přestaňte psát. Systém automaticky zanalyzuje kontext a nabídne vám tři různé směry rozvoje.
                  </p>
                </div>
              )}
            </div>

            {/* Quick Starter Templates - Collapsible Roletka */}
            {originalPrompt === "" && questions.length === 0 && (
              <div className="mb-4 bg-slate-950/40 rounded-2xl border border-slate-900/80 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsStarterTemplatesOpen(!isStarterTemplatesOpen)}
                  className="w-full flex items-center justify-between p-3 text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-cyan-400 animate-pulse" />
                    <div className="text-left">
                      <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider font-mono">INITIAL NEURAL SPECIFICATIONS</span>
                      <span className="text-xs font-semibold text-slate-300">Rychlé šablony ({STARTER_TEMPLATES.length})</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-500 text-[10px] bg-slate-900/60 px-2 py-1 rounded-lg border border-slate-800/40">
                    <span>{isStarterTemplatesOpen ? "Skrýt" : "Zobrazit šablony"}</span>
                    {isStarterTemplatesOpen ? <ChevronUp className="w-3.5 h-3.5 text-cyan-400" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {isStarterTemplatesOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="p-3 pt-0 border-t border-slate-900/60">
                        <div className="grid grid-cols-2 gap-2 mt-2.5">
                          {STARTER_TEMPLATES.map((tmpl, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                posthog.capture('starter_template_selected', {
                                  template_label: tmpl.label,
                                });
                                setOriginalPrompt(tmpl.prompt);
                                handleStartPrompt(tmpl.prompt);
                              }}
                              className="text-left bg-slate-900/60 p-3 rounded-2xl border border-slate-800/80 text-xs shadow-md hover:border-cyan-500/50 hover:bg-slate-900 transition-all active:scale-95 flex flex-col justify-between min-h-[85px] cursor-pointer"
                            >
                              <span className="font-semibold text-slate-200 line-clamp-1">{tmpl.label}</span>
                              <span className="text-slate-500 line-clamp-2 mt-1.5 font-mono text-[10px] leading-relaxed">
                                {tmpl.prompt}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* THREE PILLARS WORKFLOW CONTROLS */}
            {questions.length > 0 && (
              <div className="flex bg-slate-950/80 border border-slate-800 rounded-2xl p-1 mb-4 shadow-inner">
                <button
                  onClick={() => setCurrentPillar(1)}
                  className={`flex-1 py-2 text-center rounded-xl text-xs font-bold transition-all font-mono ${
                    currentPillar === 1 
                      ? "bg-slate-900 text-cyan-400 border border-slate-800" 
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  1. Context Q&A
                </button>
                <button
                  onClick={() => setCurrentPillar(2)}
                  className={`flex-1 py-2 text-center rounded-xl text-xs font-bold transition-all font-mono ${
                    currentPillar === 2 
                      ? "bg-slate-900 text-cyan-400 border border-slate-800" 
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  2. Catalog Sourcing
                </button>
                <button
                  onClick={() => setCurrentPillar(3)}
                  disabled={questions.length === 0}
                  className={`flex-1 py-2 text-center rounded-xl text-xs font-bold transition-all font-mono disabled:opacity-40 ${
                    currentPillar === 3 
                      ? "bg-slate-900 text-cyan-400 border border-slate-800" 
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  3. Universal Synthesis
                </button>
              </div>
            )}

            {/* PILLAR WORKSPACE VIEWPORTS */}
            <AnimatePresence mode="wait">

              {/* PILLAR 1: Context Expansion Questionnaire */}
              {currentPillar === 1 && questions.length > 0 && (
                <motion.div
                  key="pillar1"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-3"
                >
                  <div className="flex items-center justify-between px-1">
                    <div>
                      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                        Context Matrix (12 Parameters)
                      </h3>
                      <p className="text-[11px] text-cyan-400 font-mono">
                        Calibrated: {answeredCount} / {questions.length} inputs
                      </p>
                    </div>
                    
                    <button
                      onClick={handleAutoFillAnswers}
                      className="text-[11px] font-semibold text-cyan-400 bg-cyan-950/40 border border-cyan-800/30 rounded-full px-3 py-1 flex items-center gap-1 hover:bg-cyan-950 transition-colors cursor-pointer font-mono"
                    >
                      <Sparkles className="w-3 h-3 fill-cyan-400/20" />
                      Auto-Inject answers
                    </button>
                  </div>

                  {/* High-Tech Glow Progress Bar */}
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                    <div 
                      className="bg-cyan-500 h-full transition-all duration-300"
                      style={{ 
                        width: `${(answeredCount / questions.length) * 100}%`,
                        boxShadow: "0 0 8px rgba(6, 182, 212, 0.6)"
                      }}
                    />
                  </div>

                  {/* Interactive Questions Feed */}
                  <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1 no-scrollbar">
                    {questions.map((q, idx) => (
                      <div key={q.id} className="cyber-card rounded-2xl p-3.5 border-l-4 border-l-cyan-500 bg-slate-900/40">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[9px] font-bold text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded-full border border-cyan-800/30 font-mono">
                            {q.category}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500 font-mono">
                            VAR_0{idx + 1}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-100 mb-2 leading-relaxed">
                          {q.question}
                        </p>
                        <input
                          type="text"
                          value={q.answer || ""}
                          onChange={(e) => handleUpdateAnswer(q.id, e.target.value)}
                          placeholder={q.placeholder}
                          className="w-full text-xs bg-slate-950/90 border border-slate-800 rounded-xl p-2.5 focus:border-cyan-500 focus:outline-hidden font-medium text-slate-100 placeholder-slate-600"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Proceed trigger */}
                  <button
                    onClick={() => {
                      setCurrentPillar(2);
                      triggerICloudSync();
                    }}
                    className="w-full py-2.5 bg-slate-900 border border-slate-800 text-slate-100 hover:text-cyan-400 hover:border-cyan-500/50 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 mt-2 active:scale-98 transition-transform cursor-pointer font-mono"
                  >
                    <span>Proceed to Sourced Catalogs</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              )}

              {/* PILLAR 2: Sourced prompt catalogs */}
              {currentPillar === 2 && catalog.length > 0 && (
                <motion.div
                  key="pillar2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-3"
                >
                  <div className="px-1 flex items-center justify-between">
                    <div>
                      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                        Sourced catalogs (5 Best Templates)
                      </h3>
                      <p className="text-[11px] text-slate-500 font-medium">
                        {offlineMode ? "Local backup catalog active" : "Web search grounded catalog active"}
                      </p>
                    </div>

                    {!offlineMode && citations.length > 0 && (
                      <span className="text-[9px] bg-emerald-950 text-emerald-400 font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-800/30 font-mono">
                        <Globe className="w-2.5 h-2.5" /> GROUNDED
                      </span>
                    )}
                  </div>

                  {/* Templates Feed */}
                  <div className="space-y-3 max-h-[385px] overflow-y-auto pr-1 no-scrollbar">
                    {catalog.map((item, idx) => (
                      <div 
                        key={idx} 
                        className={`cyber-card rounded-2xl p-3.5 border transition-all cursor-pointer ${
                          item.selected 
                            ? "border-cyan-500 bg-cyan-950/10 shadow-md" 
                            : "border-slate-800 hover:border-slate-700 bg-slate-900/30"
                        }`}
                        onClick={() => toggleCatalogSelection(idx)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <input 
                              type="checkbox" 
                              checked={!!item.selected} 
                              onChange={() => {}} 
                              className="w-3.5 h-3.5 text-cyan-500 rounded-sm bg-slate-950 border-slate-800 focus:ring-0 focus:outline-hidden"
                            />
                            <span className="text-xs font-bold text-slate-100 line-clamp-1">
                              {item.title}
                            </span>
                          </div>
                          
                          <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400 bg-slate-950 border border-slate-800 px-2 py-0.5 rounded-md font-mono">
                            {item.source}
                          </span>
                        </div>

                        {/* Template Content Box */}
                        <div className="bg-slate-950/80 border border-slate-800/60 rounded-xl p-2.5 text-[10px] font-mono text-slate-400 relative overflow-hidden max-h-[105px] overflow-y-auto mb-2 leading-relaxed">
                          <p className="whitespace-pre-wrap">{item.content}</p>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyText(item.content, idx);
                            }}
                            className="absolute right-1 top-1 p-1 bg-slate-900 rounded-md border border-slate-800 text-slate-400 hover:text-cyan-400 transition-colors"
                            title="Copy prompt template text"
                          >
                            {copiedIndex === idx ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>

                        {/* Suitability review block */}
                        <div className="text-[10px] bg-cyan-950/40 text-cyan-300 p-2.5 rounded-xl border border-cyan-800/30 flex gap-1.5 items-start leading-relaxed">
                          <Info className="w-3.5 h-3.5 shrink-0 text-cyan-400 mt-0.5" />
                          <div>
                            <span className="font-bold text-cyan-200">Suitability Matrix:</span> {item.suitability}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Sourced citations grounded references */}
                  {!offlineMode && citations.length > 0 && (
                    <div className="bg-slate-950 rounded-xl p-2.5 border border-slate-800 text-[10px] text-slate-400">
                      <span className="font-bold text-slate-300 block mb-1 font-mono">CYBERNETIC COPT-IN SOURCES:</span>
                      <div className="space-y-1">
                        {citations.map((c, i) => (
                          <a 
                            key={i} 
                            href={c.uri} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-cyan-400 hover:underline flex items-center gap-1"
                          >
                            <Globe className="w-3 h-3 text-cyan-400" />
                            <span className="truncate">{c.title}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Synthesize universal prompt trigger */}
                  <button
                    onClick={handleSynthesizePrompt}
                    disabled={synthesizing}
                    className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-2xl flex items-center justify-center gap-1.5 active:scale-98 transition-transform cursor-pointer cyber-neon-glow"
                  >
                    {synthesizing ? (
                      <>
                        <RefreshCw className="w-4.5 h-4.5 animate-spin" />
                        <span>Configuring Synthesis Matrix...</span>
                      </>
                    ) : (
                      <>
                        <Layers className="w-4.5 h-4.5" />
                        <span>3. Compile Synthesized Universal Prompt</span>
                      </>
                    )}
                  </button>
                </motion.div>
              )}

              {/* PILLAR 3: Synthesized final output & reload manual refine */}
              {currentPillar === 3 && (
                <motion.div
                  key="pillar3"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-3"
                >
                  <div className="px-1 flex items-center justify-between">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                      Universal Final Prompt Matrix
                    </h3>
                    
                    <button
                      onClick={handleSaveToICloud}
                      className="text-[10px] font-bold text-slate-300 bg-slate-900 border border-slate-800 rounded-full px-3 py-1 flex items-center gap-1.5 hover:bg-slate-850 hover:text-cyan-400 transition-colors cursor-pointer shadow-md font-mono"
                    >
                      <CloudCheck className="w-3.5 h-3.5 text-cyan-400" />
                      iCloud Backup
                    </button>
                  </div>

                  {synthesizing ? (
                    <div className="cyber-card rounded-2xl p-6 text-center text-slate-400 space-y-2">
                      <RefreshCw className="w-8 h-8 animate-spin text-cyan-400 mx-auto" />
                      <p className="text-xs font-bold text-slate-200">Structuring final template layout...</p>
                      <p className="text-[10px] text-slate-500 font-mono">Injecting role guides, context answers, and constraints.</p>
                    </div>
                  ) : synthesized ? (
                    <div className="space-y-3">
                      
                      {/* Synthesized Output Terminal Screen */}
                      <div className="bg-slate-950 rounded-2xl border border-slate-800 p-3.5 relative shadow-xl">
                        <textarea
                          readOnly
                          value={synthesized.finalPrompt}
                          className="w-full text-[11px] font-mono text-slate-300 bg-slate-900/40 border border-slate-800/80 rounded-xl p-3 min-h-[220px] focus:outline-hidden resize-y leading-relaxed"
                        />
                        
                        {/* Copy button */}
                        <button
                          type="button"
                          onClick={() => handleCopyText(synthesized.finalPrompt)}
                          className="absolute right-5 top-5 p-2 bg-slate-900 rounded-lg shadow-md border border-slate-800 text-slate-300 hover:text-cyan-400 transition-colors flex items-center gap-1 text-[10px] font-bold font-mono"
                        >
                          {copiedFinal ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-400">COPIED</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>COPY FINAL</span>
                            </>
                          )}
                        </button>

                        {/* Architect notes block */}
                        <div className="mt-3 bg-cyan-950/40 p-3 rounded-xl text-[10px] text-cyan-300 border border-cyan-800/30 flex gap-2 leading-relaxed">
                          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-cyan-200">Architect Tuning Notes:</span> {synthesized.explanation}
                          </div>
                        </div>
                      </div>

                      {/* Manual adjustments & Reload dynamic recalculation */}
                      <div className="bg-slate-950 rounded-2xl p-3 border border-slate-850 shadow-inner">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">
                          2. Polish / Manual Directives
                        </label>
                        
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={manualEdits}
                            onChange={(e) => setManualEdits(e.target.value)}
                            placeholder="e.g. Simplify syntax, add rules to avoid prefaces..."
                            className="flex-1 text-xs bg-slate-900/60 border border-slate-800 rounded-xl p-3 focus:ring-1 focus:ring-cyan-500 focus:outline-hidden font-medium text-slate-100 placeholder-slate-600"
                            onKeyDown={(e) => e.key === "Enter" && handleRefinePrompt()}
                          />
                          
                          {/* Reload Icon - Dynamic Refine Recalculator */}
                          <button
                            onClick={handleRefinePrompt}
                            disabled={refining || !manualEdits.trim()}
                            className="p-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 disabled:opacity-40 transition-colors flex items-center justify-center shrink-0 cursor-pointer shadow-md cyber-neon-glow"
                            title="Recalculate and further improve prompt"
                          >
                            <RefreshCw className={`w-4 h-4 ${refining ? "animate-spin" : ""}`} />
                          </button>
                        </div>
                      </div>

                      {/* Optimization History Visualizations */}
                      {optimizationHistory.length > 0 && (
                        <OptimizationHistoryChart history={optimizationHistory} />
                      )}

                    </div>
                  ) : (
                    <div className="cyber-card rounded-2xl p-6 text-center text-slate-500 text-xs font-mono">
                      Null state. Go back to prior matrices.
                    </div>
                  )}

                  {/* Reset/Restart trigger */}
                  <button
                    onClick={() => {
                      setOriginalPrompt("");
                      setQuestions([]);
                      setCatalog([]);
                      setSynthesized(null);
                      setCurrentPillar(1);
                      triggerICloudSync();
                    }}
                    className="w-full py-2 bg-transparent border border-slate-800 text-slate-400 font-bold text-xs rounded-xl hover:bg-slate-900 hover:text-slate-200 transition-colors cursor-pointer font-mono"
                  >
                    Reset Optimization Loop
                  </button>
                </motion.div>
              )}

            </AnimatePresence>

          </div>

          {/* ICLOUD STORAGE SYSTEMS / SAVED CHANNELS - Collapsible Roletka */}
          <div className="mt-6 border-t border-slate-900/60 pt-4">
            <button
              type="button"
              onClick={() => setIsICloudSavedOpen(!isICloudSavedOpen)}
              className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-950/40 hover:bg-slate-950/80 border border-slate-900 hover:border-slate-800 transition-all text-left cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Database className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <div className="text-left">
                  <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider font-mono">ICLOUD SAVED PROMPTS</span>
                  <span className="text-xs font-semibold text-slate-300">Uložené prompty ({savedSessions.length})</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-slate-500 text-[10px] bg-slate-900/60 px-2 py-1 rounded-lg border border-slate-800/40 font-mono">
                <span>{isICloudSavedOpen ? "Skrýt" : "Zobrazit uložené"}</span>
                {isICloudSavedOpen ? <ChevronUp className="w-3.5 h-3.5 text-cyan-400" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </div>
            </button>

            <AnimatePresence initial={false}>
              {isICloudSavedOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="pt-3 space-y-2">
                    {/* Last sync info */}
                    <div className="flex justify-between items-center px-1 text-[9px] text-slate-500 font-mono">
                      <span>STATUS: SYNCED</span>
                      <span>Poslední synchronizace: {lastSyncTime}</span>
                    </div>

                    {savedSessions.length === 0 ? (
                      <div className="text-center p-4 rounded-2xl border border-dashed border-slate-800 text-[11px] text-slate-500 font-mono bg-slate-950/20">
                        iCloud storage container empty. Sync prompt to test.
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-[160px] overflow-y-auto no-scrollbar pt-1">
                        {savedSessions.map((sess) => (
                          <div
                            key={sess.id}
                            onClick={() => handleLoadSession(sess)}
                            className={`p-2.5 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                              activeSessionId === sess.id
                                ? "bg-cyan-950/20 border-cyan-500/50 text-cyan-300"
                                : "bg-slate-900/30 border-slate-850 hover:border-slate-800 text-slate-300"
                            }`}
                          >
                            <div className="flex items-center gap-2 overflow-hidden">
                              <Terminal className={`w-3.5 h-3.5 shrink-0 ${activeSessionId === sess.id ? "text-cyan-400" : "text-slate-500"}`} />
                              <div className="text-left overflow-hidden">
                                <span className="font-semibold text-xs block truncate leading-tight">
                                  {sess.title}
                                </span>
                                <span className="text-[9px] text-slate-500 block mt-0.5 font-mono">
                                  {sess.timestamp}
                                </span>
                              </div>
                            </div>

                            <button
                              onClick={(e) => handleDeleteSession(sess.id, e)}
                              className="p-1 text-slate-600 hover:text-rose-400 transition-colors shrink-0 cursor-pointer"
                              title="Delete from iCloud"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>

        {/* BOTTOM HIGH-TECH NAVIGATION CONTROL DECK */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-[#080d1a]/95 backdrop-blur-md border-t border-slate-900 px-6 flex items-center justify-between z-10">
          <button 
            onClick={() => {
              if (questions.length > 0) setCurrentPillar(1);
              else showToast("Please input a directive prompt first!");
            }}
            className={`flex flex-col items-center gap-1 transition-colors cursor-pointer ${
              currentPillar === 1 && questions.length > 0 ? "text-cyan-400" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <Compass className="w-5 h-5" />
            <span className="text-[9px] font-bold font-mono">Q&A INPUTS</span>
          </button>

          <button 
            onClick={() => {
              if (questions.length > 0) setCurrentPillar(2);
              else showToast("Please input a directive prompt first!");
            }}
            className={`flex flex-col items-center gap-1 transition-colors cursor-pointer ${
              currentPillar === 2 && questions.length > 0 ? "text-cyan-400" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <BookOpen className="w-5 h-5" />
            <span className="text-[9px] font-bold font-mono">SOURCED</span>
          </button>

          <button 
            onClick={() => {
              if (questions.length > 0) setCurrentPillar(3);
              else showToast("Please input a directive prompt first!");
            }}
            className={`flex flex-col items-center gap-1 transition-colors cursor-pointer ${
              currentPillar === 3 && questions.length > 0 ? "text-cyan-400" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <Layers3 className="w-5 h-5" />
            <span className="text-[9px] font-bold font-mono">SYNTHESIS</span>
          </button>

          <button 
            onClick={() => setShowAestheticModal(true)}
            className="flex flex-col items-center gap-1 text-slate-500 hover:text-slate-300 cursor-pointer"
          >
            <PlusCircle className="w-5 h-5 text-slate-400 hover:text-cyan-400" />
            <span className="text-[9px] font-bold font-mono">ADD STYLE</span>
          </button>
        </div>

        {/* BOTTOM HOME CAP-LINE FOR DEVICES */}
        {useDeviceFrame && (
          <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-slate-700 rounded-full z-20 pointer-events-none" />
        )}

      </div>

      {/* DETAILED CYBERNETIC PLUS SHEETS MODAL */}
      <AnimatePresence>
        {showAestheticModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-end justify-center px-4 pb-6">
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="bg-slate-950 rounded-3xl w-full max-w-sm p-5 shadow-2xl relative border border-slate-800 max-h-[500px] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-900">
                <div className="flex items-center gap-1.5 text-cyan-400 font-mono">
                  <Plus className="w-5 h-5 text-cyan-400" />
                  <span className="font-bold text-sm tracking-tight uppercase">Incorporate Design Matrix</span>
                </div>
                <button 
                  onClick={() => setShowAestheticModal(false)}
                  className="p-1 bg-slate-900 rounded-full text-slate-400 hover:text-slate-200 transition-colors border border-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Custom specs form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 font-mono tracking-widest">
                    Matrix A: Custom layout specs
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="e.g. Modernist dark grid with lime accents..."
                      value={customAestheticText}
                      onChange={(e) => setCustomAestheticText(e.target.value)}
                      className="flex-1 text-xs bg-slate-900 border border-slate-800 rounded-xl p-2.5 focus:border-cyan-500 focus:outline-hidden text-slate-100 placeholder-slate-600"
                    />
                    <button
                      onClick={() => {
                        if (customAestheticText.trim()) {
                          setReferenceAesthetics(customAestheticText);
                          setCustomAestheticText("");
                          setShowAestheticModal(false);
                          showToast("Custom aesthetic specified");
                          triggerICloudSync();
                        }
                      }}
                      className="bg-cyan-500 text-slate-950 px-3.5 rounded-xl text-xs font-bold hover:bg-cyan-400 transition-colors cursor-pointer"
                    >
                      ADD
                    </button>
                  </div>
                </div>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-slate-900"></div>
                  <span className="flex-shrink mx-3 text-[9px] text-slate-500 font-bold uppercase tracking-widest font-mono">OR</span>
                  <div className="flex-grow border-t border-slate-900"></div>
                </div>

                {/* Cyber presets list */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 font-mono tracking-widest">
                    Matrix B: Premium system presets
                  </label>
                  
                  <div className="space-y-2">
                    {AESTHETIC_PRESETS.map((preset) => (
                      <div
                        key={preset.id}
                        onClick={() => handleApplyPreset(preset)}
                        className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                          selectedPresetId === preset.id
                            ? "bg-cyan-950/20 border-cyan-500/50 shadow-md"
                            : "bg-slate-900/30 border-slate-850 hover:border-slate-800/80"
                        }`}
                      >
                        <span className="font-bold text-xs text-slate-200 block">
                          {preset.name}
                        </span>
                        <span className="text-[10px] text-slate-500 mt-0.5 block leading-relaxed">
                          {preset.description}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DETAILED NEURAL MODEL HUB MODAL */}
      <AnimatePresence>
        {showEngineModal && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-xs z-50 flex items-end justify-center px-4 pb-6">
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="bg-slate-950 rounded-3xl w-full max-w-sm p-5 shadow-2xl relative border border-slate-800 max-h-[620px] overflow-y-auto no-scrollbar"
            >
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-900">
                <div className="flex items-center gap-1.5 text-cyan-400 font-mono">
                  <Database className="w-5 h-5 text-cyan-400" />
                  <span className="font-bold text-sm tracking-tight uppercase">Local LLM Model Hub</span>
                </div>
                <button 
                  onClick={() => setShowEngineModal(false)}
                  className="p-1 bg-slate-900 rounded-full text-slate-400 hover:text-slate-200 transition-colors border border-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-[10px] text-slate-400 mb-4 leading-relaxed font-sans">
                Stáhněte si výkonné jazykové modely optimalizované pro běh přímo na čipech Apple Silicon (macOS/iOS). Stažené modely se automaticky napojí a fungují zcela lokálně bez internetu.
              </p>

              {/* Models list */}
              <div className="space-y-3">
                {/* Standard Cloud engine Option */}
                <div 
                  onClick={() => selectActiveEngine("default-cloud")}
                  className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                    activeEngineId === "default-cloud"
                      ? "bg-cyan-950/20 border-cyan-500/50 shadow-md"
                      : "bg-slate-900/30 border-slate-900 hover:border-slate-800/80"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-200 block">
                      Standard Cloud Hybrid (Výchozí)
                    </span>
                    {activeEngineId === "default-cloud" && (
                      <span className="text-[8px] font-bold text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded-full border border-cyan-800/50 uppercase tracking-widest font-mono">
                        Aktivní
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block leading-relaxed">
                    Spouští se v cloudu s nízkou latencí. Vyžaduje aktivní připojení k internetu.
                  </span>
                  <div className="mt-2 flex items-center gap-2 text-[9px] font-mono text-slate-500">
                    <span className="bg-slate-900 px-1.5 py-0.5 rounded">Velikost: 0 MB</span>
                    <span className="bg-slate-900 px-1.5 py-0.5 rounded">Přesnost: 98%</span>
                    <span className="bg-slate-900 px-1.5 py-0.5 rounded">Rychlost: Cloud</span>
                  </div>
                </div>

                <div className="border-t border-slate-900 my-2 pt-2">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono block mb-2">
                    LOKÁLNÍ NEURÁLNÍ MODELY (iOS / macOS):
                  </span>
                </div>

                {localEngines.map((engine) => {
                  const isActive = activeEngineId === engine.id;
                  return (
                    <div
                      key={engine.id}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        isActive
                          ? "bg-cyan-950/20 border-cyan-500/50 shadow-md"
                          : "bg-slate-900/30 border-slate-900 hover:border-slate-800/80"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-slate-200 block">
                            {engine.name}
                          </span>
                          <span className="text-[9px] text-slate-500 font-mono">({engine.parameters})</span>
                        </div>
                        {isActive && (
                          <span className="text-[8px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-800/50 uppercase tracking-widest font-mono">
                            Aktivní
                          </span>
                        )}
                      </div>

                      <p className="text-[10px] text-slate-400 leading-relaxed">
                        {engine.description}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[9px] font-mono text-slate-500">
                        <span className="bg-slate-900 px-1.5 py-0.5 rounded">VRAM: {engine.size}</span>
                        <span className="bg-slate-900 px-1.5 py-0.5 rounded text-cyan-400">Přesnost: {engine.accuracy}</span>
                        <span className="bg-slate-900 px-1.5 py-0.5 rounded text-emerald-400">Rychlost: {engine.speed}</span>
                      </div>

                      {/* Download or active buttons */}
                      <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-900/40 pt-2.5">
                        {engine.downloaded ? (
                          <div className="flex items-center justify-between w-full">
                            <span className="text-[9px] text-emerald-400 flex items-center gap-1 font-mono">
                              <Check className="w-3.5 h-3.5" /> Staženo a integrováno
                            </span>
                            <div className="flex items-center gap-2">
                              {!isActive && (
                                <button
                                  type="button"
                                  onClick={() => selectActiveEngine(engine.id)}
                                  className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-[9px] px-2.5 py-1 rounded-md transition-all active:scale-95 cursor-pointer"
                                >
                                  Aktivovat
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setLocalEngines(prev => prev.map(e => e.id === engine.id ? { ...e, downloaded: false, progress: 0 } : e));
                                  if (isActive) setActiveEngineId("default-cloud");
                                  showToast(`Model ${engine.name} byl odinstalován`);
                                  triggerICloudSync();
                                }}
                                className="text-slate-500 hover:text-rose-400 text-[9px] font-mono underline cursor-pointer"
                              >
                                Smazat
                              </button>
                            </div>
                          </div>
                        ) : engine.downloading ? (
                          <div className="w-full">
                            <div className="flex items-center justify-between text-[9px] mb-1 font-mono">
                              <span className="text-cyan-400 animate-pulse">Stahování modelových vah...</span>
                              <span className="text-slate-400 font-bold">{engine.progress}%</span>
                            </div>
                            <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-cyan-400 h-full transition-all duration-150" style={{ width: `${engine.progress}%` }} />
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between w-full">
                            <span className="text-[9px] text-slate-500 font-mono">
                              Volný prostor vyžadován: {engine.size}
                            </span>
                            <button
                              type="button"
                              onClick={() => downloadEngineModel(engine.id)}
                              className="bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-cyan-500/20 font-bold text-[9px] px-3 py-1 rounded-md transition-all active:scale-95 cursor-pointer flex items-center gap-1"
                            >
                              <span>Stáhnout ({engine.size})</span>
                              <ArrowRight className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Cyber Toast Success Feedback */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-slate-950 text-cyan-400 text-[11px] py-2.5 px-4 rounded-full shadow-2xl z-50 flex items-center gap-1.5 font-bold border border-cyan-500/20 cyber-neon-glow font-mono"
          >
            <CheckCircle className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400/10" />
            <span>{toastMessage.toUpperCase()}</span>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
