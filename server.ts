import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Helper to initialize Gemini safely at request-time to prevent startup crashes if key is missing
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured in environment variables.");
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

// Endpoint 1: Generate 10-20 detailed context questions
app.post("/api/generate-questions", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Original prompt is required" });
    }

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

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
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
    res.json({ questions: data });
  } catch (error: any) {
    console.error("Error generating questions:", error);
    res.status(500).json({ error: error.message || "Failed to generate context questions." });
  }
});

// Endpoint 2: Web ground prompt catalog search
app.post("/api/search-catalog", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Original prompt is required" });
    }

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

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
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
    });

    const catalog = JSON.parse(response.text || "[]");
    
    // Extract search citations if available
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const citations = chunks.map((c: any) => ({
      title: c.web?.title || "Prompt Catalog Reference",
      uri: c.web?.uri || ""
    })).filter((c: any) => c.uri);

    res.json({ catalog, citations });
  } catch (error: any) {
    console.error("Error searching catalog:", error);
    res.status(500).json({ error: error.message || "Failed to search prompt catalog." });
  }
});

// Endpoint 3: Synthesize universal prompt
app.post("/api/synthesize-prompt", async (req, res) => {
  try {
    const { originalPrompt, answers, selectedCatalogPrompts, referenceAesthetics } = req.body;
    
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

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
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
    res.json(result);
  } catch (error: any) {
    console.error("Error synthesizing prompt:", error);
    res.status(500).json({ error: error.message || "Failed to synthesize prompt." });
  }
});

// Endpoint 4: Refine/Recalculate prompt after manual adjustments
app.post("/api/refine-prompt", async (req, res) => {
  try {
    const { finalPrompt, manualEdits } = req.body;
    
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

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
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
    res.json(result);
  } catch (error: any) {
    console.error("Error refining prompt:", error);
    res.status(500).json({ error: error.message || "Failed to refine prompt." });
  }
});

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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
