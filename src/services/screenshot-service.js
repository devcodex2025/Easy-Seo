import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import axios from 'axios';

// For local development, you might need to install Chrome locally
const isDev = process.env.NODE_ENV !== 'production';

export async function captureScreenshot(url) {
    let browser = null;

    try {
        // Ensure URL has protocol
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }

        // Launch browser
        browser = await puppeteer.launch({
            args: isDev ? puppeteer.defaultArgs() : chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: isDev
                ? process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
                : await chromium.executablePath(),
            headless: chromium.headless,
            ignoreHTTPSErrors: true,
        });

        const page = await browser.newPage();

        // Set viewport
        await page.setViewport({
            width: 1280,
            height: 800,
            deviceScaleFactor: 1,
        });

        // Navigate to URL with timeout
        await page.goto(url, {
            waitUntil: 'domcontentloaded', // Changed from networkidle0 for faster loading
            timeout: 30000, // Increased from 15000
        });

        // Wait a bit for dynamic content
        await page.waitForTimeout(2000); // Increased from 1000

        // Take screenshot
        const screenshot = await page.screenshot({
            type: 'png',
            fullPage: false, // Just viewport
            encoding: 'base64',
        });

        await browser.close();

        // Return as data URL
        return `data:image/png;base64,${screenshot}`;

    } catch (error) {
        if (browser) {
            await browser.close();
        }

        console.error('Screenshot error:', error);

        // Fallback: try using a screenshot API service
        return await fallbackScreenshot(url);
    }
}

async function fallbackScreenshot(url) {
    console.log('Using fallback screenshot generation for:', url);
    // Directly return placeholder to avoid "Invalid Key" errors from external APIs
    // unless a specific API key is configured
    return createPlaceholderImage(url);
}

function createPlaceholderImage(url) {
    // Create a simple SVG placeholder
    const svg = `
    <svg width="1280" height="800" xmlns="http://www.w3.org/2000/svg">
      <rect width="1280" height="800" fill="#1e293b"/>
      <text x="640" y="400" font-family="Arial" font-size="24" fill="#94a3b8" text-anchor="middle">
        Screenshot not available
      </text>
      <text x="640" y="440" font-family="Arial" font-size="16" fill="#64748b" text-anchor="middle">
        ${url}
      </text>
    </svg>
  `;

    const base64 = Buffer.from(svg).toString('base64');
    return `data:image/svg+xml;base64,${base64}`;
}

// Alternative: Use screenshot API service (recommended for production)
export async function captureScreenshotAPI(url) {
    try {
        // Ensure URL has protocol
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }

        // Use screenshotapi.net or similar service
        // This is a paid service but more reliable for production
        const apiKey = process.env.SCREENSHOT_API_KEY;

        if (!apiKey) {
            return await captureScreenshot(url);
        }

        const apiUrl = `https://shot.screenshotapi.net/screenshot`;
        const params = new URLSearchParams({
            url: url,
            width: '1280',
            height: '800',
            output: 'image',
            file_type: 'png',
            wait_for_event: 'load',
        });

        const response = await axios.get(`${apiUrl}?token=${apiKey}&${params.toString()}`, {
            responseType: 'arraybuffer',
            timeout: 20000,
        });

        const base64 = Buffer.from(response.data, 'binary').toString('base64');
        return `data:image/png;base64,${base64}`;

    } catch (error) {
        console.error('Screenshot API error:', error);
        return await captureScreenshot(url);
    }
}
