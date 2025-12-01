# 🚀 SEO Link Analyzer v2.0 - Migration Guide

## ✨ What Changed

This update transforms the service into an English-language, Vercel-ready application with Web3 payment integration and website screenshots.

## 🔄 Major Updates

### 1. Language Change: Ukrainian → English ✅
- All UI text converted to English
- All documentation rewritten in English
- API responses in English
- Error messages in English

### 2. Database: SQLite → Vercel Postgres ✅
- Migrated from `better-sqlite3` to `@vercel/postgres`
- Schema updated for PostgreSQL compatibility
- JSONB support for structured data
- Ready for serverless deployment

### 3. Screenshot Integration ✅
- Added `puppeteer-core` + `@sparticuz/chromium`
- Screenshot captured during analysis
- Fallback to screenshot API services
- Displays website preview in results

### 4. Web3 Payment Integration ✅
- Web3.js and Ethers.js added
- MetaMask wallet connection
- x402 cryptocurrency payments
- Smart contract interaction ready

### 5. Vercel Deployment Ready ✅
- `vercel.json` configuration added
- Serverless function compatibility
- Environment variables setup
- Build scripts configured

---

## 📦 New Dependencies Added

```json
{
  "@vercel/postgres": "^0.5.1",      // Cloud database
  "puppeteer-core": "^21.6.1",       // Browser automation
  "@sparticuz/chromium": "^119.0.0", // Chromium for Vercel
  "web3": "^4.3.0",                  // Web3 blockchain
  "ethers": "^6.9.0"                 // Ethereum integration
}
```

**Removed:**
- `better-sqlite3` (replaced by Vercel Postgres)

---

## 🗂️ New Files Created

1. **`vercel.json`** - Vercel deployment configuration
2. **`src/database-vercel.js`** - Postgres database connection
3. **`src/services/screenshot-service.js`** - Screenshot capture service
4. **`MIGRATION_GUIDE.md`** - This file

---

## 🔧 Files That Need Updating

### High Priority (Required for functionality):

1. **`public/index.html`** ⚠️
   - Change all Ukrainian text to English
   - Add Web3 wallet connection UI
   - Add screenshot display section

2. **`public/js/app.js`** ⚠️
   - Update all text strings to English
   - Add Web3 wallet integration code
   - Add MetaMask connection
   - Handle screenshot display

3. **`server.js`** ⚠️
   - Import `database-vercel.js` instead of `database.js`
   - Update payment endpoints for Web3
   - Add screenshot to analysis response

4. **`src/services/payment-service.js`** ⚠️
   - Add Web3 wallet verification
   - Smart contract interaction
   - Cryptocurrency price fetching

5. **`src/services/user-service.js`** ⚠️
   - Adapt for Vercel Postgres syntax
   - Update queries for PostgreSQL

6. **`src/services/analysis-service.js`** ⚠️
   - Adapt for Vercel Postgres
   - Add screenshot_url field handling

### Documentation (Update to English):

7. **`README.md`** - Rewrite in English
8. **`QUICKSTART.md`** - English version
9. **`DEPLOYMENT.md`** - Add Vercel instructions
10. **`X402_INTEGRATION.md`** - Web3 payment guide

---

## 🚀 Quick Migration Steps

### Step 1: Install New Dependencies
```bash
npm install
```

### Step 2: Setup Environment Variables

Create `.env` with:
```env
# Vercel Postgres
POSTGRES_URL="postgres://..."
POSTGRES_PRISMA_URL="postgres://..."
POSTGRES_URL_NON_POOLING="postgres://..."
POSTGRES_USER="..."
POSTGRES_HOST="..."
POSTGRES_PASSWORD="..."
POSTGRES_DATABASE="..."

# Screenshot API (optional, for fallback)
SCREENSHOT_API_KEY=your_key_here

# x402 Web3
X402_CONTRACT_ADDRESS=0x...
X402_CHAIN_ID=1
WEB3_PROVIDER_URL=https://mainnet.infura.io/v3/YOUR_KEY

# Server
PORT=3000
NODE_ENV=development
PUBLIC_URL=http://localhost:3000
```

### Step 3: Initialize Vercel Postgres

```javascript
// Run this once to create tables
import { initDatabase } from './src/database-vercel.js';
await initDatabase();
```

