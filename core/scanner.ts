import * as fs from 'fs';
import * as path from 'path';

export type ScanPerspective = 'developer' | 'owner' | 'user';

export interface ScanConfig {
    /** Root directory to scan */
    rootDir: string;
    /** File extensions to include (e.g., ['.ts', '.tsx', '.js']) */
    extensions: string[];
    /** Directories to exclude (always excludes node_modules, .next, .git, dist) */
    excludeDirs?: string[];
    /** Directories to prioritize as 'critical' */
    criticalDirs?: string[];
    /** NEW: Only include files whose content matches these patterns (grep-like) */
    contentPatterns?: string[];
    /** NEW: Perspectives to include in the scan (default: ['developer']) */
    perspectives?: ScanPerspective[];
}

export interface ScannedFile {
    filePath: string;
    relativePath: string;
    category: 'critical' | 'high' | 'medium' | 'low';
    extension: string;
    sizeBytes: number;
    perspective?: ScanPerspective;
    matchedPatterns?: string[];
}

const DEFAULT_EXCLUDE = ['node_modules', '.next', '.git', 'dist', '.cache', 'coverage', 'test-results', 'playwright-report', '.backup'];
const DEFAULT_CRITICAL = ['api', 'auth', 'middleware', 'actions', 'supabase', 'scripts', 'server'];

const PERSPECTIVE_CONFIG: Record<ScanPerspective, { extensions: string[], includePaths: string[] }> = {
    developer: {
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json', '.yml', '.yaml'],
        includePaths: ['src', 'lib', 'utils', 'hooks', 'components', 'app', 'pages', 'api']
    },
    owner: {
        extensions: ['.env', '.env.local', '.env.production', 'Dockerfile', '.yml', '.yaml'],
        includePaths: ['supabase', 'docker', 'scripts', 'billing', 'pricing', '.github']
    },
    user: {
        extensions: ['.html', '.css', '.md', '.txt', '.xml'],
        includePaths: ['public', 'docs', 'content']
    }
};

export function scanProject(config: ScanConfig): ScannedFile[] {
    const results: ScannedFile[] = [];
    const excludeDirs = [...DEFAULT_EXCLUDE, ...(config.excludeDirs || [])];
    const criticalDirs = [...DEFAULT_CRITICAL, ...(config.criticalDirs || [])];
    const perspectives = config.perspectives || ['developer'];

    function walk(dir: string) {
        let entries: fs.Dirent[];
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        } catch {
            return;
        }

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            const entryName = entry.name;

            if (entry.isDirectory()) {
                if (excludeDirs.includes(entryName)) continue;
                walk(fullPath);
            } else if (entry.isFile()) {
                const ext = path.extname(entryName);
                const relativePath = path.relative(config.rootDir, fullPath).replace(/\\/g, '/');

                // Determine if this file fits any selected perspective
                let matchingPerspective: ScanPerspective | undefined;

                for (const p of perspectives) {
                    const pConfig = PERSPECTIVE_CONFIG[p];
                    const isCorrectExt = pConfig.extensions.includes(ext) || config.extensions.includes(ext) || entryName.startsWith('.env');
                    const isInPath = pConfig.includePaths.some(pPath => relativePath.startsWith(pPath + '/')) || dir === config.rootDir;

                    if (isCorrectExt || isInPath) {
                        matchingPerspective = p;
                        break;
                    }
                }

                if (!matchingPerspective && perspectives.includes('developer')) {
                    if (config.extensions.includes(ext)) matchingPerspective = 'developer';
                }

                if (!matchingPerspective) continue;

                // CONTENT PATTERN MATCHING (Intent-Aware Discovery)
                let matchedPatterns: string[] | undefined;
                if (config.contentPatterns && config.contentPatterns.length > 0) {
                    try {
                        const content = fs.readFileSync(fullPath, 'utf-8');
                        matchedPatterns = config.contentPatterns.filter(p => content.includes(p));
                        if (matchedPatterns.length === 0) continue; // Skip if no patterns match
                    } catch (e) {
                        continue; // Skip file if unreadable
                    }
                }

                const stats = fs.statSync(fullPath);
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
                    sizeBytes: stats.size,
                    perspective: matchingPerspective,
                    matchedPatterns
                });
            }
        }
    }

    walk(config.rootDir);

    const priority = { critical: 0, high: 1, medium: 2, low: 3 };
    results.sort((a, b) => priority[a.category] - priority[b.category]);

    return results;
}

export function generateInputFile(files: ScannedFile[], outputPath: string): void {
    fs.writeFileSync(outputPath, JSON.stringify(files, null, 2));
    console.log(`📁 Scanned ${files.length} files → ${outputPath}`);
    console.log(`   Critical: ${files.filter(f => f.category === 'critical').length}`);
    console.log(`   High:     ${files.filter(f => f.category === 'high').length}`);
    console.log(`   Medium:   ${files.filter(f => f.category === 'medium').length}`);
    console.log(`   Low:      ${files.filter(f => f.category === 'low').length}`);

    const perspectives = Array.from(new Set(files.map(f => f.perspective)));
    if (perspectives.length > 1) {
        console.log(`   By Perspective: ${perspectives.map(p => `${p}(${files.filter(f => f.perspective === p).length})`).join(', ')}`);
    }
}
