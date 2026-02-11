---
name: Autonomous Loop Engine
description: A fault-tolerant batch processing engine for long-running agent tasks. Handles state persistence, retries, concurrency, and crash recovery.
---

# Autonomous Loop Engine

Use this skill when you need to perform a repeating task across many items (files, records, URLs, etc.) with resilience. The engine handles **state persistence**, **retries**, **concurrency**, and **crash recovery** so you can focus on the logic.

## When to Use This Skill

- "Audit all 500 files in this project"
- "Generate landing pages for these 25 features"
- "Scrape data from these 100 URLs"
- "Process every row in this CSV"

## Architecture

```
YOU (the Agent) = The Brain (decides WHAT to do)
Loop Engine     = The Body (does it reliably, without forgetting)
```

**You do NOT hardcode logic into the engine.** You create a worker script in the USER's project and the engine runs it.

## How to Use (Step by Step)

### Phase 1: Understand the Task
Before writing any code, analyze what the user wants:
- What is the **unit of work**? (one file, one URL, one record)
- What is the **input source**? (directory scan, database, JSON file, CSV)
- What **preprocessing** is needed? (detect tech stack, research, etc.)

### Phase 2: Research (if needed)
For intelligent tasks like security audits, do your research FIRST:
1. Read `package.json`, `tsconfig.json`, framework configs to detect the tech stack
2. Use your search tools to find known vulnerabilities for that stack
3. Build a checklist of what to look for

### Phase 3: Generate Input Data
Create a `data.json` in the USER's project (NOT inside this skill folder):

```typescript
// Example: For a file-based task, scan the directory
import * as fs from 'fs';
import * as path from 'path';

function scanProject(dir: string, extensions: string[]): any[] {
  const results: any[] = [];
  // Walk directory recursively
  // Filter by extensions (.ts, .tsx, .js, etc.)
  // Exclude: node_modules, .next, dist, .git, public, *.css, *.svg, *.png
  // Categorize by risk: api routes = critical, middleware = critical, pages = medium
  return results;
}
```

### Phase 4: Write the Worker
Create a worker in the USER's project directory:

```
{user_project}/
├── scripts/
│   └── {task-name}/
│       ├── worker.ts      ← Your worker logic
│       ├── run.ts          ← Entry point
│       ├── data.json       ← Generated input
│       └── checkpoint.json ← Auto-created by engine
```

The worker handles ONE item:

```typescript
import { WorkerFunction } from '{path-to-skill}/core/types';

export const worker: WorkerFunction<ItemType> = async (item, ctx) => {
  ctx.log(`Processing: ${item.name}`);

  // Your logic here:
  // - Read a file
  // - Call an API
  // - Run analysis
  // - Write output

  return { result: "done", findings: [] };
};
```

### Phase 5: Write the Runner

```typescript
import { LoopEngine } from '{path-to-skill}/core/engine';
import { worker } from './worker';

const engine = new LoopEngine({
  inputPath: './scripts/{task-name}/data.json',
  checkpointPath: './scripts/{task-name}/checkpoint.json',
  concurrency: 3,    // parallel workers
  maxRetries: 2,      // retry failed items
  itemTimeoutMs: 30000 // 30s timeout per item
});

engine.run(worker);
```

### Phase 6: Execute
```bash
npx tsx scripts/{task-name}/run.ts
```

## Important Rules

1. **NEVER modify files inside this skill folder.** Create workers in the USER's project.
2. **The worker must be idempotent.** Running the same item twice should produce the same result.
3. **Use `ctx.log()` liberally.** All logs are saved per-item in `checkpoint.json`.
4. **If the process crashes, just run it again.** The engine resumes from where it left off.
5. **Keep workers focused.** One worker = one responsibility. Chain multiple engine runs for multi-phase workflows.

## Example Patterns

### Pattern A: Security Audit
```
Phase 1: Read package.json → detect stack (Next.js, Supabase, etc.)
Phase 2: Search web for "Next.js CVEs 2015-2025", "Supabase vulnerabilities"
Phase 3: Scan project with scanner.ts → data.json (500+ files, sorted by risk)
Phase 4: Worker reads each file → checks for SQL injection, XSS, hardcoded secrets, missing auth
Phase 5: Output security-report.json
```

