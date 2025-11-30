// Solana Web3 libraries will be loaded dynamically when needed for payments

// ==================== STATE MANAGEMENT ====================
const state = {
    userId: null,
    currentAnalysis: null,
    pricing: null
};

// ==================== API HELPERS ====================
const API_BASE = '/api';

async function apiCall(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });

        const data = await response.json();

        if (!response.ok) {
            const errorMessage = data.error || data.message || 'API request failed';
            const error = new Error(errorMessage);
            error.status = response.status;
            error.data = data;
            throw error;
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// ==================== INITIALIZATION ====================
async function initializeApp() {
    // Check if user exists in localStorage
    let userId = localStorage.getItem('userId');

    if (!userId) {
        // Create guest user
        try {
            const user = await apiCall('/user/guest', { method: 'POST' });
            userId = user.id;
            localStorage.setItem('userId', userId);
            state.userId = userId;
        } catch (error) {
            showNotification('Error creating user', 'error');
            return;
        }
    } else {
        state.userId = userId;
        // Verify user exists in database
        try {
            await apiCall(`/user/${userId}`);
        } catch (error) {
            // If user doesn't exist (404), create a new one
            if ((error.status === 404) || (error.message && error.message.toLowerCase().includes('not found'))) {
                console.log('User from localStorage not found in database, creating new user...');
                try {
                    const newUser = await apiCall('/user/guest', { method: 'POST' });
                    userId = newUser.id;
                    localStorage.setItem('userId', userId);
                    state.userId = userId;
                } catch (createError) {
                    console.error('Error creating new user:', createError);
                    showNotification('Error creating user. Please refresh the page.', 'error');
                    return;
                }
            } else {
                console.error('Error verifying user:', error);
            }
        }
    }

    // Load user info, pricing, and global stats
    await Promise.all([
        loadUserInfo(),
        loadPricing(),
        loadGlobalStats()
    ]).catch(error => {
        console.error('Error during app initialization:', error);
        showNotification('Failed to load initial data. Please refresh.', 'error');
    });

    // Setup event listeners
    setupEventListeners();
}

async function loadGlobalStats() {
    try {
        const stats = await apiCall('/stats');

        // Animate numbers
        const statAnalysesEl = document.getElementById('statAnalyses');
        if (statAnalysesEl) {
            animateValue('statAnalyses', 0, stats.totalAnalyses || 0, 2000);
        }

        // Format time (e.g., 1200ms -> 1.2s)
        const statTimeEl = document.getElementById('statTime');
        if (statTimeEl) {
            const timeValue = stats.avgLoadTime || 0;
            const timeDisplay = timeValue < 1000
                ? `${timeValue}ms`
                : `${(timeValue / 1000).toFixed(1)}s`;
            statTimeEl.textContent = timeDisplay;
        }

        // Update accuracy/score
        const statScoreEl = document.getElementById('statScore');
        if (statScoreEl) {
            statScoreEl.textContent = `${stats.avgScore || 0}%`;
        }

    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

function animateValue(id, start, end, duration) {
    if (start === end) return;
    const range = end - start;
    const current = start;
    const increment = end > start ? 1 : -1;
    const stepTime = Math.abs(Math.floor(duration / range));
    const obj = document.getElementById(id);

    let timer = setInterval(function () {
        start += increment;
        obj.textContent = start + (id === 'statAnalyses' ? '+' : '');
        if (start == end) {
            clearInterval(timer);
        }
    }, Math.max(stepTime, 50)); // Min 50ms step
}

async function loadUserInfo() {
    try {
        const user = await apiCall(`/user/${state.userId}`);
        updateCreditsDisplay(user);
    } catch (error) {
        console.error('Error loading user info:', error);

        // If user not found (404), create a new guest user
        if ((error.status === 404) || (error.message && error.message.toLowerCase().includes('not found'))) {
            console.log('User not found in database, creating new guest user...');
            try {
                const newUser = await apiCall('/user/guest', { method: 'POST' });
                state.userId = newUser.id;
                localStorage.setItem('userId', newUser.id);
                updateCreditsDisplay(newUser);
            } catch (createError) {
                console.error('Error creating new user:', createError);
                showNotification('Error creating user. Please refresh the page.', 'error');
            }
        } else {
            // Likely server error or connection refused
            showNotification('Cannot connect to server. Please ensure the backend is running.', 'error');
            const creditsText = document.getElementById('creditsText');
            if (creditsText) creditsText.textContent = 'Offline';
        }
    }
}

async function loadPricing() {
    try {
        state.pricing = await apiCall('/pricing');
    } catch (error) {
        console.error('Error loading pricing:', error);
    }
}

function updateCreditsDisplay(user) {
    const creditsText = document.getElementById('creditsText');
    if (!creditsText) return; // Element might not exist in HTML
    if (user.plan === 'unlimited') {
        creditsText.textContent = 'Unlimited';
    } else if (user.plan === 'free') {
        creditsText.textContent = `${user.remaining || 0}/${3} today`;
    } else {
        creditsText.textContent = `${user.credits || 0} credits`;
    }
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
    // Logo click - return to home
    const logo = document.querySelector('.logo');
    if (logo) {
        logo.style.cursor = 'pointer';
        logo.addEventListener('click', resetToHome);
    }

    // Analyze button
    document.getElementById('analyzeBtn').addEventListener('click', performAnalysis);

    // Enter key in URL input
    document.getElementById('urlInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performAnalysis();
        }
    });

    // Pricing modal
    const pricingBtn = document.getElementById('pricingBtn');
    if (pricingBtn) {
        pricingBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Pricing button clicked');
            showPricingModal();
        });
    } else {
        console.error('Pricing button not found!');
    }
    document.getElementById('closePricing').addEventListener('click', closePricingModal);
    document.getElementById('pricingOverlay').addEventListener('click', closePricingModal);

    // Handle static pricing buttons in HTML
    document.querySelectorAll('[data-plan]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const planKey = btn.getAttribute('data-plan');
            if (state.pricing && state.pricing[planKey]) {
                closePricingModal();
                showPaymentModal(planKey, state.pricing[planKey]);
            } else {
                showPricingModal();
            }
        });
    });

    // Payment modal
    document.getElementById('closePayment').addEventListener('click', closePaymentModal);
    document.getElementById('paymentOverlay').addEventListener('click', closePaymentModal);
    const copyAddressBtn = document.getElementById('copyAddress');
    if (copyAddressBtn) {
        copyAddressBtn.addEventListener('click', copyWalletAddress);
    }
    const confirmPaymentBtn = document.getElementById('confirmPaymentBtn');
    if (confirmPaymentBtn) {
        confirmPaymentBtn.addEventListener('click', confirmPayment);
    }
    const payWithPhantomBtn = document.getElementById('payWithPhantomBtn');
    if (payWithPhantomBtn) {
        payWithPhantomBtn.addEventListener('click', payWithPhantom);
    }

    // History modal
    const historyBtn = document.getElementById('historyBtn');
    if (historyBtn) {
        historyBtn.addEventListener('click', showHistoryModal);
    }
    document.getElementById('closeHistory').addEventListener('click', closeHistoryModal);
    document.getElementById('historyOverlay').addEventListener('click', closeHistoryModal);

    // Share modal
    document.getElementById('shareBtn').addEventListener('click', showShareModal);
    document.getElementById('closeShare').addEventListener('click', closeShareModal);
    document.getElementById('shareOverlay').addEventListener('click', closeShareModal);
    document.getElementById('copyShareLink').addEventListener('click', copyShareLink);

    // Social share buttons
    document.getElementById('shareTwitter').addEventListener('click', () => shareToSocial('twitter'));
    document.getElementById('shareFacebook').addEventListener('click', () => shareToSocial('facebook'));
    document.getElementById('shareLinkedIn').addEventListener('click', () => shareToSocial('linkedin'));
    document.getElementById('shareTelegram').addEventListener('click', () => shareToSocial('telegram'));

    // Export PDF
    const exportPdfBtn = document.getElementById('exportPdfBtn');
    if (exportPdfBtn) {
        exportPdfBtn.addEventListener('click', exportToPDF);
    }

    // New analysis
    const newAnalysisBtn = document.getElementById('newAnalysisBtn');
    if (newAnalysisBtn) {
        newAnalysisBtn.addEventListener('click', resetToHome);
    }
}

