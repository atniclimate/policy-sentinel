// Cited and linked records for the opened document (design section 2,
// index conditions C1 and C2). It plugs into DocumentPane's panels seam.
// Rows come from src/demo/links.ts; a family that needs a live call shows
// a button and asks the source only when pressed, through onExpand.
import { chain } from "../../src/demo/copy/chain";
import type { InTextGap } from "../../src/demo/document";
import { localDay } from "../../src/demo/follow";
import { LINK_NOTICES } from "../../src/demo/link-labels";
import { groupInText, labelNamesTarget } from "../../src/demo/links";
import type { ChainLink, ChainRow, ChainSection } from "../../src/demo/links";
import { RELATION_FIELD } from "../../src/demo/relation-names";

export type ChainExpansionId = keyof typeof chain.expand;

export interface ChainExpansion {
  readonly id: ChainExpansionId;
  readonly state: "idle" | "loading" | "done" | "error";
  /** Rows the Worker returned, labeled with the source's own relation name. */
  readonly rows?: readonly ChainRow[];
}

/** A shard the page could not show: index unavailable, not yet available, withdrawn. */
export interface ChainIndexNotice {
  readonly text: string;
  readonly sourceName: string;
  readonly liveUrl: string;
}

const SECTIONS: readonly ChainSection[] = ["stated", "identifiers", "inText"];
const INDEX_SOURCES = new Set(["cfr-index", "usc-index"]);

// Verbatim official wording is marked so the forbidden-word test can skip
// exactly the verbatim fields (VERBATIM_FIELDS and RELATION_FIELD) and
// nothing else. Only a relation name on the closed list is labelVerbatim.
const verbatim = (field: string | null | undefined) =>
  field ? { "data-verbatim": field } : {};

function Row({
  row,
  showQuote,
  onHop,
}: {
  row: ChainRow;
  showQuote: boolean;
  onHop?: (target: ChainLink["target"]) => void;
}) {
  const F = chain.facts;
  const quote = showQuote ? row.quote : null;
  return (
    <li class="chain-row">
      {quote && (
        <figure class="chain-quote">
          <figcaption>{quote.heading}</figcaption>
          {quote.text === null ? (
            <p>{LINK_NOTICES.omitted}</p>
          ) : (
            <blockquote {...verbatim(quote.field)}>{quote.text}</blockquote>
          )}
        </figure>
      )}
      <p class="chain-label">
        <strong {...verbatim(row.labelVerbatim && RELATION_FIELD)}>
          {row.label}
        </strong>
        {row.kind === "link" && !labelNamesTarget(row) && (
          <>
            {" "}
            {row.target.officialUrl ? (
              <a href={row.target.officialUrl} rel="noreferrer">
                {row.targetText}
              </a>
            ) : (
              <span>{row.targetText}</span>
            )}
          </>
        )}
        {row.kind === "link" &&
          labelNamesTarget(row) &&
          row.target.officialUrl && (
            <>
              {" "}
              <a href={row.target.officialUrl} rel="noreferrer">
                {chain.openRecord}
              </a>
            </>
          )}
      </p>
      {row.places && <p class="chain-places">{chain.places(row.places)}</p>}
      {row.kind === "link" &&
        onHop &&
        INDEX_SOURCES.has(row.target.sourceId) && (
          <button type="button" onClick={() => onHop(row.target)}>
            {chain.openHop(row.targetText)}
          </button>
        )}
      <dl class="chain-facts">
        {row.kind === "link" && (
          <>
            <dt>{F.basis}</dt>
            <dd>{chain.basis[row.basis]}</dd>
          </>
        )}
        <dt>{F.source}</dt>
        <dd>{row.sourceName}</dd>
        {row.sourceWording && (
          <>
            <dt>{F.wording}</dt>
            <dd>
              <q {...verbatim("text")}>{row.sourceWording}</q>
            </dd>
          </>
        )}
        <dt>{F[row.asOfLabel]}</dt>
        <dd {...verbatim(row.asOfField)}>{row.asOfText}</dd>
        <dt>{F.retrieved}</dt>
        <dd>{localDay(row.retrievedAt)}</dd>
        {row.notice && (
          <>
            <dt>{F.notice}</dt>
            <dd>{row.notice}</dd>
          </>
        )}
      </dl>
      {row.stale && <p class="chain-stale">{chain.stale}</p>}
      {row.liveUrl && (
        <a href={row.liveUrl} rel="noreferrer">
          {chain.liveLink(row.sourceName)}
        </a>
      )}
    </li>
  );
}

