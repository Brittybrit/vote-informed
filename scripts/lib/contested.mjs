// Unanimous votes are not ties (Brit, Oct 27, 2026), for every body: city, county, Cabinet, school board, Florida
// House and Senate, Congress, current and earlier offices.
// - A vote ties a donor (or a business interest) only when it was contested: the record shows at least one "no"
//   among the members voting, and the member voted yes.
// - Unanimous (tally no = 0, or every recorded roll entry is yes) does not tie, and leaves the share line's pool.
// - Unknown (no recorded no-count and an incomplete roll with no "no" in it) is not shown to be contested: it does
//   not tie and is not in the pool either.
// - Budget and earmark requests and an officer's own office actions are not votes: unaffected.
// - A "no" vote is contested by definition, so the separate "voted no" line is unaffected.
export const tallyOf = t => Array.isArray(t) && t.length >= 2 ? t.map(Number)
  : typeof t === 'string' && /^\s*\d+\s*-\s*\d+/.test(t) ? t.split('-').map(x => parseInt(x, 10)) : null;

// 'contested' | 'unanimous' | 'unknown'
export function voteStatus(tally, roll, complete) {
  const t = tallyOf(tally), vs = Object.values(roll || {}).map(v => String(v == null ? '' : v).toLowerCase());
  if ((t && t[1] > 0) || vs.includes('no')) return 'contested';
  if (t && t[1] === 0) return 'unanimous';
  const cast = vs.filter(v => v === 'yes' || v === 'no');
  if (complete && cast.length && cast.every(v => v === 'yes')) return 'unanimous';
  return 'unknown';
}
export const contested = a => voteStatus(a && a.tally, a && a.roll, a && a.rollComplete) === 'contested';
