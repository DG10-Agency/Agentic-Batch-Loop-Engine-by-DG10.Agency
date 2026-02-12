export interface LoopConfig {
  /** Path to the input data file (JSON) */
  inputPath: string;
  /** Path to the store the checkpoint/status file */
  checkpointPath: string;
  /** Concurrency level (default: 1) */
  concurrency?: number;
  /** Max retries per item (default: 3) */
  maxRetries?: number;
  /** Timeout in ms per item. If exceeded, item fails. (default: no timeout) */
  itemTimeoutMs?: number;
  /** Optional: Direct array of input data instead of loading from a file */
  inputData?: any[];
}

export type ItemStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'awaiting_agent';

export interface BatchItem<T = any> {
  id: string;
  data: T;
  status: ItemStatus;
  attempts: number;
  lastError?: string;
  pendingPrompt?: any;
  output?: any;
  logs?: string[];
}

export interface Checkpoint<T = any> {
  jobId: string;
  startTime: string;
  items: BatchItem<T>[];
  completedCount: number;
  failedCount: number;
}

export interface WorkerContext {
  log: (message: string) => void;
}

export type WorkerFunction<T = any, R = any> = (
  item: T,
  context: WorkerContext
) => Promise<R>;
