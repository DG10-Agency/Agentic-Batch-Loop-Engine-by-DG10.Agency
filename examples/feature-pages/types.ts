export interface FeatureInput {
    name: string;
    description: string;
    category: string;
}

export interface ResearchResult {
    keywords: string[];
    competitors: string[];
    uniqueValueProp: string;
}

export interface ContentDraft {
    title: string;
    metaDescription: string;
    heroHeadline: string;
    heroSubheadline: string;
    benefits: string[];
    faq: { question: string; answer: string }[];
}

export interface PageResult {
    filePath: string;
    url: string;
    verificationStatus: 'passed' | 'failed';
}
