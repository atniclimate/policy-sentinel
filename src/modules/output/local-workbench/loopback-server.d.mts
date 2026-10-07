import type { Buffer } from "node:buffer";
import type { Server } from "node:http";

export function createLoopbackOutputServer(
  files: Map<string, Buffer>,
  port?: number,
): Promise<Server>;
