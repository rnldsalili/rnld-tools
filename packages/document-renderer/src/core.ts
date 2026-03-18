import {
  INSTALLMENT_INTERVAL_LABELS,
  INSTALLMENT_INTERVAL_VALUES,
} from '@workspace/constants';

export type TipTapNode = {
  type: string;
  text?: string;
  content?: Array<TipTapNode>;
  marks?: Array<{ type: string }>;
  attrs?: Record<string, unknown>;
};

export interface LoanDocumentRenderInstallment {
  amount: number;
  dueDate: string | Date;
}

export interface LoanDocumentRenderLoan {
  amount: number;
  address: string | null;
  borrower: string;
  currency: string;
  description: string | null;
  email: string | null;
  installmentInterval: string;
  installments: Array<LoanDocumentRenderInstallment>;
  interestRate: number | null;
  loanDate: string | Date;
  phone: string | null;
}

export interface LoanDocumentRenderInput {
  content: unknown;
  loan: LoanDocumentRenderLoan;
  signatureDataUrl?: string | null;
  signedAt?: string | Date | null;
}

const MISSING_PLACEHOLDER_VALUE = '-';
const DISPLAY_LOCALE = 'en-US';
const DISPLAY_TIME_ZONE = 'Asia/Manila';
const DISPLAY_TIME_ZONE_LABEL = 'PHT';
const LOAN_DOCUMENT_INSTALLMENTS_PLACEHOLDER = '{{loan.installments}}';
const LOAN_DOCUMENT_SIGNATURE_PLACEHOLDER = '{{loan.signature}}';
const LOAN_DOCUMENT_PLACEHOLDER_KEYS = [
  '{{currentDate}}',
  '{{loan.borrower}}',
  '{{loan.email}}',
  '{{loan.phone}}',
  '{{loan.address}}',
  '{{loan.amount}}',
  '{{loan.currency}}',
  '{{loan.interestRate}}',
  '{{loan.description}}',
  '{{loan.loanDate}}',
  '{{loan.installmentCount}}',
  '{{loan.installmentInterval}}',
  LOAN_DOCUMENT_INSTALLMENTS_PLACEHOLDER,
  LOAN_DOCUMENT_SIGNATURE_PLACEHOLDER,
] as const;

const currencyNumberFormatter = new Intl.NumberFormat(DISPLAY_LOCALE);
const longDateFormatter = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  timeZone: DISPLAY_TIME_ZONE,
});
const shortDateFormatter = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: DISPLAY_TIME_ZONE,
});
const dateTimeFormatter = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: DISPLAY_TIME_ZONE,
});

export function normalizeTipTapLineBreaks(content: unknown): TipTapNode | null {
  if (!isTipTapNode(content)) {
    return null;
  }

  return normalizeNode(content);
}

export function collapseFragmentedPlaceholders(
  content: TipTapNode | null,
  placeholders: ReadonlyArray<string>,
): TipTapNode | null {
  if (!content) {
    return null;
  }

  return collapseNodePlaceholders(content, placeholders);
}

export function renderLoanDocumentHtmlWithGenerator(
  params: LoanDocumentRenderInput,
): string {
  const normalizedContent = normalizeTipTapLineBreaks(params.content);

  if (!normalizedContent) {
    return '';
  }

  const placeholderNormalizedContent = collapseFragmentedPlaceholders(
    normalizedContent,
    LOAN_DOCUMENT_PLACEHOLDER_KEYS,
  );

  if (!placeholderNormalizedContent) {
    return '';
  }

  let html = serializeTipTapNode(placeholderNormalizedContent);

  const placeholderValues = getPlaceholderValues(params.loan);
  for (const [placeholder, value] of Object.entries(placeholderValues)) {
    html = html.replaceAll(placeholder, escapeHtml(value));
  }

  html = replaceInstallmentsPlaceholderMarkup(html, params.loan);

  return replaceSignaturePlaceholderMarkup(html, {
    borrower: params.loan.borrower,
    signatureDataUrl: params.signatureDataUrl ?? null,
    signedAt: params.signedAt ?? null,
  });
}

