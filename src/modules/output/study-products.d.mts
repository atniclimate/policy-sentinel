import type {
  AnalyzedCorpus,
  PolicyCoverage,
  PolicyDate,
} from "../../pipeline/analyzed-corpus-v2.mjs";
import type { PolicySearchResults } from "../../engine/policy-search.mjs";
import type {
  ResearchStudy,
  StudyCatalogs,
  StudyCitation,
  StudyGraphNode,
  StudyGraphEdge,
} from "../../core/research-study.mjs";

export interface StudyContextRelationship {
  readonly relationshipId: string;
  readonly relationshipDigest: string;
  readonly type: "amends" | "corrects" | "repeals" | "supersedes";
  readonly fromWorkId: string;
  readonly fromVersionId: string;
  readonly targetWorkId: string;
  readonly targetVersionId: string;
  /** Exact source wording, or null when source display policy withholds it. */
  readonly sourceLabel: string | null;
  readonly sourceStatedAt: PolicyDate;
  readonly sourceSegmentIds: readonly string[];
}
export interface StudyContextRecord {
  readonly versionId: string;
  readonly proceedingId: string | null;
  readonly title: string;
  readonly docketIds: readonly string[];
  readonly rins: readonly string[];
  readonly passageIds: readonly string[];
  readonly reason:
    "governing_proceeding_context" | "source_stated_procedural_relationship";
  readonly relationshipId?: string;
  readonly sourceSegmentIds?: readonly string[];
  readonly sourceRelationships?: readonly StudyContextRelationship[];
}
export interface StudySearchContext {
  readonly contextRecords: readonly StudyContextRecord[];
  readonly totalContextRecords: number;
  readonly contextLimit: number;
  readonly contextTruncated: boolean;
  readonly coverage: readonly (PolicyCoverage & {
    readonly searched: boolean;
  })[];
  readonly limitations: readonly string[];
}
export interface StudyEvidenceRow {
  readonly id: string;
  readonly actorId: string;
  readonly reviewState: string;
  readonly provenance: "source_content";
  readonly citation: StudyCitation;
  readonly text: string | null;
  readonly reason: string | null;
  readonly originGroup: string;
}
export interface StudyProducts {
  readonly dossierHtml: string;
  readonly evidenceCsv: string;
  readonly timelineCsv: string;
  readonly authorityCsv: string;
  readonly gapsCsv: string;
  readonly graph: {
    readonly $schema: "https://policy-sentinel.invalid/schemas/attributed-study-graph.schema.v1.json";
    readonly schemaVersion: "1.0.0";
    readonly kind: "attributed_study_graph";
    readonly audience: "local" | "public";
    readonly studyId: string | null;
    readonly studyDigest: string | null;
    readonly corpusDigest: string | null;
    readonly generatedAt: string | null;
    readonly actors: StudyCatalogs["actors"];
    readonly nodes: readonly StudyGraphNode[];
    readonly edges: readonly StudyGraphEdge[];
  };
  readonly provenance: {
    readonly schemaVersion: "1.0.0";
    readonly audience: "local" | "public";
    readonly studyId: string;
    readonly studyDigest: string | null;
    readonly corpusDigest: string | null;
    readonly evidence: readonly StudyEvidenceRow[];
    readonly records: StudyCatalogs;
    readonly history: ResearchStudy["revisions"];
    readonly limitations: readonly string[];
  };
  readonly records: StudyCatalogs;
  readonly evidence: readonly StudyEvidenceRow[];
  readonly timeline: readonly (
    | StudyCatalogs["actions"][number]
    | StudyCatalogs["deadlines"][number]
    | StudyCatalogs["consultations"][number]
  )[];
  readonly authorityMatrix: StudyCatalogs["authorityRelationships"];
  readonly gapRegister: StudyCatalogs["gaps"];
  readonly coverage: readonly PolicyCoverage[];
  readonly limitations: readonly string[];
}
export function buildStudyProducts(
  study: ResearchStudy,
  corpus: AnalyzedCorpus,
  options?: { readonly audience?: "local" | "public" },
): Promise<StudyProducts>;
/** The corpus is already validated. A supplied study must be held by the core's validated workspace cache. */
export function studySearchContext(
  study: ResearchStudy | null,
  corpus: AnalyzedCorpus,
  results: PolicySearchResults,
  options?: {
    readonly sourceProfileId?: string;
    readonly contextLimit?: number;
  },
): StudySearchContext;
