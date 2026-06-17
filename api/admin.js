const SUPABASE_URL = 'https://gohmnfgpczaeoysamlwy.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

export const config = { api: { bodyParser: false } };

async function getBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(data)); }
      catch(e) { resolve({}); }
    });
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = req.query.action;

  if (!SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'SUPABASE_SERVICE_KEY niet geconfigureerd' });
  }

  const headers = {
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json'
  };

  try {
    if (action === 'list-users') {
      const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, { headers });
      const data = await r.json();
      return res.status(200).json(data);
    }

    if (action === 'invite-user' && req.method === 'POST') {
      const body = await getBody(req);
      const { email, naam, role } = body;
      const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/invite`, {
        method: 'POST', headers,
        body: JSON.stringify({ email, data: { naam, role }, redirect_to: 'https://sap-pm-dashboard.vercel.app' })
      });
      const data = await r.json();
      return res.status(200).json(data);
    }

    if (action === 'create-user' && req.method === 'POST') {
      const body = await getBody(req);
      const { email, password, naam } = body;
      const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        method: 'POST', headers,
        body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { naam } })
      });
      const data = await r.json();
      return res.status(200).json(data);
    }

    if (action === 'delete-user' && req.method === 'DELETE') {
      const { userId } = req.query;
      await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, { method: 'DELETE', headers });
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Onbekende actie: ' + action });

  } catch (err) {
    console.error('Admin API error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