export function createLoanDocumentPdfHtmlDocument(documentHtml: string): string {
  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    '<style>',
    '  @page { size: A4; margin: 16mm 14mm; }',
    '  * { box-sizing: border-box; }',
    '  body { margin: 0; color: #111827; font-family: "Helvetica Neue", Arial, sans-serif; font-size: 13px; line-height: 1.2; }',
    '  main { width: 100%; }',
    '  h1, h2, h3, h4, h5, h6 { margin: 0 0 8px; line-height: 1.15; }',
    '  h1 { font-size: 24px; }',
    '  h2 { font-size: 20px; }',
    '  h3 { font-size: 17px; }',
    '  main > h1:first-child { margin-bottom: 12px; }',
    '  p { margin: 0 0 4px; white-space: pre-wrap; }',
    '  p:empty { min-height: 1.2em; }',
    '  p:empty::before { content: "\\00a0"; }',
    '  ul, ol { margin: 0 0 6px 22px; padding: 0; }',
    '  li { margin-bottom: 2px; white-space: pre-wrap; }',
    '  table.installments-table { width: 100%; border-collapse: collapse; margin: 8px 0; }',
    '  .installments-table th, .installments-table td { border: 1px solid #d1d5db; padding: 8px 10px; text-align: left; vertical-align: top; }',
    '  .installments-table th { background: #f3f4f6; }',
    '  .signature-label { margin: 0 0 4px; font-size: 11px; color: #6b7280; }',
    '  .signature-line { width: 200px; height: 48px; margin: 0 0 4px; border-bottom: 1px solid #111827; }',
    '  .signature-image { display: block; width: 200px; height: 80px; margin: 0 0 4px; object-fit: contain; }',
    '</style>',
    '</head>',
    '<body>',
    '<main>',
    documentHtml,
    '</main>',
    '</body>',
    '</html>',
  ].join('');
}

function getPlaceholderValues(loan: LoanDocumentRenderLoan): Record<string, string> {
  return {
    '{{currentDate}}': formatDisplayDate(new Date()),
    '{{loan.borrower}}': loan.borrower,
    '{{loan.email}}': loan.email ?? MISSING_PLACEHOLDER_VALUE,
    '{{loan.phone}}': loan.phone ?? MISSING_PLACEHOLDER_VALUE,
    '{{loan.address}}': loan.address ?? MISSING_PLACEHOLDER_VALUE,
    '{{loan.amount}}': `${formatDisplayNumber(loan.amount)} ${loan.currency}`,
    '{{loan.currency}}': loan.currency,
    '{{loan.interestRate}}': loan.interestRate != null ? `${loan.interestRate}%` : MISSING_PLACEHOLDER_VALUE,
    '{{loan.description}}': loan.description ?? MISSING_PLACEHOLDER_VALUE,
    '{{loan.loanDate}}': formatDisplayDate(loan.loanDate),
    '{{loan.installmentCount}}': String(loan.installments.length),
    '{{loan.installmentInterval}}': getInstallmentIntervalLabel(loan.installmentInterval),
  };
}

function getInstallmentIntervalLabel(installmentInterval: string) {
  if (isInstallmentInterval(installmentInterval)) {
    return INSTALLMENT_INTERVAL_LABELS[installmentInterval].toLowerCase();
  }

  return installmentInterval.toLowerCase();
}

function formatDisplayNumber(value: number) {
  return currencyNumberFormatter.format(value);
}

function formatDisplayDate(value: string | Date) {
  return longDateFormatter.format(new Date(value));
}

function formatDisplayShortDate(value: string | Date) {
  return shortDateFormatter.format(new Date(value));
}