### Pattern B: Content Generation (Multi-Role)
```
Phase 1: Get list of features/topics
Phase 2: Research SEO keywords for each via web search
Phase 3: Create data.json with topics + keywords
Phase 4: Worker runs: SEO Research → Copywriting → Code Generation → QA
Phase 5: Output files + database SQL
```

### Pattern C: SEO Audit
```
Phase 1: Discover all page routes (scan app/ directory)
Phase 2: Create data.json with routes
Phase 3: Worker checks each page for: meta title, description, h1, alt text, canonical, Open Graph
Phase 4: Output seo-report.json
```

### Pattern D: Internationalization (i18n)
```
Phase 1: Scan all .tsx files for hardcoded strings
Phase 2: Worker extracts strings → translates via LLM → writes to locale files
Phase 3: Output en.json, es.json, fr.json, etc.
```

### Pattern E: Database Migration
```
Phase 1: Export records from source DB → data.json
Phase 2: Worker transforms each record → validates → inserts into target DB
Phase 3: Checkpoint tracks which records migrated (resume on connection drop)
```

### Pattern F: API Endpoint Testing
```
Phase 1: Scan all api/ routes → data.json
Phase 2: Worker sends test payloads (GET, POST, PUT, DELETE)
Phase 3: Verify status codes, response shapes, auth guards
Phase 4: Output api-test-report.json
```

### Pattern G: Accessibility Audit (WCAG)
```
Phase 1: Scan all components/pages
Phase 2: Worker checks: aria labels, color contrast, keyboard nav, focus, alt text
Phase 3: Output a11y-report.json with WCAG violation levels
```

### Pattern H: Code Refactoring at Scale
```
Phase 1: Scan files matching old pattern (deprecated API, old import)
Phase 2: Worker finds old pattern → generates replacement via LLM → applies patch
Phase 3: Output refactor-log.json + modified files
```

### Pattern I: Screenshot Generation
```
Phase 1: List all page routes
Phase 2: Worker launches browser → navigates → takes screenshot → saves to screenshots/
Phase 3: Output screenshot library (use concurrency: 3, timeout: 30s per page)
```

### Pattern J: Email Campaign
```
Phase 1: Load leads from CRM/CSV → data.json
Phase 2: Worker personalizes content → sends via API → logs status
Phase 3: Checkpoint tracks sent/failed (resume after rate limit)
Phase 4: Output campaign-report.json
```

### Pattern K: Documentation Generation
```
Phase 1: Scan all exported functions/components
Phase 2: Worker reads function → generates JSDoc/README via LLM → writes to docs/
Phase 3: Output auto-generated API documentation
```

### Pattern L: Performance Profiling
```
Phase 1: List all page routes
Phase 2: Worker runs Lighthouse/custom metrics → measures load time, CLS, LCP
Phase 3: Output performance-report.json with scores per page
```

## Reference: Core API

```typescript
interface LoopConfig {
  inputPath: string;        // Path to JSON array of items
  checkpointPath: string;   // Path to save progress
  concurrency?: number;     // Parallel workers (default: 1)
  maxRetries?: number;      // Retries per item (default: 3)
  itemTimeoutMs?: number;   // Timeout per item in ms
}

type WorkerFunction<T, R> = (item: T, context: WorkerContext) => Promise<R>;

interface WorkerContext {
  log: (message: string) => void;
}
```

## Reference: File Scanner

```typescript
import { scanProject, generateInputFile } from '{path-to-skill}/core/scanner';

const files = scanProject({
  rootDir: '/path/to/project',
  extensions: ['.ts', '.tsx', '.js', '.jsx'],
  excludeDirs: ['test', 'mocks'],       // Added to defaults
  criticalDirs: ['payments', 'billing']  // Added to defaults
});

generateInputFile(files, './data.json');
// Output: Scanned 523 files → data.json
//   Critical: 47, High: 89, Medium: 312, Low: 75
```

## Reference: LLM Client

```typescript
import { LLMClient } from '{path-to-skill}/core/llm';
const ai = new LLMClient(); // Auto-detects environment credentials

const result = await ai.generate("Write a tagline for X");
```