// ==================== ANALYSIS ====================
async function performAnalysis() {
    const urlInput = document.getElementById('urlInput');
    let url = urlInput.value.trim();

    if (!url) {
        showNotification('Please enter a URL', 'warning');
        return;
    }

    // Add protocol if missing
    if (!url.match(/^https?:\/\//i)) {
        url = 'https://' + url;
        urlInput.value = url;
    }

    // Check user limits before starting analysis
    try {
        const user = await apiCall(`/user/${state.userId}`);
        if (user.canAnalyze === false || user.remaining === 0) {
            showNotification('Analysis limit exceeded. Please upgrade your plan to continue.', 'error');
            setTimeout(() => {
                showPricingModal();
            }, 1000);
            return;
        }
    } catch (error) {
        console.error('Error checking user limits:', error);
        // Continue anyway, server will check
    }

    // Show loading with progress
    document.querySelector('.hero').style.display = 'none';
    document.getElementById('resultsSection').style.display = 'none';
    const loadingContainer = document.getElementById('loadingContainer');
    loadingContainer.style.display = 'block';

    // Initialize progress
    updateProgress(0, 'Initializing analysis...');
    addLogItem('Initializing analysis...', 'pending');

    try {
        // Simulate progress steps
        await simulateProgress([
            { progress: 10, message: 'Connecting to server...', delay: 300 },
            { progress: 25, message: 'Fetching website content...', delay: 500 },
            { progress: 40, message: 'Analyzing HTML structure...', delay: 600 },
            { progress: 55, message: 'Checking meta tags...', delay: 400 },
            { progress: 70, message: 'Analyzing performance metrics...', delay: 500 },
            { progress: 85, message: 'Generating screenshot...', delay: 600 },
            { progress: 95, message: 'Finalizing report...', delay: 400 }
        ]);

        updateProgress(100, 'Analysis complete!');
        addLogItem('Analysis complete!', 'completed');

        const result = await apiCall('/analyze', {
            method: 'POST',
            body: JSON.stringify({
                url,
                userId: state.userId
            })
        });

        state.currentAnalysis = result;

        // Hide loading, show results
        setTimeout(() => {
            loadingContainer.style.display = 'none';
            document.getElementById('resultsSection').style.display = 'block';
            displayResults(result);
            loadUserInfo();
            document.getElementById('resultsSection').scrollIntoView({ behavior: 'smooth' });
        }, 500);

    } catch (error) {
        updateProgress(0, 'Analysis failed');
        addLogItem(`Error: ${error.message}`, 'error');

        setTimeout(() => {
            loadingContainer.style.display = 'none';
            document.querySelector('.hero').style.display = 'block';
        }, 2000);

        // Check if limit exceeded
        if (error.status === 403 || (error.data && error.data.limitExceeded)) {
            showNotification('Analysis limit exceeded. Please upgrade your plan to continue.', 'error');
            setTimeout(() => {
                showPricingModal();
            }, 1000);
            return;
        }

        // If user not found (404), try to create a new user and retry
        if ((error.status === 404) || (error.message && error.message.toLowerCase().includes('user not found'))) {
            console.log('User not found, creating new guest user and retrying...');
            try {
                const newUser = await apiCall('/user/guest', { method: 'POST' });
                state.userId = newUser.id;
                localStorage.setItem('userId', newUser.id);

                // Retry analysis with new user
                showNotification('User recreated, retrying analysis...', 'info');
                await performAnalysis();
                return;
            } catch (createError) {
                console.error('Error creating new user:', createError);
                showNotification('Error creating user. Please refresh the page.', 'error');
                return;
            }
        }

        showNotification(error.message || 'Analysis error', 'error');
    }
}

function updateProgress(percentage, message) {
    const progressFill = document.getElementById('progressFill');
    const progressPercentage = document.getElementById('progressPercentage');

    if (progressFill) {
        progressFill.style.width = `${percentage}%`;
    }

    if (progressPercentage) {
        progressPercentage.textContent = `${percentage}%`;
    }

    if (message) {
        addLogItem(message, percentage === 100 ? 'completed' : 'active');
    }
}

function addLogItem(message, status = 'pending') {
    const logContainer = document.getElementById('analysisLog');
    if (!logContainer) return;

    const logItem = document.createElement('div');
    logItem.className = 'log-item';
    logItem.setAttribute('data-status', status);

    const icons = {
        pending: '⏳',
        active: '🔄',
        completed: '✅',
        error: '❌'
    };

    logItem.innerHTML = `
        <span class="log-icon">${icons[status] || '⏳'}</span>
        <span class="log-text">${message}</span>
    `;

    logContainer.appendChild(logItem);
    logContainer.scrollTop = logContainer.scrollHeight;

    // Update previous items
    const previousItems = logContainer.querySelectorAll('.log-item[data-status="active"]');
    previousItems.forEach(item => {
        if (item !== logItem) {
            item.setAttribute('data-status', 'completed');
            item.querySelector('.log-icon').textContent = '✅';
        }
    });
}

async function simulateProgress(steps) {
    for (const step of steps) {
        updateProgress(step.progress, step.message);
        await new Promise(resolve => setTimeout(resolve, step.delay));
    }
}

function displayResults(result) {
    // Display screenshot if available
    if (result.screenshot) {
        const screenshotCard = document.getElementById('screenshotCard');
        const screenshotImage = document.getElementById('screenshotImage');
        if (screenshotCard && screenshotImage) {
            screenshotImage.src = result.screenshot;
            screenshotCard.style.display = 'block';
        }
    }

    // SEO Score
    const score = result.seoScore || 0;
    document.getElementById('scoreValue').textContent = score;

    // Animate score ring
    const circumference = 2 * Math.PI * 70;
    const offset = circumference - (score / 100) * circumference;
    document.getElementById('scoreRing').style.strokeDashoffset = offset;

    // Score rating
    const scoreRating = document.getElementById('scoreRating');
    if (scoreRating) {
        if (score >= 80) {
            scoreRating.textContent = 'Excellent! 🎉';
            scoreRating.style.color = 'var(--success)';
        } else if (score >= 60) {
            scoreRating.textContent = 'Good 👍';
            scoreRating.style.color = 'var(--warning)';
        } else {
            scoreRating.textContent = 'Needs improvement';
            scoreRating.style.color = 'var(--error)';
        }
    }

    // Basic details
    const analyzedUrl = document.getElementById('analyzedUrl');
    const httpStatus = document.getElementById('httpStatus');
    const ttfbTime = document.getElementById('ttfbTime');
    const loadTime = document.getElementById('loadTime');

    if (analyzedUrl) analyzedUrl.textContent = result.finalUrl || result.url;
    if (httpStatus) httpStatus.textContent = result.httpStatus || '-';
    if (ttfbTime) ttfbTime.textContent = result.ttfb ? `${result.ttfb}ms` : '-';
    if (loadTime) loadTime.textContent = result.loadTime ? `${result.loadTime}ms` : '-';

    // Title
    const titleText = document.getElementById('titleText');
    const titleLength = document.getElementById('titleLength');
    const titleBadge = document.getElementById('titleBadge');

    if (titleText && titleLength && titleBadge) {
        if (result.title) {
            titleText.textContent = result.title;
            titleLength.textContent = `${result.titleLength} characters`;

            if (result.titleLength >= 30 && result.titleLength <= 60) {
                titleBadge.textContent = 'Good';
                titleBadge.className = 'card-badge good';
            } else if (result.titleLength < 30 || result.titleLength > 70) {
                titleBadge.textContent = 'Bad';
                titleBadge.className = 'card-badge bad';
            } else {
                titleBadge.textContent = 'Ok';
                titleBadge.className = 'card-badge warning';
            }
        } else {
            titleText.textContent = 'Missing';
            titleLength.textContent = '0 characters';
            titleBadge.textContent = 'Missing';
            titleBadge.className = 'card-badge bad';
        }
    }

    // Meta Description
    const metaText = document.getElementById('metaText');
    const metaLength = document.getElementById('metaLength');
    const metaBadge = document.getElementById('metaBadge');

    if (metaText && metaLength && metaBadge) {
        if (result.metaDescription) {
            metaText.textContent = result.metaDescription;
            metaLength.textContent = `${result.metaDescriptionLength} characters`;

            if (result.metaDescriptionLength >= 120 && result.metaDescriptionLength <= 160) {
                metaBadge.textContent = 'Good';
                metaBadge.className = 'card-badge good';
            } else if (result.metaDescriptionLength < 100 || result.metaDescriptionLength > 170) {
                metaBadge.textContent = 'Bad';
                metaBadge.className = 'card-badge bad';
            } else {
                metaBadge.textContent = 'Ok';
                metaBadge.className = 'card-badge warning';
            }
        } else {
            metaText.textContent = 'Missing';
            metaLength.textContent = '0 characters';
            metaBadge.textContent = 'Missing';
            metaBadge.className = 'card-badge bad';
        }
    }

    // Headings
    const h1Count = document.getElementById('h1Count');
    const h2Count = document.getElementById('h2Count');
    const h3Count = document.getElementById('h3Count');

    if (h1Count) h1Count.textContent = result.h1Count || 0;
    if (h2Count) h2Count.textContent = result.h2Count || 0;
    if (h3Count) h3Count.textContent = result.h3Count || 0;

    // Security checks
    setCheckStatus('httpsCheck', result.isHttps);
    setCheckStatus('hstsCheck', result.securityHeaders?.strictTransportSecurity);
    setCheckStatus('viewportCheck', result.hasViewport);

    // Open Graph - Display actual data
    const ogTitleCheck = document.getElementById('ogTitleCheck');
    const ogDescCheck = document.getElementById('ogDescCheck');
    const ogImageCheck = document.getElementById('ogImageCheck');
    const twitterCheck = document.getElementById('twitterCheck');

    if (ogTitleCheck) {
        if (result.ogTitle) {
            ogTitleCheck.className = 'check-item pass';
            ogTitleCheck.innerHTML = `<span>Open Graph Title: <strong>${result.ogTitle}</strong></span>`;
        } else {
            ogTitleCheck.className = 'check-item fail';
            ogTitleCheck.innerHTML = '<span>Open Graph Title: Missing</span>';
        }
    }

    if (ogDescCheck) {
        if (result.ogDescription) {
            ogDescCheck.className = 'check-item pass';
            const desc = result.ogDescription.length > 60 ? result.ogDescription.substring(0, 60) + '...' : result.ogDescription;
            ogDescCheck.innerHTML = `<span>Open Graph Description: <strong>${desc}</strong></span>`;
        } else {
            ogDescCheck.className = 'check-item fail';
            ogDescCheck.innerHTML = '<span>Open Graph Description: Missing</span>';
        }
    }

    if (ogImageCheck) {
        if (result.ogImage) {
            ogImageCheck.className = 'check-item pass';
            ogImageCheck.innerHTML = `<span>Open Graph Image: <strong>${result.ogImage.length > 40 ? result.ogImage.substring(0, 40) + '...' : result.ogImage}</strong></span>`;
        } else {
            ogImageCheck.className = 'check-item fail';
            ogImageCheck.innerHTML = '<span>Open Graph Image: Missing</span>';
        }
    }

    if (twitterCheck) {
        if (result.twitterCard) {
            twitterCheck.className = 'check-item pass';
            twitterCheck.innerHTML = `<span>Twitter Card: <strong>${result.twitterCard}</strong></span>`;
        } else {
            twitterCheck.className = 'check-item fail';
            twitterCheck.innerHTML = '<span>Twitter Card: Missing</span>';
        }
    }

    // Canonical
    const canonicalCheck = document.getElementById('canonicalCheck');
    const canonicalText = document.getElementById('canonicalText');

    if (canonicalCheck && canonicalText) {
        if (result.hasCanonical) {
            canonicalCheck.className = 'check-item pass';
            canonicalText.textContent = result.canonicalUrl || 'Present';
        } else {
            canonicalCheck.className = 'check-item fail';
            canonicalText.textContent = 'Missing';
        }
    }

    // Warnings
    const warningsList = document.getElementById('warningsList');
    warningsList.innerHTML = '';

    if (result.warnings && result.warnings.length > 0) {
        result.warnings.forEach(warning => {
            const li = document.createElement('li');
            li.textContent = warning;
            warningsList.appendChild(li);
        });
    } else {
        warningsList.innerHTML = '<li>No warnings! ✨</li>';
    }

    // Recommendations
    const recommendationsList = document.getElementById('recommendationsList');
    recommendationsList.innerHTML = '';

    if (result.recommendations && result.recommendations.length > 0) {
        result.recommendations.forEach(rec => {
            const li = document.createElement('li');
            li.textContent = rec;
            recommendationsList.appendChild(li);
        });
    } else {
        recommendationsList.innerHTML = '<li>No recommendations! 🎯</li>';
    }
}

function setCheckStatus(elementId, passed) {
    const element = document.getElementById(elementId);
    element.className = passed ? 'check-item pass' : 'check-item fail';
}

// ==================== PRICING MODAL ====================
function showPricingModal() {
    console.log('showPricingModal called');

    const modal = document.getElementById('pricingModal');
    if (!modal) {
        console.error('Pricing modal not found in HTML');
        showNotification('Pricing modal not found', 'error');
        return;
    }

    const grid = document.getElementById('pricingGrid');
    if (!grid) {
        console.error('Pricing grid not found in HTML');
        showNotification('Pricing grid not found', 'error');
        return;
    }

    // Show modal immediately
    modal.classList.add('active');
    console.log('Modal class added, modal display:', window.getComputedStyle(modal).display);

    // Force display in case CSS is not working
    if (window.getComputedStyle(modal).display === 'none') {
        modal.style.display = 'flex';
        console.log('Forced modal display to flex');
    }

    // Load pricing if not loaded
    if (!state.pricing) {
        console.log('Pricing not loaded, loading...');
        grid.innerHTML = '<div style="text-align: center; padding: 2rem;">Loading pricing...</div>';
        loadPricing().then(() => {
            if (state.pricing) {
                renderPricingCards(grid);
            } else {
                grid.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--error);">Failed to load pricing</div>';
            }
        }).catch(error => {
            console.error('Error loading pricing:', error);
            grid.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--error);">Error loading pricing</div>';
        });
        return;
    }

    renderPricingCards(grid);
}

