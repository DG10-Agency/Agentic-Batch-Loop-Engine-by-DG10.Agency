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

### Pattern A: File Audit
```
Phase 1: Detect tech stack from package.json
Phase 2: Research known vulnerabilities for that stack
Phase 3: Scan project → generate data.json with file paths
Phase 4: Worker reads each file, checks against vulnerability list
Phase 5: Output findings to security-report.json
```

### Pattern B: Content Generation
```
Phase 1: Get list of topics/features
Phase 2: Research SEO keywords for each
Phase 3: Create data.json with topics + keywords
Phase 4: Worker generates content for each topic
Phase 5: Output files to output/ directory
```

### Pattern C: Data Migration
```
Phase 1: Export records from source DB
Phase 2: Create data.json with records
Phase 3: Worker transforms and inserts each record into target DB
Phase 4: checkpoint.json tracks which records are migrated
```

## Reference: Core API

```typescript
// Types
interface LoopConfig {
  inputPath: string;        // Path to JSON array of items
  checkpointPath: string;   // Path to save progress
  concurrency?: number;     // Parallel workers (default: 1)
  maxRetries?: number;      // Retries per item (default: 3)
  itemTimeoutMs?: number;   // Timeout per item in ms
}

// Worker signature
type WorkerFunction<T, R> = (item: T, context: WorkerContext) => Promise<R>;

// Context provided to each worker
interface WorkerContext {
  log: (message: string) => void;
}
```

## Reference: LLM Client (Optional)

If your worker needs AI generation, use the built-in client:

```typescript
import { LLMClient } from '{path-to-skill}/core/llm';
const ai = new LLMClient(); // Auto-detects environment credentials

const result = await ai.generate("Write a tagline for X");
```
