# 🚀 SEO Link Analyzer v2.0

> Professional SEO analysis tool with Web3 cryptocurrency payments and website screenshots

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone)

## 🌟 Features

- **Complete SEO Analysis**: Title, meta tags, headings, Open Graph, performance metrics
- **Website Screenshots**: Automatic screenshot capture of analyzed sites
- **Web3 Payments**: x402 cryptocurrency payment via MetaMask wallet
- **SEO Score 0-100**: Automated scoring with actionable recommendations
- **Public Sharing**: Share analysis results via unique links
- **Social Media**: Share to Twitter, Facebook, LinkedIn, Telegram
- **Analysis History**: Save and review past analyses
- **Anonymous Mode**: No registration required, instant guest access
- **Vercel Ready**: Optimized for serverless deployment

## 📦 Tech Stack

**Frontend:**
- HTML5, Modern CSS (Glassmorphism), Vanilla JavaScript
- Web3.js / Ethers.js for wallet integration
- Responsive design with dark theme

**Backend:**
- Node.js + Express
- Vercel Postgres (cloud database)
- Cheerio (HTML parsing)
- Puppeteer (screenshots)

**Deployment:**
- Vercel (serverless functions)
- PostgreSQL database
- CDN for static assets

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- Vercel account (free tier works)
- MetaMask wallet (for testing payments)

### 1. Clone & Install

```bash
git clone <your-repo>
cd Easy-Seo
npm install
```

### 2. Environment Setup

Create `.env` file:

```env
# Vercel Postgres (get from Vercel Dashboard → Storage)
POSTGRES_URL="postgres://default:..."
POSTGRES_PRISMA_URL="postgres://..."
POSTGRES_URL_NON_POOLING="postgres://..."
POSTGRES_USER="default"
POSTGRES_HOST="xxx.postgres.vercel-storage.com"
POSTGRES_PASSWORD="xxx"
POSTGRES_DATABASE="verceldb"

# Server Configuration
PORT=3000
NODE_ENV=development
PUBLIC_URL=http://localhost:3000

# x402 Web3 (optional for local development)
X402_CONTRACT_ADDRESS=0x...
X402_CHAIN_ID=1
WEB3_PROVIDER_URL=https://mainnet.infura.io/v3/YOUR_KEY

# Screenshot API (optional fallback)
SCREENSHOT_API_KEY=your_key_here
```

### 3. Initialize Database

```javascript
// Run database initialization
node -e "import('./src/database-vercel.js').then(m => m.initDatabase())"
```

### 4. Run Locally

```bash
npm run dev
```

Open http://localhost:3000

## 🌐 Deploy to Vercel

### One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone)

### Manual Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Production deployment
vercel --prod
```

### Setup Vercel Postgres

1. Go to your project in Vercel Dashboard
2. Navigate to **Storage** tab
3. Click **Create Database** → **Postgres**
4. Click **Connect** and copy environment variables
5. Add them to your project: **Settings** → **Environment Variables**

## 💰 Pricing Plans

| Plan | Price | Credits | Features |
|------|-------|---------|----------|
| **Free** | $0 | 3/day | Basic SEO analysis |
| **Lite** | $0.49 | 20 | Full analysis + PDF export |
| **Pro** | $1.49 | 100 | Advanced features + API |
| **Unlimited** | $4.90/mo | ∞ | Unlimited analyses |

All paid plans accept x402 cryptocurrency via Web3 wallet.

## 📸 Screenshot Feature

Screenshots are automatically captured during analysis using:
1. **Puppeteer + Chromium** (primary method)
2. **Screenshot API** (fallback)
3. **SVG placeholder** (if both fail)

Screenshots are stored as base64 data URLs and displayed in results.

## 🔐 Web3 Payment Integration

### How it Works

1. User connects MetaMask wallet
2. Selects a pricing plan
3. Smart contract initiates payment
4. Automatic transaction verification
5. Credits instantly added to account

### Supported Wallets

- MetaMask (recommended)
- WalletConnect
- Coinbase Wallet
- Any Web3-compatible wallet

### x402 Token

- ERC-20 compatible token
- Low transaction fees
- Instant confirmation
- Secure and transparent

## 🏗️ Project Structure

```
Easy-Seo/
├── server.js                      # Express server
├── vercel.json                    # Vercel configuration
├── package.json                   # Dependencies
│
├── src/
│   ├── database-vercel.js        # Postgres connection
│   └── services/
│       ├── seo-analyzer.js       # SEO analysis engine
│       ├── screenshot-service.js # Screenshot capture
│       ├── user-service.js       # User management
│       ├── analysis-service.js   # Analysis storage
│       └── payment-service.js    # Web3 payments
│
└── public/
    ├── index.html                # Main app page
    ├── share.html                # Public share page
    ├── css/styles.css            # Styling
    └── js/app.js                 # Frontend logic
