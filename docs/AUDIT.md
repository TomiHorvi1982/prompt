# Audit funkčnosti a logiky — Prompt Architect

**Datum:** 2026-08-22
**Rozsah:** `server.ts`, `src/App.tsx`, `src/lib/localModel.ts`, `src/components/*`, konfigurace buildu
**Metoda:** statická analýza + spuštění buildu, typecheck a runtime reprodukce vybraných chyb

## Souhrn

Build i typecheck procházejí bez chyb (`vite build` OK, `tsc --noEmit` 0 chyb). Aplikace je ale
typově zabezpečená jen zdánlivě — `tsconfig.json` nemá `strict`, takže většina reálných defektů
projde kompilací. Byly nalezeny **2 kritické** chyby (pád serveru vyvolatelný jedním requestem,
zcela nefunkční analýza klíčových slov), **6 vysoce závažných** logických chyb a řada středních.

Nejzávažnější systémový problém není jednotlivý bug, ale **návrhový vzor „vše spadne do offline
fallbacku a uživateli se to nikdy neřekne"**. Server u všech pěti endpointů odchytí libovolnou
chybu a vrátí HTTP 200 s předpřipraveným lokálním textem. Frontend příznak `isOfflineFallback`
nikdy nezobrazí. Uživatel tedy nemá jak poznat, že „AI výstup" je konzervovaná šablona.

| Závažnost | Počet |
|---|---|
| Kritická | 2 |
| Vysoká | 6 |
| Střední | 10 (+1 stažený) |
| Nízká / úklid | 9 |

> **Revize po ověření s platným API klíčem.** H2 má potvrzený dopad, ale jinou příčinu, než
> nález původně tvrdil. M3 byl chybný a je stažen. Detaily u jednotlivých nálezů.

---

## KRITICKÉ

### C1 — Jeden malformovaný POST shodí celý server (DoS)

**Soubor:** `server.ts:262-271`, `src/lib/localModel.ts:185`

Vnější `catch` bloku `/api/synthesize-prompt` volá znovu `localSynthesizePrompt()`. Pokud data
z těla requestu způsobila výjimku už uvnitř, spadne i tento fallback. Výjimka v `catch` bloku
async handleru není v Expressu 4 nikde zachycena → unhandled rejection → Node 22 ukončí proces.

`localSynthesizePrompt` volá `a.answer.trim()` bez kontroly, že pole `answer` existuje:

```ts
// localModel.ts:185
.filter(a => a.answer.trim() !== "")
```

**Reprodukce (ověřeno):**

```bash
curl -X POST localhost:3000/api/synthesize-prompt \
  -H 'Content-Type: application/json' \
  -d '{"originalPrompt":"x","answers":[{"question":"q"}]}'
```

Výsledek: `TypeError: Cannot read properties of undefined (reading 'trim')`, proces skončí,
všechny následné requesty vrací connection refused. Stejný efekt má `answers` jako string
(`.filter` není funkce) nebo `selectedCatalogPrompts: [null]` (čtení `c.title`).

**Oprava:**
1. Validovat a normalizovat vstup na hranici endpointu (`Array.isArray`, coerce na string).
2. Obranné čtení v `localModel.ts`: `(a?.answer ?? "").trim()`, `c?.title ?? ""`.
3. Obalit handlery async wrapperem + přidat globální `app.use((err, req, res, next) => ...)`,
   `process.on("unhandledRejection", ...)`.

### C2 — Analýza hustoty klíčových slov produkuje nesmysly

**Soubor:** `src/components/DeepAnalysisView.tsx:156`

Do znakové třídy regulárního výrazu se omylem dostal literální text `Czech? Czechoslovakia`:

```ts
.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()Czech? Czechoslovakia]/g, " ")
```

Znaková třída tím maže i písmena **C, z, e, c, h, o, s, l, v, a, k, i** a mezeru z každého slova.

**Reprodukce (ověřeno):** vstup
`"vytvoř moderní landing page design pro SaaS produkt s tmavým vzhledem"` dá tokeny

```
["", "yt", "ř", "m", "d", "rní", "nd", "ng", "p", "g", "d", "gn", "pr", "pr", "du", "t", "tm", "ým", "d", "m"]
```

místo očekávaných `["vytvoř","moderní","landing","page","design",...]`.

Panel „Hustota klíčových slov" i větev `Klíčová slova` v D3 treemapu tedy zobrazují fragmenty.
Chyba je maskovaná tím, že po filtru `length > 2` zbude pár útržků, které vypadají jako data.

