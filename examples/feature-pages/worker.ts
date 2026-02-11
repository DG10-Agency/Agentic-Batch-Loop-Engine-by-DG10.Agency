import { WorkerFunction, WorkerContext } from '../../core/types.js';
import { FeatureInput, ResearchResult, ContentDraft, PageResult } from './types.js';
import { LLMClient } from '../../core/llm.js'; // Import the new AI Brain
import * as fs from 'fs';
import * as path from 'path';

// Initialize the AI Brain
const ai = new LLMClient({ model: 'gpt-4o' }); // Uses OPENAI_API_KEY env var

// --- Simulation Helpers ---
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- ROLES ---

async function roleSEOSpecialist(feature: FeatureInput, log: (msg: string) => void): Promise<ResearchResult> {
    log(`[SEO Role] Analyzing keywords for "${feature.name}"...`);

    // REAL WORLD: await ai.generate(`Find high volume keywords for: ${feature.name}`);
    // For demo speed, we simulate:
    await delay(200);

    return {
        keywords: [`${feature.name} software`, `best ${feature.name} tool`, `${feature.category} automation`],
        competitors: ['CompetitorA', 'CompetitorB'],
        uniqueValueProp: `The only ${feature.name} that integrates seamlessly with your existing workflow.`
    };
}

async function roleCopywriter(feature: FeatureInput, research: ResearchResult, log: (msg: string) => void): Promise<ContentDraft> {
    log(`[Copywriter Role] Drafting content based on UVP: "${research.uniqueValueProp}"...`);

    // --- REAL AI GENERATION ---
    // This is where we use the "AI Brain" to write the copy.
    let contentJson: string;
    try {
        const prompt = `
      You are a Senior Copywriter with 20 years experience.
      Write a landing page copy for a feature called "${feature.name}".
      
      Context:
      - Category: ${feature.category}
      - UVP: ${research.uniqueValueProp}
      - Keywords: ${research.keywords.join(', ')}

      Return ONLY a JSON object with this structure:
      {
        "title": "SEO Title",
        "metaDescription": "Meta Description",
        "heroHeadline": "Punchy Headline",
        "heroSubheadline": "Compelling Subhead",
        "benefits": ["Benefit 1", "Benefit 2", "Benefit 3"],
        "faq": [{"question": "Q1", "answer": "A1"}]
      }
    `;

        // If we have an API Key, use it. Otherwise, fall back to simulation for the user's dry run.
        if (process.env.OPENAI_API_KEY) {
            contentJson = await ai.generate(prompt, "You are a JSON-only response bot.");
            // Strip markdown code blocks if present
            contentJson = contentJson.replace(/```json/g, '').replace(/```/g, '');
        } else {
            log("[AI Brain] No API Key found, using template...");
            await delay(500);
            contentJson = JSON.stringify({
                title: `${feature.name} - The Ultimate Solution`,
                metaDescription: `Discover how our ${feature.name} can revolutionize your ${feature.category}.`,
                heroHeadline: `Master Your ${feature.category} with ${feature.name}`,
                heroSubheadline: research.uniqueValueProp,
                benefits: ['Save Time', 'Increase Efficiency', 'Reduce Errors'],
                faq: [{ question: 'Is it free?', answer: 'Yes, initially.' }]
            });
        }

        return JSON.parse(contentJson);

    } catch (err: any) {
        log(`[Copywriter Error] ${err.message}. Falling back to template.`);
        return {
            title: `${feature.name} [Fallback]`,
            metaDescription: `Description for ${feature.name}`,
            heroHeadline: `Feature: ${feature.name}`,
            heroSubheadline: research.uniqueValueProp,
            benefits: [],
            faq: []
        };
    }
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
