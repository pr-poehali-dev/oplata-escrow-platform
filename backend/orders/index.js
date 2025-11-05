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

const calculateCommission = (amount, percent = 5) => {
  return Math.round(amount * (percent / 100) * 100) / 100;
};

export async function handler(event, context) {
  const { httpMethod, body, pathParams, queryStringParameters } = event;

  if (httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  try {
    const client = await getDbClient();

    if (httpMethod === 'POST' && !pathParams?.id) {
      const data = JSON.parse(body || '{}');
      
      if (!data.buyerId || !data.sellerId || !data.amount || !data.description) {
        await client.end();
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          isBase64Encoded: false,
          body: JSON.stringify({ error: 'Missing required fields' })
        };
      }

      const commission = calculateCommission(data.amount);
      
      const result = await client.query(
        `INSERT INTO orders (buyer_id, seller_id, amount, commission, description, status, currency)
         VALUES ($1, $2, $3, $4, $5, 'created', 'RUB')
         RETURNING id, buyer_id, seller_id, amount, commission, description, status, created_at`,
        [data.buyerId, data.sellerId, data.amount, commission, data.description]
      );

      await client.query(
        `INSERT INTO audit_logs (order_id, user_id, event_type, payload)
         VALUES ($1, $2, 'order_created', $3)`,
        [result.rows[0].id, data.buyerId, JSON.stringify(result.rows[0])]
      );

      await client.end();

      return {
        statusCode: 201,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        isBase64Encoded: false,
        body: JSON.stringify({
          order: result.rows[0],
          paymentUrl: `https://yookassa.ru/checkout/${result.rows[0].id}`
        })
      };
    }

    if (httpMethod === 'GET' && pathParams?.id) {
      const orderId = parseInt(pathParams.id);
      
      const result = await client.query(
        `SELECT o.*, 
                buyer.username as buyer_username, 
                seller.username as seller_username
         FROM orders o
         LEFT JOIN users buyer ON o.buyer_id = buyer.id
         LEFT JOIN users seller ON o.seller_id = seller.id
         WHERE o.id = $1`,
        [orderId]
      );

      await client.end();

      if (result.rows.length === 0) {
        return {
          statusCode: 404,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          isBase64Encoded: false,
          body: JSON.stringify({ error: 'Order not found' })
        };
      }

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        isBase64Encoded: false,
        body: JSON.stringify({ order: result.rows[0] })
      };
    }

    if (httpMethod === 'GET' && !pathParams?.id) {
      const userId = queryStringParameters?.userId;
      
      let query = `
        SELECT o.*, 
               buyer.username as buyer_username, 
               seller.username as seller_username
        FROM orders o
        LEFT JOIN users buyer ON o.buyer_id = buyer.id
        LEFT JOIN users seller ON o.seller_id = seller.id
      `;
      
      const params = [];
      
      if (userId) {
        query += ` WHERE o.buyer_id = $1 OR o.seller_id = $1`;
        params.push(parseInt(userId));
      }
      
      query += ` ORDER BY o.created_at DESC`;
      
      const result = await client.query(query, params);
      await client.end();

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        isBase64Encoded: false,
        body: JSON.stringify({ orders: result.rows })
      };
    }

    if (httpMethod === 'POST' && pathParams?.id && pathParams?.action === 'confirm') {
      const orderId = parseInt(pathParams.id);
      
      const orderResult = await client.query(
        'SELECT * FROM orders WHERE id = $1',
        [orderId]
      );

      if (orderResult.rows.length === 0) {
        await client.end();
        return {
          statusCode: 404,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          isBase64Encoded: false,
          body: JSON.stringify({ error: 'Order not found' })
        };
      }

      const order = orderResult.rows[0];

      if (order.status !== 'delivered') {
        await client.end();
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          isBase64Encoded: false,
          body: JSON.stringify({ error: 'Order must be in delivered status' })
        };
      }

      await client.query(
        `UPDATE orders SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [orderId]
      );

      const sellerAmount = order.amount - order.commission;

      await client.query(
        `INSERT INTO transactions (order_id, type, amount, gateway_response)
         VALUES ($1, 'payout_to_seller', $2, $3)`,
        [orderId, sellerAmount, JSON.stringify({ status: 'success', timestamp: new Date() })]
      );

      await client.query(
        `INSERT INTO audit_logs (order_id, user_id, event_type, payload)
         VALUES ($1, $2, 'order_completed', $3)`,
        [orderId, order.buyer_id, JSON.stringify({ sellerAmount })]
      );

      await client.end();

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        isBase64Encoded: false,
        body: JSON.stringify({
          message: 'Order completed successfully',
          sellerAmount
        })
      };
    }

    if (httpMethod === 'POST' && pathParams?.id && pathParams?.action === 'dispute') {
      const orderId = parseInt(pathParams.id);
      const data = JSON.parse(body || '{}');
      
      const orderResult = await client.query(
        'SELECT * FROM orders WHERE id = $1',
        [orderId]
      );

      if (orderResult.rows.length === 0) {
        await client.end();
        return {
          statusCode: 404,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          isBase64Encoded: false,
          body: JSON.stringify({ error: 'Order not found' })
        };
      }

      await client.query(
        `UPDATE orders SET status = 'dispute', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [orderId]
      );

      await client.query(
        `INSERT INTO disputes (order_id, initiator_id, reason, status)
         VALUES ($1, $2, $3, 'open')`,
        [orderId, data.initiatorId, data.reason]
      );

      await client.query(
        `INSERT INTO audit_logs (order_id, user_id, event_type, payload)
         VALUES ($1, $2, 'dispute_opened', $3)`,
        [orderId, data.initiatorId, JSON.stringify({ reason: data.reason })]
      );

      await client.end();

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        isBase64Encoded: false,
        body: JSON.stringify({ message: 'Dispute opened successfully' })
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
