import type { TemporalValue } from "../../kernel/assertions/index";

import {
  S0_ATTRIBUTION,
  S0_COORDINATE_SPACE_ID,
  S0_EXPLANATION,
  S0_EXPLANATION_ID,
  S0_JURISDICTION_HEADERS,
  S0_JURISDICTION_HEADING,
  S0_SPATIAL_HEADERS,
  S0_SPATIAL_HEADING,
  S0_TOPOLOGY_RULE_ID,
  S0_TOPOLOGY_RULE_VERSION,
  S0_UNIT,
  S0_UNKNOWN_REASON_TEXT,
} from "./constants";
import {
  createJurisdictionEvidenceCollection,
  validateJurisdictionEvidenceCollection,
} from "./jurisdiction-evidence";
import {
  createSpatialObservationCollection,
  validateSpatialObservationCollection,
} from "./observation";
import {
  createSpatialRelationCollection,
  validateSpatialRelationCollection,
} from "./relation";
import type {
  EvidenceTableRow,
  ImmutableJurisdictionEvidence,
  ImmutableSpatialEvidenceInput,
  ImmutableSpatialEvidenceViewModel,
  ImmutableSpatialObservation,
  ImmutableSpatialRelation,
  JurisdictionEvidenceTableView,
  ObservationUncertainty,
  SpatialEvidenceInput,
  SpatialEvidenceTableView,
  SpatialEvidenceViewModel,
  SpatialRelationUncertainty,
} from "./types";
import {
  assertS0JsonValue,
  exactKeys,
  fail,
  immutableClone,
  objectValue,
} from "./validation";

const VIEW_INPUT_KEYS = [
  "observations",
  "relations",
  "jurisdictionEvidence",
] as const;

const DETERMINATE_RELATION_LABELS = {
  intersects: "Intersects",
  contains: "Contains",
  within: "Within",
  touches: "Touches",
  disjoint: "Disjoint",
} as const;

type SpatialCells = readonly [
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
];

type JurisdictionCells = readonly [
  string,
  string,
  string,
  string,
  string,
  string,
  string,
];

function temporalValueText(value: TemporalValue): string {
  if (value.kind === "date" || value.kind === "date_time") {
    return value.value;
  }
  const left = value.start === null ? "(" : value.start.inclusive ? "[" : "(";
  const start = value.start === null ? "-infinity" : value.start.value;
  const end = value.end === null ? "+infinity" : value.end.value;
  const right = value.end === null ? ")" : value.end.inclusive ? "]" : ")";
  return `${left}${start}, ${end}${right}`;
}

function sharedValidTimeText(relation: ImmutableSpatialRelation): string {
  if (relation.sharedValidTime.state === "overlap") {
    return temporalValueText(relation.sharedValidTime.value as TemporalValue);
  }
  if (relation.sharedValidTime.state === "indeterminate") {
    return "No shared valid time - mixed date/date-time precision.";
  }
  return "No shared valid time - disjoint valid times.";
}

function relationText(relation: ImmutableSpatialRelation): string {
  if (relation.relation === "unknown") {
    if (relation.unknownReason === null) {
      fail(
        "$view.relation.unknownReason",
        "unknown relation requires its exact reason",
      );
    }
    return S0_UNKNOWN_REASON_TEXT[relation.unknownReason];
  }
  return DETERMINATE_RELATION_LABELS[relation.relation];
}

function uncertaintyText(
  uncertainty: ObservationUncertainty | SpatialRelationUncertainty,
): string {
  return uncertainty.state === "certain"
    ? "certain"
    : `uncertain(${uncertainty.reason})`;
}

function resolveObservation(
  observationId: string,
  observations: ReadonlyMap<string, ImmutableSpatialObservation>,
): ImmutableSpatialObservation {
  const observation = observations.get(observationId);
  if (observation === undefined) {
    fail("$view", `unresolved observation ID ${observationId}`);
  }
  return observation;
}

