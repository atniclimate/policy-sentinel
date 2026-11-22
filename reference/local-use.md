# Run Policy Sentinel locally

Use Windows x64, Node.js 24.19.0 and npm 12.0.2. From the repository root, run `npm ci` once to install the locked dependencies.

## Search the synthetic collection

Run `npm run build`, then `npm run preview -- --host 127.0.0.1`. Open the address printed in the terminal. The build writes the app and its validated synthetic index under `dist/`. After installing dependencies, you can build and search this collection offline. Open **Search** and select a result to inspect its citation.

## Work with a reviewed local collection

If you already hold a reviewed collection, use its corpus root to build the study workspace. The default review is named `gold`. Replace the example path with your collection's location.

```powershell
npm run policy:build:local -- --corpus-root "C:/collections/reviewed"
npm run policy:serve:local -- --corpus-root "C:/collections/reviewed"
```

Open the loopback URL printed by the second command. The server exposes only the reviewed output. In the study workspace, choose **Save study JSON** to keep a study across sessions. The file includes your private notes. Keep it with the collection under your organization's custody. A reopened study checks that its collection still matches.

## Public demo interface

Run `npm run demo:dev -- --host 127.0.0.1` and open its address. By default this interface uses the hosted demo service. Searches send the query to the selected official services through that service.

To use a local Worker, start `npm run demo:worker:dev` in a second terminal. Open the interface over HTTP on `127.0.0.1` or `localhost`, then append the Worker's HTTP loopback origin to the page address as `?api=http://127.0.0.1:8787`. Substitute the Worker port it prints and omit any trailing slash from the override. An unrecognized override selects the hosted service. The local Worker still contacts official sources for live requests. GovInfo, Congress.gov and Regulations.gov depend on the Worker's `DATA_GOV_API_KEY` secret. Keep keys on the Worker side. **About and Limits** shows available sources.

## Storage

Run `npm run storage:report -- --help` for the read-only inventory command. Supply a local manifest naming the collection directories you intend to measure. Replace the example path with the absolute path of an existing collection outside the source checkout.

```json
{
  "version": "1.0.0",
  "roots": [{ "id": "collection", "path": "C:/collections/example", "categories": [], "runs": [] }],
  "projections": []
}
```

Run `npm run storage:report -- --manifest collection.local.json`. The report counts files and logical bytes without reading document contents. An empty projections list gives a current inventory only. A missing directory makes the inventory incomplete.

The disk-backed custody tests need at least 20 GiB free on the volume that holds their temporary collection. To run those tests on another volume, set `POLICY_SENTINEL_TEST_CUSTODY_PARENT` to an existing absolute directory. The tests create and remove their own synthetic collections there.
