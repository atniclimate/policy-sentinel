export const WASHINGTON_LWS_CONTRACT_VERSION = "1.0.0" as const;
export const WASHINGTON_LWS_SOURCE_ID = "washington-lws" as const;
export const WASHINGTON_LWS_SYNTHETIC_NOTICE =
  "Synthetic contract data; not a Washington LWS response." as const;

export const WASHINGTON_LWS_ORIGIN =
  "https://wslwebservices.leg.wa.gov" as const;
export const WASHINGTON_LWS_SERVICE_NAMESPACE =
  "http://WSLWebServices.leg.wa.gov/" as const;
export const SOAP_11_NAMESPACE =
  "http://schemas.xmlsoap.org/soap/envelope/" as const;
export const XML_SCHEMA_INSTANCE_NAMESPACE =
  "http://www.w3.org/2001/XMLSchema-instance" as const;
export const XML_SCHEMA_NAMESPACE = "http://www.w3.org/2001/XMLSchema" as const;
export const XML_NAMESPACE = "http://www.w3.org/XML/1998/namespace" as const;
export const XMLNS_NAMESPACE = "http://www.w3.org/2000/xmlns/" as const;

export const WASHINGTON_LWS_WSDL_SHA256 = {
  amendmentservice:
    "14e927bd01ce16e67c625fcc6332cbed93fa465dd591dbdb7a4b708f918d85ac",
  committeeactionservice:
    "c081b053bfeaaf45dd1442a3e7f651388bf98575d00d22d2061d19fdc5931fc7",
  committeemeetingservice:
    "6437645518193a61454e8e2e088ee45e3ca6b04ba02fa2fb122e217f90cf28f8",
  committeeservice:
    "65d073f19f9d56ecad7e49c395c25a0f3f996798f702699b16d9a99620cc85fb",
  legislationservice:
    "a432d52a01ddba46b65e42500b7eabea6f9c1e89647ff3f30ce1cca28e1a0719",
  legislativedocumentservice:
    "f91c9292eafcf75361672cfd689c6182b1bbed02e48422fa9027ab210d4ae5b8",
  rcwciteaffectedservice:
    "2983af4ffd25a2a0fa1f7c09d433cc60594cafbe51fb1a7ad7b2e3b49a0369a8",
  sessionlawservice:
    "516a5f9938946b175c375fd4f83ff68b8ca3b0ac9bcbb4bc15a527f7d6bdfad2",
  sponsorservice:
    "0c74a4c84a09fecbc650e1d896d297f1f3a1cc86569e21f69646b916107abd6e",
} as const;

export const WASHINGTON_LWS_OPERATION_DESCRIPTORS = {
  GetLegislation: {
    servicePath: "/legislationservice.asmx",
    responseElement: "GetLegislationResponse",
    resultElement: "GetLegislationResult",
    itemElement: "Legislation",
    maximumItems: 64,
  },
  GetLegislativeStatusChangesByBillId: {
    servicePath: "/legislationservice.asmx",
    responseElement: "GetLegislativeStatusChangesByBillIdResponse",
    resultElement: "GetLegislativeStatusChangesByBillIdResult",
    itemElement: "LegislativeStatus",
    maximumItems: 2_048,
  },
  GetSponsors: {
    servicePath: "/legislationservice.asmx",
    responseElement: "GetSponsorsResponse",
    resultElement: "GetSponsorsResult",
    itemElement: "Sponsor",
    maximumItems: 1_024,
  },
  GetCommitteeReferralsByBill: {
    servicePath: "/committeeactionservice.asmx",
    responseElement: "GetCommitteeReferralsByBillResponse",
    resultElement: "GetCommitteeReferralsByBillResult",
    itemElement: "CommitteeReferral",
    maximumItems: 512,
  },
  GetDocuments: {
    servicePath: "/legislativedocumentservice.asmx",
    responseElement: "GetDocumentsResponse",
    resultElement: "GetDocumentsResult",
    itemElement: "LegislativeDocument",
    maximumItems: 512,
  },
  GetSessionLawByBillId: {
    servicePath: "/sessionlawservice.asmx",
    responseElement: "GetSessionLawByBillIdResponse",
    resultElement: "GetSessionLawByBillIdResult",
    itemElement: "SessionLaw",
    maximumItems: 1,
  },
} as const;

export type WashingtonLwsOperation =
  keyof typeof WASHINGTON_LWS_OPERATION_DESCRIPTORS;

export const WASHINGTON_LWS_XML_POLICY = {
  maximumRequestBytes: 16 * 1_024,
  maximumResponseBytes: 2 * 1_024 * 1_024,
  maximumDepth: 16,
  maximumNodes: 30_000,
  maximumAttributesPerElement: 16,
  maximumAttributes: 30_000,
  maximumNameLength: 128,
  maximumScalarTextLength: 16_384,
  maximumAggregateTextLength: 1 * 1_024 * 1_024,
  maximumIdentifierLength: 128,
  maximumUrlLength: 2_048,
  maximumFaultTextLength: 2_048,
  maximumStatusWindowDays: 31,
} as const;
