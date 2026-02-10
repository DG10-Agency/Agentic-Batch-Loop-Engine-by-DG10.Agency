import { WorkerFunction, WorkerContext } from '../../core/types.js';
import { FeatureInput, ResearchResult, ContentDraft, PageResult } from './types.js';
import * as fs from 'fs';
import * as path from 'path';

// --- Simulation Helpers ---
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- ROLES ---

async function roleSEOSpecialist(feature: FeatureInput, log: (msg: string) => void): Promise<ResearchResult> {
    log(`[SEO Role] Analyzing keywords for "${feature.name}"...`);
    await delay(500); // Simulate API call

    // In a real agent, this would call a search tool or LLM
    return {
        keywords: [`${feature.name} software`, `best ${feature.name} tool`, `${feature.category} automation`],
        competitors: ['CompetitorA', 'CompetitorB'],
        uniqueValueProp: `The only ${feature.name} that integrates seamlessly with your existing workflow.`
    };
}

async function roleCopywriter(feature: FeatureInput, research: ResearchResult, log: (msg: string) => void): Promise<ContentDraft> {
    log(`[Copywriter Role] Drafting content based on UVP: "${research.uniqueValueProp}"...`);
    await delay(500);

    return {
        title: `${feature.name} - The Ultimate Solution`,
        metaDescription: `Discover how our ${feature.name} can revolutionize your ${feature.category}.`,
        heroHeadline: `Master Your ${feature.category} with ${feature.name}`,
        heroSubheadline: research.uniqueValueProp,
        benefits: ['Save Time', 'Increase Efficiency', 'Reduce Errors'],
        faq: [{ question: 'Is it free?', answer: 'Yes, initially.' }]
    };
}

async function roleDeveloper(feature: FeatureInput, content: ContentDraft, log: (msg: string) => void): Promise<string> {
    log(`[Developer Role] Generating React component...`);
    await delay(500);

    const componentName = feature.name.replace(/\s+/g, '');
    const fileContent = `
import React from 'react';
import { Layout } from '@/components/Layout';

export default function ${componentName}Page() {
  return (
    <Layout title="${content.title}" description="${content.metaDescription}">
      <section className="hero">
        <h1>${content.heroHeadline}</h1>
        <p>${content.heroSubheadline}</p>
      </section>
      {/* ... more sections ... */}
    </Layout>
  );
}
`;

    // Ensure output directory exists
    const outDir = path.join(process.cwd(), 'output', 'pages');
    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
    }

    const filePath = path.join(outDir, `${feature.name.toLowerCase().replace(/\s+/g, '-')}.tsx`);
    fs.writeFileSync(filePath, fileContent);
    log(`[Developer Role] File written to ${filePath}`);

    return filePath;
}

async function roleQA(filePath: string, log: (msg: string) => void): Promise<'passed' | 'failed'> {
    log(`[QA Role] Verifying file exists and has content...`);
    await delay(300);

    if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        if (content.length > 50) {
            log(`[QA Role] Verification PASSED.`);
            return 'passed';
        }
    }

    log(`[QA Role] Verification FAILED.`);
    return 'failed';
}

// --- MAIN WORKER ---

export const featureWorker: WorkerFunction<FeatureInput> = async (item, context) => {
    const { log } = context;

    log(`Starting multifaceted workflow for: ${item.name}`);

    // 1. Research
    const research = await roleSEOSpecialist(item, log);

    // 2. Draft
    const content = await roleCopywriter(item, research, log);

    // 3. Implement
    const filePath = await roleDeveloper(item, content, log);

    // 4. Verify
    const status = await roleQA(filePath, log);

    if (status === 'failed') {
        throw new Error("QA Verification failed");
    }

    return {
        status,
        path: filePath,
        generatedAt: new Date().toISOString()
    };
};