**Oprava:** odstranit omylem vložený text ze znakové třídy:

```ts
.replace(/[.,\/#!$%^&*;:{}=\-_`~()?]/g, " ")
```

---

## VYSOKÁ ZÁVAŽNOST

### H1 — Offline fallback se tváří jako živý AI výstup

**Soubor:** `server.ts:133-142, 197-206, 252-271, 311-320, 377-386`; `src/App.tsx` (celý)

Každý endpoint má dvouúrovňový `try/catch`, který **jakoukoli** chybu (chybějící `GEMINI_API_KEY`,
400 z API, neplatný JSON, síťový výpadek) zaloguje jako *„Gemini API quota reached"* a vrátí 200
s lokální šablonou. Ověřeno v logu: bez API klíče server hlásí vyčerpanou kvótu, ačkoli jde
o chybu konfigurace.

Server sice posílá `isOfflineFallback: true`, ale `grep` potvrzuje, že se v `src/` používá
**pouze jako deklarace typu** (`types.ts:63`) — žádná komponenta ho nečte.

Důsledky:
* Uživatel dostane `score: 92` a „AI Critic analyzoval váš prompt" i když žádná AI neběžela.
* Pilíř 2 zobrazuje hlášku „Web search grounded catalog active", zatímco jde o lokální šablony
  s vymyšlenými zdroji (`"PromptHero (Local)"`, `"Awesome Prompts GitHub (Local)"`).
* Provozní chyby jsou neviditelné — server nikdy nevrátí 5xx, monitoring nic nezachytí.

**Potvrzeno end-to-end s platným API klíčem.** Nejde o teoretický scénář — s klíčem, na kterém
běžná volání fungují, se to chová takto:

```
/api/generate-questions   isOfflineFallback: False   Q1: "Who is the ideal target audience
                                                          or buyer persona for this SaaS product?"
/api/search-catalog       isOfflineFallback: True    citations: 0
                          zdroje: "PromptHero (Local)", "Awesome Prompts GitHub (Local)", ...
```

Jeden endpoint vrací skutečnou odpověď modelu, druhý konzervovaná data s vymyšlenými zdroji —
a UI mezi nimi nedělá žádný rozdíl. Uživatel se o tom nemá jak dozvědět.

**Oprava:** rozlišit typy chyb (chybí klíč → 503 + jasná hláška; kvóta → fallback), příznak
`isOfflineFallback` promítnout do UI jako viditelný odznak u každého vygenerovaného výstupu.

### H2 — Web-grounded katalog nikdy nevrací webová data (ověřeno, ale jiná příčina)

**Soubor:** `server.ts:166-186`
**Status:** dopad potvrzen živým voláním; **původní hypotéza se nepotvrdila**

`/api/search-catalog` posílá zároveň `tools: [{ googleSearch: {} }]` **a**
`responseMimeType: "application/json"` + `responseSchema`. Původní znění tohoto nálezu tvrdilo,
že se tyto dvě věci v Gemini API vzájemně vylučují a request končí chybou 400. **To se
nepotvrdilo.**

Měření s platným klíčem (`gemini-3.6-flash`):

| Varianta | Výsledek |
|---|---|
| A: `googleSearch` + `responseMimeType` + `responseSchema` (co posílá server) | 429 `RESOURCE_EXHAUSTED` |
| B: `googleSearch` samotný | 429 `RESOURCE_EXHAUSTED` |
| C: `responseMimeType` + `responseSchema` samotné | 200, validní JSON pole |

Protože 429 vrací i varianta B, kde žádné structured output není, **chyba visí na nástroji
`googleSearch`, ne na kombinaci se schématem**. Grounding má vlastní kvótu, která je na testovaném
klíči vyčerpaná, zatímco běžné `generateContent` na témže klíči funguje bez problémů.

Zda je kombinace `googleSearch` + `responseSchema` *navíc* neplatná, se z tohoto měření zjistit
nedá — search je kvótou zablokovaný v obou variantách, takže se k případné validační chybě
request nedostane. K rozhodnutí je potřeba klíč s dostupnou grounding kvótou.

**Praktický dopad je ale potvrzený**, a je stejný, jak nález popisoval: endpoint vždy spadne do
lokálního fallbacku. Ověřeno end-to-end proti běžícímu serveru s platným klíčem:

```
/api/generate-questions   isOfflineFallback: False   (skutečná odpověď modelu)
/api/search-catalog       isOfflineFallback: True    citations: 0
                          zdroje: "PromptHero (Local)", "Awesome Prompts GitHub (Local)", ...
