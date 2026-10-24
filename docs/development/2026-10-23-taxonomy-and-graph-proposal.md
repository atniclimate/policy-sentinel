# Federal Register topics to the taxonomy, and a first relationship graph (proposal, 2026-10-23)

Status: proposal for the team to review (D-114). Nothing here maps a record
yet. The product still maps only from exact official labels, and only through
entries in `config/taxonomy.v1.json` that carry review provenance.

## What was done

`scripts/dev-ai/propose-topic-mappings.mjs` read the Federal Register's own
topic list (one facet call: topics on documents published since 2024-01-01;
317 topics with at least 20 documents). For each topic it asked Jev
(`jev-1.14.0`) one yes-or-no question per taxonomy subcategory: do documents
with this Federal Register topic usually fall within that policy area?
Readings: above 0.7 yes, 0.3 to 0.7 unsettled. The full output, including
unsettled readings for every topic, is
`C:/dev/_scratch/policy-sentinel/jev-parallel-20261023/fr-topic-mapping-proposals.json`.

56 topics got at least one yes. The other 261 got none, mostly for one of
three reasons: they are procedural ("Reporting and recordkeeping
requirements", "Administrative practice and procedure"), outside the
taxonomy's areas (aviation, banking, imports), or broad ("Environmental
protection", "Intergovernmental relations").

## How a row becomes a mapping

A reviewer who accepts a row adds one `sourceMappings` entry to
`config/taxonomy.v1.json`: `sourceId` `federal-register`, scheme
`federal-register-topic`, the exact topic name as the value, the target
subcategory, and provenance (facet URL, retrieval time, `validated`, reviewer
and date). The taxonomy version goes up. Jev's reading may be cited as the
reason a row was proposed, never as the approval.

## Questions for the team

1. Tribal topics. "Indians" (143 documents), "Indians-lands" (83),
   "Indians-tribal government" (22) and "Grant programs-Indians" (27) fit no
   policy area, which is right: they say who a document concerns, not what
   it is about. Proposal: keep them as a verbatim "Federal Register Tribal
   topics" facet beside the categories, never as a category, and never as a
   link to any Nation.
2. Climate adaptation. No Federal Register topic maps to
   `climate-adaptation-resilience`, so official labels alone will leave it
   empty. This is where D-114's model-judgment reference metadata would help:
   a per-document Jev reading, shown as "Model judgment: climate adaptation
   (Jev 1.14, 0.84)", kept apart from official-label categories, and absent
   from the page when no AI is used.
3. Rows to check. "Lead" goes to waste and toxics (0.71), but most Federal
   Register "Lead" documents are air-quality plan approvals. "Law
   enforcement" goes to `criminal-law-jurisdictional-oversight`, whose name
   implies jurisdiction; confirm the subcategory means what its name says.
   "Greenhouse gases" proposes two subcategories; many-to-many is allowed.
4. Air-quality volume. Seven of the top ten rows are air-quality topics from
   state implementation plan approvals. Decide whether each should map, or
   only "Air pollution control".

## A first relationship graph (design)

Find related already links documents through exact identifiers. A graph
makes those links, and the new ones, visible as nodes and edges. Every edge
carries what establishes it, so a reader never mistakes a shared identifier
or a model judgment for proof that one document governs another (D-049).

| Edge | From, to | Established by | Kind |
| --- | --- | --- | --- |
| states identifier | document to docket, RIN or CFR part | the source's own field | exact |
| has official topic | document to Federal Register topic | the source's own field | exact |
| maps to | topic to taxonomy subcategory | a reviewed mapping entry | reviewed |
| cites | document to CFR, U.S. Code, Executive Order or Public Law | the cross-reference rule over its text | deterministic |
| related RIN | RIN to RIN | Unified Agenda `RELATED_RIN` with `RIN_RELATION` | exact |
| funds program | Grants.gov opportunity to Assistance Listing | `cfdaList` | exact |
| model suggests | document to subcategory, or document to document (corrects, extends the comment period of, finalizes) | a Jev reading with its question, model and probability | model judgment |

Never an edge: document to Nation, unless exact official evidence names that
Nation (D-005). A shared docket or RIN stays "shares an identifier", never
"governs" or "replaces".

Proposed first step, once the team agrees on the table above: a development
script builds this graph from a session's results (or the audit sample) into
a JSON node and edge list, and the exported report gains a "how these records
connect" section drawn from exact and reviewed edges only.

## Proposed rows (Jev yes readings)

| FR topic | Documents since 2024 | Proposed subcategory (Jev reading) | Also unsettled |
| --- | --- | --- | --- |
| Air pollution control | 1044 | air-quality-management (0.92) | environmental-impact-permitting (0.45) |
| Ozone | 659 | air-quality-management (0.91) | environmental-impact-permitting (0.55) |
| Volatile organic compounds | 601 | air-quality-management (0.80) | waste-toxics-control (0.69); environmental-impact-permitting (0.60) |
| Particulate matter | 459 | air-quality-management (0.94) | environmental-impact-permitting (0.50) |
| Nitrogen dioxide | 441 | air-quality-management (0.91) | environmental-impact-permitting (0.55) |
| Sulfur oxides | 423 | air-quality-management (0.90) | environmental-impact-permitting (0.60) |
| Carbon monoxide | 252 | air-quality-management (0.86) | environmental-impact-permitting (0.41); waste-toxics-control (0.40) |
| Fisheries | 233 | fisheries-aquatic-habitat-restoration (0.88) |  |
| Lead | 232 | waste-toxics-control (0.71) | environmental-impact-permitting (0.49); air-quality-management (0.37) |
| Fishing | 213 | fisheries-aquatic-habitat-restoration (0.88) | wildlife-endangered-species-management (0.34) |
| Hazardous substances | 209 | waste-toxics-control (0.84) | environmental-impact-permitting (0.41) |
| Nitrogen oxides | 195 | air-quality-management (0.90) | environmental-impact-permitting (0.55) |
| Wildlife | 190 | wildlife-endangered-species-management (0.86) | environmental-impact-permitting (0.42) |
| Hazardous waste | 159 | waste-toxics-control (0.97) | environmental-impact-permitting (0.46) |
| Endangered and threatened species | 143 | wildlife-endangered-species-management (0.96) | environmental-impact-permitting (0.37) |
| Bridges | 103 | transportation-freight-infrastructure (0.89) |  |
| Medicare | 97 | health-financing-insurance (0.94) |  |
| Law enforcement | 96 | criminal-law-jurisdictional-oversight (0.73) |  |
| Water pollution control | 88 | water-resources-quality (0.96) | environmental-impact-permitting (0.49); water-infrastructure-utilities (0.35) |
| Environmental impact statements | 85 | environmental-impact-permitting (0.96) |  |
| Fish | 81 | fisheries-aquatic-habitat-restoration (0.81) | wildlife-endangered-species-management (0.51); environmental-impact-permitting (0.33) |
| Drug abuse | 80 | behavioral-mental-health (0.70) |  |
| Waste treatment and disposal | 79 | waste-toxics-control (0.93) | environmental-impact-permitting (0.45) |
| Health insurance | 76 | health-financing-insurance (0.76) |  |
| Water supply | 74 | water-infrastructure-utilities (0.77) | water-resources-quality (0.64) |
| Alcohol abuse | 71 | behavioral-mental-health (0.77) |  |
| Medicaid | 69 | health-financing-insurance (0.94) | family-support-income-maintenance (0.45) |
| Courts | 61 | judicial-systems-tribal-state-courts (0.82) | criminal-law-jurisdictional-oversight (0.33) |
| Colleges and universities | 56 | higher-education-workforce-training (0.93) |  |
| Highways and roads | 56 | transportation-freight-infrastructure (0.92) |  |
| Excise taxes | 55 | sales-excise-fuel-taxation (0.93) |  |
| Greenhouse gases | 55 | emissions-reduction-carbon-markets (0.84); air-quality-management (0.76) | environmental-impact-permitting (0.44); clean-energy-grid-modernization (0.32) |
| Marine mammals | 53 | wildlife-endangered-species-management (0.80) | fisheries-aquatic-habitat-restoration (0.62); environmental-impact-permitting (0.41) |
| Law enforcement officers | 51 | criminal-law-jurisdictional-oversight (0.72) |  |
| Grant programs-transportation | 49 | transportation-freight-infrastructure (0.82) | economic-development-grants-management (0.53) |
| Public assistance programs | 49 | family-support-income-maintenance (0.87) |  |
| Oil pollution | 46 | water-resources-quality (0.72) | environmental-impact-permitting (0.56); waste-toxics-control (0.51) |
| Marine resources | 38 | fisheries-aquatic-habitat-restoration (0.76) | environmental-impact-permitting (0.34) |
| Public lands | 38 | forestry-land-management (0.81) | environmental-impact-permitting (0.37) |
| Mass transportation | 36 | transportation-freight-infrastructure (0.78) |  |
| Vocational education | 34 | higher-education-workforce-training (0.88) |  |
| Mental health programs | 32 | behavioral-mental-health (0.86) | healthcare-service-delivery (0.32) |
| Student aid | 30 | higher-education-workforce-training (0.87) |  |
| National forests | 29 | forestry-land-management (0.94) | environmental-impact-permitting (0.42) |
| Disaster assistance | 28 | emergency-management-first-response (0.73) |  |
| Equal access to justice | 28 | judicial-systems-tribal-state-courts (0.77) |  |
| Hunting | 27 | wildlife-endangered-species-management (0.77) |  |
| Wilderness areas | 26 | forestry-land-management (0.84) | environmental-impact-permitting (0.48); wildlife-endangered-species-management (0.37) |
| Scholarships and fellowships | 25 | higher-education-workforce-training (0.80) |  |
| Superfund | 24 | waste-toxics-control (0.97) | environmental-impact-permitting (0.43) |
| Carbon oxides | 23 | air-quality-management (0.71) | emissions-reduction-carbon-markets (0.64); environmental-impact-permitting (0.50) |
| Manpower training programs | 23 | higher-education-workforce-training (0.70) |  |
| Historic preservation | 21 | cultural-resource-protection (0.90) | repatriation-museum-stewardship (0.37) |
| Loan programs-education | 21 | higher-education-workforce-training (0.78) |  |
| Public health | 21 | public-health-disease-surveillance (0.74) |  |
| Water resources | 21 | water-resources-quality (0.75) | water-infrastructure-utilities (0.40); environmental-impact-permitting (0.39) |
