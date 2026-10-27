# Needs a browser (s10-family)

1. Miami Gardens Laserfiche (edocs.miamigardens-fl.gov/WebLink) full-text search for "EcoTech Visions" and "ETV", council agendas and minutes 2015-2020.
   Why: Miami-Dade ethics INQ 17-248 says Mayor Oliver Gilbert's spouse had an existing City contract through EcoTech Visions, Inc. and that he may not vote on it. The repo's Miami Gardens actions (2008-2026) have no EcoTech item, so the contract approval, any renewal, and Gilbert's vote or abstention are not yet found.
   Output: the agenda item, resolution number, date, roll call, and any Form 8B, saved to scripts/data/sources/inbox/.

2. Florida Commission on Ethics complaint records before 2024 by respondent name (only 2024-2026 monthly press releases are posted at /Documents/Ethics/PressReleases/<Mon><YY>pres.pdf; older releases were not found at that pattern).
   Names: every pid in public/data/prior/index.json and public/data/money-summary.json.
   Look for: probable-cause findings or stipulations under s. 112.3143 (voting conflict) or 112.313(6)/(7) that involve a relative.

3. Coral Gables verbatim transcripts (Legistar attachments) for Vince Lago's abstentions on 2014-04-08 (RS&H), 2017-08-29 (Henry S. West Lab School), 2022-07-25 and 2022-10-25 (1505 Ponce, 515 Valencia), 2022-12-13 (234 Navarre). The Legistar API histories and the action minutes for 2022-07-25, 2022-10-25 and 2022-12-13 (read) give no reason. The 2014 and 2017 minutes host (legistar1.granicus.com, coralgables.legistar1.com http) did not resolve from here.

4. Sunny Isles Beach Laserfiche minutes (docucenter.sibfl.net): Feb 19, 2015 (DocView id=326242, Goldman recusal) and Nov 15, 2018 (DocView id=2019364, Svechin recusal). Already listed in business/history-3/needs-browser.md; check the stated reason for a relative.
