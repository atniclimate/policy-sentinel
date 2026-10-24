// Development-only clients for TypeSafe (Jev) and Parallel (D-114).
// Keys come from the developer's environment; nothing here is imported by
// src/, demo/ or worker/, and public output never depends on it.
import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export const LOG_DIR =
  process.env.PS_DEV_LOG_DIR ??
  "C:/dev/_scratch/policy-sentinel/jev-parallel-20261023";

function log(kind, entry) {
  mkdirSync(LOG_DIR, { recursive: true });
  appendFileSync(
    join(LOG_DIR, `${kind}-requests.jsonl`),
    `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`,
  );
}

function key(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set in this environment.`);
  return value;
}

async function post(kind, url, headers, body) {
  let response;
  let text;
  // Development tools only: back off on overload, never on official sources.
  for (let attempt = 0; ; attempt++) {
    response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
    });
    text = await response.text();
    log(kind, { url, status: response.status, attempt, body });
    if (![429, 529, 503].includes(response.status) || attempt >= 4) break;
    const wait =
      Number(response.headers.get("retry-after")) || 2 ** attempt * 2;
    await new Promise((r) => setTimeout(r, wait * 1000));
  }
  // A failed call is an error, never an answer.
  if (!response.ok) {
    throw new Error(`${kind} ${response.status}: ${text.slice(0, 400)}`);
  }
  return JSON.parse(text);
}

/** One System One request: shared state, many typed questions. */
export function askJev({ state, questions, model = "jev-1.14.0" }) {
  return post(
    "typesafe",
    "https://api.typesafe.ai/v1/systemone",
    { authorization: `Bearer ${key("TYPESAFE_API_KEY")}` },
    { model, state, questions },
  );
}

/** Parallel Search. `body` follows the Search API (objective, search_queries, mode, source_policy). */
export function parallelSearch(body) {
  return post(
    "parallel",
    "https://api.parallel.ai/v1/search",
    { "x-api-key": key("PARALLEL_API_KEY") },
    body,
  );
}

/** Any other Parallel endpoint (Task, Monitor, Extract), path like "/v1/tasks/runs". */
export function parallelPost(path, body) {
  return post(
    "parallel",
    `https://api.parallel.ai${path}`,
    { "x-api-key": key("PARALLEL_API_KEY") },
    body,
  );
}

export async function parallelGet(path) {
  const response = await fetch(`https://api.parallel.ai${path}`, {
    headers: { "x-api-key": key("PARALLEL_API_KEY") },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`parallel ${response.status}: ${text.slice(0, 400)}`);
  }
  return JSON.parse(text);
}

/** Noul reading with the default 0.7 / 0.3 band; the middle stays unsettled. */
export function band(noul, yes = 0.7, no = 0.3) {
  if (noul >= yes) return "yes";
  if (noul <= no) return "no";
  return "unsettled";
}
