/**
 * AuthorizedPrivateContextAdapter interface (Makah demo groundwork,
 * 2026-09-15).
 *
 * FROZEN INTERFACE. This is the typed form of the documentation-level
 * private extension boundary in docs/architecture.md. It declares the four
 * operations and ships one synthetic in-memory implementation used only by
 * tests. No file, network, shapefile or GeoJSON parsing dependency exists;
 * build-time ingestion of real boundary files is a documented follow-on
 * that requires a separate owner dependency approval and a private
 * deployment under decision D-010 and gate G-G.
 *
 * Deviation from the architecture sketch, recorded deliberately: the
 * operations are synchronous. The interface performs no I/O, so promises
 * would only obscure determinism in tests. A real adapter that must read a
 * private root wraps these calls; it does not change them.
 */
import type { PolicyRecord } from "../shared/contracts";
import { serializeLandBoundary } from "./land-boundary-contracts";
import type { LandBoundary } from "./land-boundary-contracts";
import { serializeLandParcel } from "./land-parcel-contracts";
import type { LandParcel } from "./land-parcel-contracts";
import { resolveParcelQuery } from "./parcel-query";
import type { ParcelQueryOptions, ParcelQueryResult } from "./parcel-query";

export const PRIVATE_CONTEXT_NONCLAIMS = Object.freeze([
  "not_a_public_capability",
  "not_a_nation_association",
  "not_a_jurisdiction_or_applicability_determination",
  "not_a_land_status_or_ownership_determination",
  "authorization_is_verified_only_for_the_exact_referenced_input",
] as const);

export interface DeploymentContext {
  readonly deploymentProfile: "private" | "public";
  readonly deploymentId: string;
  /** True only when the deployment serves exclusively on a loopback host. */
  readonly loopbackOnly: boolean;
}

export type PrivateAuthorizationKind =
  "written_owner_and_nation_authorization" | "synthetic_test_authorization";

export interface AuthorizedInput {
  readonly adapterId: string;
  readonly trustDomain: "synthetic_test_only" | "private_local_authorized";
  readonly boundaries: readonly LandBoundary[];
  readonly parcels: readonly LandParcel[];
  readonly authorization: {
    readonly kind: PrivateAuthorizationKind;
    /** Opaque reference to the written authorization; never its content. */
    readonly reference: string;
    readonly issuedAt: string;
  };
}

export interface Authorization {
  readonly state: "verified";
  readonly adapterId: string;
  readonly reference: string;
  readonly trustDomain: AuthorizedInput["trustDomain"];
  /** SHA-256 hex over the canonical serialization of every boundary and parcel, in input order. */
  readonly inputDigest: string;
  readonly nonClaims: typeof PRIVATE_CONTEXT_NONCLAIMS;
}

export interface PrivateContext {
  readonly adapterId: string;
  readonly deploymentId: string;
  readonly authorization: Authorization;
  readonly boundaries: readonly LandBoundary[];
  readonly parcels: readonly LandParcel[];
}

export interface PrivateView {
  readonly adapterId: string;
  readonly deploymentId: string;
  /** Fixed marker so a serialized view is never mistaken for public output. */
  readonly deploymentProfile: "private";
  readonly trustDomain: AuthorizedInput["trustDomain"];
  /** One entry per parcel in context order. */
  readonly parcelQueries: readonly {
    readonly parcelId: string;
    readonly result: ParcelQueryResult;
  }[];
  readonly nonClaims: typeof PRIVATE_CONTEXT_NONCLAIMS;
}

