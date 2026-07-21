// Local Offline Prompt Model Engine
// Provides immediate continuity for offline-mode usage on Mac & iOS.

export interface Question {
  id: number;
  category: string;
  question: string;
  placeholder: string;
}

export interface CatalogItem {
  title: string;
  content: string;
  suitability: string;
  source: string;
}

export interface SynthesizedPromptResponse {
  finalPrompt: string;
  explanation: string;
}

// 1. Local Question Generator
export function localGenerateQuestions(prompt: string): Question[] {
  const normalized = prompt.toLowerCase();
  
  let categoryTheme = "General Prompting";
  if (normalized.includes("write") || normalized.includes("text") || normalized.includes("copy")) {
    categoryTheme = "Content Creation";
  } else if (normalized.includes("code") || normalized.includes("program") || normalized.includes("react") || normalized.includes("js")) {
    categoryTheme = "Software Engineering";
  } else if (normalized.includes("image") || normalized.includes("design") || normalized.includes("art")) {
    categoryTheme = "Visual & Arts";
  } else if (normalized.includes("business") || normalized.includes("market") || normalized.includes("finance")) {
    categoryTheme = "Business & Strategy";
  }

  const baseQuestions = [
    {
      id: 1,
      category: "Core Persona",
      question: `What specific role or expert persona should the AI adopt for: "${prompt}"?`,
      placeholder: "e.g., Senior iOS Engineer, Creative Copywriter, Harvard Business Advisor"
    },
    {
      id: 2,
      category: "Target Audience",
      question: "Who is the ultimate audience or consumer of this output?",
      placeholder: "e.g., High school students, Tech executives, General public, Developers"
    },
    {
      id: 3,
      category: "Tone & Style",
      question: "What specific tone or personality traits should the output reflect?",
      placeholder: "e.g., Professional yet witty, Empathetic and conversational, Scientific, Brutalist"
    },
    {
      id: 4,
      category: "Desired Format",
      question: "How should the final results be structured?",
      placeholder: "e.g., Markdown table, Interactive JSON, Bullet points with headings, Short essay"
    },
    {
      id: 5,
      category: "Output Length",
      question: "What are your length or verbosity constraints?",
      placeholder: "e.g., Under 200 words, Exactly 3 paragraphs, Comprehensive documentation"
    },
    {
      id: 6,
      category: "Anti-Goals & Rules",
      question: "What are the absolute rules, phrases, or formats the AI must AVOID?",
      placeholder: "e.g., No prefaces or self-praise, Do not use passive voice, Avoid jargon"
    },
    {
      id: 7,
      category: "Context & Background",
      question: "Is there any key background information or context that's vital?",
      placeholder: "e.g., It's for an offline-enabled iOS app, The product launched in 2026"
    },
    {
      id: 8,
      category: "Input Variables",
      question: "What dynamic parameters or variables will you pass to this prompt later?",
      placeholder: "e.g., [user_topic], [source_code], [draft_text]"
    },
    {
      id: 9,
      category: "Examples / Few-Shot",
      question: "Do you have any quick example of a perfect output you can supply?",
      placeholder: "e.g., 'In: Hello -> Out: Ahoy!', or 'Provide 2 examples of output format'"
    },
    {
      id: 10,
      category: "Reasoning Approach",
      question: "Should the AI explain its steps or reason before answering?",
      placeholder: "e.g., Yes, use <thinking> tags first; No, output only the clean final code"
    },
    {
      id: 11,
      category: "Language",
      question: "What language should the AI use for thinking versus final output?",
      placeholder: "e.g., Output in Czech, think in English; Output entirely in English"
    },
    {
      id: 12,
      category: "Creativity Level",
      question: "On a scale of 1-10, how creative or strictly factual should the AI be?",
      placeholder: "e.g., Level 3 (strictly factual and data-driven), Level 9 (artistic and imaginative)"
    }
  ];

  return baseQuestions;
}

