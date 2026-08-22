import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { 
  localGenerateQuestions, 
  localSearchCatalog, 
  localSynthesizePrompt, 
  localRefinePrompt,
  localCriticPrompt
} from "./src/lib/localModel";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Wraps an async handler so a rejected promise reaches Express' error middleware.
// Without this an async throw becomes an unhandled rejection and Node exits.
type AsyncHandler = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => Promise<unknown>;

function asyncRoute(handler: AsyncHandler) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

// Normalizes untrusted request bodies. The offline engines are the failure path for
// every endpoint, so they must never be handed a shape they can throw on.
function asText(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function asAnswers(value: unknown): { question: string; answer: string }[] {
  if (!Array.isArray(value)) return [];
  return value.map((item: any) => ({
    question: asText(item?.question),
    answer: asText(item?.answer)
  }));
}

function asCatalogItems(value: unknown): any[] {
  if (!Array.isArray(value)) return [];
  return value.map((item: any) => ({
    title: asText(item?.title),
    content: asText(item?.content),
    suitability: asText(item?.suitability),
    source: asText(item?.source)
  }));
}

// Why a response was produced by the offline engine instead of the model. The client
// shows this to the user, so a canned answer is never presented as a model answer.
export type FallbackReason =
  | "missing-api-key"
  | "quota-exhausted"
  | "api-error"
  | "server-error";

const MISSING_KEY_MESSAGE = "GEMINI_API_KEY is not configured in environment variables.";

function classifyFailure(err: any): FallbackReason {
  const message = String(err?.message ?? "");
  if (message.includes(MISSING_KEY_MESSAGE)) return "missing-api-key";

  const status = err?.status ?? err?.code ?? "";
  const lower = message.toLowerCase();
  const isQuota =
    status === 429 ||
    status === "RESOURCE_EXHAUSTED" ||
    lower.includes("depleted") ||
    lower.includes("prepayment") ||
    lower.includes("billing") ||
    lower.includes("quota");

  return isQuota ? "quota-exhausted" : "api-error";
}

// A depleted quota is expected operation; a missing key or an unexpected API error is a
// fault that should be visible to whoever runs this. Blanket-logging everything as
// "quota reached" hid real failures behind a message that read like normal behaviour.
function logFallback(endpoint: string, reason: FallbackReason, err: any) {
  if (reason === "quota-exhausted") {
    console.info(`${endpoint}: Gemini quota exhausted, serving offline engine result.`);
    return;
  }
  if (reason === "missing-api-key") {
    console.error(`${endpoint}: GEMINI_API_KEY is not set. Serving offline engine result.`);
    return;
  }
  console.error(`${endpoint}: Gemini call failed (${reason}), serving offline engine result:`, err);
}

// Helper to initialize Gemini safely at request-time to prevent startup crashes if key is missing
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(MISSING_KEY_MESSAGE);
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

const CANDIDATE_MODELS = [
  "gemini-3.6-flash",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest"
];

async function generateContentWithFallback(ai: GoogleGenAI, config: any, allowSearchTool: boolean = true) {
  let lastError: any = null;

  for (const modelName of CANDIDATE_MODELS) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const reqConfig = { ...config };
        if (!allowSearchTool && reqConfig.config && reqConfig.config.tools) {
          delete reqConfig.config.tools;
        }

        const response = await ai.models.generateContent({
          ...reqConfig,
          model: modelName
        });
        return response;
      } catch (err: any) {
        lastError = err;
        const status = err?.status || err?.code || "";
        const msg = (err?.message || "").toLowerCase();
        
        const isQuotaDepleted = msg.includes("depleted") || msg.includes("prepayment") || msg.includes("billing") || msg.includes("quota");
        
        if (isQuotaDepleted) {
          // Immediately throw so endpoint catches and uses local offline engine instantly
          throw err;
        }

        const isTransient = status === "UNAVAILABLE" || status === 503 || status === 500 || status === 502 || status === 504 ||
                            msg.includes("high demand") || msg.includes("temporar");
        
        if (isTransient) {
          const delay = attempt * 500;
          await new Promise(r => setTimeout(r, delay));
          if (attempt === 2 && config.config && config.config.tools) {
            allowSearchTool = false;
          }
        } else {
          break;
        }
      }
    }
  }

  throw lastError || new Error("All Gemini model candidates exhausted.");
}

