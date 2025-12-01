# Easy SEO - Docker Build and Deploy Guide

## Quick Start

### 1. Build Docker Image
```bash
docker build -t easy-seo:latest .
```

### 2. Run Locally
```bash
# Using .env file
docker run -p 3000:3000 --env-file .env easy-seo:latest

# Or with individual environment variables
docker run -p 3000:3000 \
  -e SUPABASE_URL=your-url \
  -e SUPABASE_KEY=your-key \
  -e SOLANA_RECIPIENT_WALLET=your-wallet \
  -e SOLANA_CLUSTER=devnet \
  easy-seo:latest
```

### 3. Test the Application
Open browser: http://localhost:3000

### 4. Push to Docker Hub
```bash
# Login to Docker Hub
docker login

# Tag the image
docker tag easy-seo:latest YOUR_USERNAME/easy-seo:latest

# Push to Docker Hub
docker push YOUR_USERNAME/easy-seo:latest
```

## Deploy to Akash Network

### Update akash-deployment.yml
```yaml
services:
  web:
    image: YOUR_USERNAME/easy-seo:latest
    expose:
      - port: 3000
        as: 80
        to:
          - global: true
    env:
      - SUPABASE_URL=your-supabase-url
      - SUPABASE_KEY=your-supabase-key
      - SOLANA_RECIPIENT_WALLET=your-wallet-address
      - SOLANA_CLUSTER=mainnet
      - SOLANA_RPC_MAINNET=your-custom-rpc-endpoint
      - FREE_DAILY_LIMIT=3
      - PRICE_LITE=0.49
      - CREDITS_LITE=20
      - PRICE_PRO=1.49
      - CREDITS_PRO=100
```

### Deploy
```bash
akash tx deployment create akash-deployment.yml --from YOUR_WALLET
```

## Environment Variables

### Required
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_KEY` - Your Supabase anon key
- `SOLANA_RECIPIENT_WALLET` - Your Solana wallet for receiving payments

### Optional (with defaults)
- `SOLANA_CLUSTER` - `devnet` or `mainnet` (default: devnet)
- `SOLANA_RPC_MAINNET` - Custom RPC endpoint for mainnet (REQUIRED for production)
- `SOLANA_RPC_DEVNET` - Custom RPC endpoint for devnet
- `FREE_DAILY_LIMIT` - Free tier daily limit (default: 3)
- `PRICE_LITE` - Lite plan price in USDC (default: 0.49)
- `CREDITS_LITE` - Lite plan credits (default: 20)
- `PRICE_PRO` - Pro plan price in USDC (default: 1.49)
- `CREDITS_PRO` - Pro plan credits (default: 100)

## Docker Commands Reference

```bash
# Build
docker build -t easy-seo:latest .

# Run with .env file
docker run -p 3000:3000 --env-file .env easy-seo:latest

# Run in background
docker run -d -p 3000:3000 --env-file .env --name easy-seo easy-seo:latest

# View logs
docker logs easy-seo

# Stop container
docker stop easy-seo

# Remove container
docker rm easy-seo

# Remove image
docker rmi easy-seo:latest
```

## Troubleshooting

### Container won't start
```bash
# Check logs
docker logs easy-seo

# Run interactively to see errors
docker run -it -p 3000:3000 --env-file .env easy-seo:latest
```

### Database connection issues
- Verify SUPABASE_URL and SUPABASE_KEY are correct
- Check if Supabase project is active
- Run migration script: `migrations/add_wallet_auth.sql`

### Payment issues
- For mainnet: MUST use custom RPC endpoint (QuickNode, Alchemy, Helius)
- Verify SOLANA_RECIPIENT_WALLET address is correct
- Check SOLANA_CLUSTER matches your RPC endpoint
