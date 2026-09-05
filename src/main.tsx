/** @jsxImportSource preact */

import { render } from "preact";
import { App } from "./app/App";
import { installSkipLink } from "./app/skip-link";
import "./styles.css";

const root = document.getElementById("app");

if (!root) {
  throw new Error("Policy Sentinel application root was not found.");
}

installSkipLink();
if (import.meta.env.VITE_POLICY_LOCAL === "1") {
  render(
    <main id="main-content" tabIndex={-1}>
      <h1>Policy Sentinel local workbench</h1>
      <p role="status">Verifying the local corpus…</p>
    </main>,
    root,
  );
  void Promise.all([
    import("./app/PolicyWorkbench"),
    import("./app/policy-local-loader"),
  ])
    .then(async ([{ PolicyWorkbench }, { loadPolicyLocalCorpus }]) => {
      const corpus = await loadPolicyLocalCorpus();
      render(
        <PolicyWorkbench
          corpus={corpus}
          dossierHref="./dossier.html"
          jsonHref="./corpus.json"
        />,
        root,
      );
    })
    .catch(() => {
      render(
        <main id="main-content" tabIndex={-1}>
          <h1>Local corpus unavailable</h1>
          <p>
            The reviewed output could not be verified. Rebuild with the explicit
            local corpus command and restart its loopback server.
          </p>
        </main>,
        root,
      );
    });
} else {
  render(<App />, root);
}