// Endpoint 1: Generate 10-20 detailed context questions
app.post("/api/generate-questions", asyncRoute(async (req, res) => {
  const prompt = asText(req.body?.prompt);
  try {
    if (!prompt.trim()) {
      return res.status(400).json({ error: "Original prompt is required" });
    }

    try {
      const ai = getGeminiClient();
      const systemInstruction = `You are a professional Prompt Engineer specialized in optimizing AI prompts for mobile/web apps.
Your task is to analyze the user's simple prompt and generate exactly 12 relevant, precise, and interactive questions that will help narrow down the context, target audience, tone, format, constraints, and visual elements.
Keep the questions short, human-friendly, and highly relevant.
Also, provide a realistic default example answer for each question to allow fast iteration.
Return a valid JSON array of objects, where each object has:
- "id": number (1 to 12)
- "category": string (e.g. "Core Purpose", "Tone & Style", "Format & Output", "Constraints")
- "question": string
- "placeholder": string`;

      const response = await generateContentWithFallback(ai, {
        contents: `Generate 12 context questions with default answers for this prompt: "${prompt}"`,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.INTEGER },
                category: { type: Type.STRING },
                question: { type: Type.STRING },
                placeholder: { type: Type.STRING }
              },
              required: ["id", "category", "question", "placeholder"]
            }
          }
        }
      });

      const data = JSON.parse(response.text || "[]");
      return res.json({ questions: data });
    } catch (apiError: any) {
      const reason = classifyFailure(apiError);
      logFallback("/api/generate-questions", reason, apiError);
      const fallbackQuestions = localGenerateQuestions(prompt);
      return res.json({ questions: fallbackQuestions, isOfflineFallback: true, fallbackReason: reason });
    }
  } catch (error: any) {
    logFallback("/api/generate-questions", "server-error", error);
    const fallbackQuestions = localGenerateQuestions(prompt);
    return res.json({ questions: fallbackQuestions, isOfflineFallback: true, fallbackReason: "server-error" });
  }
}));

// Endpoint 2: Web ground prompt catalog search
app.post("/api/search-catalog", asyncRoute(async (req, res) => {
  const prompt = asText(req.body?.prompt);
  try {
    if (!prompt.trim()) {
      return res.status(400).json({ error: "Original prompt is required" });
    }

    try {
      const ai = getGeminiClient();
      const systemInstruction = `You are an AI prompt analyst.
Your task is to search the web for actual reviewed, high-performing, or industry-standard prompt templates/catalog examples related to the user's topic: "${prompt}".
Find the 5 most suitable prompts. For each of the 5 items, generate:
- "title": a short name of the prompt template
- "content": the actual text of the optimized prompt template
- "suitability": a brief explanation of why this prompt is suitable, its pros and cons.
- "source": a simulated or actual source name/website (e.g., "Awesome Prompts", "PromptHero", "GitHub Prompt Collection")

Make sure the output matches the requested topic perfectly and contains high-quality, practical prompt content.
Return as a valid JSON array.`;

      const response = await generateContentWithFallback(ai, {
        contents: `Search and find 5 high-quality reviewed prompt catalog templates for: "${prompt}"`,
        config: {
          systemInstruction,
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                content: { type: Type.STRING },
                suitability: { type: Type.STRING },
                source: { type: Type.STRING }
              },
              required: ["title", "content", "suitability", "source"]
            }
          }
        }
      }, true);

      const catalog = JSON.parse(response.text || "[]");
      
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const citations = chunks.map((c: any) => ({
        title: c.web?.title || "Prompt Catalog Reference",
        uri: c.web?.uri || ""
      })).filter((c: any) => c.uri);

      return res.json({ catalog, citations });
    } catch (apiError: any) {
      const reason = classifyFailure(apiError);
      logFallback("/api/search-catalog", reason, apiError);
      const fallbackCatalog = localSearchCatalog(prompt);
      return res.json({ catalog: fallbackCatalog, citations: [], isOfflineFallback: true, fallbackReason: reason });
    }
  } catch (error: any) {
    logFallback("/api/search-catalog", "server-error", error);
    const fallbackCatalog = localSearchCatalog(prompt);
    return res.json({ catalog: fallbackCatalog, citations: [], isOfflineFallback: true, fallbackReason: "server-error" });
  }
}));

