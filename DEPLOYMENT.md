# 🚀 Інструкція з деплою SEO Link Analyzer

## Швидкий старт (Локальна розробка)

### Крок 1: Встановлення Node.js

Переконайтесь, що у вас встановлено Node.js версії 16 або вище:
```bash
node --version
```

Якщо немає - завантажте з https://nodejs.org/

### Крок 2: Встановлення залежностей

```bash
cd d:\Projects\Easy-Seo
npm install
```

### Крок 3: Налаштування середовища

Скопіюйте `.env.example` в `.env`:
```bash
copy .env.example .env
```

Відредагуйте `.env` та встановіть:
- `X402_WALLET_ADDRESS` - вашу x402 адресу
- `X402_API_KEY` - ваш API ключ
- Інші параметри за необхідності

### Крок 4: Ініціалізація бази даних

```bash
npm run init-db
```

### Крок 5: Запуск

**Development режим** (з автоматичним перезавантаженням):
```bash
npm run dev
```

**Production режим**:
```bash
npm start
```

Відкрийте браузер: http://localhost:3000

---

## 🌍 Деплой на Production

### Варіант 1: Heroku (найпростіший)

#### 1. Створіть акаунт на Heroku
Зареєструйтеся на https://heroku.com

#### 2. Встановіть Heroku CLI
```bash
npm install -g heroku
heroku login
```

#### 3. Створіть додаток
```bash
heroku create seo-analyzer-yourname
```

#### 4. Встановіть змінні оточення
```bash
heroku config:set NODE_ENV=production
heroku config:set X402_WALLET_ADDRESS=your_wallet
heroku config:set X402_API_KEY=your_key
heroku config:set PUBLIC_URL=https://seo-analyzer-yourname.herokuapp.com
```

#### 5. Деплой
```bash
git init
git add .
git commit -m "Initial commit"
git push heroku main
```

#### 6. Ініціалізуйте БД
```bash
heroku run npm run init-db
```

#### 7. Відкрийте додаток
```bash
heroku open
```

**Ціна**: Безкоштовно (Hobby план)

---

### Варіант 2: DigitalOcean App Platform

#### 1. Створіть акаунт на DigitalOcean
https://www.digitalocean.com/

#### 2. Завантажте код на GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/seo-analyzer.git
git push -u origin main
```

#### 3. Створіть App
- Перейдіть в Apps → Create App
- Підключіть GitHub репозиторій
- Оберіть `node-js` buildpack
- Встановіть build command: `npm install && npm run init-db`
- Встановіть run command: `npm start`

#### 4. Додайте Environment Variables
В розділі Environment Variables додайте всі змінні з `.env`

#### 5. Deploy
Натисніть "Create Resources"

**Ціна**: від $5/місяць

---

### Варіант 3: Railway.app (швидкий і сучасний)

#### 1. Зареєструйтесь на Railway
https://railway.app/

#### 2. Створіть новий проект
- New Project → Deploy from GitHub repo
- Підключіть ваш репозиторій

#### 3. Додайте змінні
- Variables → Add Variables
- Додайте всі з `.env.example`

#### 4. Deploy
Railway автоматично задеплоїть при push в GitHub

**Ціна**: $5/місяць за активний проект

---

### Варіант 4: VPS (Ubuntu Server)

#### 1. Орендуйте VPS
Рекомендовані провайдери:
- DigitalOcean ($5/міс)
- Linode ($5/міс)
- Vultr ($5/міс)

Мінімальні вимоги:
- 1 GB RAM
- 1 vCPU
- 25 GB SSD

#### 2. Підключіться по SSH
```bash
ssh root@your_server_ip
```

#### 3. Встановіть Node.js
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### 4. Встановіть PM2 (process manager)
```bash
sudo npm install -g pm2
```

#### 5. Клонуйте проект
```bash
cd /var/www
git clone https://github.com/yourusername/seo-analyzer.git
cd seo-analyzer
```

#### 6. Встановіть залежності
```bash
npm install --production
```

#### 7. Створіть .env файл
```bash
nano .env
```
Вставте всі необхідні змінні

#### 8. Ініціалізуйте БД
```bash
npm run init-db
```

#### 9. Запустіть з PM2
```bash
pm2 start server.js --name seo-analyzer
pm2 startup
pm2 save
```

#### 10. Встановіть Nginx
```bash
sudo apt update
sudo apt install nginx
```

#### 11. Налаштуйте Nginx
```bash
sudo nano /etc/nginx/sites-available/seo-analyzer
```

Вставте:
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
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

#### 12. Активуйте конфігурацію
```bash
sudo ln -s /etc/nginx/sites-available/seo-analyzer /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 13. Встановіть SSL (Let's Encrypt)
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

**Готово!** Ваш сайт доступний на https://your-domain.com

---

## 🐳 Docker Deployment

### Локальний запуск через Docker

```bash
# Build image
docker build -t seo-analyzer .

# Run container
docker run -p 3000:3000 --env-file .env seo-analyzer
```

### Docker Compose

Створіть `docker-compose.yml`:

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - .env
    volumes:
      - ./data:/app/data
    restart: unless-stopped
```

Запуск:
```bash
docker-compose up -d
```

---

## 📊 Моніторинг та логи

### PM2 (VPS)
```bash
# Статус
pm2 status

# Логи
pm2 logs seo-analyzer

# Restart
pm2 restart seo-analyzer

# Monitoring dashboard
pm2 monit
```

### Heroku
```bash
# Логи в реальному часі
heroku logs --tail

# Останні 100 рядків
heroku logs -n 100
```

### Docker
```bash
# Логи контейнера
docker logs -f seo-analyzer
```

---

## 🔧 Оновлення після деплою

### Heroku
```bash
git add .
git commit -m "Update"
git push heroku main
```

### VPS
```bash
cd /var/www/seo-analyzer
git pull
npm install
pm2 restart seo-analyzer
```

---

## 🛠️ Налаштування DNS

Якщо ви використовуєте власний домен:

1. В панелі керування доменом додайте A-запис:
   - Type: A
   - Name: @ (або www)
   - Value: IP адреса вашого сервера
   - TTL: 3600

2. Зачекайте 1-24 години на поширення DNS

---

## ✅ Чеклист після деплою

- [ ] Сервіс доступний через URL
- [ ] База даних ініціалізована
- [ ] Аналіз сайтів працює
- [ ] Система кредитів функціонує
- [ ] Публічні посилання працюють
- [ ] SSL сертифікат встановлено (для production)
- [ ] Змінні оточення налаштовані
- [ ] Логи доступні
- [ ] Резервне копіювання налаштоване

---

## 🆘 Поширені проблеми

### Помилка "Cannot find module"
```bash
npm install
```

### Database locked
```bash
# Перезапустіть сервер
pm2 restart seo-analyzer
```

### Port already in use
```bash
# Змініть PORT в .env або
# Знайдіть процес:
lsof -i :3000
# Вбийте процес:
kill -9 PID
```

### 502 Bad Gateway (Nginx)
```bash
# Перевірте статус PM2
pm2 status
# Перевірте логи
pm2 logs
```

---

## 📞 Підтримка

Якщо виникли проблеми:
1. Перевірте логи
2. Перегляньте README.md
3. Створіть issue на GitHub

**Успішного деплою! 🚀**
