import * as fs from 'fs';
import * as path from 'path';
import { LoopConfig, BatchItem, Checkpoint, WorkerFunction, WorkerContext } from './types.js';
import { Logger } from './logger.js';

export class LoopEngine<T = any> {
    private config: LoopConfig;
    private logger: Logger;
    private checkpoint: Checkpoint<T>;

    constructor(config: LoopConfig) {
        this.config = {
            concurrency: 1,
            maxRetries: 3,
            ...config,
        };

        // Initialize logger
        const logDir = path.dirname(this.config.checkpointPath);
        const jobName = path.basename(this.config.checkpointPath, '.json');
        this.logger = new Logger(logDir, jobName);

        this.checkpoint = this.loadCheckpoint();
    }

    private loadCheckpoint(): Checkpoint<T> {
        if (fs.existsSync(this.config.checkpointPath)) {
            this.logger.log('Resuming from checkpoint...');
            return JSON.parse(fs.readFileSync(this.config.checkpointPath, 'utf-8'));
        }

        this.logger.log('Starting new job...');
        // Load input data
        const inputData = JSON.parse(fs.readFileSync(this.config.inputPath, 'utf-8'));

        return {
            jobId: `job-${Date.now()}`,
            startTime: new Date().toISOString(),
            items: inputData.map((item: T, index: number) => ({
                id: `item-${index}`,
                data: item,
                status: 'pending',
                attempts: 0,
                logs: []
            })),
            completedCount: 0,
            failedCount: 0
        };
    }

    private saveCheckpoint() {
        fs.writeFileSync(this.config.checkpointPath, JSON.stringify(this.checkpoint, null, 2));
    }

    async run(worker: WorkerFunction<T>) {
        this.logger.log(`Starting execution with ${this.checkpoint.items.length} items. Concurrency: ${this.config.concurrency || 1}`);

        const pendingItems = this.checkpoint.items.filter(item => {
            if (item.status === 'completed') return false;
            if (item.status === 'failed' && (item.attempts >= (this.config.maxRetries || 3))) return false;
            return true;
        });

        const concurrency = this.config.concurrency || 1;
        const activePromises: Promise<void>[] = [];

        for (const item of pendingItems) {
            // Wait if we reached concurrency limit
            if (activePromises.length >= concurrency) {
                await Promise.race(activePromises);
            }

            const promise = this.processItem(item, worker).then(() => {
                // Remove self from active promises
                const index = activePromises.indexOf(promise);
                if (index > -1) activePromises.splice(index, 1);
            });

            activePromises.push(promise);
        }

        // Wait for remaining items
        await Promise.all(activePromises);

        this.logger.log('Job finished.');
        this.logger.log(`Completed: ${this.checkpoint.completedCount}, Failed: ${this.checkpoint.failedCount}`);
    }

    private async processItem(item: BatchItem<T>, worker: WorkerFunction<T>) {
        this.logger.log(`Processing item ${item.id}... (Attempt ${item.attempts + 1})`);

        item.status = 'processing';
        item.attempts++;
        this.saveCheckpoint();

        const itemLogger: WorkerContext = {
            log: (msg: string) => {
                this.logger.log(`[${item.id}] ${msg}`);
                item.logs = item.logs || [];
                item.logs.push(msg);
            }
        };

        try {
            const result = await worker(item.data, itemLogger);

            item.status = 'completed';
            item.output = result;
            this.checkpoint.completedCount++;
            this.logger.log(`Item ${item.id} COMPLETED.`);

        } catch (error: any) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Item ${item.id} FAILED: ${errorMessage}`);

            item.lastError = errorMessage;
            item.status = 'failed';
            // If we haven't hit max retries, it stays 'failed' but might be picked up next run 
            // or we could implementing immediate retry logic here.
            // For now, we count it as failed for this run.

            if (item.attempts >= (this.config.maxRetries || 3)) {
                this.checkpoint.failedCount++;
            }
        } finally {
            this.saveCheckpoint();
        }
    }
}