// 2. Local Prompt Catalog Sourcing
export function localSearchCatalog(prompt: string): CatalogItem[] {
  const p = prompt;
  return [
    {
      title: "System Role & Instructions Pattern",
      content: `# ROLE: Master Specialist in "${p}"
## INSTRUCTIONS:
- You are a senior-level advisor with deep practical expertise.
- Always execute with meticulous attention to detail, optimal efficiency, and precise terminology.
- Before formulating any final output, think step-by-step to outline constraints and edge cases.`,
      suitability: "Highly suitable if you need extreme precision, professional tone, and minimal fluff. Focuses heavily on the role declaration.",
      source: "PromptHero (Local)"
    },
    {
      title: "Variable Inputs & Zero-Fluff Formatter",
      content: `# TASK: Refine input for "${p}"
# INPUT VARIABLES:
- [RAW_DATA]: The raw source information provided by the user.

# OUTPUT FORMAT:
Output the results in a beautiful Markdown table with the columns:
| ID | Key Parameter | Evaluated State | Recommended Action |

Do not write any introductory sentences or concluding friendly remarks. Go straight to the table.`,
      suitability: "Best choice for data pipelines, automated reports, and structured tools that interface with other scripts.",
      source: "Awesome Prompts GitHub (Local)"
    },
    {
      title: "Interactive CoT (Chain-of-Thought) Reasoner",
      content: `Adopt the persona of an elite system strategist.
For any query regarding "${p}", follow these steps:
1. Wrap your initial analytical thoughts inside <thinking_process>...</thinking_process> blocks.
2. Formulate 3 distinct conceptual approaches to the query.
3. Choose the absolute best approach and present the final answer with a clear 'Why it works' annotation.`,
      suitability: "Excellent for complex reasoning, brainstorming, coding architecture, and strategy formulation.",
      source: "Systeam Guide Catalog (Local)"
    },
    {
      title: "The Apple-Style Minimalist Editor",
      content: `You are an editor with a strict focus on brevity, clarity, and elegance.
When working on "${p}":
- Express complex concepts in single, memorable sentences.
- Avoid hyperbole, sales speak, and promotional emojis.
- Use bullet points with bold keywords to highlight maximum value in minimum space.`,
      suitability: "Designed for premium consumer-facing content, UI copy, and sleek documentation in line with Cupertino style guidelines.",
      source: "Apple Developer Forums (Local)"
    },
    {
      title: "The Robust Error-Handling Guardian",
      content: `Focus strictly on edge cases and error prevention for: "${p}".
- Your output must explicitly identify at least 3 failure vectors or potential misunderstandings.
- Provide defensive mitigations for each vector.
- Output code or instructions in a way that minimizes runtime or interpretive errors.`,
      suitability: "Highly recommended for coding, safety manuals, or technical procedures where failure is expensive.",
      source: "PromptCraft Catalog (Local)"
    }
  ];
}

// 3. Local Synthesis Engine
export function localSynthesizePrompt(
  originalPrompt: string,
  answers: { question: string; answer: string }[],
  selectedCatalogPrompts: CatalogItem[],
  referenceAesthetics: string
): SynthesizedPromptResponse {
  
  let qSection = answers
    .filter(a => a.answer.trim() !== "")
    .map(a => `- **${a.question}**: ${a.answer}`)
    .join("\n");

  if (!qSection) {
    qSection = "- *No additional context provided*";
  }

  const selectedTitles = selectedCatalogPrompts.map(c => `"${c.title}"`).join(", ") || "None selected";

  const synthesized = `# ROLE & CONTEXT
Adopt the persona of an expert in prompt engineering and optimization.
The core objective is to execute the following task flawlessly:
"${originalPrompt}"

# DETAILED CONTEXT & CONSTRAINTS
Based on your iterative input, you must strictly satisfy these parameters:
${qSection}

${referenceAesthetics ? `# DESIGN & AESTHETIC DIRECTIVES
Your output should incorporate the following visual or UI aesthetic style:
- Style: ${referenceAesthetics}
` : ""}

# EXECUTION GUIDELINES
- Adopt a professional, direct, and authoritative tone suited for this context.
- Avoid generic filler words, greeting statements ("Sure, I can help you with..."), or summary chatter.
- Break down complex responses into a clear, hierarchical Markdown outline.
- Structure key parameters with standard placeholder tags like \`[DYNAMIC_INPUT]\` where appropriate.

# STEP-BY-STEP STRATEGY
1. Analyze the context and constraints provided under #DETAILED CONTEXT & CONSTRAINTS.
2. Outline the solution schema inside internal mental tokens before presenting final results.
3. Present the response with high-impact, scannable clarity.`;

  return {
    finalPrompt: synthesized,
    explanation: `Successfully synthesized offline. Integrated your core prompt, ${answers.filter(a => a.answer.trim() !== "").length} context answers, and structural elements from ${selectedCatalogPrompts.length} catalog template(s): ${selectedTitles}.`
  };
}

