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
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Telegram-User-Id, X-Auth-Token',
  'Access-Control-Max-Age': '86400',
};

const createPayment = async (data) => {
  const shopId = process.env.YUKASSA_SHOP_ID;
  const secretKey = process.env.YUKASSA_SECRET_KEY;

  if (!shopId || !secretKey) {
    const mockPaymentId = `mock_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    return {
      id: mockPaymentId,
      status: 'pending',
      amount: {
        value: data.amount.toFixed(2),
        currency: 'RUB'
      },
      confirmation: {
        type: 'redirect',
        confirmation_url: `${data.returnUrl}?payment_id=${mockPaymentId}&status=mock`
      },
      metadata: {
        order_id: data.orderId.toString()
      }
    };
  }

  const response = await fetch('https://api.yookassa.ru/v3/payments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotence-Key': `${data.orderId}_${Date.now()}`,
      'Authorization': 'Basic ' + Buffer.from(`${shopId}:${secretKey}`).toString('base64')
    },
    body: JSON.stringify({
      amount: {
        value: data.amount.toFixed(2),
        currency: 'RUB'
      },
      confirmation: {
        type: 'redirect',
        return_url: data.returnUrl
      },
      capture: true,
      description: data.description,
      metadata: {
        order_id: data.orderId.toString()
      }
    })
  });

  if (!response.ok) {
    throw new Error(`YooKassa API error: ${response.statusText}`);
  }

  return await response.json();
};

const getPaymentStatus = async (paymentId) => {
  const shopId = process.env.YUKASSA_SHOP_ID;
  const secretKey = process.env.YUKASSA_SECRET_KEY;

  if (!shopId || !secretKey) {
    return {
      id: paymentId,
      status: 'succeeded',
      amount: { value: '1000.00', currency: 'RUB' },
      confirmation: { type: 'redirect', confirmation_url: '' },
      metadata: { order_id: '1' }
    };
  }

  const response = await fetch(`https://api.yookassa.ru/v3/payments/${paymentId}`, {
    method: 'GET',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${shopId}:${secretKey}`).toString('base64')
    }
  });

  if (!response.ok) {
    throw new Error(`YooKassa API error: ${response.statusText}`);
  }

  return await response.json();
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

      if (!data.orderId || !data.amount) {
        await client.end();
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          isBase64Encoded: false,
          body: JSON.stringify({ error: 'Missing required fields' })
        };
      }

      const payment = await createPayment(data);

      await client.query(
        `UPDATE orders 
         SET payment_id = $1, payment_url = $2, status = 'pending', updated_at = CURRENT_TIMESTAMP 
         WHERE id = $3`,
        [payment.id, payment.confirmation.confirmation_url, data.orderId]
      );

      await client.query(
        `INSERT INTO transactions (order_id, type, amount, gateway_response)
         VALUES ($1, 'payment_initiated', $2, $3)`,
        [data.orderId, data.amount, JSON.stringify(payment)]
      );

      await client.query(
        `INSERT INTO audit_logs (order_id, event_type, payload)
         VALUES ($1, 'payment_created', $2)`,
        [data.orderId, JSON.stringify({ paymentId: payment.id })]
      );

      await client.end();

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        isBase64Encoded: false,
        body: JSON.stringify({
          paymentId: payment.id,
          paymentUrl: payment.confirmation.confirmation_url,
          status: payment.status
        })
      };
    }

    if (httpMethod === 'GET') {
      const paymentId = event.queryStringParameters?.paymentId;

      if (!paymentId) {
        await client.end();
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          isBase64Encoded: false,
          body: JSON.stringify({ error: 'Payment ID required' })
        };
      }

      const payment = await getPaymentStatus(paymentId);

      if (payment.status === 'succeeded') {
        const orderId = parseInt(payment.metadata.order_id);

        await client.query(
          `UPDATE orders 
           SET status = 'paid', updated_at = CURRENT_TIMESTAMP 
           WHERE id = $1`,
          [orderId]
        );

        await client.query(
          `INSERT INTO audit_logs (order_id, event_type, payload)
           VALUES ($1, 'payment_succeeded', $2)`,
          [orderId, JSON.stringify(payment)]
        );
      }

      await client.end();

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        isBase64Encoded: false,
        body: JSON.stringify({
          paymentId: payment.id,
          status: payment.status,
          amount: payment.amount
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
