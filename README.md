# Policy Sentinel

Tribal Nations decide what a federal rule or a state bill means for their own work. Policy Sentinel helps Tribal policy, natural resources and legal staff find the official record, read the words an agency or legislature used, and bring a cited passage back to the people making that decision.

ATNI Climate develops Policy Sentinel. The Affiliated Tribes of Northwest Indians (ATNI) publishes the working demo. You can use it without an account. [Open Policy Sentinel](https://atniclimate.github.io/policy-sentinel/)

## From a search to a briefing

1. **Find a record.** Search for a topic, enter a Federal Register document number, or look up a congressional or Washington State bill by number. Results name the source, say when it was checked and explain why each record appeared.
2. **Read the passage in context.** Open a Federal Register document or the introduced text of a Washington bill. The reader points to wording such as a consultation provision or a comment deadline. Follow the citation to read the official text around it.
3. **Bring the evidence back.** Add records to **My Citations**, select a passage and write your note. Export a **Briefing** when you want to share it. The source wording and your notes stay distinguishable, and the references travel with the document.
4. **Return to a docket.** Follow a record, then choose **Check for new** when you return. The demo uses the identifiers the source supplied and shows what it found on that check.

## What a result can tell you

A name match tells you where to look. A relationship to a particular Tribal Nation requires exact evidence in an official source. A shared docket or citation can help you trace a policy's history. The reader can show the agency's words and their source. Each Nation determines their significance.

Coverage varies by source. The demo searches federal records through the Federal Register, GovInfo and Regulations.gov, and looks up bills through Congress.gov and the Washington State Legislature. Grants.gov lists forecasted and posted funding opportunities. Oregon and Idaho legislative searches are unavailable. Some listings provide only a description and a link. A source that cannot answer is identified on the page. Open **About and Limits** for coverage and check the official record before relying on a date or passage.

## What leaves your browser

When you search, the demo service sends the query to the official sources used for that search. Choosing a suggested issue, bill or draft can also send searches to sources named by that suggestion. Opening a policy's issues or adding it to **My Citations** sends its public identifier to the service, which may keep the retrieved text for up to a day. The service keeps no search log. It and its hosting provider briefly count requests by network address to limit traffic.

Your followed list stays in this browser between visits. **Check for new** sends the identifiers needed for that lookup. Keep exported briefings and follow lists wherever your Nation's practices call for them.

## Run a local copy

The standard build uses synthetic records so developers can try searching and reading citations offline after installing dependencies. Staff with a reviewed local collection can build a separate research workspace to save and reopen studies. [Local research workflow](reference/local-use.md)

Use the project's pinned Windows x64 toolchain, Node.js 24.19.0 and npm 12.0.2. From the repository root, run the following commands and open the local address printed by the last command.

```powershell
npm ci
npm run build
npm run preview -- --host 127.0.0.1
```

### Measured storage and capacity planning

For an existing local collection, `npm run storage:report -- --help` explains how to measure its size. The report counts files and bytes without reading document contents. [Storage measurement and assumptions](reference/local-use.md#storage)

## Use and attribution

Policy Sentinel is a source-reference tool under development. Cite the originating agency, legislature or court when you quote its record. The search result and automated passage flags do not establish legal effect. [Source coverage and reuse](reference/sources.md)

The original code uses the PolyForm Noncommercial License 1.0.0. Documentation uses Creative Commons Attribution-NonCommercial-ShareAlike 4.0. Official material and third-party components carry their own terms. ATNI reserves use of its seal. [Code license](LICENSE) · [Documentation license](LICENSE-docs.md) · [Third-party notices](THIRD-PARTY-NOTICES.md)
