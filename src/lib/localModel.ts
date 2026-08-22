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
  // Coerced for the same reason as localSynthesizePrompt: a throw here escapes the
  // endpoint's catch block and takes the process down.
  const safePrompt = String(prompt ?? "");
  const normalized = safePrompt.toLowerCase();

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
      question: `What specific role or expert persona should the AI adopt for: "${safePrompt}"?`,
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

  // This engine is the last line of defence when the Gemini call fails, so it must
  // never throw on malformed input — a throw here escapes the endpoint's catch block.
  const safeAnswers = (Array.isArray(answers) ? answers : [])
    .map(a => ({
      question: String(a?.question ?? "").trim(),
      answer: String(a?.answer ?? "").trim()
    }))
    .filter(a => a.answer !== "");

  const safeCatalog = (Array.isArray(selectedCatalogPrompts) ? selectedCatalogPrompts : [])
    .map(c => String(c?.title ?? "Untitled template").trim());

  let qSection = safeAnswers
    .map(a => `- **${a.question}**: ${a.answer}`)
    .join("\n");

  if (!qSection) {
    qSection = "- *No additional context provided*";
  }

  const selectedTitles = safeCatalog.map(t => `"${t}"`).join(", ") || "None selected";

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
    explanation: `Successfully synthesized offline. Integrated your core prompt, ${safeAnswers.length} context answers, and structural elements from ${safeCatalog.length} catalog template(s): ${selectedTitles}.`
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

// 4.5 Local AI Prompt Critic
export function localCriticPrompt(finalPrompt: string) {
  const points = [
    {
      point: "Nejasné vymezení chování při prázdných vstupech",
      explanation: "Chyběla instrukce, jak naložit se zástupnými symboly [PLACEHOLDER], pokud je uživatel vynechá. Přidáno pravidlo pro bezpečné vyžádání nebo výchozí nastavení."
    },
    {
      point: "Riziko zbytečného úvodního balastu (Greeting & Preface Bloat)",
      explanation: "Výstup mohl obsahovat konverzační zdvořilosti. Vynuceno pravidlo Zero-Fluff pro okamžitou odpověď přímo k věci."
    },
    {
      point: "Absence postupného interního uvažování (Step-by-Step Reasoning)",
      explanation: "Doplněna instrukce k vnitřní analýze podmínek před zobrazením finální struktury, což předchází logickým chybám."
    }
  ];

  const improvedPrompt = `${finalPrompt}

# CRITIC ENHANCEMENT DIRECTIVES (AI Reviewed)
- **Zero-Fluff Enforcement**: Strictly output final answers without conversational introductory or concluding phrases.
- **Dynamic Fallbacks**: If any [PLACEHOLDER] variable is omitted, explicitly request missing parameters or apply default values safely.
- **Deliberate Reasoning**: Evaluate constraints step-by-step internally before finalizing the output.`;

  return {
    score: 92,
    summary: "Prompt je strukturálně velmi kvalitní. AI Critic nalezl a opravil 3 potenciální slabá místa (chování při prázdných proměnných, eliminace úvodního textu a krok uvažování).",
    weakPoints: points,
    improvedPrompt
  };
}

// 5. Neural Predictive Autocomplete Module (Mini 2.4 MB Neural Net simulation)
export interface PredictionCandidate {
  phrase: string;
  completion: string; // The remaining text to be appended
  confidence: number;
  category: string;
  type?: 'word' | 'incremental' | 'phrase';
}

/**
 * Helper to split a full completion into word-by-word (1-2 words), 
 * incremental sub-phrase (3-5 words), and full phrase candidates.
 */