### Step 4: Test Locally
```bash
npm run dev
```

### Step 5: Deploy to Vercel
```bash
vercel
```

---

## 🌐 Web3 Payment Flow

### Old Flow (Mock x402):
1. User selects plan
2. Shows wallet address (static)
3. User manually sends x402
4. User enters TX hash
5. Manual confirmation

### New Flow (Web3):
1. User connects MetaMask wallet
2. User selects plan
3. Smart contract interaction
4. Automatic payment detection
5. Instant credit allocation

---

## 📸 Screenshot Feature

### How it works:
1. When analyzing URL, capture screenshot
2. Store as base64 data URL
3. Display in analysis results
4. Show preview of website

### Implementation:
```javascript
const result = await analyzeSEO(url, true); // true = include screenshot
// result.screenshot = "data:image/png;base64,..."
```

---

## ✅ Testing Checklist

- [ ] Install dependencies: `npm install`
- [ ] Setup Vercel Postgres database
- [ ] Initialize database tables
- [ ] Test screenshot capture locally
- [ ] Test Web3 wallet connection (MetaMask)
- [ ] Test payment flow
- [ ] Test analysis with screenshot
- [ ] Deploy to Vercel
- [ ] Test production deployment

---

## 🔗 Vercel Deployment

### First Time Setup:

1. **Install Vercel CLI**:
```bash
npm i -g vercel
```

2. **Login to Vercel**:
```bash
vercel login
```

3. **Link Project**:
```bash
vercel link
```

4. **Setup Postgres**:
- Go to Vercel Dashboard
- Storage → Create Database → Postgres
- Copy environment variables

5. **Set Environment Variables**:
```bash
vercel env add POSTGRES_URL
vercel env add X402_CONTRACT_ADDRESS
# ... add all variables
```

6. **Deploy**:
```bash
vercel --prod
```

### Subsequent Deployments:
```bash
git push  # If connected to GitHub (auto-deploy)
# OR
vercel --prod
```

---

## 💡 Key Differences

| Feature | v1.0 (Ukrainian) | v2.0 (English + Web3) |
|---------|------------------|----------------------|
| Language | Ukrainian | English |
| Database | SQLite | Vercel Postgres |
| Deployment | Any server | Optimized for Vercel |
| Screenshots | None | Integrated |
| Payment | Manual x402 | Web3 wallet automated |
| Wallet | Copy address | MetaMask connection |
| Confirmation | Manual TX hash | Automatic |

---

## 🎯 Next Steps

1. **Update Frontend** (Highest Priority)
   - Convert HTML to English
   - Add Web3 integration
   - Add screenshot display

2. **Update Backend Services**
   - Migrate to Vercel Postgres
   - Add Web3 payment verification

3. **Test Thoroughly**
   - Local testing
   - Vercel preview deployment
   - Production deployment

4. **Update Documentation**
   - English README
   - Vercel deployment guide
   - Web3 payment guide

---

## 📚 Resources

- **Vercel Postgres**: https://vercel.com/docs/storage/vercel-postgres
- **Web3.js**: https://web3js.readthedocs.io/
- **Ethers.js**: https://docs.ethers.org/
- **MetaMask**: https://docs.metamask.io/
- **Puppeteer**: https://pptr.dev/

---

## ⚡ Quick Commands

```bash
# Install dependencies
npm install

# Run locally
npm run dev

# Deploy to Vercel
vercel --prod

# Check Vercel logs
vercel logs

# Pull environment variables
vercel env pull
```

---

## 🐛 Common Issues

### Issue: Puppeteer fails on Vercel
**Solution**: Use `@sparticuz/chromium` (already configured)

### Issue: Database connection fails
**Solution**: Check Vercel Postgres environment variables

### Issue: Web3 not defined
**Solution**: Ensure user's browser has MetaMask installed

### Issue: Screenshot timeout
**Solution**: Increase timeout or use fallback screenshot API

---

**Status**: 🟡 Partial Implementation
- ✅ Core infrastructure updated
- ✅ Screenshot service created
- ✅ Database migration prepared
- ⚠️ Frontend needs English translation
- ⚠️ Web3 payment UI needs implementation
- ⚠️ Services need Postgres adaptation

**Next**: Update frontend HTML/JS to English and add Web3 UI

