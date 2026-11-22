import { ordinal } from "./copy/shared.ts";

export const CONGRESS_REFERENCE =
  /^\s*(hr|s|hjres|sjres|hconres|sconres|hres|sres)\s*(?!0+\s)(\d{1,5})\s+(?!0+\s*$)(\d{2,3})\s*$/i;

export const RELATED_BILL_LIMIT = 20;
export const RELATIONSHIPS_PER_BILL = 10;

export function congressIdentifier(
  type: string,
  number: number,
  congress: number,
) {
  return `${type.toUpperCase()} ${number}, ${congress}${ordinal(congress)} Congress`;
}

export function relatedBillCount(records: readonly { identifier: string }[]) {
  return new Set(records.map((record) => record.identifier)).size;
}
