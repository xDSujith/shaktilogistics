const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [];
const ENDPOINT_URL = process.env.FORM_ENDPOINT_URL || '';
const REQUIRED = ['name', 'steamUrl', 'timezone', 'experience', 'whyJoin'];

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const origin = event.headers.origin || '';
  const cors = {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin) ? (origin || '*') : '',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    const body = JSON.parse(event.body || '{}');

    const missing = REQUIRED.filter((k) => !body[k] || !body[k].trim());
    if (missing.length > 0) {
      return {
        statusCode: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, error: 'Missing fields: ' + missing.join(', ') }),
      };
    }

    if (body._hp) {
      return {
        statusCode: 200,
        headers: { ...cors, 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true, skipped: 'spam' }),
      };
    }

    if (!ENDPOINT_URL) {
      console.log('FORM_SUBMISSION:', JSON.stringify(body, null, 2));
      return {
        statusCode: 200,
        headers: { ...cors, 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true, note: 'logged only - no FORM_ENDPOINT_URL set' }),
      };
    }

    const resp = await fetch(ENDPOINT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error('upstream ' + resp.status + ': ' + text);
    }

    const data = await resp.json();
    return {
      statusCode: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    };
  } catch (err) {
    console.error('submit error:', err);
    return {
      statusCode: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: 'Internal server error' }),
    };
  }
};
