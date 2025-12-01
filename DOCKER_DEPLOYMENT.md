# 🐳 Docker Deployment Guide

## Швидкий старт (Локальне тестування)

### 1. Побудова Docker образу
```bash
docker build -t easy-seo .
```

### 2. Запуск контейнера локально
```bash
docker run -p 3000:3000 \
  -e SUPABASE_URL=your_supabase_url \
  -e SUPABASE_KEY=your_supabase_key \
  -e SOLANA_RECIPIENT_WALLET=your_wallet \
  -e SOLANA_CLUSTER=devnet \
  easy-seo
```

Або використовуйте `.env` файл:
```bash
docker run -p 3000:3000 --env-file .env easy-seo
```

---

## 🌐 Production Deployment

### Варіант 1: Railway.app (Рекомендовано для Docker)

#### 1. Створіть акаунт на Railway
https://railway.app/

#### 2. Встановіть Railway CLI
```bash
npm i -g @railway/cli
```

#### 3. Авторизуйтесь
```bash
railway login
```

#### 4. Ініціалізуйте проект
```bash
railway init
```

#### 5. Додайте змінні оточення
```bash
railway variables set SUPABASE_URL=your_url
railway variables set SUPABASE_KEY=your_key
railway variables set SOLANA_RECIPIENT_WALLET=your_wallet
railway variables set SOLANA_CLUSTER=mainnet
railway variables set NODE_ENV=production
```

#### 6. Деплой
```bash
railway up
```

Railway автоматично виявить Dockerfile і побудує контейнер.

**Ціна**: $5/місяць за активний проект

---

### Варіант 2: Render.com

#### 1. Створіть акаунт на Render
https://render.com/

#### 2. Завантажте код на GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/easy-seo.git
git push -u origin main
```

#### 3. Створіть Web Service
- Dashboard → New → Web Service
- Підключіть GitHub репозиторій
- Оберіть "Docker" як Environment
- Додайте Environment Variables:
  - `SUPABASE_URL`
  - `SUPABASE_KEY`
  - `SOLANA_RECIPIENT_WALLET`
  - `SOLANA_CLUSTER`
  - `NODE_ENV=production`

#### 4. Deploy
Натисніть "Create Web Service"

**Ціна**: Безкоштовно (з обмеженнями) або від $7/місяць

---

### Варіант 3: DigitalOcean App Platform

#### 1. Завантажте на GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git push origin main
```

#### 2. Створіть App
- Apps → Create App
- Підключіть GitHub
- DigitalOcean автоматично виявить Dockerfile

#### 3. Налаштуйте Environment Variables
Додайте всі змінні з `.env.example`

#### 4. Deploy
Натисніть "Create Resources"

**Ціна**: від $5/місяць

---

### Варіант 4: Fly.io (Глобальний CDN)

#### 1. Встановіть Fly CLI
```bash
# Windows (PowerShell)
iwr https://fly.io/install.ps1 -useb | iex

# Linux/Mac
curl -L https://fly.io/install.sh | sh
```

#### 2. Авторизуйтесь
```bash
fly auth login
```

#### 3. Запустіть проект
```bash
fly launch
```

#### 4. Встановіть змінні
```bash
fly secrets set SUPABASE_URL=your_url
fly secrets set SUPABASE_KEY=your_key
fly secrets set SOLANA_RECIPIENT_WALLET=your_wallet
fly secrets set SOLANA_CLUSTER=mainnet
```

#### 5. Deploy
```bash
fly deploy
```

**Ціна**: Безкоштовно до певного ліміту, потім від $5/місяць

---

### Варіант 5: VPS з Docker

#### 1. Підключіться до VPS
```bash
ssh root@your_server_ip
```

#### 2. Встановіть Docker
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
```

#### 3. Клонуйте проект
```bash
git clone https://github.com/yourusername/easy-seo.git
cd easy-seo
```

#### 4. Створіть .env файл
```bash
nano .env
```
Додайте всі змінні

#### 5. Побудуйте і запустіть
```bash
docker build -t easy-seo .
docker run -d -p 3000:3000 --env-file .env --name easy-seo --restart unless-stopped easy-seo
```

#### 6. Налаштуйте Nginx (опціонально)
```bash
sudo apt install nginx
sudo nano /etc/nginx/sites-available/easy-seo
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/easy-seo /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 🔄 Оновлення

### Railway/Render/DigitalOcean
```bash
git add .
git commit -m "Update"
git push
```
Автоматичний деплой

### VPS
```bash
ssh root@your_server
cd easy-seo
git pull
docker build -t easy-seo .
docker stop easy-seo
docker rm easy-seo
docker run -d -p 3000:3000 --env-file .env --name easy-seo --restart unless-stopped easy-seo
```

---

## 📊 Моніторинг

### Перегляд логів
```bash
# Railway
railway logs

# Docker (VPS)
docker logs -f easy-seo

# Fly.io
fly logs
```

---

## ✅ Рекомендації

**Для початківців**: Railway.app або Render.com
- Найпростіша настройка
- Автоматичний деплой з GitHub
- Хороша безкоштовна версія

**Для досвідчених**: Fly.io або VPS
- Більше контролю
- Глобальний CDN (Fly.io)
- Дешевше при масштабуванні

**Найкраще співвідношення ціна/якість**: Railway.app
- $5/місяць
- Проста настройка
- Автоматичний деплой
- Хороша підтримка Docker