// Endpoint 3: Synthesize universal prompt
app.post("/api/synthesize-prompt", asyncRoute(async (req, res) => {
  const originalPrompt = asText(req.body?.originalPrompt);
  const answers = asAnswers(req.body?.answers);
  const selectedCatalogPrompts = asCatalogItems(req.body?.selectedCatalogPrompts);
  const referenceAesthetics = asText(req.body?.referenceAesthetics);

  try {
    try {
      const ai = getGeminiClient();
      const systemInstruction = `You are a Master Prompt Engineer.
Your task is to synthesize a high-performance, robust, and beautiful "Universal Final Prompt" by merging:
1. The user's original basic idea: "${originalPrompt}"
2. The extra context from the detailed Q&A answers:
${JSON.stringify(answers || [])}
3. Inspiring components or structural techniques from these selected catalog prompts:
${JSON.stringify(selectedCatalogPrompts || [])}
4. Aesthetic or Visual styling requirements (if any): "${referenceAesthetics || 'None'}"

Design rules for the final prompt:
- Use markdown headers, bullet points, and placeholders (like [your_data_here]) for structure.
- Add clear instructions for role, tone, context, step-by-step thinking (CoT), constraints, and expected output format.
- Make it highly effective for state-of-the-art models.

Provide the response in JSON format with:
- "finalPrompt": The fully synthesized prompt
- "explanation": Short, scannable overview of why this prompt was built this way and how it leverages the combined context.`;

      const response = await generateContentWithFallback(ai, {
        contents: "Synthesize the optimized universal prompt based on the provided parameters.",
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              finalPrompt: { type: Type.STRING },
              explanation: { type: Type.STRING }
            },
            required: ["finalPrompt", "explanation"]
          }
        }
      });

      const result = JSON.parse(response.text || "{}");
      return res.json(result);
    } catch (apiError: any) {
      const reason = classifyFailure(apiError);
      logFallback("/api/synthesize-prompt", reason, apiError);
      const fallbackResult = localSynthesizePrompt(
        originalPrompt,
        answers,
        selectedCatalogPrompts,
        referenceAesthetics
      );
      return res.json({ ...fallbackResult, isOfflineFallback: true, fallbackReason: reason });
    }
  } catch (error: any) {
    logFallback("/api/synthesize-prompt", "server-error", error);
    const fallbackResult = localSynthesizePrompt(
      originalPrompt,
      answers,
      selectedCatalogPrompts,
      referenceAesthetics
    );
    return res.json({ ...fallbackResult, isOfflineFallback: true, fallbackReason: "server-error" });
  }
}));

// Endpoint 4: Refine/Recalculate prompt after manual adjustments
app.post("/api/refine-prompt", asyncRoute(async (req, res) => {
  const finalPrompt = asText(req.body?.finalPrompt);
  const manualEdits = asText(req.body?.manualEdits);

  try {
    try {
      const ai = getGeminiClient();
      const systemInstruction = `You are a prompt optimizer.
The user has a finalized prompt:
"${finalPrompt}"

They made the following manual adjustments or requested these changes:
"${manualEdits}"

Refine, polish, and optimize the prompt to flawlessly incorporate their manual adjustments while keeping the structure high-performance and beautiful.
Return the result in JSON format:
- "finalPrompt": The newly updated, refined, and improved prompt.
- "explanation": What was changed and why.`;

      const response = await generateContentWithFallback(ai, {
        contents: "Refine and polish the prompt with the specified manual edits.",
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              finalPrompt: { type: Type.STRING },
              explanation: { type: Type.STRING }
            },
            required: ["finalPrompt", "explanation"]
          }
        }
      });

      const result = JSON.parse(response.text || "{}");
      return res.json(result);
    } catch (apiError: any) {
      const reason = classifyFailure(apiError);
      logFallback("/api/refine-prompt", reason, apiError);
      const fallbackResult = localRefinePrompt(finalPrompt, manualEdits);
      return res.json({ ...fallbackResult, isOfflineFallback: true, fallbackReason: reason });
    }
  } catch (error: any) {
    logFallback("/api/refine-prompt", "server-error", error);
    const fallbackResult = localRefinePrompt(finalPrompt, manualEdits);
    return res.json({ ...fallbackResult, isOfflineFallback: true, fallbackReason: "server-error" });
  }
}));

