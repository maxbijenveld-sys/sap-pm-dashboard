const SUPABASE_URL = 'https://gohmnfgpczaeoysamlwy.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = req.query.action;

  if (!SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'SERVICE_KEY missing' });
  }

  const authHeaders = {
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json'
  };

  try {
    let body = {};
    if (req.body) {
      body = typeof req.body === 'object' ? req.body : JSON.parse(req.body);
    }

    if (action === 'list-users') {
      const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, { headers: authHeaders });
      const data = await r.json();
      return res.status(200).json(data);
    }

    if (action === 'invite-user') {
      const { email, naam, role } = body;
      if (!email) return res.status(400).json({ error: 'Email verplicht' });
      
      // Probeer beide endpoints
      const endpoints = [
        `${SUPABASE_URL}/auth/v1/admin/invite`,
        `${SUPABASE_URL}/auth/v1/admin/users/invite`
      ];
      
      let data = null;
      for (const endpoint of endpoints) {
        const r = await fetch(endpoint, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ 
            email, 
            data: { naam: naam||'', role: role||'viewer' }, 
            redirect_to: 'https://sap-pm-dashboard.vercel.app' 
          })
        });
        const text = await r.text();
        console.log(`Endpoint ${endpoint}: ${r.status} - ${text.substring(0,100)}`);
        if (r.status !== 404) {
          try { data = JSON.parse(text); } catch(e) { data = { error: text }; }
          break;
        }
      }
      
      if (!data) data = { error: 'Invite endpoint niet gevonden' };
      return res.status(200).json(data);
    }

    if (action === 'create-user') {
      const { email, password, naam } = body;
      if (!email || !password) return res.status(400).json({ error: 'Email en wachtwoord verplicht' });
      
      const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { naam: naam||'' } })
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
