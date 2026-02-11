import * as fs from 'fs';
import * as path from 'path';

export interface ScanConfig {
    /** Root directory to scan */
    rootDir: string;
    /** File extensions to include (e.g., ['.ts', '.tsx', '.js']) */
    extensions: string[];
    /** Directories to exclude (always excludes node_modules, .next, .git, dist) */
    excludeDirs?: string[];
    /** Directories to prioritize as 'critical' */
    criticalDirs?: string[];
}

export interface ScannedFile {
    filePath: string;
    relativePath: string;
    category: 'critical' | 'high' | 'medium' | 'low';
    extension: string;
    sizeBytes: number;
}

const DEFAULT_EXCLUDE = ['node_modules', '.next', '.git', 'dist', '.cache', 'coverage', 'test-results', 'playwright-report', '.backup'];
const DEFAULT_CRITICAL = ['api', 'auth', 'middleware', 'actions', 'supabase', 'scripts', 'server'];

export function scanProject(config: ScanConfig): ScannedFile[] {
    const results: ScannedFile[] = [];
    const excludeDirs = [...DEFAULT_EXCLUDE, ...(config.excludeDirs || [])];
    const criticalDirs = [...DEFAULT_CRITICAL, ...(config.criticalDirs || [])];

    function walk(dir: string) {
        let entries: fs.Dirent[];
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        } catch {
            return; // Permission denied or similar
        }

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);

            if (entry.isDirectory()) {
                if (excludeDirs.includes(entry.name)) continue;
                walk(fullPath);
            } else if (entry.isFile()) {
                const ext = path.extname(entry.name);
                if (!config.extensions.includes(ext)) continue;

                const relativePath = path.relative(config.rootDir, fullPath).replace(/\\/g, '/');
                const stats = fs.statSync(fullPath);

                // Categorize by directory
                const pathLower = relativePath.toLowerCase();
                let category: ScannedFile['category'] = 'medium';

                if (criticalDirs.some(d => pathLower.includes(`/${d}/`) || pathLower.startsWith(`${d}/`))) {
                    category = 'critical';
                } else if (pathLower.includes('/lib/') || pathLower.includes('/utils/') || pathLower.includes('/hooks/')) {
                    category = 'high';
                } else if (pathLower.includes('/components/') || pathLower.includes('/app/')) {
                    category = 'medium';
                } else if (pathLower.endsWith('.test.ts') || pathLower.endsWith('.spec.ts') || pathLower.includes('/e2e/')) {
                    category = 'low';
                }

                results.push({
                    filePath: fullPath,
                    relativePath,
                    category,
                    extension: ext,
                    sizeBytes: stats.size
                });
            }
        }
    }

    walk(config.rootDir);

    // Sort: critical first, then high, medium, low
    const priority = { critical: 0, high: 1, medium: 2, low: 3 };
    results.sort((a, b) => priority[a.category] - priority[b.category]);

    return results;
}

/**
 * Write scanned files to a JSON file for the Loop Engine to consume.
 */
export function generateInputFile(files: ScannedFile[], outputPath: string): void {
    fs.writeFileSync(outputPath, JSON.stringify(files, null, 2));
    console.log(`📁 Scanned ${files.length} files → ${outputPath}`);
    console.log(`   Critical: ${files.filter(f => f.category === 'critical').length}`);
    console.log(`   High:     ${files.filter(f => f.category === 'high').length}`);
    console.log(`   Medium:   ${files.filter(f => f.category === 'medium').length}`);
    console.log(`   Low:      ${files.filter(f => f.category === 'low').length}`);
}
