# 💰 Інтеграція X402 Криптовалюти

## 📖 Що таке x402?

x402 - це криптовалюта, яка використовується для монетизації сервісу SEO Link Analyzer.

## 🔧 Налаштування

### Крок 1: Отримання гаманця x402

1. Створіть гаманець x402 на офіційному сайті
2. Збережіть адресу вашого гаманця
3. Отримайте API ключ для автоматизації

### Крок 2: Налаштування в .env

Відредагуйте файл `.env` (створіть з `.env.example`):

```env
# X402 Integration
X402_WALLET_ADDRESS=ваша_адреса_гаманця
X402_API_KEY=ваш_api_ключ
X402_WEBHOOK_SECRET=секретний_ключ_для_webhook
```

### Крок 3: Курс обміну

В файлі `src/services/payment-service.js` знайдіть:

```javascript
// X402 exchange rate (mock - in production, fetch from real API)
const X402_TO_USD_RATE = 0.0025; // 1 x402 = $0.0025
```

Оновіть курс відповідно до реального:
- Отримуйте з x402 API
- Або встановіть фіксований курс

## 💳 Процес оплати

### Як це працює:

1. **Користувач обирає план**
   - Free, Lite, Pro або Unlimited

2. **Створюється payment intent**
   ```javascript
   POST /api/payment/create
   {
     "userId": "user-id",
     "plan": "pro"
   }
   ```

3. **Відповідь містить:**
   - Суму в USD
   - Суму в x402
   - Адресу гаманця для оплати
   - Transaction ID

4. **Користувач здійснює переказ**
   - Копіює адресу гаманця
   - Відправляє x402 з свого гаманця
   - Отримує TX Hash (хеш транзакції)

5. **Підтвердження оплати**
   ```javascript
   POST /api/payment/confirm
   {
     "transactionId": "transaction-id",
     "txHash": "tx-hash-from-blockchain"
   }
   ```

6. **Автоматичне зарахування кредитів**
   - Система перевіряє транзакцію
   - Додає кредити користувачу
   - Оновлює план (якщо Unlimited)

## 🔄 Автоматизація через Webhook

### Налаштування webhook:

```javascript
// В x402 кабінеті встановіть webhook URL:
https://your-domain.com/api/payment/webhook

// Додайте endpoint в server.js:
app.post('/api/payment/webhook', async (req, res) => {
  const signature = req.headers['x-x402-signature'];
  const payload = req.body;
  
  // Перевірка підпису
  if (!verifyWebhookSignature(signature, payload)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  // Автоматичне підтвердження
  if (payload.status === 'confirmed') {
    await paymentService.confirmPayment(
      payload.transactionId, 
      payload.txHash
    );
  }
  
  res.json({ received: true });
});
```

## 📊 Тарифи та ціни

### Поточні тарифи:

```javascript
// В .env
PRICE_LITE=0.49          # $0.49 = ~196 x402
PRICE_PRO=1.49           # $1.49 = ~596 x402
PRICE_UNLIMITED_MONTHLY=4.90  # $4.90/міс = ~1960 x402

CREDITS_LITE=20          # 20 аналізів
CREDITS_PRO=100          # 100 аналізів
CREDITS_UNLIMITED=999999 # Необмежено
```

### Розрахунок курсу:

Якщо 1 x402 = $0.0025:
- Lite: $0.49 = 196 x402
- Pro: $1.49 = 596 x402
- Unlimited: $4.90 = 1960 x402

### Зміна цін:

Відредагуйте `.env`:
```env
PRICE_LITE=0.99    # Нова ціна
CREDITS_LITE=30    # Більше кредитів
```

## 🔐 Безпека

### 1. Захист API ключів
- ❌ Ніколи не публікуйте `.env` в git
- ✅ Використовуйте `.env.example` як шаблон
- ✅ На production використовуйте environment variables

