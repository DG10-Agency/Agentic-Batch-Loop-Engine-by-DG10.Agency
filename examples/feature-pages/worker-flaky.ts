import { WorkerFunction } from '../../core/types.js';
import { featureWorker } from './worker.js';

export const flakyWorker: WorkerFunction = async (item, context) => {
    // Simulate failure on the 3rd item (index 2)
    if (item.id === 'item-2') {
        // Check if we've already tried automatically? 
        // The engine engine tracks attempts. We can't easily see it here without passing it in.
        // So we'll just fail randomly with 50% chance?
        // Let's just fail ALWAYS to test the "Stop and Resume" capability.

        // Actually, let's look at the context or just fail once.
        // Since I can't see the attempt count in the worker args (my bad design?), 
        // I'll just throw error.

        // To test "Resume", I will manually flip this boolean in the source code between runs? 
        // No, that's cheating.

        // Let's just fail if the global variable is set?
        if (process.env.SHOULD_FAIL === 'true') {
            throw new Error("Simulated Crash!");
        }
    }

    return featureWorker(item, context);
};
