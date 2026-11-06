/**
 * Every follow kind this demo knows (T1.6). Step 8 registers "case" by
 * adding its definition in `case.ts` and one line here.
 */
import { docketKind } from "./docket";
import { documentKind } from "./document";
import { rinKind } from "./rin";
import type { FollowKindDef } from "./types";

export const FOLLOW_KINDS = {
  docket: docketKind,
  rin: rinKind,
  document: documentKind,
} satisfies Record<string, FollowKindDef>;

export type FollowKind = keyof typeof FOLLOW_KINDS;
export type { FollowKindDef } from "./types";
