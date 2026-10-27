// Refunds on campaign reports. A refund is reported as a negative contribution row; it cancels the latest
// earlier gift of the same amount from the same donor to the same account, and both rows then drop out.
// Same rule as scripts/state-firm-gifts.mjs and scripts/county-firm-gifts.mjs.
// rows: [{ acct, donor, amount, date, ... }]; donorKey normalizes a donor name for the match.
// Returns { live, refunded }: live = positive gifts not cancelled, refunded = the gifts a refund cancelled.
export function cancelRefunds(rows, donorKey) {
  const k = r => donorKey(r.donor);
  const used = new Set();
  const refunded = [];
  const refunds = rows.filter(r => Number(r.amount) < 0).sort((p, q) => String(p.date).localeCompare(String(q.date)));
  for (const ref of refunds) {
    const g = rows.filter(r => !used.has(r) && Number(r.amount) > 0 && r.acct === ref.acct && (r.to == null || ref.to == null || r.to === ref.to)
      && k(r) === k(ref) && Number(r.amount) === -Number(ref.amount) && String(r.date) <= String(ref.date))
      .sort((p, q) => String(q.date).localeCompare(String(p.date)))[0];
    if (g) { used.add(g); refunded.push(g); }
  }
  return { live: rows.filter(r => Number(r.amount) > 0 && !used.has(r)), refunded };
}
