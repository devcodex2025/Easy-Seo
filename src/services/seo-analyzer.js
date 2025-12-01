import axios from 'axios';
import * as cheerio from 'cheerio';
import { captureScreenshot } from './screenshot-service.js';

export async function analyzeSEO(url, includeScreenshot = true) {
    const startTime = Date.now();
    const result = {
        url,
        title: null,
        titleLength: 0,
        metaDescription: null,
        metaDescriptionLength: 0,
        h1Count: 0,
        h2Count: 0,
        h3Count: 0,
        hasCanonical: false,
        canonicalUrl: null,
        ogTitle: null,
        ogDescription: null,
        ogImage: null,
        twitterCard: null,
        httpStatus: 0,
        finalUrl: url,
        redirectCount: 0,
        ttfb: 0,
        loadTime: 0,
        hasViewport: false,
        isHttps: false,
        securityHeaders: {},
        screenshot: null,
        warnings: [],
        recommendations: [],
        seoScore: 0
    };

    try {
        // Ensure URL has protocol
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
            result.finalUrl = url;
        }

        result.isHttps = url.startsWith('https://');

        // Capture screenshot (async, but wait for it before returning)
        if (includeScreenshot) {
            try {
                result.screenshot = await captureScreenshot(url);
            } catch (err) {
                console.error('Screenshot capture failed:', err);
                result.screenshot = null;
            }
        }

        // Fetch the page with timing
        const ttfbStart = Date.now();
        const response = await axios.get(url, {
            maxRedirects: 5,
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            validateStatus: (status) => status < 500
        });

        result.ttfb = Date.now() - ttfbStart;
        result.httpStatus = response.status;
        result.finalUrl = response.request.res.responseUrl || url;

        // Count redirects
        if (response.request._redirectable && response.request._redirectable._redirectCount) {
            result.redirectCount = response.request._redirectable._redirectCount;
        }

        // Security headers
        result.securityHeaders = {
            strictTransportSecurity: response.headers['strict-transport-security'] || null,
            contentSecurityPolicy: response.headers['content-security-policy'] || null,
            xFrameOptions: response.headers['x-frame-options'] || null,
            xContentTypeOptions: response.headers['x-content-type-options'] || null
        };

        // Parse HTML
        const $ = cheerio.load(response.data);

        // Title
        result.title = $('title').text().trim() || null;
        result.titleLength = result.title ? result.title.length : 0;

        // Meta description
        result.metaDescription = $('meta[name="description"]').attr('content') || null;
        result.metaDescriptionLength = result.metaDescription ? result.metaDescription.length : 0;

        // Headings
        result.h1Count = $('h1').length;
        result.h2Count = $('h2').length;
        result.h3Count = $('h3').length;

        // Helper to resolve relative URLs
        const resolveUrl = (relativeUrl) => {
            if (!relativeUrl) return null;
            try {
                return new URL(relativeUrl, url).href;
            } catch (e) {
                return relativeUrl;
            }
        };

        // Canonical
        const canonical = $('link[rel="canonical"]').attr('href');
        if (canonical) {
            result.hasCanonical = true;
            result.canonicalUrl = resolveUrl(canonical);
        }

        // Open Graph tags
        result.ogTitle = $('meta[property="og:title"]').attr('content') || null;
        result.ogDescription = $('meta[property="og:description"]').attr('content') || null;
        const ogImage = $('meta[property="og:image"]').attr('content');
        result.ogImage = resolveUrl(ogImage);

        // Twitter Card
        result.twitterCard = $('meta[name="twitter:card"]').attr('content') || null;

        // Viewport
        result.hasViewport = $('meta[name="viewport"]').length > 0;

        // Total load time
        result.loadTime = Date.now() - startTime;

        // Calculate SEO Score and generate warnings/recommendations
        calculateSEOScore(result);

    } catch (error) {
        result.error = error.message;
        result.warnings.push(`Analysis error: ${error.message}`);
        result.seoScore = 0;
    }

    return result;
}

