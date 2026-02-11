import * as https from 'https';

export interface LLMConfig {
    apiKey?: string;
    baseURL?: string;
    model?: string;
}

export class LLMClient {
    private apiKey: string;
    private baseURL: string;
    private model: string;

    constructor(config: LLMConfig = {}) {
        this.apiKey = config.apiKey || process.env.OPENAI_API_KEY || '';
        this.baseURL = config.baseURL || 'https://api.openai.com/v1';
        this.model = config.model || 'gpt-4o';

        if (!this.apiKey) {
            console.warn('⚠️ Warning: No API Key provided for LLMClient. Calls will likely fail unless using a local unauthenticated model.');
        }
    }

    async generate(prompt: string, systemPrompt?: string): Promise<string> {
        const messages = [];
        if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
        messages.push({ role: 'user', content: prompt });

        return this.chat(messages);
    }

    async chat(messages: { role: string; content: string }[]): Promise<string> {
        const url = new URL(`${this.baseURL}/chat/completions`);

        const body = JSON.stringify({
            model: this.model,
            messages: messages,
            temperature: 0.7
        });

        const options = {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${this.apiKey}`
            }
        };

        return new Promise((resolve, reject) => {
            const req = https.request(url, options, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    if (res.statusCode && res.statusCode >= 400) {
                        reject(new Error(`LLM Error (${res.statusCode}): ${data}`));
                        return;
                    }
                    try {
                        const response = JSON.parse(data);
                        const content = response.choices?.[0]?.message?.content || '';
                        resolve(content);
                    } catch (e) {
                        reject(new Error(`Failed to parse LLM response: ${e}`));
                    }
                });
            });

            req.on('error', (e) => reject(e));
            req.write(body);
            req.end();
        });
    }
}
