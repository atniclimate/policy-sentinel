import { COPY } from "../../src/demo/copy";
import type { DemoCitation } from "../../src/demo/types";

/** The dotted run between a row's label and its value. */
export const Leader = () => <span class="leader" aria-hidden="true" />;

/** The service writes "Not stated" for a record with no issuing body. */
export const bodyOf = (citation: DemoCitation) =>
  citation.issuingBody === "Not stated"
    ? COPY.issuingBodyNotStated
    : citation.issuingBody;
