/** @jsxImportSource preact */

import type { PublicRecord, SearchCriteria, WhyShown } from "../types";
import { recordFocusId, recordHash } from "../routing";
import { formatDate, humanize, updatedDate } from "../present";

interface RecordCardProps {
  record: PublicRecord;
  criteria: SearchCriteria;
  fromPath: string;
  whyShown: WhyShown;
  selected: boolean;
  selectedIds: Set<string>;
  resultWindow: number;
  onSelectionChange: (recordId: string, selected: boolean) => void;
}

export function RecordCard({
  record,
  criteria,
  fromPath,
  whyShown,
  selected,
  selectedIds,
  resultWindow,
  onSelectionChange,
}: RecordCardProps) {
  const date = updatedDate(record);
  const checkboxId = `select-${record.internalId.replace(/[^A-Za-z0-9_-]/g, "-")}`;

  return (
    <article class="result-card" id={`record-${record.internalId}`}>
      <div class="result-card__select">
        <input
          id={checkboxId}
          type="checkbox"
          checked={selected}
          onChange={(event) =>
            onSelectionChange(record.internalId, event.currentTarget.checked)
          }
        />
        <label for={checkboxId}>Select for dossier and CSV</label>
      </div>

      <div class="badge-row" role="group" aria-label="Record indicators">
        {record.change.kind !== "unchanged" && (
          <span class="badge badge--new">
            {humanize(record.change.kind)}
            {record.change.firstSeenAt
              ? ` since ${formatDate(record.change.firstSeenAt)}`
              : ""}
          </span>
        )}
        {record.change.urgentAlert && (
          <span class="badge badge--urgent">
            {record.change.urgentAlert.label}
            {record.change.urgentAlert.date
              ? `: ${formatDate(record.change.urgentAlert.date)}`
              : ""}
          </span>
        )}
        {record.sourceHealth.usingLastKnownGood && (
          <span class="badge badge--warning">Last-known-good source data</span>
        )}
      </div>

      <h3>
        <a
          id={recordFocusId(record.internalId)}
          href={recordHash(record.internalId, criteria, fromPath, {
            selectedIds,
            resultWindow,
          })}
        >
          {record.officialTitle}
        </a>
      </h3>

      <dl class="card-metadata">
        <div>
          <dt>Document type</dt>
          <dd>{humanize(record.documentType)}</dd>
        </div>
        <div>
          <dt>Jurisdiction</dt>
          <dd>{record.jurisdiction.name}</dd>
        </div>
        {record.judicialContext && (
          <div>
            <dt>
              {record.judicialContext.adjudicatingBody.kind === "court"
                ? "Court"
                : "Adjudicating body"}
            </dt>
            <dd>{record.judicialContext.adjudicatingBody.officialName}</dd>
          </div>
        )}
        {record.accordContext && (
          <div>
            <dt>Accord parties</dt>
            <dd>
              {record.accordContext.parties
                .map(({ officialName }) => officialName)
                .join("; ")}
            </dd>
          </div>
        )}
        {!record.judicialContext &&
          !record.accordContext &&
          record.issuingBodies.length > 0 && (
            <div>
              <dt>Issuing body</dt>
              <dd>{record.issuingBodies.join("; ")}</dd>
            </div>
          )}
        {record.judicialContext && (
          <div>
            <dt>Citation</dt>
            <dd>
              {record.judicialContext.citations
                .map(({ value }) => value)
                .join("; ")}
            </dd>
          </div>
        )}
        <div>
          <dt>Official source</dt>
          <dd>{record.source.name}</dd>
        </div>
        {record.accordContext ? (
          <div>
            <dt>Current status</dt>
            <dd>Not stated by source</dd>
          </div>
        ) : (
          <div>
            <dt>Source status</dt>
            <dd>{record.status.sourceLabel ?? "Not provided by source"}</dd>
          </div>
        )}
        <div>
          <dt>{date.label}</dt>
          <dd>{formatDate(date.value)}</dd>
        </div>
      </dl>

      <p class={`why-shown why-shown--${whyShown.basis}`}>
        <strong>Why shown:</strong> {whyShown.label}
      </p>
      <div class="card-actions">
        <a
          class="button button--small"
          href={recordHash(record.internalId, criteria, fromPath, {
            selectedIds,
            resultWindow,
          })}
        >
          Open record details
        </a>
        {record.urls.officialSource && (
          <a href={record.urls.officialSource} target="_blank" rel="noreferrer">
            Official source{" "}
            <span class="visually-hidden">(opens a new tab)</span>
          </a>
        )}
      </div>
    </article>
  );
}
