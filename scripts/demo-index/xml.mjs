// Streaming XML helpers for the static index parsers. Only the selected
// subtrees are built in memory, so a large title is never held as a tree.
import { SaxesParser } from "saxes";

/**
 * Parse `xml` and call `onNode(node, ancestors)` for each subtree whose
 * opening tag `select(name, attributes, ancestors)` accepts. A node is
 * { name, attrs, children } with children elements or decoded text strings.
 * Returns the root element's name and attributes. Malformed XML throws.
 */
export function collectSubtrees(xml, select, onNode) {
  const parser = new SaxesParser();
  const ancestors = [];
  let root = null;
  let building = null;
  parser.on("opentag", (tag) => {
    const node = { name: tag.name, attrs: tag.attributes, children: [] };
    if (root === null) root = { name: tag.name, attrs: tag.attributes };
    if (building) {
      building.at(-1).children.push(node);
      building.push(node);
    } else if (select(tag.name, tag.attributes, ancestors)) {
      building = [node];
    }
    ancestors.push(tag.name);
  });
  const onText = (text) => {
    if (building) building.at(-1).children.push(text);
  };
  parser.on("text", onText);
  parser.on("cdata", onText);
  parser.on("closetag", () => {
    ancestors.pop();
    if (!building) return;
    const node = building.pop();
    if (building.length === 0) {
      building = null;
      onNode(node, ancestors);
    }
  });
  parser.write(xml).close();
  return root;
}

export const isElement = (child) => typeof child !== "string";
export const textOf = (node) =>
  typeof node === "string" ? node : node.children.map(textOf).join("");
export const collapse = (text) => text.replace(/\s+/g, " ").trim();
export const elements = (node, name) =>
  node.children.filter((c) => isElement(c) && (!name || c.name === name));

/** Every descendant element, document order. */
export function* descendants(node) {
  for (const child of node.children)
    if (isElement(child)) {
      yield child;
      yield* descendants(child);
    }
}
