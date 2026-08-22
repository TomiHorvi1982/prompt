export interface Question {
  id: number;
  category: string;
  question: string;
  placeholder: string;
  answer?: string;
}

export interface CatalogPrompt {
  title: string;
  content: string;
  suitability: string;
  source: string;
  selected?: boolean;
}

export interface Citation {
  title: string;
  uri: string;
}

export interface SynthesizedPrompt {
  finalPrompt: string;
  explanation: string;
}

export interface AestheticPreset {
  id: string;
  name: string;
  description: string;
  styleDirectives: string;
}

export interface OptimizationStep {
  stepIndex: number;
  label: string;
  prompt: string;
  length: number;
  wordCount: number;
  complexity: number;
  timestamp: string;
}

export interface SavedPromptSession {
  id: string;
  title: string;
  originalPrompt: string;
  finalPrompt: string;
  timestamp: string;
  optimizationHistory?: OptimizationStep[];
}

export interface CriticWeakPoint {
  point: string;
  explanation: string;
}

export interface CriticReview {
  score: number;
  summary: string;
  weakPoints: CriticWeakPoint[];
  improvedPrompt: string;
  isOfflineFallback?: boolean;
}

export interface LocalEngine {
  id: string;
  name: string;
  size: string;
  parameters: string;
  description: string;
  accuracy: string;
  speed: string;
  downloaded: boolean;
  downloading: boolean;
  progress: number;
  active: boolean;
}

export interface QuestionMarkPredictionCandidate {
  id: string;
  category: string;
  title: string;
  completion: string;
  fullTextPreview: string;
}


// Where a piece of generated content actually came from, so the UI never presents a
// canned local result as a model answer.
export type OutputOrigin = "cloud" | "offline-mode" | "fallback";

export type FallbackReason =
  | "missing-api-key"
  | "quota-exhausted"
  | "api-error"
  | "server-error"
  | "network-error";

export interface OutputProvenance {
  origin: OutputOrigin;
  reason?: FallbackReason;
}
