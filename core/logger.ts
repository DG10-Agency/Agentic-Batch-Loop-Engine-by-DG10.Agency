import * as fs from 'fs';
import * as path from 'path';

export class Logger {
    private logFile: string;

    constructor(baseDir: string, jobName: string) {
        this.logFile = path.join(baseDir, `${jobName}.log`);
        // Ensure directory exists
        const dir = path.dirname(this.logFile);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    log(message: string, ...args: any[]) {
        const timestamp = new Date().toISOString();
        const formattedMessage = `[${timestamp}] ${message} ${args.map(a => JSON.stringify(a)).join(' ')}`;

        // Console output for immediate feedback
        console.log(formattedMessage);

        // File output for persistent history
        fs.appendFileSync(this.logFile, formattedMessage + '\n');
    }

    error(message: string, ...args: any[]) {
        const timestamp = new Date().toISOString();
        const formattedMessage = `[${timestamp}] [ERROR] ${message} ${args.map(a => JSON.stringify(a)).join(' ')}`;

        console.error(formattedMessage);
        fs.appendFileSync(this.logFile, formattedMessage + '\n');
    }
}