function renderPricingCards(grid) {
    grid.innerHTML = '';

    Object.entries(state.pricing).forEach(([key, plan]) => {
        const card = document.createElement('div');
        card.className = `pricing-card ${key === 'pro' ? 'featured' : ''}`;

        const periodText = plan.period === 'day' ? 'per day' :
            plan.period === 'month' ? 'per month' :
                'one-time';

        card.innerHTML = `
            <div class="pricing-name">${plan.name}</div>
            <div class="pricing-price">$${plan.price.toFixed(2)}</div>
            <div class="pricing-period">${periodText}</div>
            <ul class="pricing-features">
                ${plan.features.map(f => `<li>${f}</li>`).join('')}
            </ul>
            <button class="btn btn-primary btn-lg" style="width: 100%; margin-top: auto;">
                ${key === 'free' ? 'Current Plan' : 'Get Started'}
            </button>
        `;

        const btn = card.querySelector('.btn');

        if (key !== 'free') {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                closePricingModal();
                showPaymentModal(key, plan);
            });
        } else {
            btn.disabled = true;
            btn.classList.add('btn-secondary');
            btn.classList.remove('btn-primary');
        }

        grid.appendChild(card);
    });
}

function closePricingModal() {
    document.getElementById('pricingModal').classList.remove('active');
}

