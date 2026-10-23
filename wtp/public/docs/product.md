# We the People 305: direction and build log

## Open source (Brit, Oct 23, 2026)
The whole platform is open source under MIT in github.com/Brittybrit/vote-informed: the headless version (the API and the MCP server), the version with a UI, the citizen side and the organizer side. The org tier charges for timeliness and tooling (keys, limits, watchlists, alerts, a shared workspace), never for code or for facts the public cannot get. Anyone can run their own copy for their own county; the data under it is CC BY (proposed) and the method is published.

## Updates (newest first)
- Oct 23, 2026 (morning): the project is open source (MIT, this repo). These docs live at wethepeople305.org/docs and the founder board's assistant reads them. Direction for money: Substack for the newsletter and monthly support (weekly "what gets decided this week" digest from the API); Open Collective or a fiscal sponsor for tax-deductible gifts; a paid tier is support only, never data the free tier lacks. ballot305.org/donate is live with an email fallback until a link is set.
- Oct 23, 2026 (night): Brit bought wethepeople305.org on Cloudflare Registrar. We the People 305 is its own Cloudflare Worker (`wtp/`), separate from ballot305.org, with its own KV, secrets and routes; the founder board is at admin.wethepeople305.org. The voter guide stays frozen except data refreshes and fixes until Nov 3.
- Oct 23, 2026: this is a nonprofit endeavor. Org-tier admission is by published criteria, not by name.

Name (Brit, Oct 22, 2026): "We the People 305" is the product name; handle @wethepeople305; wethepeople305.org is the domain (wethepeople.miami optional later). Ballot305 stays the site name until she says otherwise. Before print: run a trademark search in the software and civic-data classes (the bare phrase has existing filings and the White House petition platform history; the 305 anchor is what distinguishes it). Pattern scales by area code (We the People 317 for Indianapolis).

