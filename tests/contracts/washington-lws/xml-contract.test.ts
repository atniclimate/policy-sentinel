import { describe, expect, it, vi } from "vitest";

import {
  SOAP_11_NAMESPACE,
  WASHINGTON_LWS_SERVICE_NAMESPACE,
  WASHINGTON_LWS_XML_POLICY,
  XML_SCHEMA_INSTANCE_NAMESPACE,
} from "../../../src/contracts/washington-lws/constants";
import { WashingtonLwsContractError } from "../../../src/contracts/washington-lws/errors";
import { parseWashingtonLwsXmlDocument } from "../../../src/contracts/washington-lws/xml-contract";

function bytes(xml: string): Uint8Array {
  return new TextEncoder().encode(xml);
}

function envelope(
  body: string,
  {
    soapPrefix = "soap",
    servicePrefix = "",
    additionalNamespaces = "",
  }: {
    soapPrefix?: string;
    servicePrefix?: string;
    additionalNamespaces?: string;
  } = {},
): string {
  const serviceDeclaration =
    servicePrefix === ""
      ? `xmlns="${WASHINGTON_LWS_SERVICE_NAMESPACE}"`
      : `xmlns:${servicePrefix}="${WASHINGTON_LWS_SERVICE_NAMESPACE}"`;
  return (
    '<?xml version="1.0" encoding="utf-8"?>' +
    `<${soapPrefix}:Envelope xmlns:${soapPrefix}="${SOAP_11_NAMESPACE}" ` +
    `xmlns:xsi="${XML_SCHEMA_INSTANCE_NAMESPACE}" ${serviceDeclaration} ` +
    `${additionalNamespaces}>` +
    `<${soapPrefix}:Body>${body}</${soapPrefix}:Body>` +
    `</${soapPrefix}:Envelope>`
  );
}