/**
 * Error codes:
 * - DEPLOYMENT_NOT_PRIVATE: deploymentProfile is not `private` or
 *   loopbackOnly is false.
 * - ADAPTER_ID_MISMATCH: input.adapterId differs from the adapter's id.
 * - AUTHORIZATION_KIND_MISMATCH: trustDomain `synthetic_test_only` requires
 *   authorization.kind `synthetic_test_authorization`; `private_local_authorized`
 *   requires `written_owner_and_nation_authorization`.
 * - REAL_PRIVATE_DATA_REQUIRES_AUTHORIZED_ADAPTER: the synthetic in-memory
 *   adapter received trustDomain `private_local_authorized` or any boundary
 *   or parcel whose trustDomain is not `synthetic_test_only`.
 * - TRUST_DOMAIN_MISMATCH: a boundary or parcel trustDomain differs from
 *   input.trustDomain.
 * - BOUNDARY_REFERENCE_UNRESOLVED: a parcel's boundaryRef names a boundaryId
 *   absent from input.boundaries.
 * - AUTHORIZATION_NOT_VERIFIED: connectLocally received an Authorization whose
 *   adapterId, reference, trustDomain or inputDigest does not match the input.
 * - CONTEXT_MISMATCH: enrichPrivateView received a context from a different
 *   adapterId.
 */
export const PRIVATE_CONTEXT_ERROR_CODES = Object.freeze([
  "DEPLOYMENT_NOT_PRIVATE",
  "ADAPTER_ID_MISMATCH",
  "AUTHORIZATION_KIND_MISMATCH",
  "REAL_PRIVATE_DATA_REQUIRES_AUTHORIZED_ADAPTER",
  "TRUST_DOMAIN_MISMATCH",
  "BOUNDARY_REFERENCE_UNRESOLVED",
  "AUTHORIZATION_NOT_VERIFIED",
  "CONTEXT_MISMATCH",
] as const);
export type PrivateContextErrorCode =
  (typeof PRIVATE_CONTEXT_ERROR_CODES)[number];

export class PrivateContextError extends Error {
  constructor(
    readonly code: PrivateContextErrorCode,
    readonly path: string,
    detail: string,
  ) {
    super(`${code} at ${path}: ${detail}`);
    this.name = "PrivateContextError";
  }
}

export interface AuthorizedPrivateContextAdapter {
  readonly adapterId: string;
  /** Throws DEPLOYMENT_NOT_PRIVATE; returns nothing. */
  assertDeploymentIsPrivate(context: DeploymentContext): void;
  /** Validates the input against the rules above and returns a frozen Authorization. */
  verifyWrittenAuthorization(input: AuthorizedInput): Authorization;
  /** Binds a verified Authorization to its exact input and a private deployment; returns a frozen PrivateContext. */
  connectLocally(
    context: DeploymentContext,
    input: AuthorizedInput,
    authorization: Authorization,
  ): PrivateContext;
  /** Runs resolveParcelQuery for every parcel; returns a frozen PrivateView. Records are read, never mutated. */
  enrichPrivateView(
    records: readonly PolicyRecord[],
    context: PrivateContext,
    options?: ParcelQueryOptions,
  ): PrivateView;
}

export const SYNTHETIC_PRIVATE_CONTEXT_ADAPTER_ID =
  "synthetic-in-memory-private-context";

function fail(
  code: PrivateContextErrorCode,
  path: string,
  detail: string,
): never {
  throw new PrivateContextError(code, path, detail);
}

function freeze<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonical(object[key])}`)
    .join(",")}}`;
}

function detached<T>(value: T): T {
  return freeze(JSON.parse(canonical(value)) as T);
}

// --- Pure SHA-256 (no platform crypto module, no WebCrypto). ---

const SHA256_K: readonly number[] = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
  0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
  0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
  0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
  0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];
const SHA256_H0: readonly number[] = [
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c,
  0x1f83d9ab, 0x5be0cd19,
];

function rotr(x: number, n: number): number {
  return (x >>> n) | (x << (32 - n));
}

function utf8Bytes(value: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < value.length; i += 1) {
    const codePoint = value.codePointAt(i)!;
    if (codePoint > 0xffff) i += 1;
    if (codePoint < 0x80) {
      bytes.push(codePoint);
    } else if (codePoint < 0x800) {
      bytes.push(0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f));
    } else if (codePoint < 0x10000) {
      bytes.push(
        0xe0 | (codePoint >> 12),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f),
      );
    } else {
      bytes.push(
        0xf0 | (codePoint >> 18),
        0x80 | ((codePoint >> 12) & 0x3f),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f),
      );
    }
  }
  return bytes;
}

