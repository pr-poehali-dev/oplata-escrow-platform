# OPLATA — API Documentation

## Base URLs

### Cloud Functions (Production)
- **API**: https://functions.poehali.dev/c94e52af-1969-46e3-80f1-6607b4ffeded
- **Auth**: https://functions.poehali.dev/3934f29b-6f78-4605-8e00-6f37af2c5b56
- **Orders**: https://functions.poehali.dev/bcb3516d-776e-407d-a270-7f081e3ea386
- **YooKassa**: https://functions.poehali.dev/9694571b-df2d-4986-a292-5e3a2f6f13f4

---

## Authentication

### Register / Login User
`POST /auth`

**Request Body:**
```json
{
  "telegramId": 123456789,
  "username": "ivan_user",
  "email": "ivan@example.com"
}
```

**Response:**
```json
{
  "user": {
    "id": 1,
    "telegramId": 123456789,
    "username": "ivan_user",
    "email": "ivan@example.com",
    "role": "user"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Get User by Telegram ID
`GET /auth?telegramId=123456789`

**Response:**
```json
{
  "user": {
    "id": 1,
    "telegramId": 123456789,
    "username": "ivan_user",
    "email": "ivan@example.com",
    "role": "user",
    "created_at": "2025-11-05T10:00:00Z"
  }
}
```

---

## Orders

### Create Order
`POST /orders`

**Request Body:**
```json
{
  "buyerId": 1,
  "sellerId": 2,
  "amount": 1500,
  "description": "Дизайн логотипа для стартапа"
}
```

**Response:**
```json
{
  "order": {
    "id": 1,
    "buyer_id": 1,
    "seller_id": 2,
    "amount": 1500,
    "commission": 75,
    "description": "Дизайн логотипа для стартапа",
    "status": "created",
    "created_at": "2025-11-05T12:00:00Z"
  },
  "paymentUrl": "https://yookassa.ru/checkout/1"
}
```

### Get Order by ID
`GET /orders?id=1`

**Response:**
```json
{
  "order": {
    "id": 1,
    "buyer_id": 1,
    "seller_id": 2,
    "amount": 1500,
    "currency": "RUB",
    "commission": 75,
    "description": "Дизайн логотипа",
    "status": "paid",
    "payment_id": "2c8f7e1a-...",
    "payment_url": "https://yookassa.ru/checkout/...",
    "buyer_username": "ivan_buyer",
    "seller_username": "anna_designer",
    "created_at": "2025-11-05T12:00:00Z",
    "updated_at": "2025-11-05T12:05:00Z"
  }
}
```

### Get Orders List
`GET /orders?userId=1`

Возвращает все сделки пользователя (как покупателя или продавца).

**Response:**
```json
{
  "orders": [
    {
      "id": 1,
      "amount": 1500,
      "status": "paid",
      "description": "Дизайн логотипа",
      "buyer_username": "ivan_buyer",
      "seller_username": "anna_designer",
      "created_at": "2025-11-05T12:00:00Z"
    }
  ]
}
```

### Confirm Order Delivery
`POST /orders?id=1&action=confirm`

Покупатель подтверждает получение товара/услуги.

**Response:**
```json
{
  "message": "Order completed successfully",
  "sellerAmount": 1425
}
```

### Open Dispute
`POST /orders?id=1&action=dispute`

**Request Body:**
```json
{
  "initiatorId": 1,
  "reason": "Не соответствует описанию"
}
```

**Response:**
```json
{
  "message": "Dispute opened successfully"
}
```

---

## Payments (YooKassa)

### Create Payment
`POST /yookassa`

**Request Body:**
```json
{
  "orderId": 1,
  "amount": 1500,
  "description": "Оплата сделки #1",
  "returnUrl": "https://your-app.com/payment-result"
}
```

**Response:**
```json
{
  "paymentId": "2c8f7e1a-bcb4-4f8e-9b6c-...",
  "paymentUrl": "https://yookassa.ru/checkout/...",
  "status": "pending"
}
```

### Get Payment Status
`GET /yookassa?paymentId=2c8f7e1a-...`

**Response:**
```json
{
  "paymentId": "2c8f7e1a-...",
  "status": "succeeded",
  "amount": {
    "value": "1500.00",
    "currency": "RUB"
  }
}
```

---

## Order Statuses

| Status | Description |
|--------|-------------|
| `created` | Сделка создана, ожидает оплаты |
| `pending` | Платеж инициирован |
| `paid` | Деньги получены, удерживаются |
| `delivered` | Продавец отметил выполнение |
| `completed` | Покупатель подтвердил, средства переведены продавцу |
| `dispute` | Открыт спор, ожидает решения админа |

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Missing required fields"
}
```