function calculateSEOScore(result) {
    let score = 100;
    const warnings = [];
    const recommendations = [];

    // Title checks
    if (!result.title) {
        score -= 15;
        warnings.push('⚠️ Missing <title> tag');
        recommendations.push('Add a unique and descriptive page title (50-60 characters)');
    } else if (result.titleLength < 30) {
        score -= 5;
        warnings.push('⚠️ Title is too short');
        recommendations.push(`Title should be 50-60 characters (currently: ${result.titleLength})`);
    } else if (result.titleLength > 60) {
        score -= 5;
        warnings.push('⚠️ Title is too long');
        recommendations.push(`Title may be truncated in search results (currently: ${result.titleLength}, recommended: 50-60)`);
    }

    // Meta description checks
    if (!result.metaDescription) {
        score -= 10;
        warnings.push('⚠️ Missing meta description');
        recommendations.push('Add a meta description (150-160 characters)');
    } else if (result.metaDescriptionLength < 120) {
        score -= 5;
        warnings.push('⚠️ Meta description is too short');
        recommendations.push(`Meta description optimal length is 150-160 characters (currently: ${result.metaDescriptionLength})`);
    } else if (result.metaDescriptionLength > 160) {
        score -= 3;
        warnings.push('⚠️ Meta description is too long');
        recommendations.push(`Meta description may be truncated (currently: ${result.metaDescriptionLength})`);
    }

    // H1 checks
    if (result.h1Count === 0) {
        score -= 10;
        warnings.push('⚠️ Missing H1 heading');
        recommendations.push('Add one H1 heading per page');
    } else if (result.h1Count > 1) {
        score -= 5;
        warnings.push('⚠️ Multiple H1 tags found');
        recommendations.push('Use only one H1 heading per page');
    }

    // Canonical check
    if (!result.hasCanonical) {
        score -= 5;
        warnings.push('ℹ️ Missing canonical URL');
        recommendations.push('Add a canonical tag to avoid duplicate content issues');
    }

    // Open Graph checks
    if (!result.ogTitle || !result.ogDescription || !result.ogImage) {
        score -= 10;
        warnings.push('⚠️ Incomplete Open Graph tags');
        recommendations.push('Add og:title, og:description, and og:image for social media sharing');
    }

    // Twitter Card check
    if (!result.twitterCard) {
        score -= 3;
        warnings.push('ℹ️ Missing Twitter Card');
        recommendations.push('Add twitter:card meta tag for better Twitter/X appearance');
    }

    // HTTPS check
    if (!result.isHttps) {
        score -= 15;
        warnings.push('🔒 Site not using HTTPS');
        recommendations.push('CRITICAL: Switch to HTTPS for security');
    }

    // Viewport check
    if (!result.hasViewport) {
        score -= 10;
        warnings.push('📱 Missing viewport meta tag');
        recommendations.push('Add <meta name="viewport" content="width=device-width, initial-scale=1"> for mobile devices');
    }

    // Security headers
    if (!result.securityHeaders.strictTransportSecurity && result.isHttps) {
        score -= 5;
        warnings.push('🔒 Missing HSTS header');
        recommendations.push('Add Strict-Transport-Security header');
    }

    // Performance checks
    if (result.ttfb > 1000) {
        score -= 8;
        warnings.push('⚡ Slow TTFB (Time To First Byte)');
        recommendations.push(`TTFB: ${result.ttfb}ms - optimize server speed (recommended < 600ms)`);
    } else if (result.ttfb > 600) {
        score -= 4;
        warnings.push('⚡ TTFB could be improved');
        recommendations.push(`TTFB: ${result.ttfb}ms - can be improved (recommended < 600ms)`);
    }

    // Redirects
    if (result.redirectCount > 0) {
        score -= result.redirectCount * 3;
        warnings.push(`↪️ Found ${result.redirectCount} redirect(s)`);
        recommendations.push('Minimize redirects for faster page loading');
    }

    // Ensure score is in valid range
    result.seoScore = Math.max(0, Math.min(100, score));
    result.warnings = warnings;
    result.recommendations = recommendations;
}
