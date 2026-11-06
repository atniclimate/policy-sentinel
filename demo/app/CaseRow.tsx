import type { ComponentChildren } from "preact";
import { courts as COURTS } from "../../src/demo/copy/courts";
import { caseRowText } from "../../src/demo/courts";
import type { DiscoveryRow } from "../../src/demo/discovery";
import type { DemoCitation } from "../../src/demo/types";

/**
 * One row of the Cases family (T1.5), for ResultsList's `families.cases`
 * seam. Follow is offered only for a GovInfo package with a court code, and
 * only when the page passes `onFollow`; `actions` holds any further page
 * controls, such as adding the row to My Citations.
 */
export function CaseRow({
  row,
  nested,
  following,
  onFollow,
  actions,
}: {
  row: DiscoveryRow;
  nested: boolean;
  following: boolean;
  onFollow?: (citation: DemoCitation, packageId: string) => void;
  actions?: ComponentChildren;
}) {
  const c = row.citation;
  const text = caseRowText(c);
  const followable = onFollow && c.packageId && c.court;
  const followLabel = following ? COURTS.following : COURTS.follow;
  return (
    <li class="result" key={`${c.sourceId}:${c.identifier}`}>
      {nested ? <h4>{text.caseName}</h4> : <h3>{text.caseName}</h3>}
      {text.captionWithheld && <p class="help">{COURTS.captionWithheld}</p>}
      <ul class="meta">
        <li>
          {COURTS.courtLabel}: {text.court}
        </li>
        {text.docket && (
          <li>
            {COURTS.docketLabel}: <span class="mono">{text.docket}</span>
          </li>
        )}
        <li>
          {COURTS.dateIssuedLabel}: {text.dateIssued}
        </li>
      </ul>
      <p class="help">{text.citation}</p>
      <p class="actions">
        <a
          href={text.officialUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${COURTS.officialLink}: ${text.caseName}`}
        >
          {COURTS.officialLink}
        </a>
        {followable && (
          <button
            type="button"
            class="btn"
            aria-disabled={following}
            aria-label={`${followLabel}: ${text.caseName}`}
            onClick={() => {
              if (!following && c.packageId) onFollow?.(c, c.packageId);
            }}
          >
            {followLabel}
          </button>
        )}
        {actions}
      </p>
    </li>
  );
}
