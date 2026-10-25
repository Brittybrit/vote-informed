// Florida floor votes as a full list: every law enacted in the 2025 and 2026 sessions whose final staff
// analysis names a kind of business it helps (scripts/data/state/bills/universe.json, built from the bills,
// not from donors). For each such law, a card per final floor vote in each chamber with the vote of every
// member on the ballot, and gifts from donors in that kind of business: donors whose report names or
// occupation put them in it (scripts/data/industry/state-donors.json), to the member's campaign or committee,
// dated Jan 1, 2025 or later. Which donor industries a law helps is set per law in
// scripts/data/state/bills/classes.json ({"<bill> · <session>": ["realestate-dev", ...]}).
// Cards already on the page for a law (hand-checked) are kept and marked as part of the list.
// Florida House full tenure (Brit, Oct 25, 2026): when the flhouse body has a tenure block (scripts/state-tenure.mjs),
// the list also takes the 2021 through 2024 sessions' laws (scripts/data/tenure/flhouse/bills-2122.json, bills-2023.json, bills-2024.json;
// House votes only; donor classes from bills/classes-by-chapter.json, labels from bills/labels.json), reads each
// member's 2020-2024 gifts (scripts/data/tenure/flhouse/donors/), and counts gifts from the member's giftsFrom date
// instead of Jan 1, 2025, on every card. The Senate and the 2025-26 rules are unchanged.
// Run: node scripts/state-tenure.mjs && node scripts/state-bills.mjs && node scripts/money-summary.mjs
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { topicsOf } from './action-topics.mjs';

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
const TDIR = 'scripts/data/tenure/flhouse/';
const tsv = f => {
  if (!existsSync(f)) return [];
  return readFileSync(f, 'utf8').split('\n').filter(Boolean).map(l => l.split('\t')).filter(r => !['INT', 'REF', 'LOA', 'COF'].includes(r[3]) && Number(r[2]) > 0).map(r => {
    const [mm, dd, yy] = r[1].split('/');
    return { date: `${yy}-${mm}-${dd}`, amount: Number(r[2]), donor: r[4].trim(), occ: (r[7] || '').trim() };
  });
};
// A member's earlier campaign accounts are their own files (<name>-pre2025); a committee's 2020-2024 rows extend its file
const rowsOf = (acct, tenure) => [
  ...(tenure && acct.endsWith('-pre2025') ? [] : tsv(new URL(`scripts/data/state/donors/${acct}.tsv`, root))),
  ...(tenure ? tsv(new URL(TDIR + 'donors/' + (acct.endsWith('-pre2025') ? acct : /^pc\d+$/.test(acct) ? acct + '-pre2025' : '_none') + '.tsv', root)) : []),
];
// The House tenure laws, keyed the way the cards are; the 2022A special session's laws are labeled with 2023
const TENURE = (() => {
  if (!existsSync(new URL(TDIR + 'bills-2023.json', root))) return null;
  // 2021-22 (Nixon and Chambliss only; screened by the Senate slice): bills-2122.json with its own classes and labels
  const opt = f => existsSync(new URL(TDIR + f, root)) ? J(TDIR + f) : {};
  const lab = { ...J(TDIR + 'bills/labels.json'), ...opt('bills/labels-2122.json') }, byCh = { ...J(TDIR + 'bills/classes-by-chapter.json'), ...opt('bills/classes-2122.json') };
  const refOf = {}; for (const [k, v] of Object.entries(lab)) refOf[v.chapter] = k;
  // bills-2122.json only once state-tenure.mjs has switched the 2021-22 years on (Nixon's tenure then starts in 2020)
  const H = d.bodies.find(b => b.key === 'flhouse'), on2122 = !!(H && H.tenure && H.tenure.Nixon && H.tenure.Nixon.start < '2022');
  const files = [...(on2122 ? ['bills-2122.json'] : []), 'bills-2023.json', 'bills-2024.json'].filter(f => existsSync(new URL(TDIR + f, root)));
  // a law without a House roll call yet is left out (counted in bills-2122.json "missing")
  const bills = files.flatMap(f => J(TDIR + f).bills).filter(b => b.benefits && b.votes && b.votes.house).map(b => ({ ...b, ref: refOf[b.chapter], votes: { house: b.votes.house } }));
  for (const b of bills) if (!b.ref) throw new Error('no label for ' + b.chapter);
  const classes = {}; for (const b of bills) if (byCh[b.chapter]) classes[b.ref] = byCh[b.chapter];
  const tagsF = TDIR + 'donors/industry-pre2025.json';
  return { bills, classes, labels: lab, tags: existsSync(new URL(tagsF, root)) ? J(tagsF).donors : {} };
})();
const isoOf = s => { const m = String(s || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); return m ? `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}` : s; };

