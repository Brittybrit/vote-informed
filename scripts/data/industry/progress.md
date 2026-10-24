# Industry tagging progress (2026-10-24)

## Status
- federal-pacs.json: DONE. All 86 distinct contributors (111 rows) hand-tagged; company self-descriptions fetched from official sites (src per donor).
- state-donors.json: DONE first pass. 1,697 donors (>= $500 total, or any organisation). 102 left "unknown". 79 hand overrides.

## How to rerun (copies of build scripts in ./build; run from a scratch dir)
1. python3 agg.py  -> agg.json (aggregates all state/donors/*.tsv by uppercase name; skips INT interest and REF refund rows)
2. python3 tag_state.py -> state_tagged.json (keyword rules over name + all reported occupations; overrides.json wins)
3. python3 fed.py -> writes federal-pacs.json directly
4. Convert state_tagged.json to state-donors.json (strip _t/_org/_rule fields).
Paths in agg.py are absolute to /root/vote-informed.

## Lookups done
- DOE ComDetail (purpose and affiliated org were BLANK on all checked): A Stronger Florida 71120, CCC 80504, Florida Justice PAC 60702, FPF Fire PC 73979, IMPACT 60715, Florida Public Health Fund 61251, Committee of Florida Agents 60712, FTBA Transportation PAC 60672, ABC Merit Shop PC 61173, Florida ACRE 60473, Florida Operators Association 60810, EC-PAC 61234.
- DOE name search URL pattern: https://dos.elections.myflorida.com/committees/ComLkupByName.asp?searchtype=1&comName=NAME&NameSearchBtn=Search+by+Name
- Sunbiz and FEC committee pages: blocked/unanswered permission prompts this session.

## Still to do
- WebFetch hourly limit hit. Not yet verified: property vs other lines for insurers reported only as "INSURANCE COMPANY" (Slide, Heritage MGA, American Integrity, Florida Family, FCCI, Tower Hill, Skyway, GEICO, USAA). Left as insurance-other; upgrade to insurance-property/auto after checking each company's site.
- Candidate-named and cause-named committees (Friends of X, Florida Courage, Brighter Florida, etc.) are political-committee only; DOE pages for the big ones ($10k+) not yet all checked.
- PBM check for PRIME THERAPEUTICS (reported PHARMACEUTICALS) and UnitedHealth/Elevance (reported HEALTH CARE; not tagged insurance-health because the report doesn't say insurance).
