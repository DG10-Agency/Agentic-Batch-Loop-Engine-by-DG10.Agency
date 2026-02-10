---
name: Autonomous Loop Engine
description: A robust runtime environment for executing long-running, repetitive agent tasks with state persistence and error recovery.
---

# Autonomous Loop Engine

use this skill when you need to perform a task on a list of items (e.g., "Generate 25 pages", "Process 100 CSV rows").
It handles **state persistence**, **retries**, and **logging** automatically.

## Usage

1.  **Prepare Data**: Create a JSON file with your input list (e.g., `data.json`).
2.  **Write Worker**: Create a TypeScript file (e.g., `worker.ts`) that exports a default async function.
3.  **Run**: Use the `run_command` tool to execute the engine.

### The Worker Function

The worker function should focus on **one single item**.
It receives the `item` data and a `context` object for logging.

```typescript
// worker.ts
import { WorkerFunction } from '../../core/types';

const worker: WorkerFunction = async (item, context) => {
  context.log(`Starting work on ${item.name}`);
  
  // Do work...
  // You can use the 'browser' tool implicitly via Puppeteer if needed
  // or just perform file operations / API calls.
  
  return { result: "Done" };
};

export default worker;
```

### Running the Engine

You will typically create a small "runner" script to start the engine, or use a standard CLI wrapper (to be implemented).

Example Runner:
```typescript
import { LoopEngine } from '../../core/engine';
import worker from './worker';

const engine = new LoopEngine({
  inputPath: './data.json',
  checkpointPath: './checkpoint.json'
});

engine.run(worker);
```
