import { SaxesParser, type SaxesTagNS } from "saxes";

import {
  SOAP_11_NAMESPACE,
  WASHINGTON_LWS_SERVICE_NAMESPACE,
  WASHINGTON_LWS_XML_POLICY,
  XMLNS_NAMESPACE,
  XML_NAMESPACE,
  XML_SCHEMA_INSTANCE_NAMESPACE,
  XML_SCHEMA_NAMESPACE,
} from "./constants";
import {
  WashingtonLwsContractError,
  failWashingtonLwsContract,
} from "./errors";

export interface WashingtonLwsXmlAttribute {
  uri: string;
  local: string;
  value: string;
}

export interface WashingtonLwsXmlElement {
  uri: string;
  local: string;
  attributes: WashingtonLwsXmlAttribute[];
  children: WashingtonLwsXmlElement[];
  text: string;
}

interface MutableXmlElement extends WashingtonLwsXmlElement {
  textLength: number;
  characterLength: number;
}

function byteView(value: unknown): Uint8Array {
  if (
    !ArrayBuffer.isView(value) ||
    Object.prototype.toString.call(value) !== "[object Uint8Array]"
  ) {
    failWashingtonLwsContract(
      "invalid_type",
      "$xml",
      "expected bounded response bytes",
    );
  }
  const bytes = value as Uint8Array;
  if (
    bytes.byteLength === 0 ||
    bytes.byteLength > WASHINGTON_LWS_XML_POLICY.maximumResponseBytes
  ) {
    failWashingtonLwsContract(
      "limit_exceeded",
      "$xml",
      "response byte length is empty or exceeds the XML budget",
    );
  }
  return bytes;
}

function checkedName(value: string, path: string): string {
  if (
    value.length === 0 ||
    value.length > WASHINGTON_LWS_XML_POLICY.maximumNameLength
  ) {
    failWashingtonLwsContract(
      "limit_exceeded",
      path,
      "XML name exceeds the contract budget",
    );
  }
  return value;
}

function semanticAttributes(
  tag: SaxesTagNS,
  path: string,
  counters: { attributes: number },
): WashingtonLwsXmlAttribute[] {
  const values = Object.values(tag.attributes);
  if (values.length > WASHINGTON_LWS_XML_POLICY.maximumAttributesPerElement) {
    failWashingtonLwsContract(
      "limit_exceeded",
      path,
      "element exceeds the attribute budget",
    );
  }
  counters.attributes += values.length;
  if (counters.attributes > WASHINGTON_LWS_XML_POLICY.maximumAttributes) {
    failWashingtonLwsContract(
      "limit_exceeded",
      "$xml",
      "document exceeds the aggregate attribute budget",
    );
  }
  const attributes: WashingtonLwsXmlAttribute[] = [];
  for (const attribute of values) {
    checkedName(attribute.local, `${path}.@${attribute.local}`);
    if (attribute.uri === XMLNS_NAMESPACE) {
      if (attribute.value.length > WASHINGTON_LWS_XML_POLICY.maximumUrlLength) {
        failWashingtonLwsContract(
          "limit_exceeded",
          `${path}.@${attribute.name}`,
          "namespace declaration exceeds the contract value budget",
        );
      }
      if (
        attribute.value !== "" &&
        attribute.value !== SOAP_11_NAMESPACE &&
        attribute.value !== WASHINGTON_LWS_SERVICE_NAMESPACE &&
        attribute.value !== XML_SCHEMA_INSTANCE_NAMESPACE &&
        attribute.value !== XML_SCHEMA_NAMESPACE
      ) {
        failWashingtonLwsContract(
          "unexpected_namespace",
          `${path}.@${attribute.name}`,
          "namespace declaration is outside the reviewed XML contract",
        );
      }
      continue;
    }
    if (
      attribute.uri === XML_NAMESPACE ||
      attribute.uri !== XML_SCHEMA_INSTANCE_NAMESPACE ||
      attribute.local !== "nil" ||
      (attribute.value !== "true" && attribute.value !== "false")
    ) {
      failWashingtonLwsContract(
        "unexpected_field",
        `${path}.@${attribute.name}`,
        "attribute is outside the reviewed XML contract",
      );
    }
    attributes.push({
      uri: attribute.uri,
      local: attribute.local,
      value: attribute.value,
    });
  }
  return attributes;
}

