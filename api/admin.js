const SUPABASE_URL = 'https://gohmnfgpczaeoysamlwy.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = req.query.action;

  if (!SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'SUPABASE_SERVICE_KEY niet geconfigureerd' });
  }

  const authHeaders = {
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json'
  };

  try {
    // Lees body correct — Vercel geeft body al geparsed mee
    let body = {};
    if (req.method === 'POST') {
      if (typeof req.body === 'object' && req.body !== null) {
        body = req.body;
      } else if (typeof req.body === 'string' && req.body.length > 0) {
        body = JSON.parse(req.body);
      }
    }

    if (action === 'list-users') {
      const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, { headers: authHeaders });
      const text = await r.text();
      try {
        return res.status(200).json(JSON.parse(text));
      } catch(e) {
        return res.status(200).send(text);
      }
    }

    if (action === 'invite-user' && req.method === 'POST') {
      const { email, naam, role } = body;
      if (!email) return res.status(400).json({ error: 'Email verplicht' });
      
      const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/invite`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ 
          email, 
          data: { naam: naam || '', role: role || 'viewer' }, 
          redirect_to: 'https://sap-pm-dashboard.vercel.app' 
        })
      });
      const text = await r.text();
      console.log('Invite response:', text.substring(0, 200));
      try {
        return res.status(200).json(JSON.parse(text));
      } catch(e) {
        return res.status(200).json({ error: text });
      }
    }

    if (action === 'create-user' && req.method === 'POST') {
      const { email, password, naam } = body;
      if (!email || !password) return res.status(400).json({ error: 'Email en wachtwoord verplicht' });
      
      const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ 
          email, 
          password, 
          email_confirm: true, 
          user_metadata: { naam: naam || '' } 
        })
      });
      const text = await r.text();
      try {
        return res.status(200).json(JSON.parse(text));
      } catch(e) {
        return res.status(200).json({ error: text });
      }
    }

    if (action === 'delete-user' && req.method === 'DELETE') {
      const { userId } = req.query;
      if (!userId) return res.status(400).json({ error: 'UserId verplicht' });
      
      await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, { 
        method: 'DELETE', 
        headers: authHeaders 
      });
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Onbekende actie: ' + action });

  } catch (err) {
    console.error('Admin API error:', err.message, err.stack);
    return res.status(500).json({ error: err.message });
  }
}
