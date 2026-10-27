# Action-first standard (Brit, Oct 23-25, 2026), copied from the project doc for agents

Every list of official actions is built the same way, starting from the actions, never from donors:

1. Universe: every action the body took from the start of the official's tenure (was Jan 1, 2025; changed
   Oct 25, 2026) to the latest posted meeting that benefits a named private party (company, developer,
   nonprofit, named applicant, union): contract award, renewal, amendment, change order, purchase, bid
   waiver, piggyback; zoning, land use, variance, site plan, plat, development agreement; lease, sale or
   exchange of public land; grant or funding to a named organization; settlement; license or permit decided
   by the body; easements. Excluded: proclamations, ceremonial items, board appointments, internal staffing,
   items whose only parties are governments. An action whose beneficiary the record does not name is left
   out and counted in the list's description.
2. Roll call for each, from the body's own records (minutes, signed resolution, clerk record). Where only the
   agenda exists, every member seated that day is shown with "Vote not given in the minutes".
3. Then donors: the official's campaign and committee gifts matched to each action's parties, their
   registered lobbyists and lobbying firms, same rules everywhere.
4. Then personal business interests (official disclosure, Sunbiz with matching filed address).
5. The share line counts tied actions over this universe for every body. A list built from donors never gets
   a percentage. An official with no donor data gets no list or share.
6. A tie needs a vote the member cast: an action counts toward ties, the money total and the share only when
   the member voted yes or no. Absent, excused, abstained, recused or "vote not given in the minutes" is left
   out of both the tied count and the denominator.
7. Unanimous votes are not ties (Brit, Oct 27, 2026): a vote ties only when the record shows at least one no and
   the member voted yes. Unanimous votes, and votes whose tally is not known (no recorded no-count and an incomplete
   roll), leave the tied count and the denominator too. Requests and an officer's own actions are not votes.
   Code: scripts/lib/contested.mjs.

State legislators: every budget request filed is the universe for requests. Bills: every enacted bill whose
staff analysis names a kind of business it helps, the same way for all members.
Congress: every earmark request filed; floor votes: every enacted law in the window whose CBO/CRS analysis or
overturned rule names an affected business.
Cabinet / statewide executive: every action of the officer's own office reviewed. Board of Trustees items are votes
by motion without objection (no recorded no), so they leave the share's pool under rule 7.

Bill and law rules: a law qualifies only when its analysis itself names a kind of business or company that
benefits (not the bill text, not an implied benefit, not "businesses" generally, not a business only
regulated or burdened). The analysis sentence must state the benefit (payments, fees, revenue, tax relief,
reduced costs, less competition); laws whose sentence does not are in scripts/data/industry/not-a-benefit.json.
Donors counted for a law: scripts/data/industry/INSTRUCTIONS.md (Brit, Oct 27, 2026). In short, an industry tag plus
whole-word phrases (scripts/data/state/bills/classes-by-chapter.json; federal: floor-votes.json classes); a person
only when their own reported occupation shows they are the business (a licensed practitioner it names, or an owner
or principal), never an employee and never by their name; a company or committee by its own name or business; a
union only when the analysis names its workers as benefiting; realtors only for a law that names realtors.

Lobbyist rules: a lobbyist counts for an action only when registered with that body for the party (same
entity, registration in force at the vote) or named in that body's own record for the item. A gift from the
firm, its PAC or any of its lobbyists counts as the firm giving. Address-only actions get the owner of record
from the Property Appraiser sales history as of the action date, plus the applicant from the packet.

How a city is merged (the coordinator runs this; agents only extend the per-city source files):
  node scripts/city-actions.mjs <slugs> && node scripts/city-enrich.mjs <slugs>
  node scripts/city-firm-gifts.mjs && node scripts/leads.mjs && node scripts/money-summary.mjs && npm test
Florida bills: python3 scripts/data/state/bills/merge.py && node scripts/state-bills.mjs
