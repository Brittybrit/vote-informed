import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from forms_data import FORMS, A, I, L, B
from sunbiz_data import SUNBIZ, r as srow, M, N, RES

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', '..'))
OUT = ROOT + "/scripts/data/disclosures/"
CHECKED = "2026-10-23"
roster = json.load(open(ROOT + "/public/data/roster.json"))
cur_office = {}
for t in roster["terms"]:
    if not t.get("end"):
        cur_office[t["person"]] = t["office"]

EFDMS_NOTE = ("Forms read 2026-10-23 from Florida COE EFDMS through its public JSON endpoints "
              "(/api/PublicFiling/SearchPublicFilers and /api/PublicFiling/SearchFilingHistory) and the filing PDFs "
              "(/Report/GetFormContent?filingId=<id>, viewable at /Report/PrintForm/?filingId=<id>).")
NO8B = "Form 8B memoranda and abstentions in minutes were not searched in this pass."

# ---------------- federal ----------------
HC = "https://disclosures-clerk.house.gov/public_disc/financial-pdfs/"
FED_FORMS = {
 "mario-diaz-balart": ([{"type": "House Financial Disclosure (annual)", "year": 2025, "filed": "2026-05-11", "url": HC + "2025/10076701.pdf",
    "assets": [A("Apple Inc. (AAPL), dependent child, $1-$1,000", "securities"), A("Bank of America savings account, $50,001-$100,000", "other"),
               A("Florida Prepaid College Program, $1,001-$15,000", "other"), A("Roth IRA (Fidelity Magellan / cash reserves), spouse, $1,001-$15,000", "securities"),
               A("State of Florida pension (not self-directed)", "other"), A("TIAA-CREF accounts (CREF Growth, Inflation-Linked Bond, Money Market, TIAA Traditional), spouse, each $1,001-$15,000", "securities")],
    "incomeSources": [I("Ladat, LLC (spouse salary; amount not required)", "employer"), I("State of Florida Retirement System (pension distribution)", "other", 9721.08)],
    "liabilities": [],
    "businesses": [B("Congressional Hispanic Leadership Institute", "director", "board member (unpaid)"), B("124 D Street Condominium Association", "officer", "vice chair (unpaid)"),
                   B("National Association of Latino Elected & Appointed Officials", "director", "board member (unpaid)")],
    "source": "U.S. House Clerk, Financial Disclosure Report, Filing ID 10076701 (Schedules A, C, E, F)"}],
   "Annual report for 2025 filed 2026-05-11. No liabilities. Agreement: State of Florida pension for legislative service (Nov 2002). Sunbiz officer search for 'Diaz-Balart, Mario' returned no entity. Ladat, LLC (spouse's employer per Schedule C) is on Sunbiz as L14000069635, ACTIVE, Miami.",
   [{"name": "spouse (not named on the disclosure)", "relationship": "spouse", "basis": "Member's 2025 House Financial Disclosure, Schedule C: 'Ladat, LLC - Spouse salary'", "entity": "Ladat, LLC", "url": HC + "2025/10076701.pdf"}]),
 "maria-elvira-salazar": ([{"type": "House Financial Disclosure (annual)", "year": 2025, "filed": "2026-08-13", "url": HC + "2025/10075495.pdf",
    "assets": [A("MES Home Distributors, 100% interest (pool equipment and accessories business, Miami; dissolved May 2025); business income $100,001-$1,000,000", "business interest"),
               A("Storm Shield of Miami, Inc., common stock in privately held company, $1,001-$15,000", "business interest"),
               A("Google, Inc. (YouTube ad revenue on filer's videos), royalties $5,001-$15,000", "other"),
               A("Prudential Financial (PRU) stock; Merrill Lynch IRAs and non-retirement investment account (mutual funds, many transferred from Miracle TV, Inc. account); 529 and UTMA accounts", "securities")],
    "incomeSources": [I("MES Home Distributors (business income $100,001-$1,000,000)", "business"), I("Google / YouTube royalties ($5,001-$15,000)", "other")],
    "liabilities": [],
    "businesses": [B("Miracle TV, Inc.", "officer", "President/Director/Secretary/Treasurer; Sub-S corporation, Miami"), B("MES Home Distributors", "owner", "100%; pool equipment and accessories; dissolved May 2025"),
                   B("Storm Shield of Miami, Inc.", "owner", "common stock in a private company (storm shutters/protection, by name)"),
                   B("Marta Bermudo Revocable Trust", "officer", "trustee"), B("The Maria Elvira Salazar Revocable Trust", "officer", "trustee")],
    "source": "U.S. House Clerk, Financial Disclosure Report, Filing ID 10075495 (Schedules A, C, D, E)"}],
   "Annual report for 2025 filed 2026-08-13 (after an extension). Schedule C earned income: none disclosed; Schedule D liabilities: none. She files periodic transaction reports (several in 2024 and 2026). Storm Shield of Miami and the MES pool business are construction/home-products companies; hurricane-protection or construction items are flags.",
   []),
 "carlos-a-gimenez": ([{"type": "House Financial Disclosure (annual)", "year": 2025, "filed": "2026-08-11", "url": HC + "2025/10078065.pdf",
    "assets": [A("Rental property, 6231/33 SW 21 St, Miami (joint; $500,001-$1,000,000; 100% bought Feb 2025 from spouse's sister)", "real property"),
               A("524 Mendoza Ave, Coral Gables (spouse; inherited half interest; sold Jan 2025)", "real property"),
               A("Retirement annuities and funds: Voya 403(b), Nationwide 457, Athene IRAs, Mission Square plan, Thrift Savings Plan, Vanguard IRA", "securities"),
               A("Pensions: Florida Retirement System (filer and spouse), Miami Firefighters and Police Pension, Miami Firefighters Relief and Pension Fund", "other"),
               A("Stocks: Diamondback Energy (FANG) $15,001-$50,000; FirstEnergy (FE) $1-$1,000", "securities"),
               A("Miami Firefighters Credit Union and South Florida Educational Credit Union accounts", "other"), A("Vehicles and a boat (personal)", "other")],
    "incomeSources": [I("Florida Retirement System (spouse pension)", "other", 81927), I("Miami Fire and Police Retirement (pension)", "other", 145902), I("Florida Retirement System (pension)", "other", 79751)],
    "liabilities": [L("Chase credit card ($15,001-$50,000)"), L("Bank of America credit card ($10,000-$15,000)"), L("Bank of America home equity line ($100,001-$250,000)"),
                    L("Miami Firefighters Federal Credit Union car loans ($50,001-$100,000)"), L("American Express credit card ($50,001-$100,000)"), L("Citi credit card ($10,000-$15,000)")],
    "businesses": [],
    "source": "U.S. House Clerk, Financial Disclosure Report, Filing ID 10078065 (Schedules A-F)"}],
   "Annual report for 2025 filed 2026-08-11 (after an extension). Income is pensions only; no outside positions (Schedule E none). Agreements: City of Miami pension and health benefits (1975), State of Florida pension (2004). Sunbiz: no active entity with him as officer at a matching address (Carlos Gimenez & Associates, P.A., P03000017606, inactive since 2004; NexiaLink Corporation lists a 'Carlos Alberto Gimenez' not shown to be him).",
   []),
 "jared-moskowitz": ([{"type": "House Financial Disclosure (annual)", "year": 2025, "filed": "2026-08-13", "url": HC + "2025/10074897.pdf",
    "assets": [A("MOD LLC, Ft. Lauderdale (spouse; consulting services; $250,001-$500,000; income reported on Sched. C)", "business interest"),
               A("Emergency Ventures, Inc. stock options (strike $.15)", "business interest"), A("Merit International stock options (strike $.36, exercise pending)", "business interest"),
               A("Stationhead, Inc. (software company, New York) $15,001-$50,000", "business interest"), A("AEXLAB (virtual reality studio, Miami)", "business interest"),
               A("StartEngine (capital markets company, West Hollywood)", "business interest"),
               A("Adler Real Estate Fund V LP (commercial properties in CO, FL, GA, NC, TX, VA)", "business interest"),
               A("AshBritt Inc. 401(k) (several funds)", "securities"), A("Florida Retirement System pension", "other"),
               A("Bank, CD and savings accounts (Bank of America, Goldman Sachs, Marcus, Charles Schwab, Western Alliance)", "other"),
               A("MassMutual whole life policies (filer and spouse)", "other"), A("Many individual stocks, ETFs and Treasury STRIPS in Morgan Stanley, Merrill, Betterment, Stash, Schwab and STIFEL accounts (including dependent-child accounts)", "securities")],
    "incomeSources": [I("MOD LLC (spouse salary; amount not required)", "employer")],
    "liabilities": [L("Bank of America mortgage, personal residence (1) ($500,001-$1,000,000)"), L("CrossCountry Mortgage, personal residence (2), Washington DC ($500,001-$1,000,000)"), L("American Express ($15,001-$50,000)")],
    "businesses": [B("MOD LLC", "owner", "spouse-owned consulting services firm, Ft. Lauderdale; pays spouse salary"),
                   B("AshBritt Inc.", "other", "former employer (disaster-recovery contractor); continued 401(k) participation agreement since Jan 2019"),
                   B("Emergency Ventures, Inc.", "owner", "stock options"), B("Merit International", "owner", "stock options"), B("Stationhead, Inc.", "owner", "private stock"),
                   B("AEXLAB", "owner", "private stock"), B("StartEngine", "owner", "private stock"), B("Adler Real Estate Fund V LP", "owner", "limited partner")],
    "source": "U.S. House Clerk, Financial Disclosure Report, Filing ID 10074897 (Schedules A, C, D, E, F)"}],
   "Annual report for 2025 filed 2026-08-13 (after an extension); 41 pages, mostly brokerage holdings, summarized here. He files frequent periodic transaction reports (2024-2026). AshBritt is a FEMA/state disaster-debris contractor; disaster-response contracting and FEMA items are flags. Sunbiz: LCR Consulting LLC (L13000112641, manager Jared E. Moskowitz, inactive since 2023-09-22; address residential, not on his disclosure) and Jared Moskowitz for Congress Inc. (campaign entity).",
   [{"name": "spouse (not named on the disclosure)", "relationship": "spouse", "basis": "Member's 2025 House Financial Disclosure, Schedule A (MOD LLC, owner SP) and Schedule C ('MOD LLC - Spouse Salary')", "entity": "MOD LLC (consulting services, Ft. Lauderdale)", "url": HC + "2025/10074897.pdf"}]),
 "ashley-moody": ([{"type": "Form 6F", "year": 2025, "filed": "2025-03-27", "url": "https://disclosure.floridaethics.gov/Report/PrintForm/?filingId=998452",
    "netWorth": 4426804,
    "assets": [A("10.51% interest in Moody Investment Limited Partnership, Lexington, SC", "business interest", 677049), A("1.67% interest in Missouri Midway LLC, Largo, FL", "business interest", 12525),
               A("10% interest in Artzibushev - University One Limited Partnership, Tampa", "business interest", 1135240), A("8.33% interest in Young & Moody Building, Plant City", "real property", 166109),
               A("16.67% interest in condominium unit, Longboat Key", "real property", 138861), A("33.33% interest in land, Yancey County, NC", "real property", 73193),
               A("16.67% interest in vacant land on Franklin Street, Plant City", "real property", 200040), A("16.67% interest in two condominiums, Treasure Island", "real property", 118790),
               A("6% interest in Gulf to Bay JV Partners LLC, Tampa", "business interest", 151475), A("8.33% interest in First Tampa Alexander LLC, Plant City", "business interest", 166600),
               A("33.33% interest in a Merrill Lynch account (cash $293,359 plus small biotech/tech stocks)", "securities"), A("SunTrust bank accounts", "other", 27659),
               A("Two houses (addresses exempt from disclosure)", "real property", 584197), A("Federal Thrift Savings Plan", "securities", 88515), A("State of Florida deferred compensation", "securities", 339566),
               A("33.33% interest in lot, SW 2nd Ave, Gainesville", "real property", 38330), A("33.33% interest in JSM Life Insurance Trust cash surrender value", "other", 85658),
               A("16.67% interest in condominium, 827 Normandy Trace Rd, Tampa", "real property", 64349), A("Household goods and personal effects", "other", 60000)],
    "incomeSources": [I("State of Florida (Attorney General salary, 2024)", "employer", 139628), I("Moody Investments Limited Partnership", "business", 43547), I("Artzibushev - University One Limited Partnership (est.)", "business", 21000),
                      I("Merrill Lynch dividends and capital gains", "other", 16091), I("Franklin Street property income, Plant City", "rental", 3214), I("Young & Moody Building", "rental", 1834),
                      I("Treasure Island condominiums (16.67%)", "rental", 5300), I("Gulf to Bay JV Partners LLC (est.)", "business", 1500), I("First Tampa Alexander LLC (est.)", "business", 1000),
                      I("827 Normandy Trace, Tampa (16.67%)", "rental", 1290)],
    "liabilities": [L("Bank of America", 307905)],
    "businesses": [B("Moody Investment Limited Partnership", "owner", "10.51% limited partnership interest, Lexington SC"), B("Artzibushev - University One Limited Partnership", "owner", "10%; Tampa retail property whose tenants include Staples, Panera Bread (Covelli Enterprises) and Regions Bank"),
                   B("Gulf to Bay JV Partners LLC", "owner", "6%, Tampa"), B("First Tampa Alexander LLC", "owner", "8.33%, Plant City"), B("Missouri Midway LLC / First Tampa Rosery LLC", "owner", "1.67%, Largo"),
                   B("Young & Moody Building", "owner", "8.33%, Plant City; tenant Plant City Chamber")],
    "source": "Florida COE EFDMS, CE Form 6F (final disclosure on leaving the Attorney General's office 2025-01-21), filing history https://disclosure.floridaethics.gov/PublicSearch/FilingHistory/72729; assets and liabilities as of 2024-12-31, income for 2024 (attached schedule)"}],
   "U.S. Senate financial disclosure not read: Senate eFD (efdsearch.senate.gov) requires accepting a usage agreement before searching, which needs the user's go-ahead, so her 2025 Senate annual report is not captured. Used instead her final Florida Form 6F (filed 2025-03-27; assets as of 2024-12-31). Secondary income sources on that form: Staples, Panera Bread/Covelli Enterprises and Regions Bank (tenants of Artzibushev - University One LP) and Plant City Chamber (tenant of Young & Moody Building). Sunbiz: no entity found with her as officer at a matching address.",
   []),
}