// Endpoint 5: AI Prompt Critic
app.post("/api/critic-prompt", asyncRoute(async (req, res) => {
  const finalPrompt = asText(req.body?.finalPrompt);
  const originalIdea = asText(req.body?.originalIdea);

  try {
    try {
      const ai = getGeminiClient();
      const systemInstruction = `You are an expert AI Prompt Critic & Quality Assurance Auditor.
Your job is to thoroughly critique a synthesized prompt, locate weak points, explain why and how to fix them, and produce an improved version of the prompt.

Analyze the prompt:
1. Identify 2-3 concrete weak places (e.g., ambiguity, missing constraints, lack of output format enforcement, missing error handling or variable placeholders).
2. Explain clearly why each weak point limits prompt performance and how the proposed change fixes it.
3. Generate a refined, robust, improved version of the prompt ("improvedPrompt").
4. Provide an overall quality score (0-100) and a brief summary.

Return response strictly as JSON with:
- "score": number (0-100)
- "summary": string (brief overview of findings)
- "weakPoints": array of objects, each with:
    - "point": string (Name/description of weak place)
    - "explanation": string (Why it's weak and how it was fixed)
- "improvedPrompt": string (The complete improved version of the prompt)`;

      const response = await generateContentWithFallback(ai, {
        contents: `Critique this prompt and provide improvements:\n\nPrompt:\n${finalPrompt}\n\nOriginal Idea:\n${originalIdea || 'Not specified'}`,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.INTEGER },
              summary: { type: Type.STRING },
              weakPoints: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    point: { type: Type.STRING },
                    explanation: { type: Type.STRING }
                  },
                  required: ["point", "explanation"]
                }
              },
              improvedPrompt: { type: Type.STRING }
            },
            required: ["score", "summary", "weakPoints", "improvedPrompt"]
          }
        }
      });

      const result = JSON.parse(response.text || "{}");
      return res.json(result);
    } catch (apiError: any) {
      const reason = classifyFailure(apiError);
      logFallback("/api/critic-prompt", reason, apiError);
      const fallbackResult = localCriticPrompt(finalPrompt);
      return res.json({ ...fallbackResult, isOfflineFallback: true, fallbackReason: reason });
    }
  } catch (error: any) {
    logFallback("/api/critic-prompt", "server-error", error);
    const fallbackResult = localCriticPrompt(finalPrompt);
    return res.json({ ...fallbackResult, isOfflineFallback: true, fallbackReason: "server-error" });
  }
}));

// Serve frontend SPA or configure development middleware
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Catches anything the per-endpoint handling missed, so a bad request returns 500
  // instead of escaping as an unhandled rejection.
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("Unhandled error while serving request:", err);
    if (res.headersSent) return;
    res.status(500).json({ error: "Internal server error" });
  });

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });

  // Bind failures arrive as an event, not a rejection, so without this the
  // process-level handler below would swallow EADDRINUSE and leave a process alive
  // that never serves anything. A server that cannot listen must exit.
  server.on("error", (err: NodeJS.ErrnoException) => {
    console.error(`Server could not listen on port ${PORT}:`, err.message);
    process.exit(1);
  });
}

// Node exits on an unhandled rejection by default; keep the process alive and log
// instead, so one malformed request can never take the service down for everyone.
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
});

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
