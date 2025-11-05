import { Client } from 'pg';

const getDbClient = async () => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  await client.connect();
  return client;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Telegram-User-Id, X-Auth-Token',
  'Access-Control-Max-Age': '86400',
};

export async function handler(event, context) {
  const { httpMethod, body, queryStringParameters } = event;

  if (httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  try {
    const client = await getDbClient();

    if (httpMethod === 'GET') {
      const result = await client.query('SELECT COUNT(*) as count FROM orders');
      await client.end();

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        isBase64Encoded: false,
        body: JSON.stringify({
          message: 'OPLATA API v1.0',
          totalOrders: parseInt(result.rows[0].count),
          endpoints: {
            health: 'GET /',
            createOrder: 'POST /orders',
            getOrder: 'GET /orders/:id',
            confirmDelivery: 'POST /orders/:id/confirm',
            openDispute: 'POST /orders/:id/dispute',
          }
        })
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