### 404 Not Found
```json
{
  "error": "Order not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "message": "Database connection failed"
}
```

---

## CORS

Все endpoints поддерживают CORS:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, X-Telegram-User-Id, X-Auth-Token
```

---

## Rate Limits

- **Auth**: 10 req/min per IP
- **Orders**: 30 req/min per user
- **Payments**: 5 req/min per user

---

## Database Schema

### users
```sql
id              SERIAL PRIMARY KEY
telegram_id     BIGINT UNIQUE NOT NULL
username        VARCHAR(255)
email           VARCHAR(255)
role            VARCHAR(50) DEFAULT 'user'
created_at      TIMESTAMP DEFAULT NOW()
```

### orders
```sql
id              SERIAL PRIMARY KEY
buyer_id        INTEGER REFERENCES users(id)
seller_id       INTEGER REFERENCES users(id)
amount          DECIMAL(10, 2) NOT NULL
currency        VARCHAR(3) DEFAULT 'RUB'
commission      DECIMAL(10, 2)
description     TEXT
status          VARCHAR(50) DEFAULT 'created'
payment_id      VARCHAR(255)
payment_url     TEXT
created_at      TIMESTAMP DEFAULT NOW()
updated_at      TIMESTAMP DEFAULT NOW()
```

### transactions
```sql
id                  SERIAL PRIMARY KEY
order_id            INTEGER REFERENCES orders(id)
type                VARCHAR(50)
amount              DECIMAL(10, 2)
gateway_response    JSONB
created_at          TIMESTAMP DEFAULT NOW()
```

### disputes
```sql
id              SERIAL PRIMARY KEY
order_id        INTEGER REFERENCES orders(id)
initiator_id    INTEGER REFERENCES users(id)
reason          TEXT
status          VARCHAR(50) DEFAULT 'open'
admin_decision  TEXT
created_at      TIMESTAMP DEFAULT NOW()
resolved_at     TIMESTAMP
```

### audit_logs
```sql
id          SERIAL PRIMARY KEY
order_id    INTEGER REFERENCES orders(id)
user_id     INTEGER
event_type  VARCHAR(100)
payload     JSONB
created_at  TIMESTAMP DEFAULT NOW()
```

---

## Examples

### Complete Order Flow

1. **Register users**
```bash
curl -X POST https://functions.poehali.dev/3934f29b-6f78-4605-8e00-6f37af2c5b56 \
  -H "Content-Type: application/json" \
  -d '{"telegramId": 111, "username": "buyer"}'

curl -X POST https://functions.poehali.dev/3934f29b-6f78-4605-8e00-6f37af2c5b56 \
  -H "Content-Type: application/json" \
  -d '{"telegramId": 222, "username": "seller"}'
```

2. **Create order**
```bash
curl -X POST https://functions.poehali.dev/bcb3516d-776e-407d-a270-7f081e3ea386 \
  -H "Content-Type: application/json" \
  -d '{"buyerId": 1, "sellerId": 2, "amount": 1500, "description": "Test order"}'
```

3. **Create payment**
```bash
curl -X POST https://functions.poehali.dev/9694571b-df2d-4986-a292-5e3a2f6f13f4 \
  -H "Content-Type: application/json" \
  -d '{"orderId": 1, "amount": 1500, "description": "Payment", "returnUrl": "https://app.com"}'
```

4. **Confirm delivery**
```bash
curl -X POST "https://functions.poehali.dev/bcb3516d-776e-407d-a270-7f081e3ea386?id=1&action=confirm"
```

---

**Version:** 1.0.0  
**Last Updated:** 05.11.2025
