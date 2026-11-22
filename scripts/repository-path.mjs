import { lstatSync, realpathSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repository = fileURLToPath(new URL("../", import.meta.url));

export function insideRepo(path, root = repository) {
  const contains = (base, candidate) => {
    const rel = relative(base, candidate);
    return rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
  };
  const target = resolve(path);
  if (contains(root, target)) return true;
  let ancestor = target;
  while (!lstatSync(ancestor, { throwIfNoEntry: false })) {
    const parent = dirname(ancestor);
    if (parent === ancestor) throw new Error("path has no existing root");
    ancestor = parent;
  }
  return contains(realpathSync(root), realpathSync(ancestor));
}