// ==================== WALLET CONNECTION ====================
let connectedWallet = null;

async function connectSolanaWallet() {
    try {
        // Check if Phantom/Solflare is installed
        if (!window.solana) {
            showNotification('Please install Phantom wallet', 'warning');
            window.open('https://phantom.app/', '_blank');
            return null;
        }

        // Connect wallet
        const response = await window.solana.connect();
        connectedWallet = response.publicKey.toString();

        showNotification('Wallet connected! 🎉', 'success');
        updateWalletUI(connectedWallet);

        return connectedWallet;
    } catch (error) {
        console.error('Wallet connection error:', error);
        showNotification('Failed to connect wallet', 'error');
        return null;
    }
}

function updateWalletUI(walletAddress) {
    // Update header wallet display (if you have such element)
    const walletBtn = document.getElementById('walletBtn');
    if (walletBtn && walletAddress) {
        walletBtn.textContent = `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`;
        walletBtn.classList.add('connected');
    }
}

// ==================== PAYMENT MODAL ====================
let currentPaymentQuote = null;

async function showPaymentModal(planKey, plan) {
    const modal = document.getElementById('paymentModal');
    if (!modal) {
        console.error('Payment modal not found in HTML');
        return;
    }

    const paymentPlanName = document.getElementById('paymentPlanName');
    const paymentAmount = document.getElementById('paymentAmount');

    if (paymentPlanName) paymentPlanName.textContent = plan.name;
    if (paymentAmount) paymentAmount.textContent = `$${plan.price.toFixed(2)} (${plan.priceUSDC.toFixed(2)} USDC)`;

    modal.classList.add('active');

    // Get payment quote from server (402 response)
    try {
        const response = await fetch(`${API_BASE}/payment/quote`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: state.userId,
                plan: planKey
            })
        });

        // Expect 402 Payment Required
        if (response.status !== 402) {
            throw new Error('Unexpected response from server');
        }

        currentPaymentQuote = await response.json();

        // Payment details are already displayed in the modal
        // The payWithPhantomBtn will use currentPaymentQuote when clicked

    } catch (error) {
        console.error('Error getting payment quote:', error);
        showNotification('Error creating payment quote', 'error');
        closePaymentModal();
    }
}

