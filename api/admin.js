const SUPABASE_URL = 'https://gohmnfgpczaeoysamlwy.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

export const config = { api: { bodyParser: true } };

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
    // ── Gebruikers ophalen ──
    if (action === 'list-users') {
      const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, { headers });
      const data = await r.json();
      return res.status(200).json(data);
    }

    // ── Gebruiker uitnodigen ──
    if (action === 'invite-user' && req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { email, naam, role } = body;
      const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/invite`, {
        method: 'POST', headers,
        body: JSON.stringify({ email, data: { naam, role }, redirect_to: 'https://sap-pm-dashboard.vercel.app' })
      });
      const data = await r.json();
      return res.status(200).json(data);
    }

    // ── Gebruiker aanmaken met wachtwoord ──
    if (action === 'create-user' && req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { email, password, naam } = body;
      const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        method: 'POST', headers,
        body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { naam } })
      });
      const data = await r.json();
      return res.status(200).json(data);
    }

    // ── Gebruiker verwijderen ──
    if (action === 'delete-user' && req.method === 'DELETE') {
      const { userId } = req.query;
      await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, { method: 'DELETE', headers });
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Onbekende actie: ' + action });

  } catch (err) {
    console.error('Admin API error:', err);
    return res.status(500).json({ error: err.message, stack: err.stack });
  }
}