```

**Oprava:** nejdřív ověřit grounding kvótu na cílovém klíči. Pokud je dostupná a kombinace se
schématem selže, rozdělit na dvě volání (1. grounded search → text, 2. strukturování textu do
JSON bez nástroje). Nezávisle na tom je potřeba H1 — bez něj se tato chyba nikdy neprojeví.

### H3 — Smazání poslední uložené relace se neuloží

**Soubor:** `src/App.tsx:547-551`

```ts
useEffect(() => {
  if (savedSessions.length > 0) {
    localStorage.setItem("prompt_architect_sessions", JSON.stringify(savedSessions));
  }
}, [savedSessions]);
```

Když uživatel smaže poslední položku, pole je prázdné, zápis se přeskočí a v localStorage zůstane
stará hodnota. Po reloadu se smazané prompty vrátí. Podmínka `> 0` je zde zbytečná.

### H4 — Poškozený localStorage shodí celou aplikaci

**Soubor:** `src/App.tsx:521-526`

`JSON.parse(stored)` bez `try/catch` při mountu. Jakýkoli nevalidní obsah klíče
`prompt_architect_sessions` (jiná verze schématu, ruční zásah, kolize s jinou appkou na stejné
doméně) vyhodí výjimku během renderu → bílá obrazovka bez možnosti obnovy z UI.

Navíc se při prvním spuštění do úložiště zapíšou **fiktivní ukázkové relace** vydávané za
uživatelská data („Yesterday, 4:20 PM").

### H5 — Diktování ztrácí vše kromě poslední věty

**Soubor:** `src/App.tsx:266-281`

```ts
let baseText = originalPrompt;          // zachyceno jednou, při startu
recognition.onresult = (event) => {
  let transcript = "";
  for (let i = event.resultIndex; i < event.results.length; i++) { ... }
  setOriginalPrompt(baseText + spacing + transcript);   // vždy od baseText
};
```

Při `continuous = true` chodí `onresult` opakovaně a smyčka začíná na `event.resultIndex`, tedy
obsahuje jen nejnovější segment. Protože se ale výsledek vždy skládá s neměnným `baseText`,
každý nový segment **přepíše** ty předchozí. Uživatel nadiktuje odstavec a v poli zůstane
poslední fráze. Zároveň se zahodí cokoli, co uživatel mezitím napsal na klávesnici.

`recognitionRef` se navíc neuklízí při unmountu — rozpoznávání běží dál.

**Oprava:** akumulovat finální segmenty (`event.results[i].isFinal`) do refu a průběžné
(interim) zobrazovat odděleně; v `useEffect` cleanupu volat `recognition.stop()`.

### H6 — Predikce v režimu otazníku se vkládají na špatné místo

**Soubor:** `src/App.tsx:340-346, 380-405`

V „question mode" (prompt obsahuje `?`) je `ghostPrefixText` text **před** otazníkem, ale:

* `handleApplyNextWordPrediction` (řádek 401) skládá `originalPrompt + nextWordChunk`, tedy
  připojí slovo až za otazník a případný zbytek textu — nekonzistentní s
  `handleApplyActivePrediction`, který používá `fullTextPreview` (otazník odstraní).
* Ghost overlay (řádek ~1290) vykreslí průhledně `ghostPrefixText`, zatímco textarea pod ním
  obsahuje `prefix + "?" + zbytek`. Nápověda se proto vizuálně nekryje se skutečným textem —
  posun je přesně o délku otazníku a koncového textu.

---

## STŘEDNÍ ZÁVAŽNOST

### M1 — `PORT` je natvrdo 3000
`server.ts:17`. Cloud Run (a většina PaaS) injektuje `process.env.PORT`; kontejner s pevným
portem se nespustí. Použít `Number(process.env.PORT) || 3000`.

### M2 — Mutace sdíleného konfiguračního objektu ve fallbacku
`server.ts:49-52`. `const reqConfig = { ...config }` je mělká kopie, takže
`delete reqConfig.config.tools` maže `tools` v **původním** objektu volajícího. Odstranění
nástroje tedy trvale přetrvá i pro další modely v seznamu kandidátů, i když to nebylo záměrem.

### M3 — ~~Dva ze tří kandidátních modelů jsou neexistující ID~~ (neplatí)

**Status:** **nález stažen — byl chybný.**

Původní znění tvrdilo, že `gemini-3.6-flash` a `gemini-3.1-flash-lite` v `server.ts:37-41` jsou
neexistující ID a každý request kvůli nim platí dva zbytečné round-tripy. Ověření proti
`GET /v1beta/models` ukázalo, že **všechna tři ID existují** a vrací HTTP 200:

```
gemini-3.6-flash       -> HTTP 200
gemini-3.1-flash-lite  -> HTTP 200
gemini-flash-latest    -> HTTP 200
```

Seznam kandidátů je v pořádku a žádnou opravu nevyžaduje. Nález vznikl tím, že se ID
posuzovala podle znalosti modelové řady místo dotazu na API.

### M4 — Prompt injection do systémových instrukcí
`server.ts:100-108, 155-164, 216-232, 281-291, 330-345`. Uživatelský text se interpoluje přímo
do `systemInstruction` (`"${prompt}"`, `${JSON.stringify(answers)}`). Uživatel může vypnout nebo
přepsat pravidla. Ironické vzhledem k tomu, že aplikace sama nabízí „Analýzu rizik prompt
injection". Vstup patří do `contents` jako uživatelská zpráva, ne do systémové instrukce.

### M5 — Chybí rate limiting a validace velikosti
`express.json({ limit: "10mb" })` bez jakéhokoli omezení počtu requestů. Každý request stojí
peníze za Gemini API.

### M6 — `showToast` si přepisuje vlastní časovače
`src/App.tsx:555-560`. Každé volání nastaví nový 2,5s `setTimeout` bez zrušení předchozího.
Dva toasty za sebou → starší časovač schová novější zprávu předčasně. Stejný vzor v
`triggerICloudSync` (1250 ms). Držet handle v `useRef` a před nastavením ho čistit.

### M7 — Sériové načítání místo paralelního
`src/App.tsx:645-679`. `/api/generate-questions` se `await`uje celý, teprve pak startuje
`/api/search-catalog`. Zdvojnásobuje čas do prvního výsledku bez důvodu — použít `Promise.all`.

### M8 — Pilíř 2 nemá loading stav
`loadingCatalog` se nastavuje (řádky 611, 674, 677), ale v JSX se **nikdy nečte** (ověřeno
grepem). Sekce se renderuje jen při `catalog.length > 0`, takže během načítání uživatel vidí
prázdno bez indikace, že se něco děje.

### M9 — Reset nevyčistí stav
`src/App.tsx:2298-2306` („Reset Optimization Loop") nechává nedotčené `criticReview`,
`citations`, `manualEdits`, `optimizationHistory`, `referenceAesthetics`, `activeSessionId`.
Stejně tak `handleStartPrompt` nevynuluje `criticReview` a `citations` z předchozího běhu —
staré citace se zobrazí u nového katalogu.

### M10 — Sémantické kategorie nesečtou 100 %
`DeepAnalysisView.tsx:141-143`:

```ts
value: Math.max(5, Math.round((cat.weight / totalScore) * 100))
})).filter(c => c.value > 5);
```

`Math.max(5, …)` zvedne malé podíly na 5, načež je `filter(> 5)` zase odstraní — obě operace se
navzájem ruší a jsou zbytečné. Zbylé hodnoty se prezentují jako procenta, ale jejich součet
100 % nedává. Navíc je porovnání shodou okolností na hraně: kategorie s reálným podílem 5 %
zmizí úplně.

Související: shoda klíčových slov je podřetězcová (`new RegExp(kw, 'gi')`), takže `"text"` se
napočítá i uvnitř `"kontext"` a `"data"` uvnitř `"database"` — kategorie jsou nadhodnocené.

### M11 — Detekce prompt injection je kosmetická
`DeepAnalysisView.tsx:175-212`. Osm anglických frází porovnávaných přes `includes()`.
Skóre 45/20 bodů. Zároveň:
* **false positives:** `"override"` a `"bypass"` označí za riziko běžné technické zadání
  („bypass the cache", „override the CSS").
* **false negatives:** česky psaný útok, parafráze nebo jiné rozdělení slov projde.

Panel se přesto prezentuje jako „D3 SecureEngine v1.1 • Skóre: X/100". To je nadslib —
buď zeslabit formulace na „heuristická kontrola", nebo detekci reálně implementovat.

---

## NÍZKÁ ZÁVAŽNOST / ÚKLID

### L1 — Nadpis treemapu se nikdy neobarví červeně
`DeepAnalysisView.tsx:370`: `p.name === "Bezpečnost"` — `d3.HierarchyNode` nemá vlastnost `name`,
data jsou v `p.data.name`. Ověřeno runtime: `p.name === undefined`. Podmínka je vždy `false`,
takže hlavička „BEZPEČNOST" zůstane šedá i při detekovaném riziku. Správně `p.data.name`.
TypeScript to nezachytil kvůli volnému typování v `d3` re-exportu.

### L2 — Mrtvý kód ve stavu `App.tsx`
Deklarováno a nikdy nepoužito: `inspectStepIndex`/`setInspectStepIndex` (115),
`compareStepIndex`/`setCompareStepIndex` (116) — duplikují stav uvnitř
`OptimizationHistoryChart`; `lastToast`/`setLastToast` (554); funkce `applyPrediction` (563).
Nepoužité importy: celý řádek 52 z `recharts` (`ResponsiveContainer`, `AreaChart`, `Area`,
`XAxis`, `YAxis`, `Tooltip`, `CartesianGrid`) plus řada ikon z `lucide-react`.

### L3 — Mrtvá logika v `localGenerateQuestions`
`localModel.ts:27-36`: `categoryTheme` se vypočítá ve čtyřech větvích a **nikdy se nepoužije**.
Vrácených 12 otázek je až na první statických — „lokální model" tedy na téma promptu nereaguje.

### L4 — Lokální kritik vrací vždy totéž
`localModel.ts:241-283`: fixní `score: 92`, tři pevné slabiny, konstantní shrnutí — nezávisle na
vstupu. V UI se zobrazuje jako výsledek analýzy včetně číselného skóre. Minimálně přidat
odvození skóre z `calculateComplexity()` a označit výstup jako heuristický.

### L5 — Nekonzistentní `isPredictionModelDownloaded`
`App.tsx:313` inicializováno na `true`, přestože UI nabízí tlačítko „Install Free (2.4MB)"
a simulaci stahování. Model je „nainstalovaný" ještě před instalací.

### L6 — Duplicitní stav výběru kroku v grafu
`OptimizationHistoryChart.tsx:31-33`: `selectedStepIndex` se po přidání nového kroku neresetuje,
takže detailní panel zůstane přišpendlený na starém kroku. Zároveň když se `compareStepIndex`
rovná `activeInspectIdx`, je odpovídající `<option>` odfiltrovaná (řádek 229) — select vypadá
prázdný, ale porovnání se dál renderuje (krok sám se sebou).

### L7 — Přístupnost
Klikací `<div>` bez `role`/`tabIndex`/klávesové obsluhy: karty katalogu (`App.tsx:1873`),
řádky uložených relací (2350), presety (2534), položky Model Hubu. Checkbox v katalogu má
`onChange={() => {}}` a stav se mění klikem na rodiče — klávesnicí neovladatelné.

### L8 — Konfigurace a metadata
* `tsconfig.json` bez `"strict": true` — většina výše uvedených defektů by se odhalila staticky.
* `index.html` má titulek `"My Google AI Studio App"`, ne „Prompt Architect"; `lang="en"`
  u převážně české aplikace; chybí meta description.
* `lint` skript je jen `tsc --noEmit` — žádný ESLint, žádné testy, žádná CI.
* `package.json` `"name": "react-example"`.
* Historie obsahuje přidání PostHog (`ec2fa67`) i `package-lock.json`, které byly později
  odstraněny; repo dnes používá `bun.lock`.

### L9 — Velikost bundlu
Jeden chunk 874 kB (263 kB gzip) — `d3` + `recharts` + `motion` se načítají eagerně, přestože
`DeepAnalysisView` (d3) i `OptimizationHistoryChart` (recharts) jsou skryté za přepínačem.
Kandidáti na `React.lazy` + dynamický import.

---

## Doporučené pořadí prací

1. **C1** — validace vstupu + globální error handler (jednořádkový DoS je nepřijatelný).
2. **C2** — oprava regexu (jednoznaková oprava, vrací celý panel k životu).
3. **H2** — ověřit `googleSearch` + `responseSchema` s reálným klíčem; podle výsledku předělat.
4. **H1** — rozlišit chyby od kvóty, zobrazit `isOfflineFallback` v UI.
5. **H3, H4** — perzistence localStorage (rychlé, uživatelsky viditelné).
6. **M1** — `process.env.PORT` před nasazením.
7. **H5, H6** — diktování a predikce.
8. Zapnout `strict` v `tsconfig`, přidat ESLint a smoke testy endpointů; teprve pak zbytek.
