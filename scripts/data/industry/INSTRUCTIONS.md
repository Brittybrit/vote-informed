# Which donors count for a law (Brit, Oct 27, 2026)

Applies to every law tie: Florida House and Senate (current lists and full tenure, `scripts/state-bills.mjs`),
earlier Florida House and Senate seats (`scripts/prior-legislature.mjs`), and Congress. The rule is code in
`scripts/lib/donor-class.mjs`; tests in `tests/donor-class.test.mjs`.

A law's class (`classes.json`, `classes-by-chapter.json`, `classes-2122.json`, `classes-senate.json`) has `tags`
(industry tags from `state-donors.json` and the tenure `industry-pre2025.json` files), `re` (the kinds of business the
analysis names, as phrases) and `not`. Optional flags, set only when the analysis says so:
- `realtors: true`: the analysis names realtors, real estate brokers or sales associates.
- `unions: true`: the analysis names the workers a union represents as benefiting.
- `who`: practitioner nouns the analysis names beyond the standard list (pattern).

1. **Whole words and phrases.** Phrases match on word boundaries. A short word (4 letters or fewer) matches itself
   and plain endings only (BANK: BANKS, BANKER, BANKING). Short abbreviations in the patterns stand for listed words
   (SURG: SURGEON, SURGICAL; LAB: LAB, LABORATORY, never LABOR; AUTO: AUTOMOBILE, AUTOMOTIVE). Longer stems match their
   words, except listed false starts (CHURCH is not CHURCHILL, WATER is not WATERPROOFING, MOBIL is not MOBILE).
   Phrases that only look like a business are removed first: FOOD BANK, BLOOD BANK, SOCIAL SECURITY, ECONOMIC
   DEVELOPMENT, BUSINESS DEVELOPMENT, ADULT DAY CARE (for child care laws).
2. **A person counts only when their own reported occupation shows they ARE the business**: a licensed practitioner
   or business noun the class names (PHYSICIAN for laws paying physicians, CONTRACTOR for laws helping contractors,
   PSYCHOLOGIST, FUNERAL DIRECTOR, DISTRIBUTOR, DEALER, FARMER), or an owner or principal role (OWNER, PRESIDENT, CEO,
   FOUNDER, PARTNER, PROPRIETOR, SELF-EMPLOYED) next to the business itself. Employees do not count: banker, teller,
   driver, staff, counselor employed by a provider, software or analytics engineer, "engineer" alone, director,
   executive, CFO, administrator. Bare sector words ("CONSTRUCTION", "HEALTHCARE", "AGRICULTURE") do not say the person
   is the business. A person's name is never matched (MARINA, WATERS, TEMPLE, BARBER are names). A donor is the business
   when any occupation they reported on a gift in the same reports shows it.
3. **Committees, PACs and companies** count when their own name or reported business is that business or its trade
   association (Florida Beer Wholesalers' committee: yes for a beer distributor law; the Realtors' committee: only for a
   realtor law). A labor union counts only for a law with `unions: true`.
4. **A stated benefit.** The analysis sentence must state a benefit to the business (payments, fees, revenue, tax
   relief, reduced costs, less competition). "Costs covered by contract funds" or "may require outsourcing" is not one;
   such laws are listed in `not-a-benefit.json` and left out of every list and tie.
5. **"REAL ESTATE" alone** does not say which real estate business (developer, broker, investor, landlord). It counts
   only with a word that says which (REAL ESTATE DEVELOPER, COMMERCIAL REAL ESTATE). Realtors count only for a law with
   `realtors: true` (no Florida law in the lists names them as of Oct 27, 2026).

Federal law ties use company and trade-association PACs listed by name per class (`scripts/data/federal/floor-votes.json`
and the tenure files); no individuals and no unions. The NRA was removed from the firearms class (it is not a
trade association of firearm businesses).

Votes: a law ties only when the floor vote was contested (at least one recorded no) and the member voted yes
(`scripts/lib/contested.mjs`).