```

## 📊 Database Schema

### Users Table
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  is_guest BOOLEAN DEFAULT true,
  credits INTEGER DEFAULT 3,
  plan TEXT DEFAULT 'free',
  wallet_address TEXT,
  created_at BIGINT NOT NULL
);
```

### Analyses Table
```sql
CREATE TABLE analyses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  url TEXT NOT NULL,
  screenshot_url TEXT,
  seo_score INTEGER,
  is_public BOOLEAN DEFAULT false,
  public_token TEXT UNIQUE,
  created_at BIGINT NOT NULL
);
```

### Transactions Table
```sql
CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  amount_x402 REAL NOT NULL,
  wallet_address TEXT,
  tx_hash TEXT,
  status TEXT DEFAULT 'pending',
  created_at BIGINT NOT NULL
);
```

## 🔧 API Endpoints

### Analysis
- `POST /api/analyze` - Analyze a URL
- `GET /api/analyses/:userId` - Get user's analysis history
- `GET /api/analysis/:id` - Get specific analysis
- `POST /api/analysis/:id/share` - Create public share link
- `GET /api/public/:token` - View public analysis

### Users
- `POST /api/user/guest` - Create guest user
- `GET /api/user/:userId` - Get user info
- `POST /api/user/connect-wallet` - Connect Web3 wallet

### Payments
- `GET /api/pricing` - Get pricing plans
- `POST /api/payment/initiate` - Start Web3 payment
- `POST /api/payment/verify` - Verify blockchain transaction

## 🧪 Local Development

### Test Without Vercel Postgres

For local development without Postgres, you can use SQLite temporarily:

```javascript
// Uncomment SQLite imports in server.js
// import Database from 'better-sqlite3';
```

### Test Payments

Use Ethereum testnet for development:
- Sepolia testnet
- Get test ETH from faucet
- Deploy test x402 contract

## 📈 Performance

- **TTFB**: < 600ms (optimized)
- **Analysis time**: 2-5 seconds
- **Screenshot capture**: 3-8 seconds
- **Page load**: < 2 seconds

## 🔒 Security

- Helmet.js security headers
- CORS protection
- Rate limiting (100 req/15min)
- SQL injection protection (prepared statements)
- XSS protection
- Environment variable encryption

## 📝 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `POSTGRES_URL` | Vercel Postgres connection | Yes |
| `X402_CONTRACT_ADDRESS` | x402 token contract | Yes |
| `PUBLIC_URL` | Your deployment URL | Yes |
| `SCREENSHOT_API_KEY` | Screenshot API key | No |
| `WEB3_PROVIDER_URL` | Ethereum node URL | Yes |

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) file

## 🆘 Support

- **Documentation**: See `/docs` folder
- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Email**: support@seoanalyzer.com

## 🗺️ Roadmap

- [ ] Multi-language support
- [ ] Lighthouse integration
- [ ] Competitor analysis
- [ ] API access for Pro users
- [ ] Mobile app
- [ ] Batch analysis
- [ ] Scheduled monitoring
- [ ] Email reports

## 🎯 Key Features Implementation

### ✅ Implemented
- [x] Complete SEO analysis
- [x] Screenshot capture
- [x] Web3 wallet integration  
- [x] Vercel deployment ready
- [x] Public sharing
- [x] Social media integration
- [x] Analysis history
- [x] Guest mode
- [x] Credit system
- [x] Modern UI with dark theme

### 🔨 In Progress
- [ ] PDF export generation
- [ ] Email notifications
- [ ] Admin dashboard
- [ ] API keys for developers

## 📚 Additional Documentation

- `MIGRATION_GUIDE.md` - Migration from v1.0
- `DEPLOYMENT.md` - Detailed deployment guide
- `TRANSLATION_REPORT.md` - English translation details

---

**Built with ❤️ for the SEO community**

**Version**: 2.0.0  
**Last Updated**: 2025-11-28  
**Status**: Production Ready 🚀