Oct 22, 2026. Brit's goal (her words): a durable product for civic intelligence on publicly elected and funded officials and institutions, with API access for other platforms; something that makes holding officials accountable and staying informed of what's coming up in the community easy; insights that are timely, relevant and a call to action. Later the same night: start local; the point is actionable advice on how to get things done about what they care about in the fastest and lowest-overhead way; procurement needs to be a layer; it should also be a whitelisted org-to-org service for organizers who need intel; it needs to be headless (people work inside their own tools and use the platform's data to act); it should draw on historical data for predictive, most-likely-to-succeed plans and learn from what actually happened; demographics inform access to grants and public services; show "what's in it for me" on upcoming decisions, and what they mean for my neighbors, friends and family; go farther: what happens when the money goes away, which services are affected for me and my community.

## Organizing model (Brit, Oct 22, late)
Oriented around the citizen's scope of influence within the cycle of elections and governance. The citizen is the center: at each point in time there is a team of public servants in service to me or running to be, there is what is at stake in this phase, and there is what I have access to influence. Phases: out of session and in session; planning (budget, policy, laws); decision points for the servants (in session, votes); decision points for the citizen (elections); and the in-between where action drives direction.

Implication for the data model: a time axis per body (cycle phases with dates and sources), joined to the roster (who is seated or running for the offices on my ballot), actions (what they decided), upcoming items (what is at stake now), and levers (what a citizen can do in this phase, with deadlines and procedure). Home view = "right now, for my address": my team, the phase each body is in, what's at stake, what I can do.

Levers are few and should be stated honestly: vote; public comment (written or in person, with the body's rules and deadlines); contacting the member; records requests; petition, referendum or recall where the charter allows; running or qualifying; donating; competing for a contract. No inflated influence claims.

## Onboarding (Brit, Oct 23: "find out who they are and what they have access to")
Three doors, the user picks: upload the sample ballot (precinct read off the PDF, nothing else read from it); connect a profile (Google or Apple sign-in, home address read from the profile and converted to a precinct, address not kept, watchlist follows across devices); or answer two questions (address or ZIP, how to be reached). The tool stores the precinct and the watchlist, never the address, ballot picks or name unless signed in.
"What do you bring" (Brit, Oct 23: "their resources could include if they are a business owner"): an optional row, because standing changes the plan more than hours do. Business owner: bid on contracts (procurement levers are vendor-only), county and city vendor registration, SBE or micro-business certification, business tax receipt and signage offices, employer standing. Property owner: zoning standing, mailing-radius notice rights, right to appeal a CZAB decision as an aggrieved party ($855). Parent in M-DCPS: speaker rules, PTA and EESAC seats, school-level budget councils. Member of a group: representative speaking time (county: more than five on one side pick a rep with four minutes), the org tier. Landlord or renter: standing on housing items.

## Relevance: what it means for me, my neighbors, friends and family (Brit, Oct 23)
Every upcoming item gets tags computed from its own packet, never generated: location (address or district, distance from my precinct); fiscal (millage, fee, rate, assessment, turned into dollars per household or per business only where the packet gives the numbers); regulated industry (from the staff analysis, as the state bill cards already do); household topic (schools, transit lines, parks, water, daycare, senior services); lifestyle topic (nightlife hours, parking and towing, noise, boating, pets, cycling). The user's side: precinct, what they bring, job or business, and interests picked once and kept on the device. Match = card lines like "Your wallet: the memo puts it at $3.10 a month for a single-family home" with the memo linked. When the packet is silent the card says "no stated impact"; nothing is invented.
Neighbors: the geo tag plus what the packet says about the notice radius ("mailed to 412 owners within 500 feet"); levers scale with numbers (county: more than five on a side get a representative with four minutes).
Friends and family: a short list kept on the device, each a label, a ZIP or precinct, and the same "what they bring" boxes ("Mom, Hialeah, renter, 70+"). Items are scored for them the same way and the card grows a line per person. One-tap send (text or Partiful) carries the card, the record link and the one thing they could do. The tool never looks anyone up from a name or a contact list, and stores none of it server-side. Whether people on your list are watching an item is visible only if they turned that on.

## Budget map: what happens when the money goes away (Brit, Oct 23)
The chain: a ballot question or vote changes a revenue line > the line feeds a fund > the fund pays departments > departments run services at places near you. Every link is in a public document; the product joins them.
Data per body: revenue source to fund to department to service with dollar shares, from the adopted budget books (county OMB, each city's adopted budget, the district's); service to place (libraries, parks, fire stations, transit routes, clinics, schools) with location so "near you" is computable; the financial impact statement for each ballot measure (Revenue Estimating Conference for amendments, the referendum ordinance for local questions, which also says what the money funds); history as the base rate: what each body actually cut the last time revenue fell (county 2009 to 2011 cut lists, line by line).
Card: "This changes X by $Y. Y funds A, B, C (shares). Near you: these places. Last time this body lost this kind of money, it cut these first."
Rule: show what the money funds and what was cut before; never predict the cut. The body chooses next September, and the card says so.
Worked examples (Brit, Oct 23): Amendment 3's local revenue loss lands in Miami Beach's general fund (police, fire, parks, sanitation, arts and culture grants); the school millage renewal's referendum language names what it funds (teacher pay supplements, school safety staff), so a failure is a known amount per school.
Budget books are PDFs that do not block automated reads; same pipeline shape as the cycle files, one budget per body.

## What you're entitled to: grants and public services (Brit, Oct 23: "demographics provide insight on their access to grants or public services"; "entitled to is better than owed")
A program register per body: grants and services with eligibility rule, window, office, how to apply, source URL; hand-researched like the cycle files and refreshed with them. Examples to seed: each county commissioner's district-office Mom and Pop Small Business Grant; county SBE and micro-business certification; CDBG-funded programs by neighborhood; homestead, senior and other Property Appraiser exemptions; school-level programs; veteran and disability services; city grants funded from the budgets the cycle tracks; county cultural affairs grants (window not yet verified). Shown on the home view as "programs you may be entitled to" and used by the planner as resources.
Rules: ask eligibility, not identity. Programs key on age band, veteran status, household size, income band, business size and ownership, disability, homeownership; the tool asks these as optional yes/no eligibility questions, computes matches on the device, and discards the answers. Never store race, ethnicity, immigration status or income. Say "may be entitled to," and link every card to the agency's own rule and window. Demographic answers never join the learning pool, even aggregated; the layers share a screen, not a table.

## The planner (Brit, Oct 22: "the user types in what they want to change")
Input: a goal in plain words, precinct, hours per week, deadline, whether they will speak in public, whether they have a group, what they bring (above). Output: the shortest path, not a menu. The tool matches the goal to a body, an item and the current phase, picks the lever with the most effect per hour in that phase, and returns a dated milestone list where every step cites the record it came from (hearing date, rule, office, dollar, lobbyist registration). Capacity decides where the list stops. Resources mapped from public records: constituency and district offices, the clerk's comment channel, advisory boards with open seats, organizations that already appeared on the item (registry and minutes), the body's speakers at prior hearings, the program register. Integrations later: Partiful or Eventbrite for an event step, venues.
Lines held (Oct 22): the leverage map (who funds, who contracts, who lobbies) is shown as facts and used as a step; the tool does not author pressure campaigns against named third parties. Contacts come from offices and public records, not scraped lists of journalists or organizers; media steps point to beats and public tip lines. If the goal is electing or defeating a candidate, the plan stops at the candidate's own volunteer page and the registration deadline (the electioneering line Brit already drew).
Needs before it works: cycle layer, upcoming items per body, a contact field per office (district office email, phone, comment channel). Then one LLM call with the ledger, cycle and capacity as inputs and a rule that every step cites a record.

### Planner stage two: predictive and self-refining (Brit, Oct 23)
The ledger is the training set: every action is an outcome (what was asked, who was for it, who spoke, deferred or not, how it voted).
1. Base rates computable now from the record: deferral rate for contested items when residents appear; how often a deferral kills versus delays; pass rate by mover, by lobbyist presence, by applicant giving to members voting; members who have flipped between readings. Always shown with the count ("in 11 of 14 similar items since 2025"), never as a percentage dressed up as a probability.
2. Every plan is tied to an item id; the ledger records the item's outcome when the vote happens, so the result side is automatic.
3. The user logs what they did against each step (one tap: sent the email, spoke, got N neighbors to comment). Only new input.
4. Over time, which steps at which phase with how much capacity preceded which outcomes feed the planner's ordering and its "likely to work" line.
Honesty rule: small-sample world (one commission, a few hundred items a year, tens contested). Confidence is a count until it isn't.
Privacy rule: what a resident did against a specific item is stored aggregated by item and step type, not by person, unless they opt in to keep their own history. Org tier keeps its own history; the learning pool stays anonymous.

## Headless (Brit, Oct 23: "work inside their own preferred tools")
The platform is the thing people's tools connect to, not the other way round. An MCP server over /api/v1 so any assistant (Claude, ChatGPT, Cursor, a Slack bot) can read now/upcoming/ties/cycles, run the planner, and (org tier) manage watchlists and alerts; the user's own assistant does the calendar, email, Slack and Partiful steps with connections it already has. Identity: API key issued by OAuth sign-in (Google or Apple), remembers watchlists across devices. The server returns the tie fields (match, basis, timing), not summaries, so the caveats survive being spoken by someone else's model. Not building per-tool OAuth connectors.

## Procurement layer (Brit, Oct 22: "procurements needs to be a layer")
Its own phase model per body: need published (budget line, capital plan) > solicitation posted (RFP, ITB, RFQ; cone of silence) > evaluation and ranking > award recommendation on an agenda > vote (already in the ledger: 39 county award actions, city contracts) > contract, renewals, amendments, change orders.
Resident leverage: solicitation questions and addenda (phase 2), comment at the award vote (phase 4), records requests for scores and change orders (3 and 6), Inspector General. Bid protests are vendors only. A resident's own business competing is the one lever that changes who gets the money.
Data: solicitations feed per body (title, dates, buyer contact, status); contract register (vendor, value, term, expiration, amendments); the join vendor > registered lobbyist > donor to the members who vote. Contract expirations are the timely signal: a solicitation is coming before it is announced. Payments (who gets paid with tax dollars, staffing and contractors) sit beside it; the county's employee pay ArcGIS service is live and queryable.
Conflicts of interest (Brit, Oct 23): the tool looks for connections between parties (relatives, family, personal business interests of the official or family) but publishes only what an official record confirms. Unconfirmed leads never leave the private review file. "If you do business with the government you consent to your connections being public."

## Org tier (Brit, Oct 22: "whitelist o2o service for organizers who need intel")
Same data as the public tier; organizations pay for timeliness and tooling, never for facts the public cannot get. What the tier adds: API keys with higher limits and bulk pulls; watchlists (an item, an official, a vendor, an address); alerts when an agenda posts, a filing lands or a contract nears expiration (webhook or email); the planner for a group; a shared workspace for a coalition.
Decided (Brit, Oct 23): admission by published criteria, not by name. Draft criteria, to publish on the site:
1. A real organization: a registered nonprofit, a neighborhood or homeowners association, a union local, a newsroom, a school or faith community, or an unincorporated group with a named lead and at least five members who will use it. One key per organization.
2. Working in Miami-Dade: the organization's activity is here (an address, a meeting place, or members who live here).
3. Agrees to the terms: attribution to We the People 305 on anything published from the data; no resale or redistribution of the feed; no use of the data to harass, dox or target private individuals; no scraping of other users' or members' contacts; the data's own caveats (match kind, timing) travel with any use.
4. Not a campaign: candidate campaigns, political committees and their vendors use the public tier. Parties and committees are not refused the facts; they are refused the org tools during an election cycle.
5. Any organization meeting 1 to 4 is admitted, whichever side of an item it is on. Refusals are written and cite the criterion. The list of member organizations is published unless an organization asks to be unlisted for safety reasons.
Plumbing: keys in KV with org tier and per-key limits, /api/v1/me for a key's own limits and watchlists, a daily scheduled worker that diffs agendas and filings against watchlists and fires alerts.
Pricing instinct, not decided: free under a size threshold, flat monthly above, a newsroom rate. Nonprofit: cost recovery, sliding by size, newsrooms and small groups free.

## Shipped so far (Oct 22 and 23)
- Public read API at ballot305.org/api/v1 (src/api.js), docs at /api, OpenAPI at /api/v1/openapi.json. Built from committed JSON; a deploy is a data release. Read-only, no key, CORS, ETag. Endpoints: bodies, actions, ties, people, transparency, bulk, cycles, now, upcoming, contacts, procurement, payments, connections. Epistemic status as fields on every tie: match (party | lobbyist | firm | office | listed | class), basis, timing (before | after | same | unknown), signed days; split flag on actions. Data license stated as CC BY 4.0, not yet confirmed by Brit.
- Cycle files for all 20 local bodies (scripts/data/cycles), merged to public/data/cycles.json; /api/v1/now?precinct= gives my offices, holders, candidates, each body's phase, next meetings, levers, contacts, upcoming items with relevance, procurement horizons, payments. See cycles-coverage.md.
- Contacts, upcoming items (agendas plus procurement plus payments), agenda-systems register (what each clerk runs, integrations, contract term where derivable), disclosures schema, conflict lead finder (100 leads, 0 confirmed, none published).
- Founder board at admin.wethepeople305.org (own Worker, `wtp/`), with chat, card tools and a live read of the API.
- ballot305.org/donate, footer links, hamburger menu on every page.

## Product shape (agreed)
1. Core asset: the provenance-tracked join of official actions to money and lobbying, plus entity resolution. The election site is one view of it.
2. Durability rule: no card exists unless a committed script can rebuild it from saved source copies.
3. Elections are distribution, not the product. Actions happen year-round.
4. Scale by record system (Legistar, Granicus, Novus, CivicClerk, VoterFocus, EasyVote), not geography. The transparency scorecard is leverage on cities whose records cost the most.

## Build order from here
1. Charter hand-checks in the browser (list in cycles-coverage.md); Miami Beach cycle file; monthly cycle re-pull as a scheduled task.
2. Program register (what you're entitled to) per body, same pipeline as cycles.
3. Budget map per body (revenue > fund > department > service > place, with the last cut lists and the ballot measures' financial impact statements).
4. Base rates script from the ledger (deferrals, flips, pass rates with counts).
5. MCP server over the API; OAuth sign-in issuing keys.
6. Org tier: watchlists, alerts, criteria page.
7. Procurement: county solicitations feed and contract register with expirations; vendor to lobbyist to donor join.
8. Planner: /plan endpoint (goal, precinct, hours, deadline, what they bring) returning cited milestones, tied to item ids, with the one-tap step log.
9. Integrations (Partiful, Eventbrite) for event steps; one-tap send of a card.
10. Move the API from the ballot305 Worker to the We the People Worker once the front door is being built; ballot305 becomes a client of it.

## Open decisions for Brit
- Data license (CC BY 4.0 proposed).
- Org-tier pricing. Confirm the draft criteria wording.
- When to open Marion County: after Miami-Dade runs one post-election cycle unattended.
- wethepeople.miami (optional) and the trademark search.
