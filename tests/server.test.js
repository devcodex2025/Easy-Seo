import request from 'supertest';
import { jest } from '@jest/globals';

// Mock services before importing app
jest.unstable_mockModule('../src/services/user-service.js', () => ({
    createGuestUser: jest.fn(),
    getUser: jest.fn(),
    canUserAnalyze: jest.fn(),
    deductCredit: jest.fn(),
}));

jest.unstable_mockModule('../src/services/analysis-service.js', () => ({
    saveAnalysis: jest.fn(),
    getUserAnalyses: jest.fn(),
    getAnalysis: jest.fn(),
}));

jest.unstable_mockModule('../src/services/seo-analyzer.js', () => ({
    analyzeSEO: jest.fn(),
}));

// Import app after mocking
const app = (await import('../server.js')).default;
const userService = await import('../src/services/user-service.js');
const analysisService = await import('../src/services/analysis-service.js');
const seoAnalyzer = await import('../src/services/seo-analyzer.js');

describe('API Endpoints', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/health', () => {
        it('should return 200 and status ok', async () => {
            const res = await request(app).get('/api/health');
            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('status', 'ok');
        });
    });

    describe('POST /api/user/guest', () => {
        it('should create a guest user', async () => {
            const mockUser = { id: '123', isGuest: true };
            userService.createGuestUser.mockResolvedValue(mockUser);

            const res = await request(app).post('/api/user/guest');
            expect(res.statusCode).toEqual(200);
            expect(res.body).toEqual(mockUser);
        });
    });

    describe('POST /api/analyze', () => {
        it('should return 400 if url is missing', async () => {
            const res = await request(app).post('/api/analyze').send({ userId: '123' });
            expect(res.statusCode).toEqual(400);
            expect(res.body.error).toContain('URL and userId are required');
        });

        it('should return 400 if url is invalid', async () => {
            const res = await request(app).post('/api/analyze').send({ userId: '123', url: 'not-a-url' });
            expect(res.statusCode).toEqual(400);
            expect(res.body.error).toContain('Invalid URL');
        });

        it('should analyze url if valid', async () => {
            const mockUser = { id: '123', credits: 1 };
            userService.getUser.mockResolvedValue(mockUser);
            userService.canUserAnalyze.mockResolvedValue({ allowed: true, remaining: 1 });
            seoAnalyzer.analyzeSEO.mockResolvedValue({ title: 'Test' });
            analysisService.saveAnalysis.mockResolvedValue({ id: '456', publicToken: 'abc' });
            userService.deductCredit.mockResolvedValue();

            const res = await request(app).post('/api/analyze').send({ userId: '123', url: 'https://example.com' });
            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('title', 'Test');
            expect(res.body).toHaveProperty('analysisId', '456');
        });
    });
});