function formatDisplayDateTime(value: string | Date) {
  return `${dateTimeFormatter.format(new Date(value))} ${DISPLAY_TIME_ZONE_LABEL}`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function buildInstallmentsMarkup(installments: Array<LoanDocumentRenderInstallment>, currency: string) {
  if (installments.length === 0) {
    return `<p class="text-muted-foreground">${MISSING_PLACEHOLDER_VALUE}</p>`;
  }

  const installmentRowsMarkup = installments
    .map(
      (installment, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(formatDisplayShortDate(installment.dueDate))}</td>
          <td>${escapeHtml(formatDisplayNumber(installment.amount))} ${escapeHtml(currency)}</td>
        </tr>
      `,
    )
    .join('');

  return `
    <table class="installments-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Due Date</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>${installmentRowsMarkup}</tbody>
    </table>
  `;
}

function replaceInstallmentsPlaceholderMarkup(html: string, loan: LoanDocumentRenderLoan) {
  const installmentsMarkup = buildInstallmentsMarkup(loan.installments, loan.currency);

  return html
    .replace(
      /<li>\s*<p(?:\s+[^>]*)?>\s*\{\{loan\.installments\}\}\s*<\/p>\s*<\/li>/g,
      installmentsMarkup,
    )
    .replace(
      new RegExp(`<p(?:\\s+[^>]*)?>\\s*${escapePlaceholderForRegex(LOAN_DOCUMENT_INSTALLMENTS_PLACEHOLDER)}\\s*<\\/p>`, 'g'),
      installmentsMarkup,
    )
    .replaceAll(LOAN_DOCUMENT_INSTALLMENTS_PLACEHOLDER, installmentsMarkup);
}

function buildSignatureMarkup(params: {
  borrower: string;
  signatureDataUrl: string | null;
  signedAt: string | Date | null;
}) {
  const signedAtMarkup = params.signedAt
    ? `<p class="signature-label">Signed: ${escapeHtml(formatDisplayDateTime(params.signedAt))}</p>`
    : '';
  const signatureBodyMarkup = params.signatureDataUrl
    ? `<img src="${params.signatureDataUrl}" alt="Client signature" class="signature-image" />${signedAtMarkup}`
    : '<div class="signature-line"></div>';

  return `
    <div class="signature-block">
      ${signatureBodyMarkup}
      <p class="signature-label">${escapeHtml(params.borrower)}</p>
    </div>
  `;
}

function escapePlaceholderForRegex(placeholder: string) {
  return placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replaceSignaturePlaceholderMarkup(
  html: string,
  params: {
    borrower: string;
    signatureDataUrl: string | null;
    signedAt: string | Date | null;
  },
) {
  const signatureMarkup = buildSignatureMarkup(params);
  const signaturePlaceholderPattern = escapePlaceholderForRegex(LOAN_DOCUMENT_SIGNATURE_PLACEHOLDER);

  return html
    .replace(
      new RegExp(`<li>\\s*<p(?:\\s+[^>]*)?>\\s*${signaturePlaceholderPattern}\\s*<\\/p>\\s*<\\/li>`, 'g'),
      signatureMarkup,
    )
    .replace(
      new RegExp(`<p(?:\\s+[^>]*)?>\\s*${signaturePlaceholderPattern}\\s*<\\/p>`, 'g'),
      signatureMarkup,
    )
    .replaceAll(LOAN_DOCUMENT_SIGNATURE_PLACEHOLDER, signatureMarkup);
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

function isTipTapNode(value: unknown): value is TipTapNode {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  if (!('type' in value) || typeof value.type !== 'string') {
    return false;
  }

  if ('text' in value && value.text !== undefined && typeof value.text !== 'string') {
    return false;
  }

  if ('content' in value && value.content !== undefined) {
    if (!Array.isArray(value.content) || value.content.some((item) => !isTipTapNode(item))) {
      return false;
    }
  }

  if ('marks' in value && value.marks !== undefined) {
    if (
      !Array.isArray(value.marks)
      || value.marks.some((mark) => (
        !mark
        || typeof mark !== 'object'
        || Array.isArray(mark)
        || !('type' in mark)
        || typeof mark.type !== 'string'
      ))
    ) {
      return false;
    }
  }

  return !('attrs' in value) || value.attrs === undefined || isPlainRecord(value.attrs);
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isInstallmentInterval(value: string): value is (typeof INSTALLMENT_INTERVAL_VALUES)[number] {
  return INSTALLMENT_INTERVAL_VALUES.some((candidate) => candidate === value);
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
      continue;
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