function spatialRow(
  relation: ImmutableSpatialRelation,
  observations: ReadonlyMap<string, ImmutableSpatialObservation>,
): EvidenceTableRow<SpatialCells> {
  const subject = resolveObservation(
    relation.subject.observationId,
    observations,
  );
  const object = resolveObservation(
    relation.object.observationId,
    observations,
  );
  const cells: SpatialCells = [
    subject.featureId,
    object.featureId,
    relationText(relation),
    sharedValidTimeText(relation),
    S0_COORDINATE_SPACE_ID,
    `Subject: [${subject.coordinateSpace.axisOrder[0]}, ${subject.coordinateSpace.axisOrder[1]}]; object: [${object.coordinateSpace.axisOrder[0]}, ${object.coordinateSpace.axisOrder[1]}].`,
    `Subject: ${subject.resolution} ${S0_UNIT}; object: ${object.resolution} ${S0_UNIT}.`,
    `${relation.algorithm.tolerance} ${S0_UNIT}`,
    `Subject: ${subject.coverage}; object: ${object.coverage}.`,
    `Subject: ${uncertaintyText(subject.uncertainty as ObservationUncertainty)}; object: ${uncertaintyText(object.uncertainty as ObservationUncertainty)}; relation: ${uncertaintyText(relation.uncertainty as SpatialRelationUncertainty)}.`,
    `${S0_TOPOLOGY_RULE_ID} ${S0_TOPOLOGY_RULE_VERSION}`,
    S0_ATTRIBUTION,
  ];
  return { id: relation.relationId, cells };
}

function jurisdictionRow(
  evidence: ImmutableJurisdictionEvidence,
): EvidenceTableRow<JurisdictionCells> {
  return {
    id: evidence.jurisdictionEvidenceId,
    cells: [
      evidence.featureId,
      evidence.administrativeUnitId,
      evidence.sourceLabel,
      evidence.statement,
      evidence.evidenceBasis,
      evidence.reviewState,
      evidence.attribution,
    ],
  };
}

export function validateSpatialEvidenceInput(
  value: unknown,
  path = "$",
): ImmutableSpatialEvidenceInput {
  assertS0JsonValue(value);
  const object = objectValue(value, path);
  exactKeys(object, path, VIEW_INPUT_KEYS);
  const observations = validateSpatialObservationCollection(
    object.observations,
    `${path}.observations`,
  );
  const relations = validateSpatialRelationCollection(
    object.relations,
    observations,
    `${path}.relations`,
  );
  const jurisdictionEvidence = validateJurisdictionEvidenceCollection(
    object.jurisdictionEvidence,
    `${path}.jurisdictionEvidence`,
  );
  return immutableClone<SpatialEvidenceInput>({
    observations,
    relations,
    jurisdictionEvidence,
  });
}

export function createSpatialEvidenceInput(
  input: SpatialEvidenceInput,
): ImmutableSpatialEvidenceInput {
  assertS0JsonValue(input);
  const object = objectValue(input, "$createSpatialEvidenceInput");
  exactKeys(object, "$createSpatialEvidenceInput", VIEW_INPUT_KEYS);
  if (!Array.isArray(object.observations)) {
    fail("$.observations", "expected a spatial-observation array");
  }
  if (!Array.isArray(object.relations)) {
    fail("$.relations", "expected a spatial-relation array");
  }
  if (!Array.isArray(object.jurisdictionEvidence)) {
    fail("$.jurisdictionEvidence", "expected a jurisdiction-evidence array");
  }
  const observations = createSpatialObservationCollection(
    object.observations as readonly ImmutableSpatialObservation[],
  );
  const relations = createSpatialRelationCollection(
    object.relations as readonly ImmutableSpatialRelation[],
    observations,
  );
  const jurisdictionEvidence = createJurisdictionEvidenceCollection(
    object.jurisdictionEvidence as readonly ImmutableJurisdictionEvidence[],
  );
  return validateSpatialEvidenceInput({
    observations,
    relations,
    jurisdictionEvidence,
  });
}

export function createSpatialEvidenceViewModel(
  input: SpatialEvidenceInput,
): ImmutableSpatialEvidenceViewModel {
  const validated = validateSpatialEvidenceInput(input);
  const observationIndex = new Map(
    validated.observations.map((observation) => [
      observation.observationId,
      observation,
    ]),
  );
  const spatialTable: SpatialEvidenceTableView = {
    caption: S0_SPATIAL_HEADING,
    ariaDescribedBy: S0_EXPLANATION_ID,
    headers: S0_SPATIAL_HEADERS,
    rows: validated.relations.map((relation) =>
      spatialRow(relation, observationIndex),
    ),
  };
  const jurisdictionSection: JurisdictionEvidenceTableView | null =
    validated.jurisdictionEvidence.length === 0
      ? null
      : {
          heading: S0_JURISDICTION_HEADING,
          caption: S0_JURISDICTION_HEADING,
          ariaDescribedBy: S0_EXPLANATION_ID,
          headers: S0_JURISDICTION_HEADERS,
          rows: validated.jurisdictionEvidence.map(jurisdictionRow),
        };
  const viewModel: SpatialEvidenceViewModel = {
    heading: S0_SPATIAL_HEADING,
    explanationId: S0_EXPLANATION_ID,
    explanation: S0_EXPLANATION,
    spatialTable,
    jurisdictionSection,
  };
  return immutableClone(viewModel);
}