// 4. Local Refiner
export function localRefinePrompt(finalPrompt: string, manualEdits: string): SynthesizedPromptResponse {
  const refined = `${finalPrompt}
# ADDITIONAL USER ADJUSTMENTS
The following supplementary requirements were manually added and MUST be fully satisfied:
- ${manualEdits}
*Note: This prompt has been iteratively compiled and recalculated offline to retain workflow continuity.*`;

  return {
    finalPrompt: refined,
    explanation: "Re-synthesized offline to flawlessly incorporate your manual adjustments."
  };
}

// 5. Neural Predictive Autocomplete Module (Mini 2.4 MB Neural Net simulation)
export interface PredictionCandidate {
  phrase: string;
  completion: string; // The remaining text to be appended
  confidence: number;
  category: string;
}

const PREDICTION_DATABASE: { triggers: string[]; fullPhrase: string; category: string }[] = [
  // Czech Autocomplete predictions
  {
    triggers: ["vyt", "vytv", "vytvo", "vytvor", "vytvoř", "vytvořit"],
    fullPhrase: "vytvořit moderní SwiftUI komponentu s plynulými animacemi",
    category: "Software Engineering"
  },
  {
    triggers: ["vyt", "vytv", "vytvo", "vytvor", "vytvoř", "vytvořit"],
    fullPhrase: "vytvořit responsivní dashboard v Tailwind CSS s tmavým vzhledem",
    category: "Web Development"
  },
  {
    triggers: ["vyt", "vytv", "vytvo", "vytvor", "vytvoř", "vytvořit"],
    fullPhrase: "vytvořit backend v Node.js s Express, TypeScriptem a SQLite databází",
    category: "Backend Engine"
  },
  {
    triggers: ["nap", "napi", "napis", "napsat"],
    fullPhrase: "napsat konverzní landing page copy pro inovativní SaaS produkt",
    category: "Copywriting"
  },
  {
    triggers: ["nap", "napi", "napis", "napsat"],
    fullPhrase: "napsat sekvenci chladných prodejních e-mailů s vysokým konverzním poměrem",
    category: "Email Marketing"
  },
  {
    triggers: ["nav", "navr", "navrh", "navrhn", "navrhno", "navrhnout"],
    fullPhrase: "navrhnout personalizovaný fitness plán pro extrémně zaneprázdněné manažery",
    category: "Lifestyle Planning"
  },
  {
    triggers: ["nav", "navr", "navrh", "navrhn", "navrhno", "navrhnout"],
    fullPhrase: "navrhnout robustní mikroservisní architekturu pro vysokou zátěž v Google Cloudu",
    category: "Cloud Architecture"
  },
  {
    triggers: ["pre", "pře", "přep", "přeps", "přepsat"],
    fullPhrase: "přepsat stávající Javascript kód do čistého a bezpečného TypeScriptu",
    category: "Refactoring"
  },
  {
    triggers: ["pre", "pře", "přep", "přeps", "přepsat"],
    fullPhrase: "přepsat marketingový text do vysoce profesionálního, diplomatického a elegantního tónu",
    category: "Brand Refining"
  },
  {
    triggers: ["opt", "opti", "optim", "optimal", "optimaliz", "optimalizovat"],
    fullPhrase: "optimalizovat SQL databázové dotazy pro radikální snížení latence a úsporu výkonu",
    category: "Database Tuning"
  },
  {
    triggers: ["opt", "opti", "optim", "optimal", "optimaliz", "optimalizovat"],
    fullPhrase: "optimalizovat tento prompt pro nejnovější modely řady Gemini s eliminací vaty",
    category: "Prompt Tuning"
  },
  {
    triggers: ["ana", "anal", "analy", "analyz", "analyzo", "analyzovat"],
    fullPhrase: "analyzovat uživatelskou zpětnou vazbu z lístků podpory a kategorizovat top problémy",
    category: "Data Intelligence"
  },
  {
    triggers: ["ana", "anal", "analy", "analyz", "analyzo", "analyzovat"],
    fullPhrase: "analyzovat finanční data a navrhnout okamžité úspory v cloudové infrastruktuře",
    category: "Fintech Audit"
  },

  // English Autocomplete predictions
  {
    triggers: ["cre", "crea", "creat", "create"],
    fullPhrase: "create a high-converting SaaS landing page copywriting draft",
    category: "Copywriting"
  },
  {
    triggers: ["cre", "crea", "creat", "create"],
    fullPhrase: "create a beautiful responsive dashboard interface in Tailwind CSS",
    category: "Web Development"
  },
  {
    triggers: ["cre", "crea", "creat", "create"],
    fullPhrase: "create a lightweight SwiftUI reusable view component with custom transitions",
    category: "iOS Engineering"
  },
  {
    triggers: ["wri", "writ", "write"],
    fullPhrase: "write an advanced cold email outreach sequence for B2B technology sales",
    category: "Sales Strategy"
  },
  {
    triggers: ["wri", "writ", "write"],
    fullPhrase: "write a clean, fully typed TypeScript API endpoint handler with exhaustive error checks",
    category: "Software Engineering"
  },
  {
    triggers: ["des", "desi", "desig", "design"],
    fullPhrase: "design a highly personalized fitness & diet planner for busy professionals",
    category: "Lifestyle Planning"
  },
  {
    triggers: ["des", "desi", "desig", "design"],
    fullPhrase: "design a robust serverless backend architecture for high-concurrency mobile apps",
    category: "System Architecture"
  },
  {
    triggers: ["opt", "opti", "optim", "optimize"],
    fullPhrase: "optimize this custom prompt to completely prevent hallucinations and introductory fluff",
    category: "Prompt Tuning"
  },
  {
    triggers: ["opt", "opti", "optim", "optimize"],
    fullPhrase: "optimize database queries to reduce execution latency under heavy read load",
    category: "Database Tuning"
  },
  {
    triggers: ["ana", "anal", "analy", "analyze"],
    fullPhrase: "analyze user support tickets to automatically group and identify recurring bugs",
    category: "Data Intelligence"
  },
  {
    triggers: ["tra", "tran", "trans", "transl", "translate"],
    fullPhrase: "translate this technical markdown documentation into Czech while preserving code fences",
    category: "Localization"
  }
];

