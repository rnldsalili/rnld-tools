export type TipTapNode = {
  type: string;
  text?: string;
  content?: Array<TipTapNode>;
  marks?: Array<{ type: string }>;
  attrs?: Record<string, unknown>;
};

export function normalizeTipTapLineBreaks(content: unknown): TipTapNode | null {
  if (!content || typeof content !== 'object' || Array.isArray(content)) {
    return null;
  }

  return normalizeNode(content as TipTapNode);
}

export function collapseFragmentedPlaceholders(
  content: TipTapNode | null,
  placeholders: Array<string>,
): TipTapNode | null {
  if (!content) {
    return null;
  }

  return collapseNodePlaceholders(content, placeholders);
}

function normalizeNode(node: TipTapNode): TipTapNode {
  if (node.text !== undefined) {
    return {
      ...node,
      content: undefined,
    };
  }

  if (!node.content) {
    return node;
  }

  return {
    ...node,
    content: node.content.flatMap((childNode) => normalizeChildNode(childNode)),
  };
}

function normalizeChildNode(node: TipTapNode): Array<TipTapNode> {
  if (node.text === undefined) {
    return [normalizeNode(node)];
  }

  if (!node.text.includes('\n')) {
    return [{ ...node }];
  }

  const textSegments = node.text.split('\n');

  return textSegments.flatMap((segment, index) => {
    const normalizedNodes: Array<TipTapNode> = [];

    if (segment.length > 0) {
      normalizedNodes.push({
        ...node,
        text: segment,
        content: undefined,
      });
    }

    if (index < textSegments.length - 1) {
      normalizedNodes.push({ type: 'hardBreak' });
    }

    return normalizedNodes;
  });
}

function collapseNodePlaceholders(node: TipTapNode, placeholders: Array<string>): TipTapNode {
  if (!node.content) {
    return node;
  }

  return {
    ...node,
    content: collapseContentPlaceholders(
      node.content.map((childNode) => collapseNodePlaceholders(childNode, placeholders)),
      placeholders,
    ),
  };
}

function collapseContentPlaceholders(
  contentNodes: Array<TipTapNode>,
  placeholders: Array<string>,
): Array<TipTapNode> {
  const collapsedNodes: Array<TipTapNode> = [];

  for (let nodeIndex = 0; nodeIndex < contentNodes.length; nodeIndex += 1) {
    const currentNode = contentNodes[nodeIndex];

    if (!currentNode.text || !currentNode.text.includes('{{')) {
      collapsedNodes.push(currentNode);
      continue;
    }

    let combinedText = currentNode.text;
    let didCollapse = false;

    for (
      let nextNodeIndex = nodeIndex + 1;
      nextNodeIndex < contentNodes.length && nextNodeIndex < nodeIndex + 6;
      nextNodeIndex += 1
    ) {
      const nextNode = contentNodes[nextNodeIndex];

      if (nextNode.text === undefined) {
        break;
      }

      combinedText += nextNode.text;

      const hasFragmentedPlaceholder = placeholders.some((placeholder) => (
        combinedText.includes(placeholder)
        && !currentNode.text?.includes(placeholder)
      ));

      if (!hasFragmentedPlaceholder) {
        continue;
      }

      collapsedNodes.push({
        type: 'text',
        text: combinedText,
      });
      nodeIndex = nextNodeIndex;
      didCollapse = true;
      break;
    }

    if (!didCollapse) {
      collapsedNodes.push(currentNode);
    }
  }

  return collapsedNodes;
}