def mk(pid, office=None, extra_notes=""):
    forms, note = FORMS.get(pid, ([], ""))
    o = {"person": pid, "office": office or cur_office.get(pid, ""), "forms": forms, "sunbiz": SUNBIZ.get(pid, []),
         "abstentions": [], "ethicsMatters": [], "relatives": [],
         "notes": " ".join(x for x in [note, extra_notes, NO8B] if x).strip()}
    return o

CITY_RULES = {
 "conflictOrdinance": "Miami-Dade County Code Sec. 2-11.1 (Conflict of Interest and Code of Ethics Ordinance) applies to municipal officials in the County: https://library.municode.com/fl/miami_-_dade_county/codes/code_of_ordinances?nodeId=PTIIICOOR_CH2AD_ARTIINGE_S2-11.1COINCOET ; F.S. ch. 112 part III (Code of Ethics for Public Officers and Employees).",
 "abstentionRule": "F.S. 112.3143(3): a municipal officer may not vote on a measure inuring to the special private gain or loss of the officer, a principal, a relative or a business associate; must state the interest before the vote and file Form 8B within 15 days with the person recording the minutes. https://www.leg.state.fl.us/Statutes/index.cfm?App_mode=Display_Statute&URL=0100-0199/0112/Sections/0112.3143.html",
 "ethicsBody": "Miami-Dade Commission on Ethics and Public Trust (https://ethics.miamidade.gov/) and Florida Commission on Ethics (https://ethics.state.fl.us/)."}
