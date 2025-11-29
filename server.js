import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import services
import { analyzeSEO } from './src/services/seo-analyzer.js';
import * as userService from './src/services/user-service.js';
import * as analysisService from './src/services/analysis-service.js';
import * as paymentService from './src/services/payment-service.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet({
    contentSecurityPolicy: false, // Disable for development
}));
app.use(compression());
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*'
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: 'Too many requests from this IP, please try again later.'
});

app.use('/api/', limiter);

// ============== API ROUTES ==============

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
});

// Create guest user
app.post('/api/user/guest', async (req, res) => {
    try {
        const user = await userService.createGuestUser();
        res.json(user);
    } catch (error) {
        console.error('Error creating guest user:', error);
        res.status(500).json({ error: 'Failed to create guest user' });
    }
});

// Get user info
app.get('/api/user/:userId', async (req, res) => {
    try {
        const user = await userService.getUser(req.params.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const canAnalyze = await userService.canUserAnalyze(user);

        res.json({
            id: user.id,
            plan: user.plan,
            credits: user.credits,
            canAnalyze: canAnalyze.allowed,
            remaining: canAnalyze.remaining
        });
    } catch (error) {
        console.error('Error getting user:', error);
        res.status(500).json({ error: 'Failed to get user info' });
    }
});

// Analyze URL
app.post('/api/analyze', async (req, res) => {
    try {
        const { url, userId } = req.body;

        if (!url || !userId) {
            return res.status(400).json({ error: 'URL and userId are required' });
        }

        // Get user
        const user = await userService.getUser(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check if user can analyze
        const canAnalyze = await userService.canUserAnalyze(user);
        if (!canAnalyze.allowed) {
            return res.status(403).json({
                error: 'Analysis limit exceeded',
                message: 'Upgrade your plan to continue analyzing',
                remaining: 0,
                limitExceeded: true
            });
        }

        // Perform analysis
        const result = await analyzeSEO(url);

        // Save analysis
        const { id: analysisId, publicToken } = await analysisService.saveAnalysis(userId, url, result, false);

        // Deduct credit
        await userService.deductCredit(userId, user);

        // Get updated user info
        const updatedUser = await userService.getUser(userId);
        const updatedCanAnalyze = await userService.canUserAnalyze(updatedUser);

        res.json({
            ...result,
            analysisId,
            remaining: updatedCanAnalyze.remaining
        });
    } catch (error) {
        console.error('Error analyzing URL:', error);
        res.status(500).json({ error: 'Failed to analyze URL', message: error.message });
    }
});

// Get user's analysis history
app.get('/api/analyses/:userId', async (req, res) => {
    try {
        const analyses = await analysisService.getUserAnalyses(req.params.userId);
        res.json(analyses);
    } catch (error) {
        console.error('Error getting analyses:', error);
        res.status(500).json({ error: 'Failed to get analyses' });
    }
});

// Get specific analysis
app.get('/api/analysis/:analysisId', async (req, res) => {
    try {
        const analysis = await analysisService.getAnalysis(req.params.analysisId);
        if (!analysis) {
            return res.status(404).json({ error: 'Analysis not found' });
        }
        res.json(analysis);
    } catch (error) {
        console.error('Error getting analysis:', error);
        res.status(500).json({ error: 'Failed to get analysis' });
    }
});

// Make analysis public and get shareable link
app.post('/api/analysis/:analysisId/share', async (req, res) => {
    try {
        const { userId } = req.body;
        const publicToken = await analysisService.makeAnalysisPublic(req.params.analysisId, userId);

        const shareUrl = `${process.env.PUBLIC_URL || 'http://localhost:3000'}/share/${publicToken}`;

        res.json({ publicToken, shareUrl });
    } catch (error) {
        console.error('Error sharing analysis:', error);
        res.status(500).json({ error: 'Failed to share analysis' });
    }
});

// Get public analysis
app.get('/api/public/:token', async (req, res) => {
    try {
        const analysis = await analysisService.getAnalysisByPublicToken(req.params.token);
        if (!analysis) {
            return res.status(404).json({ error: 'Public analysis not found' });
        }
        res.json(analysis);
    } catch (error) {
        console.error('Error getting public analysis:', error);
        res.status(500).json({ error: 'Failed to get public analysis' });
    }
});

// Get pricing
app.get('/api/pricing', (req, res) => {
    try {
        const pricing = paymentService.getPricing();
        res.json(pricing);
    } catch (error) {
        console.error('Error getting pricing:', error);
        res.status(500).json({ error: 'Failed to get pricing' });
    }
});

// x402 Payment rate limiter
const paymentLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // max 10 payment attempts per IP
    message: 'Too many payment attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
});

// x402: Request payment quote (returns 402)
app.post('/api/payment/quote', paymentLimiter, async (req, res) => {
    try {
        const { userId, plan } = req.body;

        if (!userId || !plan) {
            return res.status(400).json({ error: 'userId and plan are required' });
        }

        // Get pricing to validate plan
        const pricing = paymentService.getPricing();
        if (!pricing[plan]) {
            return res.status(400).json({ error: 'Invalid plan' });
        }

        // Create payment quote
        const quote = await paymentService.createPaymentQuote(userId, plan);

        // Return 402 Payment Required with quote data
        res.status(402).json(quote);
    } catch (error) {
        console.error('Error creating payment quote:', error);
        res.status(500).json({ error: 'Failed to create payment quote', message: error.message });
    }
});

// x402: Process payment with X-Payment header
app.post('/api/payment/process', paymentLimiter, async (req, res) => {
    try {
        const xPaymentHeader = req.header('X-Payment');
        const { transactionId, userId } = req.body;

        if (!xPaymentHeader) {
            return res.status(400).json({ error: 'X-Payment header is required' });
        }

        if (!transactionId || !userId) {
            return res.status(400).json({ error: 'transactionId and userId are required' });
        }

        // Verify and process payment
        const result = await paymentService.verifyAndProcessPayment(xPaymentHeader, transactionId, userId);

        res.json(result);
    } catch (error) {
        console.error('Error processing payment:', error);
        res.status(400).json({ error: 'Payment verification failed', message: error.message });
    }
});

// Get user transactions
app.get('/api/transactions/:userId', async (req, res) => {
    try {
        const transactions = await paymentService.getUserTransactions(req.params.userId);
        res.json(transactions);
    } catch (error) {
        console.error('Error getting transactions:', error);
        res.status(500).json({ error: 'Failed to get transactions' });
    }
});

// Serve public share page
app.get('/share/:token', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'share.html'));
});

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Global Stats
app.get('/api/stats', async (req, res) => {
    try {
        const stats = await analysisService.getGlobalStats();
        res.json(stats);
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 SEO Link Analyzer running on http://localhost:${PORT}`);
    console.log(`📊 API available at http://localhost:${PORT}/api`);
});
