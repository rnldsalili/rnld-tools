import {
  NOTIFICATION_PLACEHOLDER_KEYS,
  NotificationChannel,
  NotificationContentFormat,
} from '@workspace/constants';
import { buildNotificationSampleContext, getNotificationPlaceholderValues } from './placeholders';
import type { NotificationEvent } from '@workspace/constants';
import type { NotificationTemplateSampleContext } from './placeholders';
import type { TipTapNode } from '@workspace/document-renderer';

const defaultEmailContent: Record<string, unknown> = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
};

export function getDefaultNotificationTemplateContent(channel: NotificationChannel) {
  if (channel === NotificationChannel.EMAIL) {
    return defaultEmailContent;
  }

  return '';
}

export function parseNotificationTemplateContent(
  contentFormat: NotificationContentFormat,
  rawContent: string,
): Record<string, unknown> | string {
  if (contentFormat === NotificationContentFormat.PLAIN_TEXT) {
    return rawContent;
  }

  try {
    const parsedContent = JSON.parse(rawContent);
    if (isPlainRecord(parsedContent)) {
      return parsedContent;
    }
  } catch {}

  return defaultEmailContent;
}

export function serializeNotificationTemplateContent(
  channel: NotificationChannel,
  content: unknown,
): {
  content: string;
  contentFormat: NotificationContentFormat;
} {
  if (channel === NotificationChannel.EMAIL) {
    return {
      content: JSON.stringify(assertRichTextContent(content)),
      contentFormat: NotificationContentFormat.RICH_TEXT_JSON,
    };
  }

  return {
    content: String(content ?? ''),
    contentFormat: NotificationContentFormat.PLAIN_TEXT,
  };
}

export function renderEmailTemplate(params: {
  event: NotificationEvent;
  subject: string;
  content: unknown;
  context?: NotificationTemplateSampleContext;
}) {
  const placeholderValues = getNotificationPlaceholderValues(
    params.context ?? buildNotificationSampleContext(params.event),
  );
  const normalizedContent = normalizeTipTapLineBreaks(assertRichTextContent(params.content));
  const collapsedContent = collapseFragmentedPlaceholders(normalizedContent, NOTIFICATION_PLACEHOLDER_KEYS);

  let html = collapsedContent ? serializeTipTapNode(collapsedContent) : '';
  for (const [placeholder, value] of Object.entries(placeholderValues)) {
    html = html.replaceAll(placeholder, escapeHtml(value));
  }

  let subject = params.subject;
  for (const [placeholder, value] of Object.entries(placeholderValues)) {
    subject = subject.replaceAll(placeholder, value);
  }

  return { subject, html };
}

export function getNotificationContentFormat(value: string): NotificationContentFormat {
  return value === NotificationContentFormat.PLAIN_TEXT
    ? NotificationContentFormat.PLAIN_TEXT
    : NotificationContentFormat.RICH_TEXT_JSON;
}

export function renderSmsTemplate(params: {
  event: NotificationEvent;
  content: string;
  context?: NotificationTemplateSampleContext;
}) {
  const placeholderValues = getNotificationPlaceholderValues(
    params.context ?? buildNotificationSampleContext(params.event),
  );

  let text = params.content;
  for (const [placeholder, value] of Object.entries(placeholderValues)) {
    text = text.replaceAll(placeholder, value);
  }

  return { text };
}

