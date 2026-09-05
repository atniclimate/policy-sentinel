import packageJson from "../package.json" with { type: "json" };

// This pins new local acceptance evidence, not historical provider observers.
const npmVersion = /^npm\/([^ ]+)/u.exec(
  process.env.npm_config_user_agent ?? "",
)?.[1];
if (
  process.versions.node !== packageJson.engines.node ||
  npmVersion !== packageJson.engines.npm ||
  process.platform !== "win32" ||
  process.arch !== "x64"
) {
  throw new Error(
    "RUN_01_RUNTIME_PIN_MISMATCH: use the pinned Windows x64 npm command.",
  );
}
console.log(
  `Runtime validation passed: Node ${process.versions.node}, npm ${npmVersion}, win32 x64.`,
);