export function getNeuralPredictions(inputText: string): PredictionCandidate[] {
  if (!inputText || inputText.trim().length < 2) return [];
  
  const cleanInput = inputText.trim().toLowerCase();
  
  // Find predictions where either:
  // - The input starts one of the triggers
  // - The input is a partial match of the fullPhrase itself
  const matches: PredictionCandidate[] = [];

  for (const item of PREDICTION_DATABASE) {
    // Check direct trigger matching
    const hasTriggerMatch = item.triggers.some(tr => cleanInput === tr || cleanInput.endsWith(" " + tr));
    // Check if the input starts the fullPhrase
    const startsPhrase = item.fullPhrase.toLowerCase().startsWith(cleanInput);

    if (hasTriggerMatch || startsPhrase) {
      let completion = "";
      if (startsPhrase) {
        completion = item.fullPhrase.substring(inputText.length);
      } else {
        // Try to replace the last trigger with the full phrase or append
        const lastWord = cleanInput.split(" ").pop() || "";
        const triggerIndex = item.triggers.indexOf(lastWord);
        if (triggerIndex !== -1) {
          const phraseWords = item.fullPhrase.split(" ");
          // Find if we can calculate a smooth completion
          completion = " " + phraseWords.slice(1).join(" ");
        } else {
          completion = " " + item.fullPhrase;
        }
      }

      // Calculate pseudo-confidence based on match type & length
      let confidence = 85 + Math.min(14, cleanInput.length * 2);
      if (startsPhrase) confidence += 3;
      if (confidence > 99) confidence = 99;

      // Avoid duplicates
      if (!matches.some(m => m.phrase === item.fullPhrase)) {
        matches.push({
          phrase: item.fullPhrase,
          completion: completion,
          confidence: confidence,
          category: item.category
        });
      }
    }
  }

  return matches.slice(0, 3); // Return top 3 high-confidence neural candidates
}