CITY_NOTE = ("Municipal elected officials filed CE Form 1 for 2025 (enforcement of SB 774's move to Form 6 is enjoined for municipal officials in Loper v. Lukis, S.D. Fla. No. 1:24-cv-20604). "
             "Form 1 reports sources and categories, not dollar values. " + EFDMS_NOTE +
             " Sunbiz: officer/registered-agent searches by name on search.sunbiz.org; rows marked 'name and filed address match' share a business address printed on the official's own form. "
             "Home addresses are not recorded.")

CITIES = {
 "coralgables": ("city-coral-gables", ["vince-c-lago", "melissa-castro"]),
 "doral": ("city-doral", ["maureen-porras"]),
 "aventura": ("city-aventura", ["howard-s-weinberg"]),
 "nmb": ("city-north-miami-beach", ["jay-r-chernoff", "phyllis-smith"]),
 "northmiami": ("city-north-miami", ["mary-estime-irvin", "kassandra-timothe", "alix-desulme"]),
 "southmiami": ("city-south-miami", ["steve-calle", "lisa-bonich", "javier-fernandez"]),
 "pinecrest": ("city-pinecrest", ["ken-fairman"]),
 "medley": ("city-medley", ["edgar-ayala", "lizelh-rodriguez"]),
 "hialeah": ("city-hialeah", ["luis-gonzalez"]),
 "opalocka": ("city-opa-locka", ["natasha-l-ervin", "sherelean-bass"]),
 "cutlerbay": ("city-cutler-bay", ["robert-duncan", "suzy-lord", "richard-ramirez"]),
 "keybiscayne": ("city-key-biscayne", ["oscar-sardinas", "fernando-a-vazquez"]),
 "sunnyisles": ("city-sunny-isles-beach", ["larisa-svechin"]),
}
EXTRA = {
 "jay-r-chernoff": "Sunbiz: only inactive entities (Jay R. Chernoff, P.A. P99000102024, dissolved 2009; Jay Chernoff, P.A.; Marbin & Chernoff Realty, Inc.; Sunny Isles Beach Chamber of Commerce); none active.",
 "phyllis-smith": "Sunbiz: 40 'Smith, Phyllis' entities statewide; none at an address on her form, none recorded (too common a name to list name-only hits).",
 "lisa-bonich": "Sunbiz rows are inactive LLCs (name only).",
 "luis-gonzalez": "Sunbiz: the form names Vital Graphics and Santa Fe Family, Inc.; both are at 2131 West 60 Street (a property on his form). Over 50 other 'Gonzalez, Luis E' entities statewide were not recorded.",
 "edgar-ayala": "Sunbiz: about a dozen active 'Ayala, Edgar' entities in Orlando/Okeechobee/Davenport are not recorded (no address tie; likely other people).",
 "robert-duncan": "Sunbiz: The Production Company Inc. (P19000054325, Robert James Duncan, president, inactive 2021) not recorded as an interest; no active match.",
 "richard-ramirez": "Sunbiz: Sunny Bay Mobil Window Tinting LLC (Spring Hill) and Ramirez truck/hookah LLCs list a 'Ramirez, Richard M' with no tie to him; not recorded.",
 "oscar-sardinas": "Sunbiz: about 35 other 'Sardinas, Oscar' entities (Home Value stores, Hialeah) are not recorded; no address tie to him.",
 "fernando-a-vazquez": "Sunbiz: CWR Global Inc. lists Fernando A. Vazquez as VP at a Key Biscayne residential address; not on his Form 1. Inactive CWREngineering, Inc. and Utilities Construction Consultants, LLC also list the name.",
 "larisa-svechin": "Sunbiz: Ommi Consulting LLC (inactive 2024) and Little Hooligans LLC (dissolved 2019) also list her name.",
 "suzy-lord": "",
 "sherelean-bass": "Sunbiz: inactive So Sheek Hair Collection LLC, Center Stage Interior LLC and Upper Level Interior Corp. also list her.",
 "natasha-l-ervin": "Sunbiz: 'Sweetnin's Catering' is not registered under that name. TransformX LLC (St. Cloud) lists a 'Natasha Ervin', no address tie; not recorded.",
 "alix-desulme": "Sunbiz: also Engage Florida, Inc. (active, same 12794 W Dixie Hwy address as Lead To Excel); several inactive entities at the North Miami property on his Form 1.",
 "mary-estime-irvin": "",
 "kassandra-timothe": "",
 "melissa-castro": "Sunbiz: about 20 'Castro, Melissa' entities statewide; only those tied to her form address or Coral Gables city associations, plus two active Miami-Dade LLCs (name only, residential address), are recorded.",
 "vince-c-lago": "Sunbiz: 1424 Ponce LLC (L22000151295), 211 Menores LLC (L22000204152) and Crema Gourmet Thesis LLC (L22000186969, inactive) are on Sunbiz at 1200 Brickell Ave #1480 but list only attorney Manuel J. Vadillo as authorized person, not Lago. BDI Construction Company (P94000093916, his employer) lists Teobaldo Rosell III and Carlos F. Rosell as officers; VT&C Holdings LLC lists Lago with the Rosells. Many older 'Lago, Vicente' entities belong to other people.",
 "javier-fernandez": "Roster id javier-fernandez.",
 "steve-calle": "",
 "ken-fairman": "",
 "howard-s-weinberg": "Sunbiz: older Larkspur entities (inactive) list a Howard Weinberg at 10800 Biscayne Blvd; not recorded.",
}

