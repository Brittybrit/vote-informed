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
   FOUNDER, PARTNER, MANAGING MEMBER, PROPRIETOR, SELF-EMPLOYED) next to the business itself. Employees do not count:
   banker, teller, driver, staff, counselor employed by a provider, software or analytics engineer, "engineer" alone,
   administrator. An executive title (rule 6) does not count on its own. Bare sector words ("CONSTRUCTION", "HEALTHCARE", "AGRICULTURE") do not say the person
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

6. **Executives count only with an official record of their stake** (Brit, Oct 27, 2026). EXECUTIVE, EXEC, CFO, COO,
   VP, VICE PRESIDENT, CHAIRMAN, DIRECTOR, MANAGING DIRECTOR, GENERAL MANAGER, PRINCIPAL or a CHIEF ... OFFICER next to
   the business counts only when Florida Sunbiz lists the person as an officer, director, manager/managing member or
   registered agent-owner of a company in the class (name and company; address when Sunbiz gives one), or an SEC filing
   (DEF 14A, 10-K Item 10, Form 3/4) names them an executive officer, director or 10% owner of it. Records:
   `exec-records.json`; worklist and method: `EXEC-RECORDS.md`. A gift that counts through a record carries it on the
   card (`record: {company, role, url}`).

7. **Conditional benefits tie only the subset, by record** (Brit, Oct 27, 2026). When the analysis limits the benefit
   to a subset of the business (those who participate, qualify, apply, are eligible, are selected or awarded, take
   advantage of or use a program, choose or opt to do something, are located in a place, "certain" or "some" of them),
   the class carries `conditional`: the analysis's own words that set the limit (SB 7016, 2024: "health care
   practitioners who are able to participate in FRAME or the DSLR Program"). A donor counts only when a record shows the
   donor is in that subset: `subset: {donor key: {recordUrl, quote}}` on the class. No record, the law ties no one.
   Federal laws: `conditional` on the bill in the floor-votes files; such a law ties no PAC. A qualifier that only
   describes the whole business ("companies that manufacture buoys", "craft brewers, who may pay less") is not one.

8. **The class names only what the analysis names** (Brit, Oct 27, 2026). Every term in `re` must be a kind of business
   the quoted analysis names, or a company that is one. A neighbouring trade does not count: HB 619 (2024) helps a
   "professional firm" doing FDOT monitoring and inspection, so contractors are out; a law for developers does not
   take home builders or realtors; one for craft brewers does not take beer distributors; one for landlords does not
   take property managers; one for subcontractors does not take general contractors; one for contractors does not
   take materials suppliers (`not`). CCNA "professional services" are the statute's own list (s. 287.055: architecture,
   engineering, landscape architecture, surveying and mapping).

Federal law ties use company and trade-association PACs listed by name per class (`scripts/data/federal/floor-votes.json`
and the tenure files); no individuals and no unions. The NRA was removed from the firearms class (it is not a
trade association of firearm businesses).

Votes: a law ties only when the floor vote was contested (at least one recorded no) and the member voted yes
(`scripts/lib/contested.mjs`).
