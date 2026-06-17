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
    let body = {};
    if (req.body) {
      body = typeof req.body === 'object' ? req.body : JSON.parse(req.body);
    }

    // ── Gebruikers ophalen ──
    if (action === 'list-users') {
      // Haal auth users op
      const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, { headers: authHeaders });
      const text = await r.text();
      let users = [];
      try {
        const data = JSON.parse(text);
        users = Array.isArray(data) ? data : (data.users || []);
      } catch(e) {
        console.error('Parse error list-users:', text.substring(0, 200));
        return res.status(200).json({ users: [] });
      }
      return res.status(200).json({ users });
    }

    // ── Gebruiker aanmaken (direct met wachtwoord) ──
    if (action === 'create-user') {
      const email = body.email || '';
      const password = body.password || '';
      const naam = body.naam || '';
      if (!email || !password) return res.status(400).json({ error: 'Email en wachtwoord verplicht' });

      const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { naam } })
      });
      const text = await r.text();
      try { return res.status(200).json(JSON.parse(text)); }
      catch(e) { return res.status(200).json({ error: text }); }
    }

    // ── Gebruiker verwijderen ──
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
