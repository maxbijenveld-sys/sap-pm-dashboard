const SUPABASE_URL = 'https://gohmnfgpczaeoysamlwy.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = req.query.action;

  // Debug logging
  console.log('Action:', action);
  console.log('Method:', req.method);
  console.log('Body type:', typeof req.body);
  console.log('Body value:', JSON.stringify(req.body));

  if (!SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'SERVICE_KEY missing' });
  }

  const authHeaders = {
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json'
  };

  try {
    // Body ophalen — alle mogelijke formaten afvangen
    let body = {};
    if (req.body) {
      if (typeof req.body === 'object') {
        body = req.body;
      } else if (typeof req.body === 'string') {
        try { body = JSON.parse(req.body); } catch(e) { body = {}; }
      }
    }
    console.log('Parsed body:', JSON.stringify(body));

    if (action === 'list-users') {
      const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, { headers: authHeaders });
      const data = await r.json();
      return res.status(200).json(data);
    }

    if (action === 'invite-user') {
      const email = body.email || '';
      const naam = body.naam || '';
      const role = body.role || 'viewer';
      console.log('Inviting:', email, naam, role);
      
      const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/invite`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ email, data: { naam, role }, redirect_to: 'https://sap-pm-dashboard.vercel.app' })
      });
      const data = await r.json();
      console.log('Invite result:', JSON.stringify(data));
      return res.status(200).json(data);
    }

    if (action === 'create-user') {
      const email = body.email || '';
      const password = body.password || '';
      const naam = body.naam || '';
      
      const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { naam } })
      });
      const data = await r.json();
      return res.status(200).json(data);
    }

    if (action === 'delete-user') {
      const userId = req.query.userId || '';
      await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, { method: 'DELETE', headers: authHeaders });
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Onbekende actie: ' + action });

  } catch (err) {
    console.error('Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
