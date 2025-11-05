# OPLATA — Руководство по развертыванию

## 🚀 Быстрый старт

### 1. Локальная разработка

```bash
# Клонируйте репозиторий
git clone <your-repo-url>
cd oplata

# Установите зависимости
npm install

# Скопируйте .env
cp .env.example .env

# Запустите PostgreSQL
docker-compose up postgres -d

# Запустите frontend
npm run dev
```

Frontend: http://localhost:5173

**Backend функции уже развернуты:**
- API: https://functions.poehali.dev/c94e52af-1969-46e3-80f1-6607b4ffeded
- Auth: https://functions.poehali.dev/3934f29b-6f78-4605-8e00-6f37af2c5b56
- Orders: https://functions.poehali.dev/bcb3516d-776e-407d-a270-7f081e3ea386
- YooKassa: https://functions.poehali.dev/9694571b-df2d-4986-a292-5e3a2f6f13f4

---

## 🐳 Полный деплой с Docker

### Запуск всего стека

```bash
# Поднять все сервисы (PostgreSQL + Redis + Frontend + Nginx)
docker-compose up -d

# Проверить статус
docker-compose ps

# Логи
docker-compose logs -f
```

Приложение доступно:
- HTTP: http://localhost:80
- HTTPS: https://localhost:443

---

## 📊 База данных

### Миграции

Миграции применяются автоматически при старте PostgreSQL из папки `db_migrations/`.

**Текущая схема (V0001):**
- `users` — пользователи
- `orders` — сделки
- `transactions` — платежи
- `disputes` — споры
- `audit_logs` — события

### Backup

```bash
# Создать backup
docker exec oplata_postgres pg_dump -U oplata_user oplata > backup.sql

# Восстановить
docker exec -i oplata_postgres psql -U oplata_user oplata < backup.sql
```

---

## 💳 Настройка ЮKassa

### Sandbox (тестирование)

1. Регистрация: https://yookassa.ru
2. **Настройки → Данные для интеграции → Тестовый режим**
3. Скопируйте Shop ID и Secret Key в `.env`:
   ```
   YUKASSA_SHOP_ID=123456
   YUKASSA_SECRET_KEY=test_AbCdEf...
   YUKASSA_MODE=sandbox
   ```
4. Тестовые карты: https://yookassa.ru/developers/payment-acceptance/testing-and-going-live/testing

### Production

1. Пройдите верификацию в ЮKassa
2. Получите боевые ключи
3. Обновите `.env`:
   ```
   YUKASSA_MODE=production
   YUKASSA_SHOP_ID=<боевой>
   YUKASSA_SECRET_KEY=<боевой>
   ```

---

## 🤖 Telegram Bot

### Создание

1. Откройте **@BotFather** в Telegram
2. `/newbot` → следуйте инструкциям
3. Скопируйте токен в `.env`:
   ```
   TELEGRAM_BOT_TOKEN=1234567890:ABCDefGHI...
   ```

---

## 🔒 SSL сертификат (Let's Encrypt)

```bash
# Установите certbot
sudo apt-get install certbot

# Получите сертификат
sudo certbot certonly --standalone -d your-domain.com

# Скопируйте в проект
mkdir -p ssl
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ssl/key.pem

# Перезапустите nginx
docker-compose restart nginx
```

---

## 🚢 Деплой на VPS (Ubuntu 22.04)

### 1. Подготовка сервера

```bash
# Подключитесь к VPS
ssh root@your-vps-ip

# Обновите систему
apt update && apt upgrade -y

# Установите Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
```

### 2. Установка проекта

```bash
# Клонируйте репозиторий
git clone <your-repo-url>
cd oplata

# Настройте окружение
cp .env.example .env
nano .env  # укажите свои данные
```

### 3. Запуск

```bash
# Соберите и запустите
docker-compose up -d

# Проверьте логи
docker-compose logs -f frontend
```

### 4. Настройка домена

```bash
# Укажите A-запись вашего домена на IP VPS
# Пример: oplata.app → 123.45.67.89

# Получите SSL (см. раздел выше)
```

---

## 🧪 Тестирование

### Backend endpoints

```bash
# Health check
curl https://functions.poehali.dev/c94e52af-1969-46e3-80f1-6607b4ffeded

# Список сделок
curl https://functions.poehali.dev/bcb3516d-776e-407d-a270-7f081e3ea386
```

### Frontend

```bash
npm run build     # Создать production билд
npm run preview   # Проверить локально
```

---

## 📈 Мониторинг

### Docker логи

```bash
# Все сервисы
docker-compose logs -f

# Конкретный сервис
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### Проверка здоровья

```bash
# PostgreSQL
docker exec oplata_postgres pg_isready -U oplata_user

# Redis
docker exec oplata_redis redis-cli ping
```

---

## 💰 Экономика

**Комиссии:**
- Платформа: 5%
- ЮKassa: ~2.8% + 15₽

**Пример на 1500₽:**
- Покупатель платит: 1500₽
- Комиссия OPLATA: 75₽
- Продавец получает: 1425₽

---

## 🔧 Полезные команды

```bash
# Перезапустить все сервисы
docker-compose restart

# Остановить
docker-compose down

# Удалить с очисткой volumes
docker-compose down -v

# Пересобрать frontend
docker-compose up --build frontend

# Просмотр контейнеров
docker ps

# Использование ресурсов
docker stats
```

---

## 📞 Поддержка

- Community: https://t.me/+QgiLIa1gFRY4Y2Iy
- Документация poehali.dev: https://docs.poehali.dev

---

**Версия:** 1.0.0  
**Обновлено:** 05.11.2025
