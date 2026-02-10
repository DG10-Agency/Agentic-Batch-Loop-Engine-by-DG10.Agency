import { LoopEngine } from '../../core/engine.js';
import { flakyWorker } from './worker-flaky.js';
import * as path from 'path';

const inputPath = path.join(process.cwd(), '.agent/skills/loop-engine/examples/feature-pages/data.json');
const checkpointPath = path.join(process.cwd(), 'checkpoint-resilience.json');

const engine = new LoopEngine({
    inputPath,
    checkpointPath,
    concurrency: 1,
    maxRetries: 3
});

console.log('Starting Resilience Batch...');
engine.run(flakyWorker).catch(console.error);
