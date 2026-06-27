const XLSX = require('xlsx');
const { parseExcelSheet } = require('../parser.js');

const SUPABASE_URL = 'https://gohmnfgpczaeoysamlwy.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const IMPORT_SECRET = process.env.IMPORT_SECRET;

module.exports.config = { api: { bodyParser: false } };

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Alleen POST toegestaan' });

  if (!IMPORT_SECRET) return res.status(500).json({ error: 'IMPORT_SECRET niet geconfigureerd' });
  if (!SUPABASE_SERVICE_KEY) return res.status(500).json({ error: 'SUPABASE_SERVICE_KEY niet geconfigureerd' });
  if (req.headers['x-import-secret'] !== IMPORT_SECRET) {
    return res.status(401).json({ error: 'Niet geautoriseerd' });
  }

  try {
    const buf = await readRawBody(req);
    const wb = XLSX.read(buf, { type: 'buffer', cellDates: false });

    const results = wb.SheetNames
      .filter(name => name !== 'Samenvatting')
      .map(name => parseExcelSheet(XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: '' })))
      .filter(r => r && r.rows.length);

    const authHeaders = {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates'
    };

    // Alleen weken bijwerken die al in het dashboard staan — nieuwe weken
    // (bv. nog niet afgeronde toekomstige planning) worden niet automatisch
    // toegevoegd, dat doet een admin bewust via de bestaande upload-knop.
    const existingRes = await fetch(`${SUPABASE_URL}/rest/v1/weeks?select=id,label`, { headers: authHeaders });
    if (!existingRes.ok) {
      return res.status(502).json({ error: 'Kon bestaande weken niet ophalen: ' + await existingRes.text() });
    }
    const existingLabels = new Map((await existingRes.json()).map(w => [w.id, w.label]));

    const saved = [];
    const skipped = [];
    for (const r of results) {
      const wid = 'w' + r.weekNum;
      if (!existingLabels.has(wid)) { skipped.push(r.weekNum); continue; }

      // Bestaand label behouden (bv. "22-26 juni 2026") i.p.v. te overschrijven
      // met de generieke "Week N, jaar" die de parser zelf teruggeeft.
      const sbRes = await fetch(`${SUPABASE_URL}/rest/v1/weeks`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ id: wid, week: r.weekNum, label: existingLabels.get(wid), rows: r.rows })
      });
      if (!sbRes.ok) {
        const errText = await sbRes.text();
        return res.status(502).json({ error: `Opslaan week ${r.weekNum} mislukt: ${errText}` });
      }
      saved.push({ week: r.weekNum, rows: r.rows.length });
    }

    return res.status(200).json({ success: true, weeks: saved, overgeslagen_nieuwe_weken: skipped });
  } catch (err) {
    console.error('Import error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