def write(path, obj):
    with open(path, "w") as f:
        json.dump(obj, f, indent=1, ensure_ascii=False)
        f.write("\n")

def build_cities():
    for slug, (body, pids) in CITIES.items():
        path = OUT + "city-" + slug + ".json"
        existing = json.load(open(path)) if os.path.exists(path) else None
        officials = []
        for pid in pids:
            o = mk(pid, extra_notes=EXTRA.get(pid, ""))
            if existing:
                old = next((x for x in existing["officials"] if x["person"] == pid), None)
                if old:
                    for k in ("abstentions", "ethicsMatters", "relatives"):
                        o[k] = old.get(k) or o[k]
            officials.append(o)
        if existing:
            keep = [x for x in existing["officials"] if x["person"] not in pids]
            officials = keep + officials
        write(path, {"body": body, "rosterBody": body, "checked": CHECKED, "officials": officials, "rules": CITY_RULES, "notes": CITY_NOTE})

def build_county():
    path = OUT + "county.json"
    d = json.load(open(path))
    for o in d["officials"]:
        pid = o["person"]
        if pid in ("vicki-l-lopez", "oliver-g-gilbert-iii"):
            forms, note = FORMS[pid]
            o["forms"] = forms
            o["notes"] = note + " Sunbiz rows below are 'name only': the Form 6 prints no business address to match. " + NO8B
            if pid == "vicki-l-lopez":
                o["notes"] += " VUI SPA LLC (L21000065662, 'Lopez, Vickie', Fort Lauderdale) and MPG Condominium Association ('Lopez, Vickie', director) were found but not recorded: different spelling, no address tie."
            if pid == "oliver-g-gilbert-iii":
                o["notes"] += " Eden Law Services of South Florida, P.A. and Eden of South Florida LLC remain active with Gilbert as president, but neither appears on his 2025 Form 6 as an asset or income source."
    d["checked"] = CHECKED
    write(path, d)

