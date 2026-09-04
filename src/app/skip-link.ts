export function installSkipLink(documentNode: Document = document): () => void {
  const skipLink = documentNode.querySelector<HTMLAnchorElement>(
    '.skip-link[href="#main-content"]',
  );

  if (!skipLink) {
    return () => undefined;
  }

  const focusMainContent = (event: MouseEvent): void => {
    event.preventDefault();
    documentNode.getElementById("main-content")?.focus();
  };

  skipLink.addEventListener("click", focusMainContent);
  return () => skipLink.removeEventListener("click", focusMainContent);
}