function closePaymentModal() {
    document.getElementById('paymentModal').classList.remove('active');
    currentPaymentQuote = null;
}

function copyWalletAddress() {
    const walletAddress = document.getElementById('walletAddress');
    if (!walletAddress) return;

    const address = walletAddress.textContent;
    navigator.clipboard.writeText(address);
    showNotification('Address copied!', 'success');
}

// x402 Payment with Phantom Wallet
async function payWithPhantom() {
    if (!currentPaymentQuote) {
        showNotification('No active payment quote', 'error');
        return;
    }

    try {
        // Connect wallet if not connected
        if (!connectedWallet) {
            connectedWallet = await connectSolanaWallet();
            if (!connectedWallet) return;
        }

        showNotification('Loading payment libraries...', 'info');

        // Dynamically import Solana libraries
        const [{ Connection, PublicKey, Transaction }, { getAssociatedTokenAddress, createTransferInstruction, TOKEN_PROGRAM_ID }] = await Promise.all([
            import('https://unpkg.com/@solana/web3.js@1.98.4/lib/index.esm.js'),
            import('https://unpkg.com/@solana/spl-token@0.4.14/lib/index.esm.js')
        ]);

        showNotification('Creating transaction...', 'info');


        // Connect to Solana
        const connection = new Connection(
            currentPaymentQuote.cluster === 'mainnet'
                ? 'https://api.mainnet-beta.solana.com'
                : 'https://api.devnet.solana.com',
            'confirmed'
        );

        // Get sender's USDC token account
        const senderWallet = new PublicKey(connectedWallet);
        const recipientTokenAccount = new PublicKey(currentPaymentQuote.tokenAccount);
        const usdcMint = new PublicKey(currentPaymentQuote.mint);

        // Get or create sender's token account
        const senderTokenAccount = await getAssociatedTokenAddress(
            usdcMint,
            senderWallet
        );

        // Create transfer instruction
        const transferInstruction = createTransferInstruction(
            senderTokenAccount,
            recipientTokenAccount,
            senderWallet,
            currentPaymentQuote.amount,
            [],
            TOKEN_PROGRAM_ID
        );

        // Create transaction
        const transaction = new Transaction();
        transaction.add(transferInstruction);

        // Get recent blockhash
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = senderWallet;

        // Sign transaction with Phantom
        showNotification('Please approve in Phantom...', 'info');
        const signedTx = await window.solana.signTransaction(transaction);

        // Serialize transaction
        const serializedTx = signedTx.serialize({ requireAllSignatures: false });

        // Convert Uint8Array to base64 (browser-compatible)
        const base64Tx = btoa(String.fromCharCode(...serializedTx));

        // Create x402 payment payload
        const x402Payload = {
            x402Version: 1,
            scheme: 'exact',
            network: currentPaymentQuote.network,
            payload: {
                serializedTransaction: base64Tx
            }
        };

        // Encode as base64 for X-Payment header (browser-compatible)
        const xPaymentHeader = btoa(JSON.stringify(x402Payload));

        // Send to server
        showNotification('Verifying payment...', 'info');

        const result = await apiCall('/payment/process', {
            method: 'POST',
            headers: {
                'X-Payment': xPaymentHeader
            },
            body: JSON.stringify({
                transactionId: currentPaymentQuote.transactionId,
                userId: state.userId
            })
        });

        showNotification(`Payment confirmed! 🚀 ${result.creditsAdded} credits added`, 'success');

        // Show transaction link
        if (result.explorerUrl) {
            showNotification(`View on Explorer: ${result.explorerUrl}`, 'info');
        }

        closePaymentModal();

        // Reload user info
        await loadUserInfo();

    } catch (error) {
        console.error('Payment error:', error);
        showNotification(error.message || 'Payment failed', 'error');
    }
}

