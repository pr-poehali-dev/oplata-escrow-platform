import { Client } from 'pg';
import crypto from 'crypto';

const getDbClient = async () => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  await client.connect();
  return client;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Telegram-User-Id, X-Auth-Token',
  'Access-Control-Max-Age': '86400',
};

const verifyTelegramAuth = (authData) => {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!botToken) {
    return true;
  }

  const { hash, ...dataToCheck } = authData;
  
  const dataCheckString = Object.keys(dataToCheck)
    .sort()
    .map(key => `${key}=${dataToCheck[key]}`)
    .join('\n');

  const secretKey = crypto.createHash('sha256').update(botToken).digest();
  const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  return calculatedHash === hash;
};

const generateJWT = (userId, telegramId) => {
  const jwtSecret = process.env.JWT_SECRET || 'default_dev_secret_key';
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    userId,
    telegramId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60)
  })).toString('base64url');

  const signature = crypto
    .createHmac('sha256', jwtSecret)
    .update(`${header}.${payload}`)
    .digest('base64url');

  return `${header}.${payload}.${signature}`;
};

export async function handler(event, context) {
  const { httpMethod, body } = event;

  if (httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  try {
    const client = await getDbClient();

    if (httpMethod === 'POST') {
      const data = JSON.parse(body || '{}');

      if (!data.telegramId) {
        await client.end();
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          isBase64Encoded: false,
          body: JSON.stringify({ error: 'Telegram ID required' })
        };
      }

      const existingUser = await client.query(
        'SELECT * FROM users WHERE telegram_id = $1',
        [data.telegramId]
      );

      let user;

      if (existingUser.rows.length > 0) {
        user = existingUser.rows[0];
        
        if (data.username || data.email) {
          await client.query(
            'UPDATE users SET username = COALESCE($1, username), email = COALESCE($2, email) WHERE id = $3',
            [data.username, data.email, user.id]
          );
        }
      } else {
        const result = await client.query(
          `INSERT INTO users (telegram_id, username, email, role)
           VALUES ($1, $2, $3, 'user')
           RETURNING *`,
          [data.telegramId, data.username, data.email]
        );
        user = result.rows[0];
      }

      const token = generateJWT(user.id, user.telegram_id);

      await client.end();

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        isBase64Encoded: false,
        body: JSON.stringify({
          user: {
            id: user.id,
            telegramId: user.telegram_id,
            username: user.username,
            email: user.email,
            role: user.role
          },
          token
        })
      };
    }

    if (httpMethod === 'GET') {
      const telegramId = event.queryStringParameters?.telegramId;

      if (!telegramId) {
        await client.end();
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          isBase64Encoded: false,
          body: JSON.stringify({ error: 'Telegram ID required' })
        };
      }

      const result = await client.query(
        'SELECT id, telegram_id, username, email, role, created_at FROM users WHERE telegram_id = $1',
        [parseInt(telegramId)]
      );

      await client.end();

      if (result.rows.length === 0) {
        return {
          statusCode: 404,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          isBase64Encoded: false,
          body: JSON.stringify({ error: 'User not found' })
        };
      }

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        isBase64Encoded: false,
        body: JSON.stringify({ user: result.rows[0] })
      };
    }

    await client.end();

    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      isBase64Encoded: false,
      body: JSON.stringify({ error: 'Method not allowed' })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      isBase64Encoded: false,
      body: JSON.stringify({ error: 'Internal server error', message: error.message })
    };
  }
}
