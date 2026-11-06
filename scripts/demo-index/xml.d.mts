export interface XmlNode {
  name: string;
  attrs: Record<string, string>;
  children: (XmlNode | string)[];
}
export function collectSubtrees(
  xml: string,
  select: (
    name: string,
    attrs: Record<string, string>,
    ancestors: readonly string[],
  ) => boolean,
  onNode: (node: XmlNode, ancestors: readonly string[]) => void,
): { name: string; attrs: Record<string, string> } | null;
export function isElement(child: XmlNode | string): child is XmlNode;
export function textOf(node: XmlNode | string): string;
export function collapse(text: string): string;
export function elements(node: XmlNode, name?: string): XmlNode[];
export function descendants(node: XmlNode): Generator<XmlNode>;