// Manual payment confirmation (legacy)
async function confirmPayment() {
    const txHashInput = document.getElementById('txHashInput');
    if (!txHashInput) {
        showNotification('Payment input not found', 'error');
        return;
    }

    const txHash = txHashInput.value.trim();

    if (!txHash) {
        showNotification('Please enter Transaction Signature', 'warning');
        return;
    }

    if (!currentPaymentQuote) {
        showNotification('Error: no active payment', 'error');
        return;
    }

    try {
        const btn = document.getElementById('confirmPaymentBtn');
        const originalText = btn.textContent;
        btn.textContent = 'Verifying...';
        btn.disabled = true;

        // Note: This is old flow - keeping for backward compatibility
        // In production, remove this or update to match x402
        showNotification('Please use "Pay with Phantom" button for x402 payments', 'warning');

    } catch (error) {
        showNotification(error.message || 'Payment confirmation failed', 'error');
    } finally {
        const btn = document.getElementById('confirmPaymentBtn');
        btn.textContent = 'Confirm Payment';
        btn.disabled = false;
    }
}

// ==================== HISTORY MODAL ====================
async function showHistoryModal() {
    const modal = document.getElementById('historyModal');
    const list = document.getElementById('historyList');

    list.innerHTML = '<p style="text-align:center; color: var(--text-muted);">Loading...</p>';

    modal.classList.add('active');

    try {
        const analyses = await apiCall(`/analyses/${state.userId}`);

        list.innerHTML = '';

        if (analyses.length === 0) {
            list.innerHTML = '<p style="text-align:center; color: var(--text-muted);">No history yet</p>';
            return;
        }

        analyses.forEach(analysis => {
            const item = document.createElement('div');
            item.className = 'history-item';

            const date = new Date(analysis.created_at).toLocaleString('en-US');
            const scoreClass = analysis.seo_score >= 80 ? 'good' :
                analysis.seo_score >= 60 ? 'medium' : 'bad';

            item.innerHTML = `
                <div class="history-url">${analysis.url}</div>
                <div class="history-meta">
                    <span class="history-score ${scoreClass}">SEO: ${analysis.seo_score}</span>
                    <span>${date}</span>
                </div>
            `;

            item.addEventListener('click', () => {
                loadHistoryAnalysis(analysis);
                closeHistoryModal();
            });

            list.appendChild(item);
        });

    } catch (error) {
        list.innerHTML = '<p style="text-align:center; color: var(--error);">Loading error</p>';
    }
}