function sha256Hex(input: string): string {
  const bytes = utf8Bytes(input);
  const bitLength = bytes.length * 8;
  const padded = [...bytes, 0x80];
  while (padded.length % 64 !== 56) padded.push(0);
  const lengthHigh = Math.floor(bitLength / 0x100000000);
  const lengthLow = bitLength >>> 0;
  for (const part of [lengthHigh, lengthLow]) {
    padded.push(
      (part >>> 24) & 0xff,
      (part >>> 16) & 0xff,
      (part >>> 8) & 0xff,
      part & 0xff,
    );
  }
  const words = new Uint32Array(padded.length / 4);
  for (let i = 0; i < words.length; i += 1) {
    words[i] =
      ((padded[i * 4]! << 24) |
        (padded[i * 4 + 1]! << 16) |
        (padded[i * 4 + 2]! << 8) |
        padded[i * 4 + 3]!) >>>
      0;
  }
  const h = [...SHA256_H0];
  const w = new Uint32Array(64);
  for (let chunk = 0; chunk < words.length; chunk += 16) {
    for (let i = 0; i < 16; i += 1) w[i] = words[chunk + i]!;
    for (let i = 16; i < 64; i += 1) {
      const s0 =
        rotr(w[i - 15]!, 7) ^ rotr(w[i - 15]!, 18) ^ (w[i - 15]! >>> 3);
      const s1 = rotr(w[i - 2]!, 17) ^ rotr(w[i - 2]!, 19) ^ (w[i - 2]! >>> 10);
      w[i] = (w[i - 16]! + s0 + w[i - 7]! + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, hh] = h as [
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
    ];
    for (let i = 0; i < 64; i += 1) {
      const bigS1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (hh + bigS1 + ch + SHA256_K[i]! + w[i]!) >>> 0;
      const bigS0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (bigS0 + maj) >>> 0;
      hh = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }
    h[0] = (h[0]! + a) >>> 0;
    h[1] = (h[1]! + b) >>> 0;
    h[2] = (h[2]! + c) >>> 0;
    h[3] = (h[3]! + d) >>> 0;
    h[4] = (h[4]! + e) >>> 0;
    h[5] = (h[5]! + f) >>> 0;
    h[6] = (h[6]! + g) >>> 0;
    h[7] = (h[7]! + hh) >>> 0;
  }
  return h.map((word) => word.toString(16).padStart(8, "0")).join("");
}

function computeInputDigest(input: AuthorizedInput): string {
  let text = "";
  for (const boundary of input.boundaries) {
    text += serializeLandBoundary(boundary);
    text += "\n";
  }
  for (const parcel of input.parcels) {
    text += serializeLandParcel(parcel);
    text += "\n";
  }
  return sha256Hex(text);
}

/**
 * Test-only implementation. Accepts only `synthetic_test_only` inputs with
 * `synthetic_test_authorization`; rejects anything real with
 * REAL_PRIVATE_DATA_REQUIRES_AUTHORIZED_ADAPTER. Holds no state between
 * calls beyond its id.
 */
export function createSyntheticInMemoryPrivateContextAdapter(): AuthorizedPrivateContextAdapter {
  const adapterId = SYNTHETIC_PRIVATE_CONTEXT_ADAPTER_ID;

  function assertDeploymentIsPrivate(context: DeploymentContext): void {
    if (context.deploymentProfile !== "private") {
      fail(
        "DEPLOYMENT_NOT_PRIVATE",
        "$/deploymentProfile",
        "deployment profile is not private",
      );
    }
    if (!context.loopbackOnly) {
      fail(
        "DEPLOYMENT_NOT_PRIVATE",
        "$/loopbackOnly",
        "deployment does not serve exclusively on loopback",
      );
    }
  }

  function verifyWrittenAuthorization(input: AuthorizedInput): Authorization {
    if (input.adapterId !== adapterId) {
      fail("ADAPTER_ID_MISMATCH", "$/adapterId", "adapter id does not match");
    }
    const expectedKind: PrivateAuthorizationKind =
      input.trustDomain === "synthetic_test_only"
        ? "synthetic_test_authorization"
        : "written_owner_and_nation_authorization";
    if (input.authorization.kind !== expectedKind) {
      fail(
        "AUTHORIZATION_KIND_MISMATCH",
        "$/authorization/kind",
        "authorization kind does not match trust domain",
      );
    }
    if (
      input.trustDomain !== "synthetic_test_only" ||
      input.boundaries.some(
        (boundary) => boundary.trustDomain !== "synthetic_test_only",
      ) ||
      input.parcels.some(
        (parcel) => parcel.trustDomain !== "synthetic_test_only",
      )
    ) {
      fail(
        "REAL_PRIVATE_DATA_REQUIRES_AUTHORIZED_ADAPTER",
        "$/trustDomain",
        "synthetic adapter accepts only synthetic test data",
      );
    }
    input.boundaries.forEach((boundary, index) => {
      if (boundary.trustDomain !== input.trustDomain) {
        fail(
          "TRUST_DOMAIN_MISMATCH",
          `$/boundaries/${index}/trustDomain`,
          "boundary trust domain differs from input trust domain",
        );
      }
    });
    input.parcels.forEach((parcel, index) => {
      if (parcel.trustDomain !== input.trustDomain) {
        fail(
          "TRUST_DOMAIN_MISMATCH",
          `$/parcels/${index}/trustDomain`,
          "parcel trust domain differs from input trust domain",
        );
      }
    });
    const boundaryIds = new Set(
      input.boundaries.map((boundary) => boundary.boundaryId),
    );
    input.parcels.forEach((parcel, index) => {
      if (
        parcel.boundaryRef !== null &&
        !boundaryIds.has(parcel.boundaryRef.boundaryId)
      ) {
        fail(
          "BOUNDARY_REFERENCE_UNRESOLVED",
          `$/parcels/${index}/boundaryRef/boundaryId`,
          "boundary reference does not resolve within input",
        );
      }
    });
    const authorization: Authorization = {
      state: "verified",
      adapterId: input.adapterId,
      reference: input.authorization.reference,
      trustDomain: input.trustDomain,
      inputDigest: computeInputDigest(input),
      nonClaims: PRIVATE_CONTEXT_NONCLAIMS,
    };
    return freeze(authorization);
  }

  function connectLocally(
    context: DeploymentContext,
    input: AuthorizedInput,
    authorization: Authorization,
  ): PrivateContext {
    assertDeploymentIsPrivate(context);
    if (
      authorization.adapterId !== input.adapterId ||
      authorization.reference !== input.authorization.reference ||
      authorization.trustDomain !== input.trustDomain ||
      authorization.inputDigest !== computeInputDigest(input)
    ) {
      fail(
        "AUTHORIZATION_NOT_VERIFIED",
        "$/authorization",
        "authorization does not verify against this exact input",
      );
    }
    const privateContext: PrivateContext = {
      adapterId: input.adapterId,
      deploymentId: context.deploymentId,
      authorization,
      boundaries: detached(input.boundaries),
      parcels: detached(input.parcels),
    };
    return freeze(privateContext);
  }

  function enrichPrivateView(
    records: readonly PolicyRecord[],
    context: PrivateContext,
    options?: ParcelQueryOptions,
  ): PrivateView {
    if (context.adapterId !== adapterId) {
      fail(
        "CONTEXT_MISMATCH",
        "$/context/adapterId",
        "private context does not belong to this adapter",
      );
    }
    const parcelQueries = context.parcels.map((parcel) => ({
      parcelId: parcel.parcelId,
      result: resolveParcelQuery(parcel, records, options),
    }));
    const view: PrivateView = {
      adapterId: context.adapterId,
      deploymentId: context.deploymentId,
      deploymentProfile: "private",
      trustDomain: context.authorization.trustDomain,
      parcelQueries,
      nonClaims: PRIVATE_CONTEXT_NONCLAIMS,
    };
    return freeze(view);
  }

  return {
    adapterId,
    assertDeploymentIsPrivate,
    verifyWrittenAuthorization,
    connectLocally,
    enrichPrivateView,
  };
}
