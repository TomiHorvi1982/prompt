import React, { useState, useEffect, useMemo } from "react";
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
  Tablet,
  Monitor, 
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
  ChevronRight,
  BarChart3,
  Gauge,
  Download,
  FileCode,
  Mic,
  MicOff,
  Volume2,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  ThumbsUp,
  SearchCheck,
  Undo2,
  Redo2,
  HelpCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { OptimizationHistoryChart } from "./components/OptimizationHistoryChart";
import DeepAnalysisView from "./components/DeepAnalysisView";

import { Question, CatalogPrompt, Citation, SynthesizedPrompt, SavedPromptSession, LocalEngine, OptimizationStep, CriticReview, QuestionMarkPredictionCandidate } from "./types";
import { AESTHETIC_PRESETS, STARTER_TEMPLATES } from "./data";
import { 
  localGenerateQuestions, 
  localSearchCatalog, 
  localSynthesizePrompt, 
  localRefinePrompt,
  localCriticPrompt,
  getNeuralPredictions,
  PredictionCandidate,
  calculateComplexity,
  getQuestionMarkPredictions
} from "./lib/localModel";

export default function App() {
  // Device Frame & Viewport State (Mobile, Tablet, PC)
  const [useDeviceFrame, setUseDeviceFrame] = useState(true);
  const [deviceView, setDeviceView] = useState<'mobile' | 'tablet' | 'pc'>('mobile');

  // Connection & iCloud State
  const [offlineMode, setOfflineMode] = useState(false);
  const [iCloudSyncing, setICloudSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>("Synced just now");
  const [isOnline, setIsOnline] = useState(true);

  // App core variables
  const [originalPrompt, setOriginalPrompt] = useState("");
  const liveComplexity = useMemo(() => calculateComplexity(originalPrompt), [originalPrompt]);
  const liveWordCount = useMemo(() => originalPrompt.trim().split(/\s+/).filter(Boolean).length, [originalPrompt]);
  const liveCharCount = originalPrompt.length;
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
  const [showExportMenu, setShowExportMenu] = useState(false);

  // AI Prompt Critic Review Mode state
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [criticReview, setCriticReview] = useState<CriticReview | null>(null);
  const [isCriticizing, setIsCriticizing] = useState(false);

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
      setActiveEngineId("default-cloud");
      showToast("Aktivován standardní Cloud Engine");
      triggerICloudSync();
      return;
    }

    const engine = localEngines.find(e => e.id === engineId);
    if (engine && engine.downloaded) {
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

  // Web Speech API Voice-to-Text state
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = React.useRef<any>(null);

  const toggleListening = () => {
    const windowObj = window as any;
    const SpeechRecognition = windowObj.SpeechRecognition || windowObj.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      showToast("Váš prohlížeč nepodporuje rozpoznávání hlasu (Web Speech API).");
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      setIsListening(false);
      showToast("Hlasové zadávání pozastaveno.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = navigator.language || "cs-CZ";

      let baseText = originalPrompt;

      recognition.onstart = () => {
        setIsListening(true);
        showToast("Hlasové nahrávání aktivní — mluvte...");
      };

      recognition.onresult = (event: any) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          const spacing = baseText && !baseText.endsWith(" ") ? " " : "";
          setOriginalPrompt(baseText + spacing + transcript);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          showToast("Přístup k mikrofonu byl odmítnut.");
        } else if (event.error !== "no-speech") {
          showToast(`Chyba hlasového vstupu: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error("Failed to start speech recognition:", err);
      showToast("Chyba při spuštění rozpoznávání hlasu.");
      setIsListening(false);
    }
  };

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

  // Question Mark (?) Smart Prediction States & Undo/Redo History Stacks
  const [questionPredictions, setQuestionPredictions] = useState<QuestionMarkPredictionCandidate[]>([]);
  const [predictionUndoStack, setPredictionUndoStack] = useState<string[]>([]);
  const [predictionRedoStack, setPredictionRedoStack] = useState<string[]>([]);

  // Active prediction index for cycling variants (Google AI Studio style)
  const [activePredictionIndex, setActivePredictionIndex] = useState(0);

  // Active prediction items calculation
  const isQuestionMode = originalPrompt.includes('?');
  const currentPredictionList = isQuestionMode ? questionPredictions : predictions;
  const activeCandidate = currentPredictionList.length > 0
    ? currentPredictionList[activePredictionIndex % currentPredictionList.length]
    : null;

  const activeGhostCompletion = (originalPrompt.trim().length >= 2 && activeCandidate)
    ? (activeCandidate.completion || "")
    : "";

  const ghostPrefixText = isQuestionMode
    ? originalPrompt.substring(0, originalPrompt.indexOf('?'))
    : originalPrompt;

  const activePredictionCategory = activeCandidate
    ? ('category' in activeCandidate ? activeCandidate.category : 'Inteligentní doplnění')
    : 'Inteligentní doplnění';

  // Apply active ghost prediction (triggered by Tab key or Accept button)
  const handleApplyActivePrediction = (customIndex?: number) => {
    const list = isQuestionMode ? questionPredictions : predictions;
    const indexToUse = customIndex !== undefined ? customIndex : activePredictionIndex;
    if (list.length === 0) return;

    const candidate = list[indexToUse % list.length];
    if (!candidate) return;

    setPredictionUndoStack(prev => [...prev, originalPrompt]);
    setPredictionRedoStack([]);

    let newPrompt = "";
    if (isQuestionMode && 'fullTextPreview' in candidate) {
      newPrompt = (candidate as QuestionMarkPredictionCandidate).fullTextPreview;
    } else if ('phrase' in candidate) {
      newPrompt = (candidate as PredictionCandidate).phrase;
    } else {
      newPrompt = ghostPrefixText + candidate.completion;
    }

    setOriginalPrompt(newPrompt);
    setActivePredictionIndex(0);
    showToast("Doplnění potvrdil [Tab ↹] — kód ztmavl a aktivoval se!");
    triggerICloudSync();
  };

  // Apply just the next 1-2 words from active ghost completion
  const handleApplyNextWordPrediction = () => {
    if (!activeGhostCompletion) return;

    setPredictionUndoStack(prev => [...prev, originalPrompt]);
    setPredictionRedoStack([]);

    const startsWithSpace = activeGhostCompletion.startsWith(" ");
    const prefixSpace = startsWithSpace ? " " : "";
    const tokens = activeGhostCompletion.trim().split(/\s+/).filter(Boolean);

    if (tokens.length === 0) return;

    // Take first 1 or 2 tokens if the first token is short
    let wordCount = 1;
    if (tokens.length > 1 && tokens[0].length <= 2) {
      wordCount = 2;
    }

    const nextWordChunk = prefixSpace + tokens.slice(0, wordCount).join(" ");
    const newPrompt = originalPrompt + nextWordChunk;

    setOriginalPrompt(newPrompt);
    setActivePredictionIndex(0);
    showToast(`Přidáno slovo po slovu: "${nextWordChunk.trim()}"`);
    triggerICloudSync();
  };

  // Cycle to next prediction variant
  const cycleNextPredictionVariant = () => {
    const total = currentPredictionList.length;
    if (total <= 1) return;
    setActivePredictionIndex(prev => (prev + 1) % total);
  };

  // Trigger question mark predictions when ? is present in originalPrompt
  useEffect(() => {
    if (originalPrompt && originalPrompt.includes('?')) {
      const preds = getQuestionMarkPredictions(originalPrompt);
      setQuestionPredictions(preds);
    } else {
      setQuestionPredictions([]);
    }
  }, [originalPrompt]);

  // Apply chosen question prediction
  const handleApplyQuestionPrediction = (candidate: QuestionMarkPredictionCandidate) => {
    setPredictionUndoStack(prev => [...prev, originalPrompt]);
    setPredictionRedoStack([]);
    setOriginalPrompt(candidate.fullTextPreview);
    setQuestionPredictions([]);
    showToast("Predikce byla vložena a otazník byl automaticky odstraněn!");
    triggerICloudSync();
  };

  // Undo last applied prediction
  const handleUndoPrediction = () => {
    if (predictionUndoStack.length === 0) return;
    const previous = predictionUndoStack[predictionUndoStack.length - 1];
    setPredictionUndoStack(prev => prev.slice(0, -1));
    setPredictionRedoStack(prev => [...prev, originalPrompt]);
    setOriginalPrompt(previous);
    showToast("Aplikování predikce bylo vráceno zpět.");
  };

  // Redo undone prediction
  const handleRedoPrediction = () => {
    if (predictionRedoStack.length === 0) return;
    const next = predictionRedoStack[predictionRedoStack.length - 1];
    setPredictionRedoStack(prev => prev.slice(0, -1));
    setPredictionUndoStack(prev => [...prev, originalPrompt]);
    setOriginalPrompt(next);
    showToast("Predikce byla znovu aplikována.");
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

  // Guards the persistence effect below: it must not run before the initial load has
  // finished, or the first render's empty array would overwrite what is in storage.
  // This is state rather than a ref on purpose — both effects run in the same commit,
  // so a ref set by the loader would already read true in the writer, with the writer
  // still closed over the empty array from that render.
  const [sessionsHydrated, setSessionsHydrated] = useState(false);

  // Coerces one stored entry into a usable session. Storage is user-writable and may
  // hold entries from an older schema, so nothing here may assume a field exists.
  const normalizeSession = (raw: any, index: number): SavedPromptSession => ({
    id: String(raw?.id ?? `restored-${index}-${Date.now()}`),
    title: String(raw?.title ?? "Untitled prompt"),
    originalPrompt: String(raw?.originalPrompt ?? ""),
    finalPrompt: String(raw?.finalPrompt ?? ""),
    timestamp: String(raw?.timestamp ?? "Unknown"),
    optimizationHistory: Array.isArray(raw?.optimizationHistory) ? raw.optimizationHistory : undefined
  });

  // Load Saved Sessions from LocalStorage
  useEffect(() => {
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

    // Storage can be unreadable (Safari private mode, disabled cookies) or hold data
    // this build cannot parse. Neither may take the app down on mount.
    try {
      const stored = localStorage.getItem("prompt_architect_sessions");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setSavedSessions(parsed.map(normalizeSession));
        } else {
          throw new Error("Stored sessions are not an array");
        }
      } else {
        localStorage.setItem("prompt_architect_sessions", JSON.stringify(sampleSessions));
        setSavedSessions(sampleSessions);
      }
    } catch (err) {
      console.warn("Could not restore saved sessions, starting from defaults:", err);
      setSavedSessions(sampleSessions);
    } finally {
      setSessionsHydrated(true);
    }
  }, []);

  // Persist sessions on every change. Writing an empty array is intentional — it is
  // how deleting the last session is recorded.
  useEffect(() => {
    if (!sessionsHydrated) return;
    try {
      localStorage.setItem("prompt_architect_sessions", JSON.stringify(savedSessions));
    } catch (err) {
      console.warn("Could not persist saved sessions:", err);
    }
  }, [savedSessions, sessionsHydrated]);

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
    setOriginalPrompt(pred.phrase);
    setPredictions([]);
    showToast(`Autocompleted: ${pred.category}`);
    triggerICloudSync();
  };

  // Capture Tab or Right Arrow to apply autocomplete, and Alt+Right to cycle variants
  const handlePromptKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl/Cmd + ArrowRight accepts +1 word from active ghost completion
    if ((e.ctrlKey || e.metaKey) && e.key === "ArrowRight" && activeGhostCompletion) {
      e.preventDefault();
      handleApplyNextWordPrediction();
      return;
    }

    // Tab key confirms ghost completion
    if (e.key === "Tab" && activeGhostCompletion) {
      e.preventDefault();
      handleApplyActivePrediction();
      return;
    }

    // Right Arrow at end of text confirms ghost completion
    if (e.key === "ArrowRight" && activeGhostCompletion) {
      const target = e.currentTarget;
      if (target.selectionStart === originalPrompt.length && target.selectionEnd === originalPrompt.length) {
        e.preventDefault();
        handleApplyActivePrediction();
        return;
      }
    }

    // Alt + Right or Alt + Down or Ctrl + Space cycles variant
    if ((e.altKey && (e.key === "ArrowRight" || e.key === "ArrowDown")) || (e.ctrlKey && e.code === "Space")) {
      e.preventDefault();
      cycleNextPredictionVariant();
      return;
    }
  };

  // Pillar 1: Initialize detailed questioning
  const handleStartPrompt = async (selectedPrompt?: string) => {
    const promptToUse = selectedPrompt || originalPrompt;
    if (!promptToUse.trim()) {
      showToast("Please write or select a simple prompt first!");
      return;
    }

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
        showToast(`Zpracováno lokálně modelem: ${engineName}!`);
        triggerICloudSync();
        if (isReviewMode) {
          handleRunCritic(response.finalPrompt);
        }
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
        if (isReviewMode) {
          handleRunCritic(data.finalPrompt);
        }
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
        if (isReviewMode) {
          handleRunCritic(response.finalPrompt);
        }
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
        showToast("Re-compiled & polished offline");
        triggerICloudSync();
        if (isReviewMode) {
          handleRunCritic(response.finalPrompt);
        }
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
        showToast("Reprocessed manual directives!");
        if (isReviewMode) {
          handleRunCritic(data.finalPrompt);
        }
      } catch (err: any) {
        console.warn("Backend refinement failed, using offline compiler:", err);
        const response = localRefinePrompt(synthesized.finalPrompt, currentEdits);
        setSynthesized(response);
        addOptimizationStep(label, response.finalPrompt);
        setManualEdits("");
        if (isReviewMode) {
          handleRunCritic(response.finalPrompt);
        }
      } finally {
        setRefining(false);
      }
    }
  };

  // AI Prompt Critic Handlers
  const handleRunCritic = async (targetPrompt?: string) => {
    const promptToReview = targetPrompt || synthesized?.finalPrompt;
    if (!promptToReview) {
      showToast("Nejdříve musíte mít vytvořený nebo zsyntetizovaný prompt!");
      return;
    }

    const isOfflineActive = offlineMode || !isOnline;
    setIsCriticizing(true);

    if (isOfflineActive) {
      setTimeout(() => {
        const review = localCriticPrompt(promptToReview);
        setCriticReview(review);
        setIsCriticizing(false);
        showToast("AI Critic dokončil analýzu slabých míst!");
      }, 700);
    } else {
      try {
        const response = await fetch("/api/critic-prompt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            finalPrompt: promptToReview,
            originalIdea: originalPrompt
          })
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        setCriticReview(data);
        showToast("AI Critic analyzoval váš prompt!");
      } catch (err: any) {
        console.warn("Backend critic failed, using offline critic:", err);
        const review = localCriticPrompt(promptToReview);
        setCriticReview(review);
      } finally {
        setIsCriticizing(false);
      }
    }
  };

  const handleConfirmCriticPrompt = () => {
    if (!criticReview || !synthesized) return;

    const newPrompt = criticReview.improvedPrompt;
    setSynthesized({
      finalPrompt: newPrompt,
      explanation: `${synthesized.explanation} | 🛡️ [AI Critic schváleno — Skóre: ${criticReview.score}/100]`
    });

    addOptimizationStep(`AI Critic Vylepšení (${criticReview.score}/100)`, newPrompt);
    setCriticReview(null);
    showToast("Nové znění promptu po AI recenzi bylo schváleno a aplikováno!");
    triggerICloudSync();
  };

  // Restore a previous version of prompt directly from history
  const handleRestoreStep = (step: OptimizationStep) => {
    const restoredPrompt = step.prompt;
    setSynthesized({
      finalPrompt: restoredPrompt,
      explanation: `Obnovená verze z historie optimalizace (Krok #${step.stepIndex}: "${step.label}")`
    });
    const shortLabel = step.label.length > 15 ? step.label.substring(0, 15) + "..." : step.label;
    const newLabel = `Obnovení #${step.stepIndex} ("${shortLabel}")`;
    addOptimizationStep(newLabel, restoredPrompt);
    showToast(`Obnovena verze promptu z kroku #${step.stepIndex}!`);
    triggerICloudSync();
  };

  // Export final synthesized prompt as .txt or .md file
  const handleExportPrompt = (format: "txt" | "md") => {
    if (!synthesized?.finalPrompt) return;
    
    let content = synthesized.finalPrompt;
    let filename = `synthesized-prompt.${format}`;
    let mimeType = format === "md" ? "text/markdown;charset=utf-8;" : "text/plain;charset=utf-8;";

    if (format === "md") {
      content = `# Universal Synthesized Prompt\n\n> **Architect Tuning Notes:** ${synthesized.explanation || 'Synthesized via Neural Matrix'}\n\n\`\`\`markdown\n${synthesized.finalPrompt}\n\`\`\`\n`;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(`Exportováno jako ${filename}`);
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
    showToast("Backed up to iCloud Storage");
    triggerICloudSync();
  };

  // Load a historic session
  const handleLoadSession = (sess: SavedPromptSession) => {
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
    setSavedSessions(prev => prev.filter(s => s.id !== id));
    if (activeSessionId === id) {
      setActiveSessionId(null);
    }
    showToast("Removed from iCloud");
    triggerICloudSync();
  };

  // Apply visual preset style
  const handleApplyPreset = (preset: any) => {
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
      setCopiedFinal(true);
      setTimeout(() => setCopiedFinal(false), 2000);
    }
    showToast("Copied to clipboard!");
  };

  const answeredCount = questions.filter(q => q.answer && q.answer.trim() !== "").length;

  return (
    <div className="min-h-screen bg-[#030712] py-6 px-4 flex flex-col items-center justify-start text-[#e5e7eb] font-sans antialiased selection:bg-blue-600/30">
      
      {/* Upper Settings & Control Bar */}
      <div className={`w-full transition-all duration-300 ${
        deviceView === 'mobile' ? 'max-w-[420px]' : deviceView === 'tablet' ? 'max-w-[768px]' : 'max-w-[1240px]'
      } mb-4 flex items-center justify-between text-xs px-2 text-slate-400 flex-wrap gap-2`}>
        
        {/* Viewport Switcher (Mobil / Tablet / PC View) */}
        <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-2xl border border-slate-800/80 shadow-lg">
          <button 
            type="button"
            onClick={() => {
              setDeviceView('mobile');
              showToast("Přepnuto na Mobilní zobrazení (412px)");
            }}
            id="viewport-mobile-btn"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-mono font-bold transition-all cursor-pointer ${
              deviceView === 'mobile' 
                ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20" 
                : "text-slate-400 hover:text-slate-200"
            }`}
            title="Mobilní zobrazení (412px)"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Mobil</span>
          </button>

          <button 
            type="button"
            onClick={() => {
              setDeviceView('tablet');
              showToast("Přepnuto na Tablet zobrazení (768px)");
            }}
            id="viewport-tablet-btn"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-mono font-bold transition-all cursor-pointer ${
              deviceView === 'tablet' 
                ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20" 
                : "text-slate-400 hover:text-slate-200"
            }`}
            title="Tablet zobrazení (768px)"
          >
            <Tablet className="w-3.5 h-3.5" />
            <span>Tablet</span>
          </button>

          <button 
            type="button"
            onClick={() => {
              setDeviceView('pc');
              showToast("Přepnuto na PC / Desktop zobrazení (1240px)");
            }}
            id="viewport-pc-btn"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-mono font-bold transition-all cursor-pointer ${
              deviceView === 'pc' 
                ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20" 
                : "text-slate-400 hover:text-slate-200"
            }`}
            title="PC / Desktop zobrazení (1240px)"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>PC View</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Frame Toggle */}
          <button 
            onClick={() => setUseDeviceFrame(!useDeviceFrame)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all border text-[11px] font-mono cursor-pointer ${
              useDeviceFrame 
                ? "bg-slate-900 text-cyan-400 border-cyan-500/30 shadow-md font-semibold" 
                : "bg-transparent text-slate-500 border-slate-800"
            }`}
            title="Zapnout/Vypnout simulaci hardwarového rámečku"
          >
            <span className={`w-2 h-2 rounded-full ${useDeviceFrame ? "bg-cyan-400 animate-pulse" : "bg-slate-600"}`}></span>
            <span>Rámeček: {useDeviceFrame ? "ZAP" : "VYP"}</span>
          </button>

          {/* Sync Indicator */}
          <div className="flex items-center gap-1.5 bg-slate-900/80 px-3 py-1.5 rounded-full border border-slate-800/80 shadow-md">
            <Cloud className={`w-3.5 h-3.5 text-cyan-400 ${iCloudSyncing ? "animate-bounce" : ""}`} />
            <span className="font-semibold text-[10px] text-slate-300 hidden sm:inline">
              {iCloudSyncing ? "iCloud Syncing..." : "iCloud Live"}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
        </div>
      </div>

      {/* Frame Container */}
      <div className={`transition-all duration-300 w-full ${
        deviceView === 'mobile'
          ? (useDeviceFrame ? "max-w-[420px] rounded-[52px] border-[12px] border-slate-800 bg-[#080d1a] shadow-2xl relative overflow-hidden h-[860px] border-t-slate-700 border-b-slate-900" : "max-w-lg min-h-[820px] rounded-3xl bg-[#080d1a] border border-slate-800 shadow-2xl relative overflow-hidden h-[860px]")
          : deviceView === 'tablet'
          ? (useDeviceFrame ? "max-w-[768px] rounded-[36px] border-[10px] border-slate-800 bg-[#080d1a] shadow-2xl relative overflow-hidden h-[880px] border-t-slate-700 border-b-slate-900" : "max-w-[768px] min-h-[850px] rounded-3xl bg-[#080d1a] border border-slate-800 shadow-2xl relative overflow-hidden h-[880px]")
          : (useDeviceFrame ? "max-w-[1240px] rounded-[24px] border-[8px] border-slate-800 bg-[#080d1a] shadow-2xl relative overflow-hidden h-[900px] border-t-slate-700 border-b-slate-900" : "max-w-[1240px] min-h-[860px] rounded-2xl bg-[#080d1a] border border-slate-800 shadow-2xl relative overflow-hidden h-[900px]")
      }`}>
        
        {/* iOS / Workstation High-Tech Status Bar */}
        <div className="bg-[#080d1a] h-12 pt-1 px-6 flex items-center justify-between select-none relative z-20 border-b border-slate-900/40">
          {deviceView === 'pc' ? (
            /* PC Desktop Titlebar with dots */
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500/80 border border-rose-600/50 inline-block"></span>
              <span className="w-3 h-3 rounded-full bg-amber-500/80 border border-amber-600/50 inline-block"></span>
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 border border-emerald-600/50 inline-block"></span>
              <span className="text-[10px] text-slate-400 ml-2 font-mono hidden sm:inline">
                https://prompt-architect.ai/studio (1240×900 Workstation)
              </span>
            </div>
          ) : (
            <span className="text-[14px] font-semibold text-slate-200 tracking-tight font-mono">
              {currentTime || "9:41 AM"}
            </span>
          )}
          
          {/* iOS Dynamic Island / Tech Notch for Mobile */}
          {useDeviceFrame && deviceView === 'mobile' && (
            <div className="absolute left-1/2 transform -translate-x-1/2 top-3 w-[115px] h-[28px] bg-black rounded-full flex items-center justify-end px-3 border border-slate-800">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-900 border border-cyan-500 mr-1 animate-pulse"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-slate-950"></span>
            </div>
          )}

          {/* Tablet Front Lens Camera */}
          {useDeviceFrame && deviceView === 'tablet' && (
            <div className="absolute left-1/2 transform -translate-x-1/2 top-3 w-[14px] h-[14px] bg-black rounded-full flex items-center justify-center border border-slate-800">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-950 border border-cyan-500/60 animate-pulse"></span>
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
            {/* Header Branding */}
            <div className="mt-2 mb-4 px-1 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-white mt-0.5">
                  Prompt Architect
                </h1>
                <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-cyan-400 flex items-center gap-1.5 shadow-sm">
                  {deviceView === 'mobile' && <Smartphone className="w-3 h-3 text-cyan-400" />}
                  {deviceView === 'tablet' && <Tablet className="w-3 h-3 text-cyan-400" />}
                  {deviceView === 'pc' && <Monitor className="w-3 h-3 text-cyan-400" />}
                  <span className="uppercase tracking-wider">
                    {deviceView === 'mobile' ? 'Mobile View' : deviceView === 'tablet' ? 'Tablet View' : 'PC Desktop View'}
                  </span>
                </span>
              </div>
            </div>

            {/* PILLAR STEP 0: Base Input Entry Point */}
            <div className="cyber-card rounded-3xl p-4 mb-4 relative border-slate-800 bg-[#0d1527]/70" id="input-core-directive-panel">
              <div className="flex items-center justify-between mb-2.5 flex-wrap gap-2">
                <label className="block text-[10px] font-bold text-cyan-400 uppercase tracking-widest font-mono">
                  1. Input Core Directive
                </label>

                {/* Real-Time Complexity Gauge Badge */}
                <div className="flex items-center gap-2 font-mono" id="complexity-gauge-badge">
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 font-semibold">
                    <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Komplexita:</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-950/90 border border-slate-800/80 px-2.5 py-1 rounded-xl shadow-xs">
                    <div className="w-16 h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800/60">
                      <div 
                        className={`h-full transition-all duration-300 rounded-full ${
                          liveComplexity > 65
                            ? "bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 shadow-sm shadow-emerald-500/50"
                            : liveComplexity > 35
                            ? "bg-gradient-to-r from-cyan-500 to-blue-500"
                            : "bg-gradient-to-r from-amber-500 to-cyan-500"
                        }`}
                        style={{ width: `${liveComplexity}%` }}
                      />
                    </div>
                    <span className={`text-[10px] font-bold ${
                      liveComplexity > 65 ? "text-emerald-400" : liveComplexity > 35 ? "text-cyan-400" : "text-amber-400"
                    }`}>
                      {liveComplexity}%
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="relative group">
                {/* Google AI Studio Inline Ghost Text Overlay */}
                {activeGhostCompletion && (
                  <div 
                    className="absolute top-0 left-0 right-0 bottom-0 p-3.5 pr-20 text-sm font-medium font-sans leading-relaxed whitespace-pre-wrap break-words pointer-events-none select-none overflow-hidden z-0"
                    aria-hidden="true"
                  >
                    {/* Typed user text rendered transparently so character width & line wrap matches 1:1 */}
                    <span className="opacity-0 text-transparent select-none">{ghostPrefixText}</span>
                    {/* Ghost completion text rendered in dimmed/faded cyan style */}
                    <span className="text-cyan-400/60 font-medium italic select-none bg-cyan-950/20 px-0.5 rounded border border-cyan-800/30 animate-pulse">
                      {activeGhostCompletion}
                    </span>
                  </div>
                )}

                <textarea
                  value={originalPrompt}
                  onChange={(e) => {
                    setOriginalPrompt(e.target.value);
                    setActivePredictionIndex(0);
                  }}
                  onKeyDown={handlePromptKeyDown}
                  placeholder="Napište instrukci (např. Vytvořit moderní SwiftUI, Napiš skript...) nebo zkusťe ?"
                  className="w-full text-sm bg-transparent border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-hidden min-h-[90px] resize-none font-medium text-slate-100 placeholder-slate-500 relative z-10 leading-relaxed font-sans shadow-inner"
                />
                
                {/* Floating Action Buttons inside input container */}
                <div className="absolute right-2 bottom-3 flex items-center gap-1.5 z-20">
                  {/* Voice-to-text Mic button */}
                  <button
                    type="button"
                    onClick={toggleListening}
                    id="voice-input-btn"
                    className={`p-1.5 rounded-full border shadow-md active:scale-90 transition-all flex items-center justify-center cursor-pointer ${
                      isListening
                        ? "bg-rose-950/90 border-rose-500/80 text-rose-400 animate-pulse shadow-rose-500/30"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/50"
                    }`}
                    title={isListening ? "Zastavit hlasový vstup" : "Aktivovat hlasové zadávání (Voice-to-Text)"}
                  >
                    {isListening ? (
                      <MicOff className="w-4 h-4 text-rose-400" />
                    ) : (
                      <Mic className="w-4 h-4" />
                    )}
                  </button>

                  {/* Preset Injector Button */}
                  <button
                    type="button"
                    onClick={() => setShowAestheticModal(true)}
                    className="p-1.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/50 shadow-md active:scale-90 transition-all flex items-center justify-center cursor-pointer"
                    title="Inject Visual Appearance Reference Preset"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Active Speech Recording Status Indicator */}
              {isListening && (
                <div className="mt-2 px-3 py-1.5 rounded-xl bg-rose-950/60 border border-rose-500/40 flex items-center justify-between text-rose-300 text-[10px] font-mono animate-pulse" id="voice-recording-status">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                    <span className="font-bold">Mluvte nyní... Hlas je převáděn na text v reálném čase</span>
                  </div>
                  <button 
                    type="button" 
                    onClick={toggleListening}
                    className="text-[9px] underline hover:text-rose-200 cursor-pointer"
                  >
                    Zastavit
                  </button>
                </div>
              )}

              {/* Google AI Studio Autocomplete Control Bar */}
              {activeGhostCompletion ? (
                <div className="mt-2.5 bg-slate-950/90 border border-cyan-500/40 rounded-2xl p-3 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-1 duration-200" id="aistudio-ghost-bar">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                    {/* Primary Accept Action */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleApplyActivePrediction()}
                        id="accept-ghost-prediction-btn"
                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 text-slate-950 font-bold font-sans text-xs hover:brightness-110 active:scale-95 transition-all shadow-md shadow-cyan-500/20 cursor-pointer"
                      >
                        <span className="bg-slate-950/30 px-1.5 py-0.5 rounded-md text-[10px] font-mono border border-slate-950/20">Tab ↹</span>
                        <span>Potvrdit ({activePredictionCategory})</span>
                      </button>

                      {/* Incremental Word-by-Word Button */}
                      <button
                        type="button"
                        onClick={handleApplyNextWordPrediction}
                        id="accept-next-word-btn"
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-cyan-500/30 text-cyan-300 font-semibold font-sans text-xs hover:border-cyan-400 active:scale-95 transition-all shadow-xs cursor-pointer"
                        title="Vložit pouze 1-2 další slova z nápovědy (Ctrl + →)"
                      >
                        <span className="bg-slate-950 px-1.5 py-0.5 rounded text-[9px] font-mono text-cyan-400 border border-slate-800">Ctrl + →</span>
                        <span>+1 Slovo po slovu</span>
                      </button>

                      {/* Variant Cycle Controls */}
                      {currentPredictionList.length > 1 && (
                        <div className="flex items-center gap-1 bg-slate-900/90 px-2.5 py-1 rounded-xl border border-slate-800 text-[10px] font-mono text-slate-300">
                          <span className="text-slate-400">Varianta:</span>
                          <span className="font-bold text-cyan-400 font-mono">{activePredictionIndex + 1} / {currentPredictionList.length}</span>
                          <button
                            type="button"
                            onClick={cycleNextPredictionVariant}
                            className="ml-1 p-0.5 hover:bg-slate-800 rounded text-cyan-400 hover:text-white transition-colors cursor-pointer"
                            title="Další varianta (Alt + →)"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Helper info & Undo */}
                    <div className="flex items-center gap-2.5 text-[10px] font-mono text-slate-400 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-slate-900 pt-2 sm:pt-0">
                      <span className="flex items-center gap-1 text-slate-400">
                        <Sparkles className="w-3 h-3 text-cyan-400" />
                        <span>Stiskněte <strong className="text-slate-200">[Tab]</strong> pro potvrdit nebo <strong className="text-slate-200">[Ctrl + →]</strong> po slovech</span>
                      </span>

                      {predictionUndoStack.length > 0 && (
                        <button
                          type="button"
                          onClick={handleUndoPrediction}
                          className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-[9px] font-mono transition-colors cursor-pointer"
                          title="Vrátit zpět (Ctrl+Z)"
                        >
                          <Undo2 className="w-3 h-3 text-cyan-400" />
                          <span>Zpět ({predictionUndoStack.length})</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Variant Quick Option Chips */}
                  {currentPredictionList.length > 1 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-900/80 flex items-center gap-2 overflow-x-auto no-scrollbar">
                      <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-wider shrink-0">
                        Možné varianty:
                      </span>
                      {currentPredictionList.map((cand, idx) => {
                        const isSelected = (activePredictionIndex % currentPredictionList.length) === idx;
                        const cat = 'category' in cand ? cand.category : 'Nápověda';
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setActivePredictionIndex(idx);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-sans font-medium transition-all cursor-pointer shrink-0 border flex items-center gap-1.5 ${
                              isSelected
                                ? "bg-cyan-950/80 border-cyan-500/60 text-cyan-200 font-semibold shadow-xs"
                                : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850"
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-cyan-400 animate-ping' : 'bg-slate-600'}`}></span>
                            <span>{cat}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                /* Undo bar if predictions were previously applied */
                predictionUndoStack.length > 0 && (
                  <div className="mt-2.5 flex items-center justify-between px-3.5 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-[10px] font-mono text-slate-400">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      Doplnění ztmavlo a aktivovalo se v textu ({predictionUndoStack.length} {predictionUndoStack.length === 1 ? 'změna' : 'změn'})
                    </span>
                    <button
                      type="button"
                      onClick={handleUndoPrediction}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-[9px] font-mono transition-all cursor-pointer active:scale-95"
                    >
                      <Undo2 className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Vrátit doplnění zpět</span>
                    </button>
                  </div>
                )
              )}

              {/* Real-time Structural Richness Gauge Details Strip */}
              <div className="mt-2 bg-slate-950/60 border border-slate-900 rounded-xl p-2 flex items-center justify-between text-[10px] font-mono flex-wrap gap-1.5" id="complexity-gauge-details-strip">
                <div className="flex items-center gap-2.5">
                  <span className="text-slate-400 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                    {liveWordCount} {liveWordCount === 1 ? 'slovo' : liveWordCount >= 2 && liveWordCount <= 4 ? 'slova' : 'slov'} ({liveCharCount} znaků)
                  </span>
                  <span className="text-slate-700">|</span>
                  <span className="text-slate-300 font-medium">
                    {liveComplexity === 0 ? (
                      <span className="text-slate-500 italic">Zadejte instrukci pro výpočet...</span>
                    ) : liveComplexity > 75 ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Vysoce strukturovaný prompt
                      </span>
                    ) : liveComplexity > 50 ? (
                      <span className="text-cyan-400 font-semibold">⚡ Detailní zadání</span>
                    ) : liveComplexity > 25 ? (
                      <span className="text-blue-400 font-medium">📝 Standardní formulace</span>
                    ) : (
                      <span className="text-amber-400 font-medium">🌱 Základní koncept</span>
                    )}
                  </span>
                </div>

                <div className="flex items-center gap-1 text-[9px] text-slate-500 font-mono">
                  <span className={`px-1.5 py-0.5 rounded border transition-colors ${originalPrompt.includes('#') ? 'bg-cyan-950/80 text-cyan-300 border-cyan-800/50 font-bold' : 'bg-slate-900/60 border-slate-850'}`}># Nadpisy</span>
                  <span className={`px-1.5 py-0.5 rounded border transition-colors ${/[-*+]\s/.test(originalPrompt) ? 'bg-cyan-950/80 text-cyan-300 border-cyan-800/50 font-bold' : 'bg-slate-900/60 border-slate-850'}`}>• Seznamy</span>
                  <span className={`px-1.5 py-0.5 rounded border transition-colors ${/\{\{.*?\}\}|\[.*?\]/.test(originalPrompt) ? 'bg-cyan-950/80 text-cyan-300 border-cyan-800/50 font-bold' : 'bg-slate-900/60 border-slate-850'}`}>&#123;&#123;Proměnná&#125;&#125;</span>
                </div>
              </div>

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
                  onClick={() => setShowDeepAnalysis(!showDeepAnalysis)}
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
                  <div className="px-1 flex items-center justify-between flex-wrap gap-2">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                      Universal Final Prompt Matrix
                    </h3>
                    
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Review Mode Toggle Button */}
                      <button
                        type="button"
                        onClick={() => {
                          const next = !isReviewMode;
                          setIsReviewMode(next);
                          if (next && synthesized?.finalPrompt && !criticReview) {
                            handleRunCritic(synthesized.finalPrompt);
                          }
                        }}
                        id="review-mode-toggle-btn"
                        className={`text-[10px] font-bold px-3 py-1 rounded-full border transition-all flex items-center gap-1.5 cursor-pointer font-mono ${
                          isReviewMode 
                            ? "bg-purple-950/90 border-purple-500/80 text-purple-200 shadow-md shadow-purple-950/50 ring-1 ring-purple-500/40" 
                            : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                        }`}
                        title="Přepnout Režim Recenze (AI Prompt Critic)"
                      >
                        <ShieldCheck className={`w-3.5 h-3.5 ${isReviewMode ? "text-purple-400 animate-pulse" : "text-slate-400"}`} />
                        <span>Review Mode</span>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded-full uppercase font-mono font-extrabold ${isReviewMode ? "bg-purple-500/30 text-purple-300" : "bg-slate-800 text-slate-500"}`}>
                          {isReviewMode ? "ON" : "OFF"}
                        </span>
                      </button>

                      {/* Direct Header Export Buttons */}
                      {synthesized && (
                        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-full p-0.5 shadow-md font-mono" id="matrix-header-export-group">
                          <button
                            type="button"
                            onClick={() => handleExportPrompt("txt")}
                            id="export-txt-header-btn"
                            className="text-[10px] font-bold text-slate-300 hover:text-cyan-400 px-2.5 py-1 rounded-full hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer"
                            title="Exportovat jako prostý text (.txt)"
                          >
                            <Download className="w-3 h-3 text-cyan-400" />
                            <span>.TXT</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleExportPrompt("md")}
                            id="export-md-header-btn"
                            className="text-[10px] font-bold text-slate-300 hover:text-cyan-400 px-2.5 py-1 rounded-full hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer"
                            title="Exportovat jako Markdown (.md)"
                          >
                            <FileCode className="w-3 h-3 text-cyan-400" />
                            <span>.MD</span>
                          </button>
                        </div>
                      )}

                      <button
                        onClick={handleSaveToICloud}
                        className="text-[10px] font-bold text-slate-300 bg-slate-900 border border-slate-800 rounded-full px-3 py-1 flex items-center gap-1.5 hover:bg-slate-850 hover:text-cyan-400 transition-colors cursor-pointer shadow-md font-mono"
                      >
                        <CloudCheck className="w-3.5 h-3.5 text-cyan-400" />
                        iCloud Backup
                      </button>
                    </div>
                  </div>

                  {synthesizing ? (
                    <div className="cyber-card rounded-2xl p-6 text-center text-slate-400 space-y-2">
                      <RefreshCw className="w-8 h-8 animate-spin text-cyan-400 mx-auto" />
                      <p className="text-xs font-bold text-slate-200">Structuring final template layout...</p>
                      <p className="text-[10px] text-slate-500 font-mono">Injecting role guides, context answers, and constraints.</p>
                    </div>
                  ) : synthesized ? (
                    <div className="space-y-3">
                      
                      {/* AI Prompt Critic Panel (When Review Mode is ON) */}
                      {isReviewMode && (
                        <div className="bg-slate-950/90 border border-purple-900/60 rounded-2xl p-4 shadow-xl space-y-3 relative overflow-hidden" id="ai-prompt-critic-panel">
                          {/* Background Glow */}
                          <div className="absolute -right-10 -top-10 w-36 h-36 bg-purple-600/10 rounded-full blur-2xl pointer-events-none" />

                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 rounded-lg bg-purple-950 border border-purple-800/80 text-purple-300">
                                <ShieldCheck className="w-4 h-4 text-purple-400" />
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-slate-100 flex items-center gap-1.5 font-mono">
                                  AI Prompt Critic & Evaluation
                                  <span className="text-[9px] bg-purple-900/60 border border-purple-700/50 text-purple-300 px-2 py-0.5 rounded-full font-bold">
                                    Review Mode
                                  </span>
                                </h4>
                                <p className="text-[10px] text-slate-400">
                                  Detekce a oprava slabých míst v reálném čase
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {criticReview && (
                                <div className="px-2.5 py-1 rounded-full bg-slate-900 border border-purple-500/40 text-purple-300 font-mono text-[10px] font-bold flex items-center gap-1 shadow-sm">
                                  <span>Score:</span>
                                  <span className={`font-black ${criticReview.score >= 90 ? "text-emerald-400" : criticReview.score >= 75 ? "text-cyan-400" : "text-amber-400"}`}>
                                    {criticReview.score}/100
                                  </span>
                                </div>
                              )}

                              <button
                                type="button"
                                onClick={() => handleRunCritic()}
                                disabled={isCriticizing}
                                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-purple-500/50 text-slate-300 hover:text-purple-300 transition-colors cursor-pointer text-[10px] font-mono flex items-center gap-1 font-semibold"
                                title="Spustit novou AI Critic analýzu"
                              >
                                <RefreshCw className={`w-3.5 h-3.5 ${isCriticizing ? "animate-spin text-purple-400" : ""}`} />
                                <span>Analýza</span>
                              </button>
                            </div>
                          </div>

                          {/* Content / Loading State */}
                          {isCriticizing ? (
                            <div className="py-6 text-center space-y-2">
                              <RefreshCw className="w-6 h-6 animate-spin text-purple-400 mx-auto" />
                              <p className="text-xs font-bold text-slate-300">AI Critic analyzuje váš prompt...</p>
                              <p className="text-[10px] text-slate-500 font-mono">Vyhledávání nejasností, nepokrytých případů a balastu.</p>
                            </div>
                          ) : criticReview ? (
                            <div className="space-y-3 pt-1">
                              {/* Summary Overview */}
                              <div className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-900/50 text-[11px] text-purple-200 leading-relaxed font-sans">
                                <span className="font-bold text-purple-300 font-mono block mb-0.5">Hodnocení AI Critic:</span>
                                {criticReview.summary}
                              </div>

                              {/* Identified Weak Points & Why/How Fixed */}
                              <div className="space-y-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono block">
                                  Slabá místa & Vysvětlení úprav:
                                </span>
                                <div className="space-y-1.5">
                                  {criticReview.weakPoints.map((wp, idx) => (
                                    <div key={idx} className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] space-y-1">
                                      <div className="flex items-center gap-1.5 text-amber-400 font-semibold font-mono text-[10px]">
                                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                        <span>{wp.point}</span>
                                      </div>
                                      <p className="text-slate-300 text-[10px] pl-5 leading-relaxed">
                                        <span className="text-purple-300 font-semibold">Proč & Jak opraveno:</span> {wp.explanation}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Improved Prompt Preview */}
                              <div className="space-y-1.5">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono block">
                                  Navržený nový vylepšený prompt:
                                </span>
                                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 max-h-40 overflow-y-auto font-mono text-[10px] text-slate-300 leading-relaxed whitespace-pre-wrap">
                                  {criticReview.improvedPrompt}
                                </div>
                              </div>

                              {/* Action Button: Confirm & Apply New Prompt */}
                              <button
                                type="button"
                                onClick={handleConfirmCriticPrompt}
                                id="confirm-critic-prompt-btn"
                                className="w-full py-2.5 bg-gradient-to-r from-purple-600 via-indigo-500 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg cursor-pointer transition-all active:scale-98"
                              >
                                <CheckCircle2 className="w-4 h-4 text-slate-950" />
                                <span>Potvrdit a použít nový prompt</span>
                              </button>
                            </div>
                          ) : (
                            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center space-y-2">
                              <SearchCheck className="w-6 h-6 text-purple-400 mx-auto opacity-80" />
                              <p className="text-xs text-slate-300 font-medium">Režim recenze aktivní</p>
                              <button
                                type="button"
                                onClick={() => handleRunCritic()}
                                className="px-3 py-1.5 bg-purple-900/60 hover:bg-purple-800/80 border border-purple-700/60 text-purple-200 rounded-lg text-[10px] font-bold font-mono transition-colors cursor-pointer"
                              >
                                Spustit AI Critic rozbor
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Synthesized Output Terminal Screen */}
                      <div className="bg-slate-950 rounded-2xl border border-slate-800 p-3.5 relative shadow-xl">
                        <textarea
                          readOnly
                          value={synthesized.finalPrompt}
                          className="w-full text-[11px] font-mono text-slate-300 bg-slate-900/40 border border-slate-800/80 rounded-xl p-3 pt-12 min-h-[220px] focus:outline-hidden resize-y leading-relaxed"
                        />
                        
                        {/* Terminal Controls Bar (Copy & Export) */}
                        <div className="absolute right-5 top-5 flex items-center gap-2">
                          {/* Export Dropdown Menu */}
                          <div className="relative" id="terminal-export-dropdown">
                            <button
                              type="button"
                              onClick={() => setShowExportMenu(!showExportMenu)}
                              id="terminal-export-btn"
                              className="p-2 bg-slate-900 hover:bg-slate-850 rounded-lg shadow-md border border-slate-800 text-slate-300 hover:text-cyan-400 transition-colors flex items-center gap-1.5 text-[10px] font-bold font-mono cursor-pointer"
                              title="Exportovat prompt do souboru"
                            >
                              <Download className="w-3.5 h-3.5 text-cyan-400" />
                              <span>EXPORT</span>
                              <ChevronDown className={`w-3 h-3 transition-transform ${showExportMenu ? "rotate-180" : ""}`} />
                            </button>

                            {showExportMenu && (
                              <div className="absolute right-0 mt-1.5 w-36 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-1 z-30 space-y-0.5 animate-in fade-in zoom-in-95">
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleExportPrompt("txt");
                                    setShowExportMenu(false);
                                  }}
                                  id="export-opt-txt"
                                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-semibold text-slate-200 hover:bg-slate-800 hover:text-cyan-400 flex items-center gap-2 cursor-pointer transition-colors"
                                >
                                  <FileText className="w-3.5 h-3.5 text-cyan-400" />
                                  <span>Text (.txt)</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleExportPrompt("md");
                                    setShowExportMenu(false);
                                  }}
                                  id="export-opt-md"
                                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-semibold text-slate-200 hover:bg-slate-800 hover:text-cyan-400 flex items-center gap-2 cursor-pointer transition-colors"
                                >
                                  <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                                  <span>Markdown (.md)</span>
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Copy button */}
                          <button
                            type="button"
                            onClick={() => handleCopyText(synthesized.finalPrompt)}
                            className="p-2 bg-slate-900 rounded-lg shadow-md border border-slate-800 text-slate-300 hover:text-cyan-400 transition-colors flex items-center gap-1 text-[10px] font-bold font-mono cursor-pointer"
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
                        </div>

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
                        <OptimizationHistoryChart 
                          history={optimizationHistory} 
                          onRestoreStep={handleRestoreStep}
                        />
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