STATE_RULES = {
 "conflictOrdinance": "F.S. ch. 112 part III (Code of Ethics for Public Officers and Employees), incl. 112.313 (standards of conduct) and 112.3144 (Form 6 full and public disclosure). https://www.leg.state.fl.us/Statutes/index.cfm?App_mode=Display_Statute&URL=0100-0199/0112/0112PartIIIContentsIndex.html",
 "abstentionRule": "F.S. 112.3143(2): a state public officer may vote on a measure that inures to his or her special private gain but must, within 15 days after the vote, file a memorandum (Form 8A) disclosing the interest. Legislators follow House Rule 3.1 / Senate Rule 1.39 (state the conflict; may abstain). https://www.leg.state.fl.us/Statutes/index.cfm?App_mode=Display_Statute&URL=0100-0199/0112/Sections/0112.3143.html",
 "ethicsBody": "Florida Commission on Ethics (https://ethics.state.fl.us/); House and Senate ethics committees for legislators."}

def build_state():
    ids = ["fabian-basabe", "ashley-viola-gantt", "omar-blanco", "kevin-d-chambliss", "mike-redondo", "juan-carlos-porras", "angela-nixon",
           "ileana-garcia", "alexis-calatayud", "ana-maria-rodriguez", "james-uthmeier", "blaise-ingoglia", "wilton-simpson"]
    extra = {
     "mike-redondo": "Sunbiz also lists Redondo & Hines, P.L.L.C. (2025) and Aegis Legal Group, P.A. (2026), which are not on his 2025 Form 6 (Aegis was formed after the reporting year).",
     "juan-carlos-porras": "Sunbiz: he is also an officer of Global Eagle Food Corp and CurMed, LLC (both active, officer address matches his W-2 address), which are not listed on his Form 6.",
     "ileana-garcia": "Sunbiz: Narmar Consulting LLC (active, manager Ileana Y. Garcia) at the address on her attached federal return; not listed on her Form 6.",
     "fabian-basabe": "Sunbiz: Fabian Basabe Enterprises, Inc. (active, president) is not on his Form 6. Older Miami Beach restaurant/bar entities with his name are inactive and not recorded.",
     "omar-blanco": "Sunbiz: ABL3 Partners LLC (manager Omar L. Blanco, formed 2026-03-16, after the reporting year) at a residential address.",
     "angela-nixon": "Sunbiz: The Moxie Group, LLC (active; manager 'Nixon, Angie M') and Angela and Nathan LLC (2026) are not on her Form 6; several older Nixon LLCs are inactive.",
     "james-uthmeier": "Sunbiz: director of Keep Florida Clean, Inc. (2024 political committee-linked nonprofit, dissolved 2025-02-20) and ex officio director of the State Board of Administration Finance Corporation (as AG; not recorded as a private interest).",
     "blaise-ingoglia": "Sunbiz: also manager of Hartland Plaza LLC and Government Gone Wild Productions, LLC (active, same Landover Blvd address) and director of Oleta Farms Property Owners Association; none of these is on his Form 6. Hartland Home Loans Inc (P24000064106) lists Melissa Coleman as president, not Ingoglia. Ex officio director, State Board of Administration Finance Corporation (not recorded).",
     "wilton-simpson": "Sunbiz: also manager of Simpson Farms, LLC (active, not on the Form 6) and director of BankFlorida Bancorp, Inc. and Pasco County Farm Bureau, Inc.",
     "ana-maria-rodriguez": "Sunbiz: dozens of other 'Rodriguez, Ana Maria' entities statewide; only AMR & CC LLC (address on her Form 6) is recorded.",
     "kevin-d-chambliss": "Sunbiz: Southern Progressive, L.L.C. (manager Kevin D. Chambliss, inactive since 2021) not recorded.",
     "alexis-calatayud": "Sunbiz: no entity found under her name.",
     "ashley-viola-gantt": "",
    }
    officials = [mk(p, extra_notes=extra.get(p, "")) for p in ids]
    write(OUT + "state.json", {"body": "state", "rosterBody": ["fl-house", "fl-senate", "fl-executive"], "checked": CHECKED, "officials": officials, "rules": STATE_RULES,
        "notes": "Florida House and Senate members and Cabinet officers file CE Form 6 (full and public disclosure, F.S. 112.3144). " + EFDMS_NOTE +
                 " Where a filer elected to attach a federal tax return instead of listing income (Porras, Garcia), income sources were read from the attached return. Sunbiz rows as for city files. Byron Donalds is handled separately."})

