# Oregon Legislature Open Data Service (OLIS OData): agreement accepted

Access date 2026-11-05. Extends
[oregon-odata-offline-contract-2026-07-31.md](oregon-odata-offline-contract-2026-07-31.md).
Owner acceptance: D-119.

- Originating publisher: Oregon Legislature Information Services.
- Data page: https://www.oregonlegislature.gov/citizen_engagement/Pages/data.aspx
  links the base endpoint `https://api.oregonlegislature.gov/odata/odataservice.svc/`,
  its `$metadata`, the data model PDF and the agreement. No key, sign-up or
  acceptance form appears on the page (raw read, 2026-11-05).
- Agreement:
  https://www.oregonlegislature.gov/citizen_engagement/Documents/OLODataAcceptableUseAgreement.pdf
  (3 pages, text extracted 2026-11-05). It ends: "To access the OLOData service
  the Client ~ Data Owner/Steward and/or Data User must electronically accept
  all terms of the Acceptable Use Agreement." With no form, acceptance was
  recorded by the owner (D-119) and sent by email to the address the data page
  publishes, leg.helpdesk@oregonlegislature.gov, on 2026-11-05. Any reply naming
  a further step is added here before the first call.

## Terms Policy Sentinel must follow

1. "Clients agree to receive the associated metadata along with the data
   extracted from Oregon Legislature Open Data Service."
2. "Clients agree to make the Oregon Legislature Open Data Service aware of any
   problems with data currency, quality, content, access, or performance."
3. "Clients agree to utilize the Oregon Legislature Open Data Service as the
   preferred method to obtain Oregon legislative data and forego regular
   'scraping' of the Oregon Legislature Website." ORS chapter pages therefore
   stay link-out only.
4. Freshness: "updated approximately every five minutes"; "Clients can execute
   on-demand queries as needed"; a stored copy may do a full refresh "once per
   day after business hours between 5:00 pm-6:00 am Pacific Time" and
   incremental refreshes "as often as needed".
5. "Client/Users will not share their credentials with other organizations."
   No credentials are issued today.
6. Disclaimer: the service "does not constitute or represent an official record
   of the Oregon Legislature". Every Oregon result says so and links the
   official measure page.

## Still open

The `$metadata` read (entity names, modified-time field) and one bounded live
call, both in the Full 0.9 build run. No numeric rate limit is stated; keep
calls on request and low. Whether the separate Oregon.gov statewide website
terms reach this API is unread.
