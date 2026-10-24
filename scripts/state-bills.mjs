// Florida floor votes as a full list: every law enacted in the 2025 and 2026 sessions whose final staff
// analysis names a kind of business it helps (scripts/data/state/bills/universe.json, built from the bills,
// not from donors). For each such law, a card per final floor vote in each chamber with the vote of every
// member on the ballot, and gifts from donors in that kind of business: donors whose report names or
// occupation put them in it (scripts/data/industry/state-donors.json), to the member's campaign or committee,
// dated Jan 1, 2025 or later. Which donor industries a law helps is set per law in
// scripts/data/state/bills/classes.json ({"<bill> · <session>": ["realestate-dev", ...]}).
// Cards already on the page for a law (hand-checked) are kept and marked as part of the list.
// Run: node scripts/state-bills.mjs && node scripts/money-summary.mjs
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const J = p => JSON.parse(readFileSync(new URL(p, root)));
const FILE = 'public/data/decisions.json';
const d = J(FILE);
const U = J('scripts/data/state/bills/universe.json');
const CLASSES = existsSync(new URL('scripts/data/state/bills/classes.json', root)) ? J('scripts/data/state/bills/classes.json') : {};
const TAGS = J('scripts/data/industry/state-donors.json').donors;
const LABEL = existsSync(new URL('scripts/data/state/bills/labels.json', root)) ? J('scripts/data/state/bills/labels.json') : {};
const CYCLE = '2025-01-01';
const NOT_INDUSTRY = new Set(['political-committee', 'party', 'self', 'individual-noindustry', 'other', 'trade-association', 'lobbying', 'law-firm', 'labor-union']);

// Donor rows per account: [candidate, date, amount, type, name, address, citystate, occupation]
const rowsOf = acct => {
  const f = new URL(`scripts/data/state/donors/${acct}.tsv`, root);
  if (!existsSync(f)) return [];
  return readFileSync(f, 'utf8').split('\n').filter(Boolean).map(l => l.split('\t')).filter(r => !['INT', 'REF', 'LOA', 'COF'].includes(r[3]) && Number(r[2]) > 0).map(r => {
    const [mm, dd, yy] = r[1].split('/');
    return { date: `${yy}-${mm}-${dd}`, amount: Number(r[2]), donor: r[4].trim(), occ: (r[7] || '').trim() };
  });
};
const isoOf = s => { const m = String(s || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); return m ? `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}` : s; };

