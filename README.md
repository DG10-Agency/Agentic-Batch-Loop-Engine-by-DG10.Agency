# Agentic Batch Loop Engine: Fault-Tolerant Workflow Orchestrator

> **The "Iron Man Suit" for Long-Running Agent Tasks.** State persistence, automatic retries, and clean concurrency for autonomous workflows.

## 🚀 The Problem
AI Agents are brilliant at single tasks but fragile at scale. When you ask an agent to *"Generate 25 SEO pages"* or *"Process 500 CSV rows"*, it often fails due to:
- **Context Window Overflow**: Forgetting the first item by the time it reaches the 10th.
- **Timeouts**: Long-running processes getting killed by the environment.
- **Fragility**: A single API error crashing the entire batch.

## 🛡️ The Solution
**Agentic Loop Engine** is a lightweight, drop-in runtime that gives your agent a **Resilient Memory**. It manages the "boring" parts of batch processing so your agent can focus on the comprehensive logic.

### Key Features
*   🚀 **Performance First**: Zero timeouts, zero memory leaks. Built for 1,000+ items.
*   🧠 **Prompt Library**: [100+ Starter Scenarios](file:///d:/Experiments/.agent/skills/loop-engine/SCENARIOS.md) for Security, SEO, and scaling.
*   🤖 **AI Native**: Works with your Agent's quota. No API keys required.
*   🛡️ **Atomic & Safe**: Workers fail? The engine retries. You stop it? It resumes from the exact same spot.
*   📂 **Smart Scanner**: Intelligently build your batch lists from project files.

---

## 📦 Installation

This is designed to be a **Drop-in Skill** for any AI Agent project.

### Option A: Install as a Git Submodule (Recommended)
Use this if you already have an Agent set up.

```bash
# Run this from your project root
git submodule add https://github.com/DG10-Agency/Agentic-Batch-Loop-Engine-by-DG10.Agency.git .agent/skills/batch-loop-engine

# Then build the skill
cd .agent/skills/batch-loop-engine
npm install
npm run build
```

### Option B: Clone Directly
If you just want the code and don't care about updates.

```bash
mkdir -p .agent/skills
git clone https://github.com/DG10-Agency/Agentic-Batch-Loop-Engine-by-DG10.Agency.git .agent/skills/batch-loop-engine
cd .agent/skills/batch-loop-engine
npm install
npm run build
```

---

## 🧠 Core Concepts

### 1. The Item
The unit of work. Anything that can be serialized to JSON.
```typescript
{ id: "item-1", data: { url: "https://google.com" } }
```

### 2. The Worker
A pure function that takes **one item** and processes it. It should be stateless and idempotent.
```typescript
type WorkerFunction = (item: T, context: WorkerContext) => Promise<any>;
```

### 3. The Engine
The orchestrator that manages the queue, retries, and state file.

---

### 4. Giving it a "Brain" (Integrated AI)
The engine includes a **Zero-Config LLM Client** that automatically uses your environment's AI credentials (Cursor, Antigravity, or standard Env Vars).

```typescript
import { LLMClient } from './core/llm';
const ai = new LLMClient(); // Automatically connects to the environment

export const myWorker = async (item, ctx) => {
  // Generate creative content on the fly
  const copy = await ai.generate(`Write a tagline for ${item.name}`);
  ctx.log(`Generated: ${copy}`);
};
```

---

## 📚 Scenarios

### Scenario A: Batch Data Processing
*Ideal for: CSV cleanup, Database migration, API enrichment.*

1.  **Prepare Data**: Load your 500 records into a JSON array.
2.  **Write Worker**:
    ```typescript
    // worker.ts
    export const dataWorker = async (record, ctx) => {
      ctx.log(`Enriching record ${record.id}...`);
      const newData = await externalApi.enrich(record);
      return newData;
    };
    ```
3.  **Run**: The engine will process them one by one (or in parallel), saving the result of each record to the checkpoint.

### Scenario B: AI Content Generation (The "25 Feature Pages")
*Ideal for: SEO Blogs, Documentation, Code Generation.*

1.  **Prepare Data**: A list of topics: `[{ topic: "Auth" }, { topic: "Billing" }]`.
2.  **Write Worker**:
    ```typescript
    // worker.ts
    export const contentWorker = async (topic, ctx) => {
      // 1. Research
      const keywords = await agent.research(topic);
      // 2. Draft
      const content = await agent.draft(topic, keywords);
      // 3. Save
      fs.writeFileSync(`output/${topic}.md`, content);
    };
    ```
3.  **Benefit**: If the AI hallucinates or errors on Topic #12, the engine catches it, logs the error, and moves to Topic #13. You can retry #12 later.

### Scenario C: Advanced Security Audit (500+ Files)
*Ideal for: Code Audits, Migration Analysis, Refactoring.*

This engine includes a **Smart File Scanner** (`core/scanner.ts`) that builds the input list for you.

1.  **Phase 1: Research**: The agent first scans `package.json` to detect the stack (e.g., Next.js, Supabase) and searches for relevant CVEs.
2.  **Phase 2: Scan**: 
    ```typescript
    import { scanProject, generateInputFile } from './core/scanner';
    
    const files = scanProject({
      rootDir: './src',
      // Auto-excludes node_modules, .next, etc.
      extensions: ['.ts', '.tsx', '.js'], 
      // Prioritize these as 'critical'
      criticalDirs: ['api', 'auth', 'middleware'] 
    });
    
    generateInputFile(files, './data.json'); 
    // Output: data.json with 500 items, sorted by risk (Critical -> High -> Low)
    ```
3.  **Phase 3: Worker**: 
    The worker reads each file and checks for vulnerabilities (SQLi, XSS, Secrets), using the `LLMClient` for deep analysis if needed.
    ```typescript
    export const auditWorker = async (fileItem, ctx) => {
      const code = fs.readFileSync(fileItem.path, 'utf-8');
      
      // 1. Static Analysis (Regex for secrets, hardcoded values)
      const secretLeaks = detectSecrets(code);
      
      // 2. Semantic Analysis (AI)
      let aiFindings = [];
      if (fileItem.category === 'critical') {
         aiFindings = await ai.analyze(code, "Find security vulnerabilities in this API route");
      }
      
      return { secrets: secretLeaks, risks: aiFindings };
    };
    ```
4.  **Result**: A robust `security-report.json` covering every single source file, with no timeouts.

### Scenario D: Browser Automation (QA / Scraping)
*Ideal for: Verifying links, taking screenshots, scraping data.*

1.  **Prepare Data**: A list of URLs.
2.  **Write Worker**:
    ```typescript
    // worker.ts
    import puppeteer from 'puppeteer';
    
    export const browserWorker = async (url, ctx) => {
      const browser = await puppeteer.launch();
      const page = await browser.newPage();
      await page.goto(url);
      const title = await page.title();
      await browser.close();
      return title;
    };
    ```
3.  **Benefit**: Browser crashes are common. The engine's retry logic ensures a flaky network doesn't stop the verified scrape of 1000 sites.

---

## ⚙️ Advanced Configuration

You can customize the engine behavior in the constructor:

```typescript
const engine = new LoopEngine({
  inputPath: './data.json',
  checkpointPath: './checkpoint.json',
  
  // Concurrency: How many workers to run in parallel?
  // Use 1 for safe, sequential processing.
  // Use 5+ for high-speed I/O bound tasks.
  concurrency: 5,

  // Max Retries: How many times to retry a failed item?
  maxRetries: 3,

  // Timeout: Kill process if it takes longer than 60 seconds
  itemTimeoutMs: 60000
});
```

---

## 🛠️ Developing & Extending

This project is set up as a standard TypeScript package.

-   **Build**: `npm run build` (Compiles TypeScript to `dist/`)
-   **Test**: `npm run example:features` (Runs the included Feature Page generator)
-   **Lint/Format**: Standard configurations can be added.

### Folder Structure
-   `core/`: The engine logic (State Machine, Logger).
-   `examples/`: Reference implementations. Use these as templates.
-   `dist/`: Compiled JavaScript output.

### Future Roadmap
-   [ ] **Dashboard**: A React UI to visualize `checkpoint.json` in real-time.
-   [ ] **Webhook Alerts**: Notify Slack/Discord on task failure.
-   [ ] **Dynamic Queue**: Add items to the queue *while* the engine is running.