function closeHistoryModal() {
    document.getElementById('historyModal').classList.remove('active');
}

function loadHistoryAnalysis(analysis) {
    // Convert database format to display format
    const result = {
        url: analysis.url,
        finalUrl: analysis.final_url,
        title: analysis.title,
        titleLength: analysis.title_length,
        metaDescription: analysis.meta_description,
        metaDescriptionLength: analysis.meta_description_length,
        h1Count: analysis.h1_count,
        h2Count: analysis.h2_count,
        h3Count: analysis.h3_count,
        hasCanonical: analysis.has_canonical === 1,
        canonicalUrl: analysis.canonical_url,
        ogTitle: analysis.og_title,
        ogDescription: analysis.og_description,
        ogImage: analysis.og_image,
        twitterCard: analysis.twitter_card,
        httpStatus: analysis.http_status,
        redirectCount: analysis.redirect_count,
        ttfb: analysis.ttfb,
        loadTime: analysis.load_time,
        hasViewport: analysis.has_viewport === 1,
        isHttps: analysis.is_https === 1,
        securityHeaders: analysis.security_headers,
        seoScore: analysis.seo_score,
        warnings: analysis.warnings,
        recommendations: analysis.recommendations,
        screenshot: analysis.screenshot_url,
        analysisId: analysis.id
    };

    state.currentAnalysis = result;

    document.querySelector('.hero').style.display = 'none';
    document.getElementById('resultsSection').style.display = 'block';
    displayResults(result);

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==================== SHARE MODAL ====================
let currentShareUrl = null;

async function showShareModal() {
    if (!state.currentAnalysis || !state.currentAnalysis.analysisId) {
        showNotification('Please perform an analysis first', 'warning');
        return;
    }

    const modal = document.getElementById('shareModal');
    const shareLink = document.getElementById('shareLink');

    shareLink.textContent = 'Generating link...';

    modal.classList.add('active');

    try {
        const result = await apiCall(`/analysis/${state.currentAnalysis.analysisId}/share`, {
            method: 'POST',
            body: JSON.stringify({
                userId: state.userId
            })
        });

        currentShareUrl = result.shareUrl;
        shareLink.textContent = currentShareUrl;

    } catch (error) {
        shareLink.textContent = 'Generation error';
        showNotification('Error creating link', 'error');
    }
}

function closeShareModal() {
    document.getElementById('shareModal').classList.remove('active');
}

function copyShareLink() {
    if (!currentShareUrl) return;

    navigator.clipboard.writeText(currentShareUrl);
    showNotification('Link copied!', 'success');
}

function shareToSocial(platform) {
    if (!currentShareUrl) return;

    const text = `Check out this SEO analysis! Score: ${state.currentAnalysis.seoScore}/100`;
    const encodedUrl = encodeURIComponent(currentShareUrl);
    const encodedText = encodeURIComponent(text);

    let shareUrl;

    switch (platform) {
        case 'twitter':
            shareUrl = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
            break;
        case 'facebook':
            shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
            break;
        case 'linkedin':
            shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
            break;
        case 'telegram':
            shareUrl = `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;
            break;
    }

    window.open(shareUrl, '_blank', 'width=600,height=400');
}

// ==================== EXPORT PDF ====================
async function exportToPDF() {
    if (!state.currentAnalysis) {
        showNotification('No data to export', 'warning');
        return;
    }

    try {
        showNotification('Generating PDF...', 'info');

        // Check if jsPDF is loaded
        if (!window.jspdf) {
            showNotification('PDF library not loaded. Please refresh the page.', 'error');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        // Colors
        const primaryColor = [255, 225, 53];
        const darkBg = [18, 18, 18];
        const cardBg = [30, 30, 30];
        const textColor = [255, 255, 255];
        const mutedColor = [160, 160, 160];

        // Header
        doc.setFillColor(...primaryColor);
        doc.rect(0, 0, 210, 40, 'F');

        doc.setTextColor(...darkBg);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(24);
        doc.text('Easy SEO', 20, 25);

        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text('SEO Analysis Report', 20, 32);

        let yPos = 50;

        // URL
        doc.setTextColor(...textColor);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Analyzed URL:', 20, yPos);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(...mutedColor);
        const url = state.currentAnalysis.finalUrl || state.currentAnalysis.url;
        doc.text(url.length > 80 ? url.substring(0, 80) + '...' : url, 20, yPos + 7);
        yPos += 20;

        // Score
        doc.setFillColor(...cardBg);
        doc.rect(20, yPos, 170, 30, 'F');
        doc.setTextColor(...primaryColor);
        doc.setFontSize(36);
        doc.setFont('helvetica', 'bold');
        doc.text(`${state.currentAnalysis.seoScore || 0}`, 30, yPos + 20);
        doc.setFontSize(14);
        doc.text('SEO Score', 70, yPos + 12);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...mutedColor);
        doc.text(`Load Time: ${state.currentAnalysis.loadTime || 0}ms`, 70, yPos + 20);
        doc.text(`TTFB: ${state.currentAnalysis.ttfb || 0}ms`, 70, yPos + 26);
        yPos += 40;

        // Title
        if (state.currentAnalysis.title) {
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...textColor);
            doc.text('Page Title:', 20, yPos);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(...mutedColor);
            const title = state.currentAnalysis.title;
            doc.text(title.length > 80 ? title.substring(0, 80) + '...' : title, 20, yPos + 7);
            doc.text(`Length: ${state.currentAnalysis.titleLength || 0} characters`, 20, yPos + 14);
            yPos += 25;
        }

        // Meta Description
        if (state.currentAnalysis.metaDescription) {
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...textColor);
            doc.text('Meta Description:', 20, yPos);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(...mutedColor);
            const desc = state.currentAnalysis.metaDescription;
            const descLines = doc.splitTextToSize(desc, 170);
            doc.text(descLines, 20, yPos + 7);
            doc.text(`Length: ${state.currentAnalysis.metaDescriptionLength || 0} characters`, 20, yPos + 7 + (descLines.length * 5));
            yPos += 20 + (descLines.length * 5);
        }

        // Headings
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...textColor);
        doc.text('Headings:', 20, yPos);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(...mutedColor);
        doc.text(`H1: ${state.currentAnalysis.h1Count || 0}`, 30, yPos + 7);
        doc.text(`H2: ${state.currentAnalysis.h2Count || 0}`, 30, yPos + 14);
        doc.text(`H3: ${state.currentAnalysis.h3Count || 0}`, 30, yPos + 21);
        yPos += 35;

        // Warnings
        if (state.currentAnalysis.warnings && state.currentAnalysis.warnings.length > 0) {
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(255, 152, 0);
            doc.text('Warnings:', 20, yPos);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(...mutedColor);
            state.currentAnalysis.warnings.slice(0, 5).forEach((warning, i) => {
                doc.text(`• ${warning}`, 25, yPos + 7 + (i * 5));
            });
            yPos += 15 + (Math.min(state.currentAnalysis.warnings.length, 5) * 5);
        }

        // Recommendations
        if (state.currentAnalysis.recommendations && state.currentAnalysis.recommendations.length > 0) {
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(33, 150, 243);
            doc.text('Recommendations:', 20, yPos);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(...mutedColor);
            state.currentAnalysis.recommendations.slice(0, 5).forEach((rec, i) => {
                doc.text(`• ${rec}`, 25, yPos + 7 + (i * 5));
            });
            yPos += 15 + (Math.min(state.currentAnalysis.recommendations.length, 5) * 5);
        }

        // Footer
        doc.setFontSize(8);
        doc.setTextColor(...mutedColor);
        doc.text('Generated by Easy SEO', 20, 285);
        doc.text(new Date().toLocaleDateString(), 170, 285);

        // Save PDF
        const filename = `seo-analysis-${new Date().getTime()}.pdf`;
        doc.save(filename);
        showNotification('PDF exported successfully!', 'success');
        if (state.currentAnalysis.recommendations && state.currentAnalysis.recommendations.length > 0) {
            if (yPos > 250) {
                doc.addPage();
                yPos = 20;
            }
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(33, 150, 243);
            doc.text('Recommendations:', 20, yPos);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(...mutedColor);
            state.currentAnalysis.recommendations.slice(0, 5).forEach((rec, i) => {
                doc.text(`• ${rec}`, 25, yPos + 7 + (i * 5));
            });
        }

        // Footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(...mutedColor);
            doc.text(`Page ${i} of ${pageCount}`, 105, 287, { align: 'center' });
            doc.text(`Generated by Easy SEO - ${new Date().toLocaleDateString()}`, 105, 292, { align: 'center' });
        }

        // Save PDF
        const fileName = `easy-seo-analysis-${Date.now()}.pdf`;
        doc.save(fileName);

        showNotification('PDF exported successfully!', 'success');
    } catch (error) {
        console.error('PDF export error:', error);
        showNotification('Error generating PDF. Please try again.', 'error');
    }
}

// ==================== UTILITIES ====================
function resetToHome() {
    document.getElementById('resultsSection').style.display = 'none';
    document.getElementById('screenshotCard').style.display = 'none';
    document.getElementById('loadingContainer').style.display = 'none';
    const hero = document.querySelector('.hero');
    if (hero) {
        hero.style.display = 'block';
    }
    const urlInput = document.getElementById('urlInput');
    if (urlInput) {
        urlInput.value = '';
    }
    state.currentAnalysis = null;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: var(--bg-secondary);
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        color: var(--text-primary);
        box-shadow: var(--shadow-lg);
        z-index: 10000;
        animation: slideIn 0.3s ease;
        max-width: 400px;
    `;

    const colors = {
        success: 'var(--success)',
        error: 'var(--error)',
        warning: 'var(--warning)',
        info: 'var(--info)'
    };

    notification.style.borderLeftColor = colors[type];
    notification.style.borderLeftWidth = '4px';
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(400px); opacity: 0; }
    }
`;
document.head.appendChild(style);

// ==================== START APP ====================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    // DOM is already ready, call immediately
    initializeApp();
}
