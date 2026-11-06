// Authority citations stated by a Grants.gov opportunity (design section 3
// T1.4): its Assistance Listings, the quoted passage at its own Authority
// heading (or the no-passage sentence), the parsed citations, and what this
// panel does not cover. A document pane side panel (step 3 seam).
import type { ComponentChildren } from "preact";
import { grantsAuthority as T } from "../../src/demo/copy/grants-authority";
import { authorityLinks } from "../../src/demo/grants-authority";
import { LINK_NOTICES } from "../../src/demo/link-labels";
import type { GrantsDetailResponse } from "../../src/demo/grants-authority";
import type { DemoCitation } from "../../src/demo/types";

export type GrantsDetailState =
  | { readonly state: "loading" }
  | { readonly state: "error" }
  | { readonly state: "ready"; readonly detail: GrantsDetailResponse };

export function AuthorityCitations(props: {
  /** The opened Grants.gov row; its link is offered while the record loads or fails. */
  citation: DemoCitation;
  detail: GrantsDetailState;
}) {
  const { detail } = props;
  const citation =
    detail.state === "ready" ? detail.detail.citation : props.citation;
  const open = (
    <a href={citation.officialUrl} target="_blank" rel="noopener noreferrer">
      {T.openOpportunity}
    </a>
  );
  return (
    <section
      class="authority-citations"
      aria-labelledby="authority-citations-h"
    >
      <h3 id="authority-citations-h">{T.title}</h3>
      {detail.state === "loading" && <p role="status">{T.loading}</p>}
      {detail.state === "error" && (
        <p role="alert">
          {T.failed} {open}
        </p>
      )}
      {detail.state === "ready" && <Ready detail={detail.detail} open={open} />}
      <p class="limits">{T.coverage}</p>
    </section>
  );
}

function Ready(props: {
  detail: GrantsDetailResponse;
  open: ComponentChildren;
}) {
  const { citation, authority } = props.detail;
  const listings = citation.assistanceListings ?? [];
  const passage = citation.authorityPassage;
  const links = authorityLinks(citation);
  return (
    <>
      <h4>{T.listingsTitle}</h4>
      {listings.length === 0 ? (
        <p>{T.listingsNone}</p>
      ) : (
        <>
          <ul>
            {listings.map((l) => (
              <li key={l.number}>
                {l.number} {l.title}
              </li>
            ))}
          </ul>
          <p class="basis">{T.listingsSource}</p>
        </>
      )}
      <h4>{T.passageTitle}</h4>
      {passage ? (
        <>
          <p class="basis">{T.passageFrom(passage.heading)}</p>
          <blockquote cite={citation.officialUrl}>
            <p>{passage.text}</p>
          </blockquote>
        </>
      ) : (
        <p>{authority === "withheld" ? T.withheld : `${T.noPassage}.`}</p>
      )}
      <p>
        {citation.versionDate
          ? T.versionDate(citation.versionDate)
          : T.versionDateNone}{" "}
        {props.open}
      </p>
      {passage && (
        <>
          <h4>{T.citationsTitle}</h4>
          {links.length === 0 ? (
            <p>{T.citationsNone}</p>
          ) : (
            <ul>
              {links.map((link) => (
                <li key={link.target.identifier}>
                  {link.target.officialUrl ? (
                    <a
                      href={link.target.officialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {link.sourceWording}
                    </a>
                  ) : (
                    <>
                      {link.sourceWording} ({LINK_NOTICES.notLive})
                    </>
                  )}{" "}
                  <span class="basis">{T.citationParsed}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </>
  );
}