let added = 0, kept = 0;
const report = [];
for (const [bodyKey, chamber, pfx] of [['flhouse', 'house', 'HV'], ['flsenate', 'senate', 'SV']]) {
  const B = d.bodies.find(b => b.key === bodyKey);
  const members = Object.keys(B.onBallot);
  const acctsOf = k => B.onBallot[k].accounts || [];
  // Full tenure (flhouse only): gifts count from each member's giftsFrom; everyone else from Jan 1, 2025
  const ten = bodyKey === 'flhouse' && B.tenure && TENURE ? TENURE : null;
  const G0 = k => (ten && B.tenure[k] && B.tenure[k].giftsFrom) || CYCLE;
  const tagOf = name => TAGS[name.toUpperCase()] || (ten && ten.tags[name.toUpperCase()]) || {};
  const donorRows = {};
  for (const k of members) donorRows[k] = acctsOf(k).flatMap(a => rowsOf(a, !!ten).map(r => ({ ...r, acct: a })));
  const list = (U.bills || []).map(b => ({ ...b, ref: `${b.bill} · ${String(b.session).slice(0, 4)}` })).concat(ten ? ten.bills : []);
  for (const bill of list) {
    if (!bill.benefits) continue;
    const ref = bill.ref;
    // Which donors count for this law: industry tags and/or a pattern on the donor's name and reported
    // occupation, set per law in classes.json after reviewing who gave (broad tags alone overmatch)
    const K = CLASSES[ref] || (ten && ten.classes[ref]) || {};
    const tags = new Set(Array.isArray(K) ? K : (K.tags || []));
    const re = K.re ? new RegExp(K.re, 'i') : null, nre = K.not ? new RegExp(K.not, 'i') : null;
    const fits = (name, occ) => { const t = tagOf(name).tags || []; const s = name + ' | ' + occ;
      if (tags.size && !t.some(x => tags.has(x))) return false; if (re && !re.test(s)) return false; if (nre && nre.test(s)) return false; return !!(tags.size || re); };
    const have = B.actions.filter(a => a.kind === 'bill' && a.ref === ref);
    if (have.length) {
      for (const a of have) {
        a.universe = true;
        // Cards already on the page keep their gifts; with a full tenure, add the earlier gifts (giftsFrom to
        // Dec 31, 2024) from donors in the same class, to members who were seated for the vote
        if (ten) {
          const gk = g => [g.to, g.acct, g.donor, Number(g.amount), g.date].join('|'), seen = new Set(a.gifts.map(gk));
          for (const k of members.filter(k => a.roll[k])) for (const r of donorRows[k]) {
            if (r.date < G0(k) || r.date >= CYCLE || !r.occ || !fits(r.donor, r.occ)) continue;
            const g = { to: k, acct: r.acct, kind: 'class', rel: 'cls', donor: r.donor, amount: r.amount, date: r.date, occ: r.occ };
            if (!seen.has(gk(g))) { seen.add(gk(g)); a.gifts.push(g); }
          }
          a.gifts.sort((p, q) => p.date.localeCompare(q.date));
        }
      }
      kept += have.length; continue;
    }
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
        // A gift is shown with the occupation as reported; a row that reports none is not matched to a kind of business
        if (r.date < G0(k) || !r.occ) continue;
        if (fits(r.donor, r.occ)) gifts.push({ to: k, acct: r.acct, kind: 'class', rel: 'cls', donor: r.donor, amount: r.amount, date: r.date, occ: r.occ });
      }
      gifts.sort((p, q) => p.date.localeCompare(q.date));
      const cat = bill.benefits.category || '';
      const lab = LABEL[ref] || (ten && ten.labels[ref]) || { en: cat, es: cat, ht: cat };
      const q = bill.benefits.quote || '';
      const card = {
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
      };
      card.topics = topicsOf(card);
      B.actions.push(card);
      added++;
    }
  }
  B.actions.sort((p, q) => q.date.localeCompare(p.date) || String(p.id).localeCompare(String(q.id)));
  report.push(`${bodyKey}: ${B.actions.filter(a => a.kind === 'bill' && a.universe).length} bill cards in the list`);
}
writeFileSync(new URL(FILE, root), JSON.stringify(d, null, 1) + '\n');
console.log(report.join('\n') + `\nadded ${added}, kept ${kept} hand-checked`);
