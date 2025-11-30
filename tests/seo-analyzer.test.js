import { jest } from '@jest/globals';
import * as cheerio from 'cheerio';

// Mock axios and screenshot service
jest.unstable_mockModule('axios', () => ({
    default: {
        get: jest.fn()
    }
}));

jest.unstable_mockModule('../src/services/screenshot-service.js', () => ({
    captureScreenshot: jest.fn()
}));

const axios = (await import('axios')).default;
const { analyzeSEO } = await import('../src/services/seo-analyzer.js');

describe('SEO Analyzer', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should analyze a page correctly', async () => {
        const html = `
            <html>
                <head>
                    <title>Test Page</title>
                    <meta name="description" content="This is a test description that is long enough.">
                </head>
                <body>
                    <h1>Heading 1</h1>
                </body>
            </html>
        `;

        axios.get.mockResolvedValue({
            status: 200,
            data: html,
            headers: {},
            request: { res: { responseUrl: 'https://example.com' } }
        });

        const result = await analyzeSEO('https://example.com', false);

        expect(result.title).toBe('Test Page');
        expect(result.h1Count).toBe(1);
        expect(result.seoScore).toBeGreaterThan(0);
    });

    it('should handle errors gracefully', async () => {
        axios.get.mockRejectedValue(new Error('Network Error'));

        const result = await analyzeSEO('https://example.com', false);

        expect(result.error).toBe('Network Error');
        expect(result.seoScore).toBe(0);
    });
});
