export function parseDocumentContent(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export function hasDocumentContent(content: string): boolean {
  const parsedContent = parseDocumentContent(content);

  if (!parsedContent || typeof parsedContent !== 'object' || Array.isArray(parsedContent)) {
    return false;
  }

  return Object.keys(parsedContent).length > 0;
}

export function serializeDocumentContent(content: Record<string, unknown> | null | undefined): string {
  return JSON.stringify(content ?? {});
}