function Rows({
  rows,
  onHop,
}: {
  rows: readonly ChainRow[];
  onHop?: (target: ChainLink["target"]) => void;
}) {
  return (
    <ul class="chain-rows">
      {rows.map((row, i) => (
        <Row
          key={i}
          row={row}
          // Rows from one line share its quote object (links.ts lineRows), so it is quoted once, above the first.
          showQuote={!!row.quote && rows[i - 1]?.quote !== row.quote}
          onHop={onHop}
        />
      ))}
    </ul>
  );
}

export function LinkedRecordsPanel({
  rows,
  notices = [],
  inTextGap = null,
  statedNotKept = false,
  expansions = [],
  onExpand,
  onHop,
}: {
  rows: readonly ChainRow[];
  notices?: readonly ChainIndexNotice[];
  /** Why the in-text rows are missing (demo/api.ts inTextGap), so the section says so instead of none. */
  inTextGap?: InTextGap | null;
  /** A copy saved before its listing's stated fields were kept: empty stated sections say so instead of none. */
  statedNotKept?: boolean;
  expansions?: readonly ChainExpansion[];
  onExpand?: (id: ChainExpansionId) => void;
  onHop?: (target: ChainLink["target"]) => void;
}) {
  return (
    <section class="chain-panel" aria-labelledby="chain-h">
      <h3 id="chain-h">{chain.title}</h3>
      {SECTIONS.map((section) => {
        const own = groupInText(rows.filter((r) => r.section === section));
        const stated = section === "stated";
        const empty =
          !own.length && !(stated && (notices.length || expansions.length));
        return (
          <section key={section} aria-labelledby={`chain-${section}-h`}>
            <h4 id={`chain-${section}-h`}>{chain.sections[section]}</h4>
            {stated &&
              notices.map((n, i) => (
                <p key={i} class="chain-notice">
                  {n.text}.{" "}
                  <a href={n.liveUrl} rel="noreferrer">
                    {chain.liveLink(n.sourceName)}
                  </a>
                </p>
              ))}
            {own.length > 0 && <Rows rows={own} onHop={onHop} />}
            {stated &&
              expansions.map((x) => (
                <div key={x.id} class="chain-expand">
                  {x.state === "done" ? (
                    x.rows?.length ? (
                      <Rows rows={x.rows} onHop={onHop} />
                    ) : (
                      <p>{chain.noneStated}</p>
                    )
                  ) : (
                    <>
                      <button
                        type="button"
                        aria-describedby="chain-expand-help"
                        aria-busy={x.state === "loading"}
                        // aria-disabled, not disabled: disabled drops keyboard focus to the body.
                        aria-disabled={x.state === "loading" || !onExpand}
                        onClick={() => {
                          if (x.state !== "loading") onExpand?.(x.id);
                        }}
                      >
                        {chain.expand[x.id]}
                      </button>
                      {x.state === "loading" && (
                        <p role="status">{chain.expandLoading}</p>
                      )}
                      {x.state === "error" && (
                        <p role="alert">{chain.expandFailed}</p>
                      )}
                    </>
                  )}
                </div>
              ))}
            {stated && expansions.length > 0 && (
              <p id="chain-expand-help" class="chain-help">
                {chain.expandHelp}
              </p>
            )}
            {empty && (
              <p>
                {section === "inText"
                  ? inTextGap
                    ? chain[inTextGap]
                    : chain.noneStated
                  : statedNotKept
                    ? chain.statedNotKept
                    : chain.noneStated}
              </p>
            )}
          </section>
        );
      })}
    </section>
  );
}