export function calculateComplexity(prompt: string): number {
  if (!prompt) return 0;
  const words = prompt.trim().split(/\s+/).filter(Boolean).length;
  if (words === 0) return 0;

  // Let's analyze features:
  // 1. Structure: count of hashes (#), lists (- or *), backticks (`)
  const hashes = (prompt.match(/#/g) || []).length;
  const lists = (prompt.match(/^[-*+]\s/gm) || []).length;
  const codeBlocks = (prompt.match(/```/g) || []).length;
  
  // 2. Keywords density:
  const keywords = ["role", "persona", "context", "constraint", "format", "instruction", "output", "rules", "do not", "always", "ensure", "vzor", "pravidla", "kontext", "role"];
  let keywordCount = 0;
  const lowerPrompt = prompt.toLowerCase();
  keywords.forEach(kw => {
    const regex = new RegExp(`\\b${kw}\\b`, "gi");
    keywordCount += (lowerPrompt.match(regex) || []).length;
  });

  // 3. Variable placeholders: e.g. {{variable}} or [variable]
  const placeholders = (prompt.match(/\{\{.*?\}\}|\[.*?\]/g) || []).length;

  // Base score calculation
  let score = 20; // baseline if has words
  score += Math.min(words * 0.25, 30); // up to 30% from word volume
  score += Math.min(hashes * 5, 15); // up to 15% from headers
  score += Math.min(lists * 3, 15); // up to 15% from list structure
  score += Math.min(keywordCount * 4, 20); // up to 20% from prompt engineering terminology
  score += Math.min(placeholders * 5, 10); // up to 10% from variables
  score += codeBlocks > 0 ? 10 : 0; // extra for code output specifications
  
  return Math.round(Math.min(Math.max(score, 10), 100));
}

export interface CommaSuggestions {
  relevant: string;
  inspiring: string;
  unusual: string;
}

export function getCommaPredictions(prompt: string): CommaSuggestions {
  if (!prompt) {
    return {
      relevant: "přidej přesný kontext a omez konverzační vatu",
      inspiring: "zformuluj zadání jako expert s 15 lety praxe v oboru",
      unusual: "přidej požadavek na vysvětlení principů formou vtipné analogie"
    };
  }

  const lower = prompt.toLowerCase();
  
  // Detect language: Czech vs English
  const isCzech = /[áčďéěíňóřšťúůýž]/i.test(prompt) || 
                  /\b(vytvor|napis|je|pro|na|jak|co|krok|tabulka|kod|navrh|analyz|pravidla)\b/i.test(lower);

  // Detect domains
  const isTech = /\b(kod|code|app|web|html|css|react|typescript|js|swiftui|python|api|databaz|sql|funkc|program|server)\b/i.test(lower);
  const isWriting = /\b(napis|write|clanek|article|blog|copy|email|text|marketing|prodej|pribeh|titulek|zprav|obsah|post|scenar|sequence)\b/i.test(lower);
  const isDesign = /\b(design|ui|ux|vzhled|barv|styl|ilustr|tvorb|graphics|layout|visual|preset|tlač|font|typograf)\b/i.test(lower);
  const isAnalysis = /\b(analyz|strateg|data|vypoc|report|audit|finan|business|trh|konkur|metrics|risk|finance|scenar)\b/i.test(lower);

  if (isCzech) {
    if (isTech) {
      return {
        relevant: "zaměř se na maximální čitelnost, čistou strukturu kódu a přidej podrobné komentáře k nejsložitějším částem.",
        inspiring: "implementuj moderní asynchronní vzory s ošetřením všech chybových stavů a logováním chyb.",
        unusual: "přidej instrukci, aby kód fungoval zcela offline a byl optimalizovaný pro extrémně nízkou paměťovou náročnost."
      };
    }
    if (isWriting) {
      return {
        relevant: "rozděl celý text do přehledných, krátkých odstavců s chytlavými podnadpisy pro snadnou čitelnost.",
        inspiring: "použij uznávanou prodejní metodu AIDA a vytvoř silný emocionální apel zaměřený na hlavní přínosy.",
        unusual: "koncipuj celý text jako strhující dialog se zvídavým cestovatelem v čase, který se právě ocitl v dnešní době."
      };
    }
    if (isDesign) {
      return {
        relevant: "definuj barevnou paletu pomocí HEX kódů, udržuj perfektní kontrast, vzdušnost a ostré kontury.",
        inspiring: "zakomponuj do celého konceptu nadčasové principy skandinávského minimalismu a geometrické čistoty.",
        unusual: "navrhni to s ohledem na unaveného uživatele pracujícího v noci, s využitím šetrných pastelových tónů."
      };
    }
    if (isAnalysis) {
      return {
        relevant: "výsledky uspořádej do přehledné srovnávací tabulky a jasně zvýrazni klíčové metriky a rizika.",
        inspiring: "přidej prediktivní model pro příští 3 roky se zohledněním konzervativního, realistického i optimistického scénáře.",
        unusual: "odhal skryté hrozby typu černá labuť (nepředvídatelné události), které by mohly tuto strategii ohrozit."
      };
    }
    // General Czech
    return {
      relevant: "definuj jasnou roli pro AI, omez nepodstatný úvodní text a přesně popiš požadovanou strukturu výstupu.",
      inspiring: "postupuj krok za krokem (Chain-of-Thought) a u každého kroku uveď stručné logické zdůvodnění.",
      unusual: "na samotný konec výstupu doplň 3 kritické otázky, které by mohl oponent položit k zpochybnění tvých závěrů."
    };
  } else {
    // English responses
    if (isTech) {
      return {
        relevant: "ensure clean code styling, robust type-safety boundaries, and add documentation comments to all major functions.",
        inspiring: "leverage advanced performance-optimization patterns including memoization, lazy evaluation, and smart caching.",
        unusual: "write the final code and comments as if you are a witty 1980s mainframe system operator drinking way too much coffee."
      };
    }
    if (isWriting) {
      return {
        relevant: "structure the layout with clear skimmable bullet points, active verbs, and action-oriented section headers.",
        inspiring: "apply the StoryBrand narrative framework to position the user as the hero and the product as the guide.",
        unusual: "integrate a subtle, elegant rhyme scheme into the value proposition statement to make it instantly memorable."
      };
    }
    if (isDesign) {
      return {
        relevant: "specify a high-contrast dark aesthetic with exact pixel-perfect padding, borders, and custom Tailwind configs.",
        inspiring: "incorporate sleek Bauhaus design concepts, emphasizing raw functional aesthetic and clean typography.",
        unusual: "style the entire user experience to emulate a nostalgic green-phosphor CRT terminal interface with retro glitches."
      };
    }
    if (isAnalysis) {
      return {
        relevant: "format the final analysis into a structured executive matrix with a clear traffic-light status system.",
        inspiring: "apply game theory strategic principles to forecast potential competitor moves and suggest proactive defenses.",
        unusual: "simulate an absolute worst-case systemic collapse scenario and outline an emergency operational survival protocol."
      };
    }
    // General English
    return {
      relevant: "specify exact expert persona roles, eliminate conversational greeting filler, and define strict output schemas.",
      inspiring: "explain your logical chain of reasoning step-by-step so the user can easily verify your technical path.",
      unusual: "act as your own devil's advocate to challenge the assumptions and provide a balanced counter-perspective."
    };
  }
}