### 2. Перевірка транзакцій
```javascript
async function verifyTransaction(txHash, expectedAmount) {
  // Запит до x402 blockchain API
  const tx = await fetch(`https://x402-api.com/tx/${txHash}`);
  const data = await tx.json();
  
  // Перевірки:
  if (data.to !== process.env.X402_WALLET_ADDRESS) {
    throw new Error('Wrong recipient');
  }
  
  if (data.amount < expectedAmount) {
    throw new Error('Insufficient amount');
  }
  
  if (!data.confirmed) {
    throw new Error('Transaction not confirmed');
  }
  
  return true;
}
```

### 3. Webhook security
```javascript
function verifyWebhookSignature(signature, payload) {
  const crypto = require('crypto');
  const secret = process.env.X402_WEBHOOK_SECRET;
  
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return signature === expectedSignature;
}
```

## 🧪 Тестування

### Mock режим (для розробки):

Створіть файл `src/services/payment-service-mock.js`:

```javascript
export function createPaymentIntent(userId, plan, amountUsd) {
  // Для тестування повертаємо fake дані
  return {
    transactionId: 'test-tx-' + Date.now(),
    amountUsd: amountUsd,
    amountX402: amountUsd / 0.0025,
    walletAddress: 'TEST-WALLET-ADDRESS',
    plan: plan,
    creditsToAdd: getCreditsForPlan(plan)
  };
}

export function confirmPayment(transactionId, txHash) {
  // В тест режимі приймаємо будь-який txHash
  if (txHash === 'test-hash') {
    return true;
  }
  throw new Error('Invalid test hash');
}
```

В `.env` додайте:
```env
X402_TEST_MODE=true
```

## 📈 Моніторинг платежів

### Перегляд транзакцій:

```sql
-- Всі платежі
SELECT * FROM transactions ORDER BY created_at DESC;

-- Успішні платежі
SELECT * FROM transactions WHERE payment_status = 'completed';

-- Сума за період
SELECT SUM(amount_usd) as total 
FROM transactions 
WHERE payment_status = 'completed' 
  AND created_at >= strftime('%s', 'now', '-30 days') * 1000;
```

### Dashboard endpoint:

```javascript
// Додайте в server.js (тільки для адміна!)
app.get('/api/admin/stats', async (req, res) => {
  // Додайте авторизацію!
  
  const stats = {
    totalRevenue: db.prepare(`
      SELECT SUM(amount_usd) as total 
      FROM transactions 
      WHERE payment_status = 'completed'
    `).get().total || 0,
    
    totalUsers: db.prepare('SELECT COUNT(*) as count FROM users').get().count,
    
    paidUsers: db.prepare(`
      SELECT COUNT(DISTINCT user_id) as count 
      FROM transactions 
      WHERE payment_status = 'completed'
    `).get().count
  };
  
  res.json(stats);
});
```

## 🎯 Рекомендації

### Для максимального заробітку:

1. **Низькі ціни** - збільшують конверсію
   - $0.49 - психологічно "дешево"
   - Більше покупців = більше доходу

2. **Unlimited план** - рекурентний дохід
   - $4.90/міс - стабільний дохід
   - Підписки краще за одноразові покупки

3. **Free tier** - залучення користувачів
   - 3/день достатньо для тестування
   - Стимулює апгрейд

4. **Прозорість** - показуйте ціни в x402 та USD
   - Користувачі бачать вартість
   - Довіра = конверсія

## 🔄 Альтернативні способи оплати

Якщо хочете додати інші методи:

```javascript
// PayPal, Stripe, та інші
app.post('/api/payment/create-stripe', async (req, res) => {
  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: { name: planInfo.name },
        unit_amount: planInfo.price * 100
      },
      quantity: 1
    }],
    mode: 'payment',
    success_url: `${process.env.PUBLIC_URL}/success`,
    cancel_url: `${process.env.PUBLIC_URL}/cancel`
  });
  
  res.json({ url: session.url });
});
```

## 📞 Підтримка

Питання з інтеграції x402:
- Документація x402: [вставте посилання]
- Support: support@seo-analyzer.com

---

**Готово до монетизації! 💰**
