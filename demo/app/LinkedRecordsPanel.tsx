// Cited and linked records for the opened document (design section 2,
// index conditions C1 and C2). It plugs into DocumentPane's panels seam.
// Rows come from src/demo/links.ts; a family that needs a live call shows
// a button and asks the source only when pressed, through onExpand.
import { chain } from "../../src/demo/copy/chain";
import { LINK_NOTICES } from "../../src/demo/link-labels";
import { groupInText } from "../../src/demo/links";
import type { ChainLink, ChainRow, ChainSection } from "../../src/demo/links";

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
// exactly VERBATIM_FIELDS and nothing else.
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
        <strong {...verbatim(row.labelVerbatim && "label")}>{row.label}</strong>
        {row.kind === "link" && (
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
        <dd>{row.retrievedAt.slice(0, 10)}</dd>
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
          // A line shared by several rows is quoted once, above the first.
          showQuote={!!row.quote && rows[i - 1]?.quote?.text !== row.quote.text}
          onHop={onHop}
        />
      ))}
    </ul>
  );
}

export function LinkedRecordsPanel({
  rows,
  notices = [],
  expansions = [],
  onExpand,
  onHop,
}: {
  rows: readonly ChainRow[];
  notices?: readonly ChainIndexNotice[];
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
                        disabled={x.state === "loading" || !onExpand}
                        onClick={() => onExpand?.(x.id)}
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
            {empty && <p>{chain.noneStated}</p>}
          </section>
        );
      })}
    </section>
  );
}
