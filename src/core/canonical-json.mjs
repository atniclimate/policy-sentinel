// Shared canonical JSON helpers. Pure: no platform imports, so engine,
// adapter, contract and pipeline code may all use them.

/** Orders strings by UTF-16 code unit, the order Array.prototype.sort uses by default. */
export function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

/**
 * JSON text with every object's keys in code-unit order, so equal data always
 * gives the same text. Otherwise JSON.stringify rules apply: toJSON is used,
 * undefined, functions and symbols are left out of objects and become null in
 * arrays. Built by hand because an object re-created from sorted entries still
 * lists integer-like keys ("9", "10") first, in numeric order.
 */
export function canonicalJson(value) {
  return encode(value, "");
}

function encode(value, key) {
  if (
    value !== null &&
    typeof value === "object" &&
    typeof value.toJSON === "function"
  )
    value = value.toJSON(key);
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value))
    return `[${value.map((entry, index) => encode(entry, String(index)) ?? "null").join(",")}]`;
  const members = [];
  for (const name of Object.keys(value).sort(compareCodeUnits)) {
    const text = encode(value[name], name);
    if (text !== undefined) members.push(`${JSON.stringify(name)}:${text}`);
  }
  return `{${members.join(",")}}`;
}

/** Freezes a value and everything reachable through its own properties; returns it. */
export function deepFreeze(value) {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value)) deepFreeze(nested);
  }
  return value;
}
