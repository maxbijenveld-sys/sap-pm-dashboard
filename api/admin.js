const SUPABASE_URL = 'https://gohmnfgpczaeoysamlwy.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_eoIJ0jmspVLW9u-9u7QeNA_IXTD8EwY';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Verifieert het meegegeven Supabase-token en geeft het e-mailadres terug
// als de aanvrager admin is, anders null. Voorkomt dat deze endpoint
// (die de service role key gebruikt) door niet-admins of anonieme
// bezoekers aangeroepen kan worden. Admin-status komt uit de
// user_roles-tabel (single source of truth, zelfde als index.html).
async function requireAdmin(req) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) return null;

  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` }
  });
  if (!userRes.ok) return null;
  const user = await userRes.json();
  const email = (user?.email || '').toLowerCase().trim();
  if (!email) return null;

  const roleRes = await fetch(`${SUPABASE_URL}/rest/v1/user_roles?email=eq.${encodeURIComponent(email)}&select=role`, {
    headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` }
  });
  if (!roleRes.ok) return null;
  const roles = await roleRes.json();
  if (Array.isArray(roles) && roles[0]?.role === 'admin') return { email, id: user.id };
  return null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = req.query.action;

  if (!SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'SUPABASE_SERVICE_KEY niet geconfigureerd' });
  }

  const admin = await requireAdmin(req);
  if (!admin) {
    return res.status(401).json({ error: 'Niet geautoriseerd' });
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
      let data;
      try { data = JSON.parse(text); }
      catch(e) {
        console.error('Parse error list-users:', text.substring(0, 200));
        return res.status(502).json({ error: 'Onleesbaar antwoord van Supabase: ' + text.substring(0, 200) });
      }
      if (!r.ok) {
        return res.status(502).json({ error: `Supabase gaf ${r.status}: ${data.msg || data.error_description || data.error || text.substring(0,200)}` });
      }
      const users = Array.isArray(data) ? data : (data.users || []);
      return res.status(200).json({ users });
    }

    // ── Eén gebruiker opzoeken op e-mailadres (debug: list-users kan falen
    // op een corrupt account, dit filtert server-side zodat we het kapotte
    // account toch kunnen vinden zonder de volledige lijst nodig te hebben) ──
    if (action === 'find-user') {
      const email = req.query.email || '';
      if (!email) return res.status(400).json({ error: 'email-parameter verplicht' });
      const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`, { headers: authHeaders });
      const text = await r.text();
      let data;
      try { data = JSON.parse(text); } catch(e) { data = null; }
      if (!r.ok) {
        return res.status(502).json({ error: `Supabase gaf ${r.status}: ${(data && (data.msg||data.error_description||data.error)) || text.substring(0,300)}` });
      }
      return res.status(200).json({ result: data });
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
      if (userId === admin.id) {
        return res.status(400).json({ error: 'Je kunt jezelf niet verwijderen' });
      }
      await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, { method: 'DELETE', headers: authHeaders });
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Onbekende actie: ' + action });

  } catch (err) {
    console.error('Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