def build_federal():
    officials = []
    for pid in ["mario-diaz-balart", "maria-elvira-salazar", "carlos-a-gimenez", "jared-moskowitz", "ashley-moody"]:
        forms, note, rel = FED_FORMS[pid]
        officials.append({"person": pid, "office": cur_office.get(pid, ""), "forms": forms, "sunbiz": SUNBIZ.get(pid, []), "abstentions": [], "ethicsMatters": [],
                          "relatives": rel, "notes": note + " " + NO8B})
    write(OUT + "federal.json", {"body": "federal", "rosterBody": ["us-house", "us-senate"], "checked": CHECKED, "officials": officials,
        "rules": {"conflictOrdinance": "Ethics in Government Act of 1978 (5 U.S.C. app. 101 et seq.; now 5 U.S.C. 13101 et seq.); House Rule XXIII; Senate Rule XXXVII; STOCK Act.",
                  "abstentionRule": "House Rule III cl. 1 (members shall vote unless they have a direct personal or pecuniary interest); Senate has no general recusal rule.",
                  "ethicsBody": "House Committee on Ethics; Senate Select Committee on Ethics; Office of Congressional Conduct."},
        "notes": "House members' 2025 annual Financial Disclosure Reports from the House Clerk (https://disclosures-clerk.house.gov/FinancialDisclosure), read 2026-10-23; value ranges as filed. Senate eFD was not accessed (requires accepting a usage agreement). Byron Donalds is handled separately (Onesto/Optima)."})

if __name__ == "__main__":
    which = sys.argv[1:] or ["county", "cities", "state", "federal"]
    if "county" in which: build_county()
    if "cities" in which: build_cities()
    if "state" in which: build_state()
    if "federal" in which: build_federal()
    print("done", which)