let added = 0, kept = 0;
const report = [];
for (const [bodyKey, chamber, pfx] of [['flhouse', 'house', 'HV'], ['flsenate', 'senate', 'SV']]) {
  const B = d.bodies.find(b => b.key === bodyKey);
  const members = Object.keys(B.onBallot);
  const acctsOf = k => B.onBallot[k].accounts || [];
  const donorRows = {};
  for (const k of members) donorRows[k] = acctsOf(k).flatMap(a => rowsOf(a).map(r => ({ ...r, acct: a })));
  for (const bill of U.bills || []) {
    if (!bill.benefits) continue;
    const ref = `${bill.bill} · ${String(bill.session).slice(0, 4)}`;
    const have = B.actions.filter(a => a.kind === 'bill' && a.ref === ref);
    if (have.length) { for (const a of have) a.universe = true; kept += have.length; continue; }
    // Which donors count for this law: industry tags and/or a pattern on the donor's name and reported
    // occupation, set per law in classes.json after reviewing who gave (broad tags alone overmatch)
    const K = CLASSES[ref] || {};
    const tags = new Set(Array.isArray(K) ? K : (K.tags || []));
    const re = K.re ? new RegExp(K.re, 'i') : null, nre = K.not ? new RegExp(K.not, 'i') : null;
    const fits = (name, occ) => { const t = (TAGS[name.toUpperCase()] || {}).tags || []; const s = name + ' | ' + occ;
      if (tags.size && !t.some(x => tags.has(x))) return false; if (re && !re.test(s)) return false; if (nre && nre.test(s)) return false; return !!(tags.size || re); };
    for (const v of ((bill.votes || {})[chamber] ? [].concat(bill.votes[chamber]) : [])) {
      if (!v || !v.roll || !Object.keys(v.roll).length) continue;
      const roll = {};
      for (const k of members) {
        const x = String(v.roll[k] == null ? 'not seated' : v.roll[k]).toLowerCase();
        roll[k] = /not seated/.test(x) ? null : /excused/.test(x) ? 'excused' : /not voting|absent/.test(x) ? 'nv' : x;
      }
      if (!Object.values(roll).some(x => x)) continue;
      const seq = (String(v.url || '').match(/(\d{3,5})\.PDF$/i) || [])[1] || String(added);
      const date = isoOf(v.date);
      const gifts = [];
      for (const k of Object.keys(roll).filter(k => roll[k])) for (const r of donorRows[k]) {
        if (r.date < CYCLE) continue;
        if (fits(r.donor, r.occ)) gifts.push({ to: k, acct: r.acct, kind: 'class', rel: 'cls', donor: r.donor, amount: r.amount, date: r.date, occ: r.occ });
      }
      gifts.sort((p, q) => p.date.localeCompare(q.date));
      const cat = bill.benefits.category || '';
      const lab = LABEL[ref] || { en: cat, es: cat, ht: cat };
      const q = bill.benefits.quote || '';
      B.actions.push({
        id: `${pfx}${String(bill.session).slice(2, 4)}-${String(bill.bill).replace(/\D/g, '')}-${seq}`, date, ref, kind: 'bill',
        subject: { en: bill.title, es: bill.title, ht: bill.title }, parties: [], result: 'passed',
        tally: v.tally || null, ...(v.notVoting != null ? { notVoting: v.notVoting } : {}), roll, rollComplete: false, lobbied: [], gifts,
        note: {
          en: `Floor vote: ${v.motion || 'passage'}. The staff analysis says the bill helps ${lab.en}: “${q}”. Donors listed are ${lab.en}, as their names and reported occupations appear in the campaign finance reports; this does not claim they asked for the bill or for this vote. Gifts are shown with the dates recorded, including any after the vote. The bill became law (Ch. ${bill.chapter}).`,
          es: `Votación en el pleno. El análisis del personal dice que el proyecto beneficia a ${lab.es} (cita en inglés): “${q}”. Los donantes que aparecen son ${lab.es}, según sus nombres y ocupaciones en los reportes de campaña; esto no afirma que pidieran el proyecto ni este voto. Las donaciones se muestran con las fechas registradas, incluso las posteriores al voto. El proyecto se convirtió en ley (Ch. ${bill.chapter}).`,
          ht: `Vòt nan sesyon plenyè. Analiz anplwaye a di pwojè a ede ${lab.ht} (sitasyon an angle): “${q}”. Donatè ki parèt yo se ${lab.ht}, jan non yo ak okipasyon yo parèt nan rapò kanpay yo; sa pa di yo te mande pwojè lwa a ni vòt sa a. Kado yo parèt ak dat yo anrejistre, menm sa ki vini apre vòt la. Pwojè a te tounen lwa (Ch. ${bill.chapter}).`,
        },
        links: [v.url && { t: 'vote', url: v.url }, bill.analysisUrl && { t: 'analysis', url: bill.analysisUrl }, bill.url && { t: 'bill', url: bill.url }].filter(Boolean),
        universe: true,
      });
      added++;
    }
  }
  B.actions.sort((p, q) => q.date.localeCompare(p.date) || String(p.id).localeCompare(String(q.id)));
  report.push(`${bodyKey}: ${B.actions.filter(a => a.kind === 'bill' && a.universe).length} bill cards in the list`);
}
writeFileSync(new URL(FILE, root), JSON.stringify(d, null, 1) + '\n');
console.log(report.join('\n') + `\nadded ${added}, kept ${kept} hand-checked`);