export function parseWashingtonLwsXmlDocument(
  value: unknown,
): WashingtonLwsXmlElement {
  const bytes = byteView(value);
  let xml: string;
  try {
    xml = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    failWashingtonLwsContract(
      "invalid_value",
      "$xml",
      "response is not valid UTF-8",
    );
  }
  if (/<!DOCTYPE/i.test(xml) || /<!ENTITY/i.test(xml)) {
    failWashingtonLwsContract(
      "prohibited_xml",
      "$xml",
      "DTD and entity declarations are forbidden",
    );
  }

  const roots: MutableXmlElement[] = [];
  const stack: MutableXmlElement[] = [];
  const counters = { nodes: 0, attributes: 0, text: 0 };
  let sawDeclaration = false;
  const parser = new SaxesParser({
    xmlns: true,
    fragment: false,
    forceXMLVersion: true,
    defaultXMLVersion: "1.0",
  });

  parser.on("xmldecl", (declaration) => {
    if (
      sawDeclaration ||
      declaration.version !== "1.0" ||
      (declaration.encoding !== undefined &&
        declaration.encoding.toLowerCase() !== "utf-8") ||
      declaration.standalone !== undefined
    ) {
      failWashingtonLwsContract(
        "prohibited_xml",
        "$xml.declaration",
        "expected one XML 1.0 UTF-8 declaration without standalone",
      );
    }
    sawDeclaration = true;
  });
  parser.on("doctype", () => {
    failWashingtonLwsContract("prohibited_xml", "$xml", "DOCTYPE is forbidden");
  });
  parser.on("processinginstruction", () => {
    failWashingtonLwsContract(
      "prohibited_xml",
      "$xml",
      "processing instructions are forbidden",
    );
  });
  parser.on("comment", () => {
    failWashingtonLwsContract(
      "prohibited_xml",
      "$xml",
      "comments are outside the reviewed response contract",
    );
  });
  parser.on("cdata", () => {
    failWashingtonLwsContract(
      "prohibited_xml",
      "$xml",
      "CDATA is outside the reviewed response contract",
    );
  });
  parser.on("opentag", (tag) => {
    counters.nodes += 1;
    if (counters.nodes > WASHINGTON_LWS_XML_POLICY.maximumNodes) {
      failWashingtonLwsContract(
        "limit_exceeded",
        "$xml",
        "document exceeds the element-node budget",
      );
    }
    if (
      tag.uri !== "" &&
      tag.uri !== SOAP_11_NAMESPACE &&
      tag.uri !== WASHINGTON_LWS_SERVICE_NAMESPACE
    ) {
      failWashingtonLwsContract(
        "unexpected_namespace",
        `$xml.${tag.local}`,
        "element namespace is outside SOAP 1.1 and the reviewed LWS service",
      );
    }
    if (stack.length + 1 > WASHINGTON_LWS_XML_POLICY.maximumDepth) {
      failWashingtonLwsContract(
        "limit_exceeded",
        "$xml",
        "document exceeds the element-depth budget",
      );
    }
    const parent = stack.at(-1);
    if (parent !== undefined && parent.textLength > 0) {
      failWashingtonLwsContract(
        "invalid_value",
        "$xml",
        "mixed element and character content is forbidden",
      );
    }
    const local = checkedName(tag.local, "$xml.element");
    const elementPath = `$xml.${local}`;
    const element: MutableXmlElement = {
      uri: tag.uri,
      local,
      attributes: semanticAttributes(tag, elementPath, counters),
      children: [],
      text: "",
      textLength: 0,
      characterLength: 0,
    };
    stack.push(element);
  });
  parser.on("text", (text) => {
    const current = stack.at(-1);
    counters.text += text.length;
    if (counters.text > WASHINGTON_LWS_XML_POLICY.maximumAggregateTextLength) {
      failWashingtonLwsContract(
        "limit_exceeded",
        "$xml",
        "character data exceeds the XML text budget",
      );
    }
    if (current !== undefined) {
      current.characterLength += text.length;
    }
    if (text.trim() === "") {
      return;
    }
    if (current === undefined || current.children.length > 0) {
      failWashingtonLwsContract(
        "invalid_value",
        "$xml",
        "character data appears outside a scalar element",
      );
    }
    current.textLength += text.length;
    if (
      current.characterLength >
      WASHINGTON_LWS_XML_POLICY.maximumScalarTextLength
    ) {
      failWashingtonLwsContract(
        "limit_exceeded",
        `$xml.${current.local}`,
        "character data exceeds the XML text budget",
      );
    }
    current.text += text;
  });
  parser.on("closetag", () => {
    const element = stack.pop();
    if (element === undefined) {
      failWashingtonLwsContract(
        "invalid_value",
        "$xml",
        "element stack is inconsistent",
      );
    }
    if (
      element.children.length === 0 &&
      element.characterLength >
        WASHINGTON_LWS_XML_POLICY.maximumScalarTextLength
    ) {
      failWashingtonLwsContract(
        "limit_exceeded",
        `$xml.${element.local}`,
        "character data exceeds the XML text budget",
      );
    }
    const finalized: MutableXmlElement = {
      ...element,
      text: element.text,
    };
    const parent = stack.at(-1);
    if (parent === undefined) {
      roots.push(finalized);
    } else {
      parent.children.push(finalized);
    }
  });

  try {
    parser.write(xml).close();
  } catch (error) {
    if (error instanceof WashingtonLwsContractError) {
      throw error;
    }
    failWashingtonLwsContract(
      "invalid_value",
      "$xml",
      "response is not well-formed reviewed XML",
    );
  }
  if (
    !sawDeclaration ||
    stack.length !== 0 ||
    roots.length !== 1 ||
    roots[0] === undefined
  ) {
    failWashingtonLwsContract(
      "invalid_value",
      "$xml",
      "expected one complete XML 1.0 document",
    );
  }
  const root = roots[0];
  return {
    uri: root.uri,
    local: root.local,
    attributes: root.attributes,
    children: root.children,
    text: root.text,
  };
}
