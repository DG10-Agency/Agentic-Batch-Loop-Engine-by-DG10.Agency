import { LoopEngine } from '../../core/engine.js';
import { featureWorker } from './worker.js';
import * as path from 'path';

// Fix path resolution: when running from the skill root, we are already in .agent/skills/loop-engine
const inputPath = path.resolve(process.cwd(), 'examples/feature-pages/data.json');
const checkpointPath = path.resolve(process.cwd(), 'examples/feature-pages/checkpoint.json');

const engine = new LoopEngine({
    inputPath,
    checkpointPath,
    concurrency: 1,
    maxRetries: 2
});

console.log('Starting Feature Page Generator Batch...');
engine.run(featureWorker).catch(err => {
    console.error('Fatal Engine Error:', err);
});
