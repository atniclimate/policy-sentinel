/** Small helpers shared by more than one copy area file. */

/** English ordinal suffix: 1st, 2nd, 3rd, 11th, 112th, 121st. */
export function ordinal(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 13) return "th";
  return ["th", "st", "nd", "rd"][n % 10] ?? "th";
}

/** Source text that already names its kind, such as "Docket No. 990101-0001", needs no label. */
export const namesItsKind = (label: string, id: string) =>
  // String(): the copy walker in tests/demo/rules.test.ts calls every function with placeholder arguments.
  String(id).toLowerCase().startsWith(String(label).toLowerCase());