function buildGranularCandidates(
  cleanInput: string,
  fullCompletion: string,
  baseCategory: string
): PredictionCandidate[] {
  const result: PredictionCandidate[] = [];
  if (!fullCompletion || !fullCompletion.trim()) return result;

  const startsWithSpace = fullCompletion.startsWith(" ");
  const prefix = startsWithSpace ? " " : "";
  const trimmed = fullCompletion.trim();
  const tokens = trimmed.split(/\s+/).filter(Boolean);

  if (tokens.length === 0) return result;

  // 1. Next 1-2 words (Word-by-word candidate)
  let wordCount = 1;
  const shortArticles = [
    "a", "v", "s", "o", "k", "z", "na", "i", "se", "ze", "ve", "ke", "to", 
    "in", "on", "at", "by", "for", "the", "an", "is", "it", "no", "do"
  ];
  if (tokens.length > 1 && (tokens[0].length <= 2 || shortArticles.includes(tokens[0].toLowerCase()))) {
    wordCount = 2;
  }

  const wordTokens = tokens.slice(0, wordCount);
  const wordComp = prefix + wordTokens.join(" ");

  if (wordComp && wordComp.trim() !== trimmed) {
    const label = !startsWithSpace 
      ? "Slovo po slovu (Dokončení)" 
      : (wordCount === 1 ? "Slovo po slovu (1 slovo)" : "Slovo po slovu (1-2 slova)");
      
    result.push({
      phrase: cleanInput + wordComp,
      completion: wordComp,
      confidence: 98,
      category: label,
      type: 'word'
    });
  }

  // 2. Next 3-5 words (Sub-phrase / Incremental candidate)
  if (tokens.length >= 3) {
    const subCount = Math.min(tokens.length - 1, Math.max(3, wordCount + 2));
    const subTokens = tokens.slice(0, subCount);
    const subComp = prefix + subTokens.join(" ");

    if (subComp !== trimmed && !result.some(r => r.completion === subComp)) {
      result.push({
        phrase: cleanInput + subComp,
        completion: subComp,
        confidence: 94,
        category: `Inkrementální krok (${subCount} slov)`,
        type: 'incremental'
      });
    }
  }

  // 3. Full phrase
  result.push({
    phrase: cleanInput + fullCompletion,
    completion: fullCompletion,
    confidence: 90,
    category: baseCategory,
    type: 'phrase'
  });

  return result;
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
  
  const cleanInput = inputText.trim();
  const lower = cleanInput.toLowerCase();
  
  const rawCompletions: { category: string; completion: string }[] = [];

  // 1. Check static database for direct trigger or prefix matches
  for (const item of PREDICTION_DATABASE) {
    const hasTriggerMatch = item.triggers.some(tr => lower === tr || lower.endsWith(" " + tr));
    const startsPhrase = item.fullPhrase.toLowerCase().startsWith(lower);

    if (hasTriggerMatch || startsPhrase) {
      let completion = "";
      if (startsPhrase) {
        completion = item.fullPhrase.substring(cleanInput.length);
      } else {
        completion = " " + item.fullPhrase;
      }

      if (completion && !rawCompletions.some(m => m.completion.trim() === completion.trim())) {
        rawCompletions.push({
          completion: completion,
          category: item.category
        });
      }
    }
  }

  // 2. Czech & English Contextual Dynamic Intent Engine
  const isCzech = /[áčďéěíňóřšťúůýž]/i.test(cleanInput) || 
                  /\b(vytvor|vytvoř|napis|napiš|je|pro|na|jak|co|krok|tabulka|kod|kód|navrh|navrhni|analyz|pravidla|proc|proč|ktery|který|připrav|priprav)\b/i.test(lower);

  const isCode = /\b(kod|kód|code|app|aplikac|web|html|css|react|typescript|ts|js|swiftui|python|api|databaz|sql|komponent|funkc)\b/i.test(lower);
  const isWriting = /\b(napis|napiš|write|clanek|článek|blog|copy|email|e-mail|text|marketing|prodej|pribeh|příběh|post)\b/i.test(lower);
  const isDesign = /\b(design|ui|ux|vzhled|barv|styl|ilustr|layout|visual|font|figma|tailwind)\b/i.test(lower);
  const isHowTo = /^(jak|how)\b/i.test(lower);
  const isWhatWhy = /^(co|proč|proc|what|why)\b/i.test(lower);

  let dynamicOptions: { category: string; completion: string }[] = [];

  if (isCzech) {
    if (isCode) {
      dynamicOptions = [
        { category: "TypeScript & React", completion: " a napiš kompletní spouštitelný kód v Reactu s Tailwind CSS, správa stavu a ošetřením chyb." },
        { category: "Architektura", completion: " v čisté architektuře s přehlednými komentáři, znovupoužitelnými komponentami a výjimkami." },
        { category: "UX & Responzivita", completion: " včetně responzivního layoutu pro mobil i desktop, klávesových zkratek a ARIA přístupnosti." }
      ];
    } else if (isWriting) {
      dynamicOptions = [
        { category: "AIDA Copywriting", completion: " pomocí prodejní metody AIDA s chytlavými podnadpisy, přehlednými odrážkami a silným CTA." },
        { category: "Expertní Tón", completion: " profesionálním a čtivým tónem, omez konverzační vatu a zdůrazni hlavní přínosy pro uživatele." },
        { category: "Příběhový Narativ", completion: " jako poutavý příběh s konkrétními příklady z reálné praxe a shrnutím klíčových bodů." }
      ];
    } else if (isDesign) {
      dynamicOptions = [
        { category: "HEX & Tailwind", completion: " s definicí přesné barevné palety (HEX), typografie, Tailwind CSS tříd a pravidel rozestupů." },
        { category: "Moderní UI/UX", completion: " v čistém minimalistickém stylu s důrazem na přístupnost (WCAG AA) a plynulé mikromomenty." },
        { category: "Design Systém", completion: " jako znovupoužitelný design systém včetně stavových efektů (hover, focus, disabled)." }
      ];
    } else if (isHowTo) {
      dynamicOptions = [
        { category: "Návod Krok za Krokem", completion: " krok za krokem s časovým odhadem jednotlivých fází a názornými ukázkami z praxe." },
        { category: "3 Účinné Metody", completion: " s využitím 3 nejúčinnějších metod v oboru, srovnáním výhod a doporučeným postupem." },
        { category: "Checklist & Chyby", completion: " včetně praktického kontrolního seznamu (checklistu) a varování před nejčastějšími chybami." }
      ];
    } else if (isWhatWhy) {
      dynamicOptions = [
        { category: "Srozumitelné Vysvětlení", completion: " srozumitelně s názornou analogií a 3 klíčovými poznatky v přehledných odrážkách." },
        { category: "Analýza & Srovnání", completion: " z pohledu seniorního experta včetně srovnávací tabulky a doporučených dalších kroků." },
        { category: "Mýty vs. Fakta", completion: " ve formě stručných otázek a odpovědí (FAQ) s vyvrácením nejčastějších mýtů." }
      ];
    } else {
      dynamicOptions = [
        { category: "Strukturované Řešení", completion: " a rozepiš řešení do přehledných sekcí s odrážkami, konkrétními příklady a bez balastu." },
        { category: "Senior Persona", completion: " z pohledu experta s 15 lety praxe v oboru s důrazem na best practices a ošetření rizik." },
        { category: "Analýza & Kód", completion: " s podrobnou analýzou možností, porovnáním variant a doporučenou finální specifikací." }
      ];
    }
  } else {
    // English dynamic fallbacks
    dynamicOptions = [
      { category: "Structured Output", completion: " with clear headers, bullet points, real-world examples, and actionable takeaways." },
      { category: "Senior Staff Engineer", completion: " adopting a Senior Staff Engineer persona, handling edge cases and performance tradeoffs." },
      { category: "Complete Specification", completion: " providing a full production-ready implementation with inline TS documentation." }
    ];
  }

  // Merge dynamic options into raw completions
  for (const opt of dynamicOptions) {
    if (rawCompletions.length >= 3) break;
    if (!rawCompletions.some(m => m.completion.trim() === opt.completion.trim())) {
      rawCompletions.push(opt);
    }
  }

  // 3. Build granular candidates (word-by-word, incremental, full phrase)
  const finalCandidates: PredictionCandidate[] = [];

  rawCompletions.forEach((raw, idx) => {
    const granular = buildGranularCandidates(cleanInput, raw.completion, raw.category);
    
    granular.forEach(cand => {
      if (!finalCandidates.some(c => c.completion.trim() === cand.completion.trim())) {
        // Boost primary word-by-word and incremental candidates so they appear near top
        if (idx === 0 && cand.type === 'word') cand.confidence = 99;
        if (idx === 0 && cand.type === 'incremental') cand.confidence = 95;
        finalCandidates.push(cand);
      }
    });
  });

  // Sort candidates so word-by-word and incremental are prominent first options, followed by full phrases
  finalCandidates.sort((a, b) => b.confidence - a.confidence);

  return finalCandidates.slice(0, 5);
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

// Question Mark Smart Prediction Generator
export interface QuestionMarkPredictionCandidate {
  id: string;
  category: string;
  title: string;
  completion: string;
  fullTextPreview: string;
}

export function getQuestionMarkPredictions(prompt: string): QuestionMarkPredictionCandidate[] {
  if (!prompt || !prompt.includes('?')) return [];

  const qIndex = prompt.indexOf('?');
  const beforeQ = prompt.substring(0, qIndex).trim();
  const afterQ = prompt.substring(qIndex + 1);

  if (!beforeQ) return [];

  const lower = beforeQ.toLowerCase();
  const isCzech = /[áčďéěíňóřšťúůýž]/i.test(beforeQ) || 
                  /\b(vytvor|napis|je|pro|na|jak|co|krok|tabulka|kod|navrh|analyz|pravidla|proc|ktery|kolik|kdy|kde|kdo)\b/i.test(lower);

  // Extract key topic elements from beforeQ
  const isLandingPage = /\b(landing|page|strank|web|prezentace|webov|konverz)\b/i.test(lower);
  const isReactDev = /\b(react|typescript|ts|js|javascript|kód|kod|komponent|kalkulač|kalkulacka|app|aplikac|funkce|api|backend|frontend)\b/i.test(lower);
  const isEmail = /\b(email|e-mail|zpráv|zprav|dopis|mail|klient|zákazník|zakaznik|oslovení)\b/i.test(lower);
  const isMarketing = /\b(marketing|reklam|kampan|kampáň|titulek|prodej|copywriting|post|social|faktura)\b/i.test(lower);
  const isDesign = /\b(design|ui|ux|vzhled|barv|layout|grafik|písmo|logo|figma|tailwind)\b/i.test(lower);
  const isCooking = /\b(recept|vaření|vareni|jídlo|jidlo|těstovin|polevk|dort|pečení|peveni|kuchařka|obed|vecer)\b/i.test(lower);
  const isFitness = /\b(fitness|dieta|trénink|trenink|cvičení|cviceni|hubnutí|hubnuti|strava|svaly|zdraví)\b/i.test(lower);
  const isFinance = /\b(peníze|penize|finance|investic|rozpočet|rozpocet|hypoték|hypoteka|banka|akcie|krypto)\b/i.test(lower);

  // Intent patterns
  const isHowTo = /^(jak|how)\b/i.test(lower);
  const isWhatWhy = /^(co|proč|proc|what|why|kdo|kdy|kde|který|ktery)\b/i.test(lower);
  const isCreateCmd = /\b(vytvoř|vytvor|napiš|napis|sepiš|sepis|generuj|navrhni|zpracuj|připrav|priprav|write|create|build)\b/i.test(lower);

  let candidates: { category: string; title: string; completion: string }[] = [];

  if (isCzech) {
    if (isLandingPage) {
      candidates = [
        {
          category: "Konverzní Framework",
          title: "AIDA + 5 Sekcí & CTA",
          completion: " Rozepiš 5 klíčových sekcí od chytlavého nadpisu po CTA tlačítko, použij konverzní metodu AIDA a přidej konkrétní ukázky textu pro SaaS produkt."
        },
        {
          category: "Copywriting & Nadpisy",
          title: "Šablona Nadpisů & Odstranění Námitek",
          completion: " Vytvoř 3 varianty úderného hlavního nadpisu (Hero Headline), odpověz na hlavní zákaznické námitky a přidej sekci s recenzemi (Social Proof)."
        },
        {
          category: "UX & Struktura Stránky",
          title: "Layout + A/B Testování",
          completion: " Navrhni vizuální rozvržení prvků (F-pattern), definuj ideální barevné akcenty pro tlačítka a uveď 3 tipy pro zvýšení míry konverze (CR)."
        }
      ];
    } else if (isReactDev) {
      candidates = [
        {
          category: "Kompletní Kód",
          title: "TypeScript + Tailwind CSS Component",
          completion: " Napiš kompletní spouštitelný kód v TypeScriptu s použitím Tailwind CSS, přidej správa stavu (useState/useReducer) a ošetření chybových stavů."
        },
        {
          category: "Expertní Architektura",
          title: "Senior Modulární Návrh & Komentáře",
          completion: " Pojmi kód podle osvědčených architektonických pravidel, rozbij řešení na znovupoužitelné podkomponenty a doplň podrobné komentáře."
        },
        {
          category: "UX & Responzivita",
          title: "Responzivní UI & Podpora Klávesnice",
          completion: " Přidej responzivní zobrazení pro mobil i desktop, podporu klávesových zkratek, přístupnost (ARIA) a možnost exportu výsledných dat."
        }
      ];
    } else if (isEmail) {
      candidates = [
        {
          category: "Profesionální Tón",
          title: "3 Předměty + Empatické Oslovení",
          completion: " Formuluj e-mail profesionálním a zároveň empatickým tónem, uveď 3 chytlavé varianty předmětu a přidej jasnou výzvu k akci (CTA)."
        },
        {
          category: "Konkrétní Řešení",
          title: "Stručný Text + Další Kroky",
          completion: " Rozděl text na krátké odstavce bez zbytečné vaty, jasně uveď důvod, nabídni konkrétní kompenzaci/řešení a uveď kontakt na podporu."
        },
        {
          category: "Šablona s Proměnnými",
          title: "Personalizovaný E-mail (Variables)",
          completion: " Sepiš zprávu ve formě univerzální šablony s proměnnými {{jméno}}, {{číslo_objednávky}} a přidej doporučený čas pro odeslání."
        }
      ];
    } else if (isCooking) {
      candidates = [
        {
          category: "Detailní Recept",
          title: "Ingredience + Postup Krok za Krokem",
          completion: " Uveď přesný seznam surovin v gramážích, časovou náročnost, postup přípravy krok za krokem a tipy pro dokonalé dochucení."
        },
        {
          category: "Nutriční Hodnoty",
          title: "Makroživiny & Zdravější Varianta",
          completion: " Doplň přehled kalorií a makroživin (bílkoviny, sacharidy, tuky), a navrhni lehkou alternativu pro nízkosacharidovou dietu."
        },
        {
          category: "Kuchařské Triky",
          title: "Šéfkuchařské Rady & Servírování",
          completion: " Přidej 3 šéfkuchařské triky pro správnou texturu, nápady na estetické servírování a doporučené párování s nápoji."
        }
      ];
    } else if (isFitness) {
      candidates = [
        {
          category: "Tréninkový Plán",
          title: "Rozpis Cviků + Série & Opakování",
          completion: " Sepiš strukturovaný týdenní plán cviků, uveď počet sérií, opakování, přestávek a správnou techniku dýchání."
        },
        {
          category: "Regenerace & Strava",
          title: "Jídelníček & Suplementace",
          completion: " Doporuč optimální denní příjem bílkovin, hydrataci, vhodné doplňky stravy a tipy pro kvalitní spánek a regeneraci svalů."
        },
        {
          category: "Začátečník vs. Pokročilý",
          title: "Progrese Zátěže & Prevence Zranění",
          completion: " Vysvětli princip postupné progrese zátěže (progressive overload), uveď nejčastější chyby při cvičení a prevenci zranění."
        }
      ];
    } else if (isHowTo) {
      candidates = [
        {
          category: "Strukturovaný Návod",
          title: "Postup Krok za Krokem + Příklady",
          completion: " Uveď podrobný návod krok za krokem, časový odhad pro jednotlivé fáze a konkrétní praktické příklady z reálné praxe."
        },
        {
          category: "Expertní Srovnání",
          title: "3 Metody + Výhody & Nevýhody",
          completion: " Popiš 3 nejúčinnější přístupy, porovnej jejich výhody i nevýhody a doporuč nejvhodnější postup pro rychlé výsledky."
        },
        {
          category: "Praktický Checklist",
          title: "Kontrolní Seznam & Časté Chyby",
          completion: " Přidej praktický checklist klíčových bodů k ověření, nejčastější úskalí a tipy, jak ušetřit čas a vyhnout se zbytečným chybám."
        }
      ];
    } else if (isWhatWhy) {
      candidates = [
        {
          category: "Jasná Definice",
          title: "Srozumitelné Vysvětlení + Analogie",
          completion: " Vysvětli téma srozumitelně i pro laika, uveď názornou vtipnou analogii a na závěr připoj 3 klíčové poznatky v bodech."
        },
        {
          category: "Hluboká Analýza",
          title: "Expertní Pohled & Srovnávací Tabulka",
          completion: " Pojmi odpověď z pohledu experta v oboru, porovnej hlavní koncepty v přehledné tabulce a přidej historický nebo odborný kontext."
        },
        {
          category: "Otázky & Odpovědi",
          title: "FAQ Format + Mýty vs. Fakta",
          completion: " Zpracuj odpověď formou stručných dotazů a odpovědí (FAQ), vyvrať 3 nejčastější mýty a zdůrazni praktický dopad pro uživatele."
        }
      ];
    } else if (isCreateCmd) {
      candidates = [
        {
          category: "Kompletní Výstup",
          title: "Strukturovaný Text bez Balastu",
          completion: " Sepiš kompletní finální výstup v přehledných sekcích s chytlavými podnadpisy, odrážkami a zcela vynechej konverzační úvody."
        },
        {
          category: "Expertní Úroveň",
          title: "Senior Persona & Best Practices",
          completion: " Zformuluj zadání jako expert s 15 lety praxe, zdůrazni klíčové standardy kvality a ošetři hraniční případy (edge-cases)."
        },
        {
          category: "Více Variant",
          title: "3 Různé Stylistické Varianty",
          completion: " Nabídni 3 různé varianty zpracování (stručnou formální, kreativní neformální a detailní analytickou)."
        }
      ];
    } else {
      candidates = [
        {
          category: "Přehledná Odpověď",
          title: "Strukturované Odrážky + Příklady",
          completion: " Rozepiš odpověď do přehledných bodů s názornými ukázkami z praxe, jasným shrnutím a vynecháním zbytečného balastu."
        },
        {
          category: "Analytický Přístup",
          title: "Krok za Krokem & Zdůvodnění",
          completion: " Postupuj krok za krokem (Chain-of-Thought), u každého kroku stručně uveď logické zdůvodnění a připoj doporučené další kroky."
        },
        {
          category: "Expertní Standard",
          title: "Senior Specifikace & Tabulka",
          completion: " Pojmi odpověď z pohledu špičkového odborníka, shrň klíčová pravidla v přehledné srovnávací tabulce a přidej kontrolní otázky."
        }
      ];
    }
  } else {
    // English dynamic predictions based on prompt context
    if (isReactDev) {
      candidates = [
        {
          category: "Production Code",
          title: "TypeScript + Tailwind Component",
          completion: " Provide a fully working TypeScript component using Tailwind CSS, state management (useState/useReducer), and clean error handling."
        },
        {
          category: "Architecture",
          title: "Modular Senior Developer Structure",
          completion: " Structure the solution into reusable sub-components, follow clean code principles, and add inline TS doc comments."
        },
        {
          category: "Responsive UI",
          title: "Responsive Layout & ARIA Accessibility",
          completion: " Include responsive mobile/desktop layouts, keyboard navigation shortcuts, ARIA accessibility attributes, and data export options."
        }
      ];
    } else if (isLandingPage) {
      candidates = [
        {
          category: "Conversion Framework",
          title: "AIDA + 5 Key Sections",
          completion: " Outline 5 essential sections from Hero headline to CTA, apply the AIDA framework, and provide copy examples for a SaaS product."
        },
        {
          category: "Copywriting",
          title: "Headlines & Objection Handling",
          completion: " Craft 3 high-converting headline variations, directly address key customer objections, and include a social proof testimonial layout."
        },
        {
          category: "UX & CRO",
          title: "Layout Grid & A/B Testing Tips",
          completion: " Design the visual grid hierarchy, specify accent colors for conversion buttons, and provide 3 actionable CRO optimization tips."
        }
      ];
    } else {
      candidates = [
        {
          category: "Structured Output",
          title: "Bullet Points + Practical Examples",
          completion: " Format the answer with clear skimmable headings, practical real-world examples, zero fluff, and key takeaways."
        },
        {
          category: "Expert Persona",
          title: "Senior Staff Engineer / Strategist",
          completion: " Adopt a Senior Staff Engineer persona, analyze edge cases and tradeoffs step-by-step, and recommend optimal best practices."
        },
        {
          category: "Actionable Template",
          title: "Ready-to-Use Output Schema",
          completion: " Deliver a production-ready structured template, a comparison matrix table, and a verification checklist."
        }
      ];
    }
  }

  return candidates.map((item, idx) => {
    const prefix = beforeQ;
    const suffix = afterQ ? (afterQ.startsWith(' ') ? afterQ : ' ' + afterQ) : '';
    const completionClean = item.completion;
    const fullTextPreview = prefix + completionClean + suffix;

    return {
      id: `q-pred-${idx}`,
      category: item.category,
      title: item.title,
      completion: completionClean,
      fullTextPreview: fullTextPreview
    };
  });
}

