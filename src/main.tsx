/** @jsxImportSource preact */

import { render } from "preact";
import { App } from "./app/App";
import "./styles.css";

const root = document.getElementById("app");

if (!root) {
  throw new Error("Policy Sentinel application root was not found.");
}

render(<App />, root);
