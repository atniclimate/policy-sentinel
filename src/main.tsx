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
render(<App />, root);