describe("Washington LWS bounded XML contract", () => {
  it("parses namespace URIs independently of prefix spelling", () => {
    const xml = envelope(
      "<l:GetLegislationResponse>" +
        '<l:GetLegislationResult xsi:nil="true" />' +
        "</l:GetLegislationResponse>",
      {
        soapPrefix: "s",
        servicePrefix: "l",
      },
    );

    const parsed = parseWashingtonLwsXmlDocument(bytes(xml));

    expect(parsed).toMatchObject({
      uri: SOAP_11_NAMESPACE,
      local: "Envelope",
      children: [
        {
          uri: SOAP_11_NAMESPACE,
          local: "Body",
          children: [
            {
              uri: WASHINGTON_LWS_SERVICE_NAMESPACE,
              local: "GetLegislationResponse",
              children: [
                {
                  uri: WASHINGTON_LWS_SERVICE_NAMESPACE,
                  local: "GetLegislationResult",
                  attributes: [
                    {
                      uri: XML_SCHEMA_INSTANCE_NAMESPACE,
                      local: "nil",
                      value: "true",
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });
  });

  it.each([
    {
      label: "DTD and external entity",
      xml:
        '<?xml version="1.0" encoding="utf-8"?>' +
        '<!DOCTYPE soap:Envelope [<!ENTITY xxe SYSTEM "https://example.invalid/secret">]>' +
        `<soap:Envelope xmlns:soap="${SOAP_11_NAMESPACE}"><soap:Body>&xxe;</soap:Body></soap:Envelope>`,
    },
    {
      label: "processing instruction",
      xml:
        '<?xml version="1.0" encoding="utf-8"?>' +
        '<?provider unsafe="true"?>' +
        `<soap:Envelope xmlns:soap="${SOAP_11_NAMESPACE}"><soap:Body /></soap:Envelope>`,
    },
    {
      label: "comment",
      xml:
        '<?xml version="1.0" encoding="utf-8"?>' +
        `<soap:Envelope xmlns:soap="${SOAP_11_NAMESPACE}"><!--unsafe--><soap:Body /></soap:Envelope>`,
    },
    {
      label: "CDATA",
      xml:
        '<?xml version="1.0" encoding="utf-8"?>' +
        `<soap:Envelope xmlns:soap="${SOAP_11_NAMESPACE}"><soap:Body><![CDATA[unsafe]]></soap:Body></soap:Envelope>`,
    },
    {
      label: "XInclude",
      xml: envelope('<xi:include href="https://example.invalid/secret" />', {
        additionalNamespaces: 'xmlns:xi="http://www.w3.org/2001/XInclude"',
      }),
    },
    {
      label: "unused unknown namespace declaration",
      xml: envelope("<Reviewed />", {
        additionalNamespaces: 'xmlns:rogue="urn:unreviewed"',
      }),
    },
    {
      label: "xml:base",
      xml:
        '<?xml version="1.0" encoding="utf-8"?>' +
        `<soap:Envelope xmlns:soap="${SOAP_11_NAMESPACE}" xml:base="https://example.invalid/"><soap:Body /></soap:Envelope>`,
    },
    {
      label: "xsi:type",
      xml:
        '<?xml version="1.0" encoding="utf-8"?>' +
        `<soap:Envelope xmlns:soap="${SOAP_11_NAMESPACE}" xmlns:xsi="${XML_SCHEMA_INSTANCE_NAMESPACE}">` +
        '<soap:Body xsi:type="unsafe" /></soap:Envelope>',
    },
    {
      label: "SOAP 1.2",
      xml:
        '<?xml version="1.0" encoding="utf-8"?>' +
        '<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope"><s:Body /></s:Envelope>',
    },
    {
      label: "XML 1.1",
      xml:
        '<?xml version="1.1" encoding="utf-8"?>' +
        `<soap:Envelope xmlns:soap="${SOAP_11_NAMESPACE}"><soap:Body /></soap:Envelope>`,
    },
  ])("rejects prohibited XML: $label", ({ xml }) => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    expect(() => parseWashingtonLwsXmlDocument(bytes(xml))).toThrowError(
      WashingtonLwsContractError,
    );
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("rejects invalid UTF-8 and over-budget response bytes", () => {
    expect(() =>
      parseWashingtonLwsXmlDocument(Uint8Array.from([0xc3, 0x28])),
    ).toThrowError(/not valid UTF-8/);
    expect(() =>
      parseWashingtonLwsXmlDocument(
        new Uint8Array(WASHINGTON_LWS_XML_POLICY.maximumResponseBytes + 1),
      ),
    ).toThrowError(/exceeds the XML budget/);
  });

  it("rejects missing declarations, multiple roots, fragments, and trailing content", () => {
    expect(() =>
      parseWashingtonLwsXmlDocument(
        bytes(
          `<soap:Envelope xmlns:soap="${SOAP_11_NAMESPACE}"><soap:Body /></soap:Envelope>`,
        ),
      ),
    ).toThrowError(/expected one complete XML 1.0 document/);
    for (const xml of [
      '<?xml version="1.0" encoding="utf-8"?><one/><two/>',
      '<?xml version="1.0" encoding="utf-8"?><one>',
      '<?xml version="1.0" encoding="utf-8"?><one/>trailing',
    ]) {
      expect(() => parseWashingtonLwsXmlDocument(bytes(xml))).toThrowError(
        WashingtonLwsContractError,
      );
    }
  });

  it("rejects one-over depth, node, scalar, and aggregate-text budgets", () => {
    const nested =
      Array.from(
        { length: WASHINGTON_LWS_XML_POLICY.maximumDepth + 1 },
        (_, index) => `<n${index} xmlns="${WASHINGTON_LWS_SERVICE_NAMESPACE}">`,
      ).join("") +
      Array.from(
        { length: WASHINGTON_LWS_XML_POLICY.maximumDepth + 1 },
        (_, index) => `</n${WASHINGTON_LWS_XML_POLICY.maximumDepth - index}>`,
      ).join("");
    expect(() =>
      parseWashingtonLwsXmlDocument(
        bytes('<?xml version="1.0" encoding="utf-8"?>' + nested),
      ),
    ).toThrowError(/element-depth budget/);

    const nodes = Array.from(
      { length: WASHINGTON_LWS_XML_POLICY.maximumNodes },
      () => "<n />",
    ).join("");
    expect(() =>
      parseWashingtonLwsXmlDocument(
        bytes(
          '<?xml version="1.0" encoding="utf-8"?>' +
            `<root xmlns="${WASHINGTON_LWS_SERVICE_NAMESPACE}">${nodes}</root>`,
        ),
      ),
    ).toThrowError(/element-node budget/);

    const scalar = "x".repeat(
      WASHINGTON_LWS_XML_POLICY.maximumScalarTextLength + 1,
    );
    expect(() =>
      parseWashingtonLwsXmlDocument(
        bytes(
          '<?xml version="1.0" encoding="utf-8"?>' +
            `<root xmlns="${WASHINGTON_LWS_SERVICE_NAMESPACE}">${scalar}</root>`,
        ),
      ),
    ).toThrowError(/text budget/);

    const textNodes =
      Array.from(
        {
          length:
            WASHINGTON_LWS_XML_POLICY.maximumAggregateTextLength /
            WASHINGTON_LWS_XML_POLICY.maximumScalarTextLength,
        },
        () =>
          `<n>${"x".repeat(
            WASHINGTON_LWS_XML_POLICY.maximumScalarTextLength,
          )}</n>`,
      ).join("") + "<n>x</n>";
    expect(() =>
      parseWashingtonLwsXmlDocument(
        bytes(
          '<?xml version="1.0" encoding="utf-8"?>' +
            `<root xmlns="${WASHINGTON_LWS_SERVICE_NAMESPACE}">${textNodes}</root>`,
        ),
      ),
    ).toThrowError(/text budget/);
  });

  it("pins the aggregate attribute ceiling at its exact boundary", () => {
    const attributesPerChild =
      WASHINGTON_LWS_XML_POLICY.maximumAttributesPerElement - 1;
    const declarationSet = (count: number): string =>
      Array.from(
        { length: count },
        (_, index) => `xmlns:p${index}="http://www.w3.org/2001/XMLSchema"`,
      ).join(" ");
    const rootAttributeCount = 1;
    const available =
      WASHINGTON_LWS_XML_POLICY.maximumAttributes - rootAttributeCount;
    const fullChildCount = Math.floor(available / attributesPerChild);
    const remainder = available % attributesPerChild;
    const fullChild = `<n ${declarationSet(attributesPerChild)} />`;
    const childrenAtLimit =
      fullChild.repeat(fullChildCount) +
      (remainder === 0 ? "" : `<n ${declarationSet(remainder)} />`);
    const document = (children: string): Uint8Array =>
      bytes(
        '<?xml version="1.0" encoding="utf-8"?>' +
          `<root xmlns="${WASHINGTON_LWS_SERVICE_NAMESPACE}">${children}</root>`,
      );
    const atLimit = document(childrenAtLimit);
    expect(atLimit.byteLength).toBeLessThan(
      WASHINGTON_LWS_XML_POLICY.maximumResponseBytes,
    );
    expect(parseWashingtonLwsXmlDocument(atLimit).children.length).toBe(
      fullChildCount + (remainder === 0 ? 0 : 1),
    );

    const oneOver =
      remainder === 0
        ? childrenAtLimit + '<n xmlns:p="http://www.w3.org/2001/XMLSchema" />'
        : fullChild.repeat(fullChildCount) +
          `<n ${declarationSet(remainder + 1)} />`;
    expect(() => parseWashingtonLwsXmlDocument(document(oneOver))).toThrowError(
      /aggregate attribute budget/,
    );
  });

  it("counts whitespace-only scalar content against scalar and aggregate budgets", () => {
    const whitespace = " ".repeat(
      WASHINGTON_LWS_XML_POLICY.maximumScalarTextLength + 1,
    );
    expect(() =>
      parseWashingtonLwsXmlDocument(
        bytes(
          '<?xml version="1.0" encoding="utf-8"?>' +
            `<root xmlns="${WASHINGTON_LWS_SERVICE_NAMESPACE}">${whitespace}</root>`,
        ),
      ),
    ).toThrowError(/text budget/);
  });

  it("pins at-limit and one-over XML name and per-element attribute ceilings", () => {
    const atLimitName = "n".repeat(WASHINGTON_LWS_XML_POLICY.maximumNameLength);
    expect(
      parseWashingtonLwsXmlDocument(
        bytes(
          '<?xml version="1.0" encoding="utf-8"?>' +
            `<${atLimitName} xmlns="${WASHINGTON_LWS_SERVICE_NAMESPACE}" />`,
        ),
      ).local,
    ).toBe(atLimitName);

    const overLimitName = "n".repeat(
      WASHINGTON_LWS_XML_POLICY.maximumNameLength + 1,
    );
    expect(() =>
      parseWashingtonLwsXmlDocument(
        bytes(
          '<?xml version="1.0" encoding="utf-8"?>' +
            `<${overLimitName} xmlns="${WASHINGTON_LWS_SERVICE_NAMESPACE}" />`,
        ),
      ),
    ).toThrowError(/XML name exceeds/);

    const declarations = (aliasCount: number): string =>
      [
        `xmlns:s="${SOAP_11_NAMESPACE}"`,
        ...Array.from(
          { length: aliasCount },
          (_, index) => `xmlns:p${index}="${SOAP_11_NAMESPACE}"`,
        ),
      ].join(" ");
    const atLimitAttributes =
      WASHINGTON_LWS_XML_POLICY.maximumAttributesPerElement - 1;
    expect(
      parseWashingtonLwsXmlDocument(
        bytes(
          '<?xml version="1.0" encoding="utf-8"?>' +
            `<s:Envelope ${declarations(atLimitAttributes)}><s:Body /></s:Envelope>`,
        ),
      ).local,
    ).toBe("Envelope");
    expect(() =>
      parseWashingtonLwsXmlDocument(
        bytes(
          '<?xml version="1.0" encoding="utf-8"?>' +
            `<s:Envelope ${declarations(atLimitAttributes + 1)}><s:Body /></s:Envelope>`,
        ),
      ),
    ).toThrowError(/attribute budget/);
  });

  it("bounds namespace declaration values before discarding them", () => {
    const overLimitNamespace = "u".repeat(
      WASHINGTON_LWS_XML_POLICY.maximumUrlLength + 1,
    );
    expect(() =>
      parseWashingtonLwsXmlDocument(
        bytes(
          '<?xml version="1.0" encoding="utf-8"?>' +
            `<s:Envelope xmlns:s="${SOAP_11_NAMESPACE}" xmlns:long="${overLimitNamespace}"><s:Body /></s:Envelope>`,
        ),
      ),
    ).toThrowError(/namespace declaration exceeds/);
  });

  it("rejects mixed scalar and element content without returning a partial tree", () => {
    const xml =
      '<?xml version="1.0" encoding="utf-8"?>' +
      `<root xmlns="${WASHINGTON_LWS_SERVICE_NAMESPACE}">partial<child /></root>`;

    expect(() => parseWashingtonLwsXmlDocument(bytes(xml))).toThrowError(
      /mixed element and character content/,
    );
  });
});
