# Autonomous Loop Engine

The Autonomous Loop Engine is a high-resilience runtime designed for **Intelligent Bulk Modification** at scale. Use this skill when you need to find thousands of targets (files, components, records) and apply precise, consistent changes.

---

## 🚀 The Ultimate Workflow: Discover → Apply → Verify → Cleanup

When a user asks for a massive change (e.g., "Change all buttons in my 2,000 components"), follow this 5-step lifecycle:

### Phase 1: Understand & Research
Analyze the user's intent. What is the signature of the target?
- *Intent*: Replace `<OldButton` with `<NewButton color="blue" />`.
- *Signature*: Files containing the string `<OldButton`.

### Phase 2: Intent-Aware Discovery
Use the `scanner.ts` with `contentPatterns` to intelligently build your batch list. This filters out the "noise" and finds exactly what needs to change.

```typescript
import { scanProject, generateInputFile } from '{path-to-skill}/core/scanner';

const targets = scanProject({
  rootDir: process.cwd(),
  extensions: ['.tsx', '.jsx'],
  // ONLY find files that actually use the target
  contentPatterns: ['<OldButton'],
  // Use multiple lenses if needed (developer, owner, user)
  perspectives: ['developer']
});

generateInputFile(targets, './scripts/button-fix/data.json');
```

### Phase 3: Apply Modification
Write a worker that performs the change. Because the engine saves state after *every* item, if the process crashes at file 1,500, it resumes at 1,501.

### Phase 4: Verify
After the job finishes, run a verification scan. Did `<OldButton` disappear from all targets? If not, investigate the failures logged in `checkpoint.json`.

### Phase 5: Cleanup
The engine signals when a job is 100% successful.
**Ask the developer**: *"The modification is complete across 847 files. Should I clean up the temporary files (data.json, checkpoint.json, logs)?"*

---

## 🛠️ Performance & Resilience Rules

1.  **Zero-Dependency Design**: This skill uses only Node.js built-ins. Do NOT `npm install` inside the skill folder. It runs using the host project's environment.
2.  **Idempotency**: Workers must be safe to run twice on the same file without causing corruption.
3.  **Context Logging**: Use `ctx.log()` to record the "before" and "after" state of each file. This log is saved in the checkpoint for debugging.

---

## Reference: Advanced Scanner

```typescript
import { scanProject } from '{path-to-skill}/core/scanner';

const files = scanProject({
  rootDir: '/path/to/project',
  extensions: ['.ts', '.tsx'],
  // Intent-Aware: Search for specific code patterns
  contentPatterns: ['interface User', 'api/auth'],
  // Multi-Perspective lenses
  perspectives: ['developer', 'owner', 'user']
});
```

| Perspective | Focus |
|---|---|
| **developer** | Source code, components, API routes, library configs. |
| **owner** | `.env` files, Dockerfiles, GitHub workflows, billing/pricing logic. |
| **user** | `public/` assets, `robots.txt`, `sitemap.xml`, SEO metadata. |

---

## Reference: Cleanup Signaling
The `checkpoint.json` will contain a `cleanupReady: true` flag and a list of `cleanupFiles` when a job succeeds. Use this to offer the user a clean workspace.