function assertRichTextContent(content: unknown) {
  if (isPlainRecord(content)) {
    return content;
  }

  return defaultEmailContent;
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function normalizeTipTapLineBreaks(content: Record<string, unknown>): TipTapNode | null {
  return isTipTapNode(content) ? normalizeNode(content) : null;
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

function collapseFragmentedPlaceholders(
  content: TipTapNode | null,
  placeholders: ReadonlyArray<string>,
): TipTapNode | null {
  if (!content) {
    return null;
  }

  return collapseNodePlaceholders(content, placeholders);
}

function collapseNodePlaceholders(node: TipTapNode, placeholders: ReadonlyArray<string>): TipTapNode {
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
  placeholders: ReadonlyArray<string>,
): Array<TipTapNode> {
  const collapsedNodes: Array<TipTapNode> = [];

  for (let nodeIndex = 0; nodeIndex < contentNodes.length; nodeIndex += 1) {
    const currentNode = contentNodes[nodeIndex];

    if (!currentNode.text || !currentNode.text.includes('{{')) {
      collapsedNodes.push(currentNode);
      continue;
    }

    const siblingTextNodes = [currentNode];
    let siblingIndex = nodeIndex + 1;

    while (siblingIndex < contentNodes.length && contentNodes[siblingIndex].text !== undefined) {
      siblingTextNodes.push(contentNodes[siblingIndex]);
      siblingIndex += 1;
    }

    const mergedText = siblingTextNodes.map((node) => node.text ?? '').join('');
    const matchedPlaceholder = placeholders.find((placeholder) => mergedText.includes(placeholder));

    if (!matchedPlaceholder) {
      collapsedNodes.push(currentNode);
      continue;
    }

    const marks = siblingTextNodes[0].marks;
    collapsedNodes.push({
      ...currentNode,
      text: mergedText,
      marks,
      content: undefined,
    });

    nodeIndex = siblingIndex - 1;
  }

  return collapsedNodes;
}

function serializeTipTapNode(node: TipTapNode): string {
  switch (node.type) {
    case 'doc':
      return (node.content ?? []).map(serializeTipTapNode).join('');
    case 'paragraph':
      return `<p${serializeTextAlign(node.attrs)}>${serializeInlineChildren(node.content) || ''}</p>`;
    case 'heading': {
      const headingLevel = clampHeadingLevel(node.attrs?.level);
      return `<h${headingLevel}${serializeTextAlign(node.attrs)}>${serializeInlineChildren(node.content)}</h${headingLevel}>`;
    }
    case 'bulletList':
      return `<ul>${(node.content ?? []).map(serializeTipTapNode).join('')}</ul>`;
    case 'orderedList':
      return `<ol>${(node.content ?? []).map(serializeTipTapNode).join('')}</ol>`;
    case 'listItem':
      return `<li>${(node.content ?? []).map(serializeTipTapNode).join('')}</li>`;
    case 'text':
      return serializeTextNode(node);
    case 'hardBreak':
      return '<br />';
    default:
      return (node.content ?? []).map(serializeTipTapNode).join('');
  }
}

function serializeInlineChildren(content: Array<TipTapNode> | undefined) {
  return (content ?? []).map(serializeTipTapNode).join('');
}

function serializeTextNode(node: TipTapNode) {
  let html = escapeHtml(node.text ?? '');

  for (const mark of node.marks ?? []) {
    if (mark.type === 'bold') {
      html = `<strong>${html}</strong>`;
      continue;
    }

    if (mark.type === 'italic') {
      html = `<em>${html}</em>`;
      continue;
    }

    if (mark.type === 'underline') {
      html = `<u>${html}</u>`;
    }
  }

  return html;
}

function serializeTextAlign(attrs: Record<string, unknown> | undefined) {
  const textAlign = attrs?.textAlign;
  if (textAlign === 'center' || textAlign === 'right' || textAlign === 'left' || textAlign === 'justify') {
    return ` style="text-align: ${textAlign}"`;
  }

  return '';
}

function clampHeadingLevel(level: unknown) {
  if (typeof level === 'number' && level >= 1 && level <= 6) {
    return level;
  }

  return 2;
}

function isTipTapNode(value: unknown): value is TipTapNode {
  if (!isPlainRecord(value) || typeof value.type !== 'string') {
    return false;
  }

  if (value.text !== undefined && typeof value.text !== 'string') {
    return false;
  }

  if (value.content !== undefined) {
    if (!Array.isArray(value.content) || value.content.some((item) => !isTipTapNode(item))) {
      return false;
    }
  }

  if (value.marks !== undefined) {
    if (
      !Array.isArray(value.marks)
      || value.marks.some((mark) => !isPlainRecord(mark) || typeof mark.type !== 'string')
    ) {
      return false;
    }
  }

  return value.attrs === undefined || isPlainRecord(value.attrs);
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
