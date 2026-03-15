import { Document, Font, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import { INSTALLMENT_INTERVAL_LABELS } from '@workspace/constants';
import type { LoanDetail } from '@/app/hooks/use-loan';
import type { TipTapNode } from '@/app/lib/document-content';
import {
  LOAN_DOCUMENT_INSTALLMENTS_PLACEHOLDER,
  LOAN_DOCUMENT_PLACEHOLDER_KEYS,
  LOAN_DOCUMENT_SIGNATURE_PLACEHOLDER,
} from '@/app/lib/document-placeholders';
import { collapseFragmentedPlaceholders, normalizeTipTapLineBreaks } from '@/app/lib/document-content';

const MISSING_PLACEHOLDER_VALUE = '-';

Font.register({
  family: 'sans-serif',
  src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2',
});

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 11,
    paddingTop: 40,
    paddingBottom: 60,
    paddingLeft: 50,
    paddingRight: 50,
    lineHeight: 1.6,
    color: '#111827',
  },
  title: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginBottom: 24,
    color: '#111827',
  },
  h1: { fontSize: 16, fontFamily: 'Helvetica-Bold', marginBottom: 8, marginTop: 12 },
  h2: { fontSize: 14, fontFamily: 'Helvetica-Bold', marginBottom: 6, marginTop: 10 },
  h3: { fontSize: 12, fontFamily: 'Helvetica-Bold', marginBottom: 4, marginTop: 8 },
  paragraph: { marginBottom: 8, lineHeight: 1.6 },
  bold: { fontFamily: 'Helvetica-Bold' },
  italic: { fontFamily: 'Helvetica-Oblique' },
  boldItalic: { fontFamily: 'Helvetica-BoldOblique' },
  underline: { textDecoration: 'underline' },
  listItem: { marginBottom: 4, paddingLeft: 12 },
  tableContainer: { marginBottom: 12, marginTop: 8 },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    padding: 6,
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 6,
    fontSize: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tableCell: { flex: 1 },
  signatureSection: {},
  signatureFooterSection: {},
  signatureLabel: { fontSize: 10, color: '#6b7280', marginBottom: 4 },
  signatureLine: { width: 200, borderBottomWidth: 1, borderBottomColor: '#111827', marginBottom: 4 },
});

function renderText(node: TipTapNode): string {
  if (node.text) return node.text;
  if (node.content) return node.content.map(renderText).join('');
  return '';
}

function renderNode(
  node: TipTapNode,
  key: string | number,
  loan: LoanDetail,
  signatureProps: SignatureBlockProps,
): React.ReactElement | null {
  switch (node.type) {
    case 'paragraph': {
      if (isInstallmentsPlaceholderParagraph(node)) {
        return (
          <InstallmentsTable
              key={key}
              installments={loan.installments}
              currency={loan.currency}
          />
        );
      }

      if (isSignaturePlaceholderParagraph(node)) {
        return (
          <SignatureBlock
              key={key}
              loan={loan}
              signatureUrl={signatureProps.signatureUrl}
              signedAt={signatureProps.signedAt}
          />
        );
      }

      const textAlign = (node.attrs?.textAlign as string | undefined) ?? 'left';
      const inlineChildren = node.content?.map((child, i) => renderInlineNode(child, i)) ?? [];
      return (
        <Text key={key} style={[styles.paragraph, { textAlign: textAlign as 'left' | 'center' | 'right' }]}>
          {inlineChildren.length > 0 ? inlineChildren : '\u00A0'}
        </Text>
      );
    }
    case 'heading': {
      const level = node.attrs?.level as number;
      const headingStyle = level === 1 ? styles.h1 : level === 2 ? styles.h2 : styles.h3;
      return (
        <Text key={key} style={headingStyle}>
          {node.content?.map(renderText).join('') ?? ''}
        </Text>
      );
    }
    case 'bulletList':
      return (
        <View key={key}>
          {node.content?.map((item, i) => {
            const blockPlaceholder = renderBlockPlaceholderFromListItem(item, i, loan, signatureProps);

            if (blockPlaceholder) {
              return blockPlaceholder;
            }

            return (
              <Text key={i} style={styles.listItem}>
                {'• '}{item.content?.flatMap((p) => p.content?.map(renderText) ?? []).join('') ?? ''}
              </Text>
            );
          })}
        </View>
      );
    case 'orderedList':
      return (
        <View key={key}>
          {node.content?.map((item, i) => {
            const blockPlaceholder = renderBlockPlaceholderFromListItem(item, i, loan, signatureProps);

            if (blockPlaceholder) {
              return blockPlaceholder;
            }

            return (
              <Text key={i} style={styles.listItem}>
                {`${i + 1}. `}{item.content?.flatMap((p) => p.content?.map(renderText) ?? []).join('') ?? ''}
              </Text>
            );
          })}
        </View>
      );
    case 'hardBreak':
      return <Text key={key}>{'\n'}</Text>;
    default:
      return null;
  }
}

function renderInlineNode(node: TipTapNode, key: string | number): React.ReactElement {
  const hasMark = (type: string) => node.marks?.some((m) => m.type === type);
  const isBold = hasMark('bold');
  const isItalic = hasMark('italic');
  const isUnderline = hasMark('underline');

  let inlineStyle = {};
  if (isBold && isItalic) inlineStyle = styles.boldItalic;
  else if (isBold) inlineStyle = styles.bold;
  else if (isItalic) inlineStyle = styles.italic;
  if (isUnderline) inlineStyle = { ...inlineStyle, ...styles.underline };

  return (
    <Text key={key} style={inlineStyle}>
      {node.text ?? ''}
    </Text>
  );
}

interface SignatureBlockProps {
  signatureUrl: string | null;
  signedAt: string | null;
}

function renderTipTapContentWithSignature(
  content: TipTapNode | null,
  loan: LoanDetail,
  signatureProps: SignatureBlockProps,
): Array<React.ReactElement> {
  if (!content?.content) return [];
  return content.content
    .map((node, i) => renderNode(node, i, loan, signatureProps))
    .filter((el): el is React.ReactElement => el !== null);
}

function InstallmentsTable({ installments, currency }: { installments: LoanDetail['installments']; currency: string }) {
  if (installments.length === 0) {
    return <Text style={styles.paragraph}>{MISSING_PLACEHOLDER_VALUE}</Text>;
  }

  return (
    <View style={styles.tableContainer}>
      <View style={styles.tableHeader}>
        <Text style={[styles.tableCell, { flex: 0.4 }]}>#</Text>
        <Text style={styles.tableCell}>Due Date</Text>
        <Text style={styles.tableCell}>Amount ({currency})</Text>
      </View>
      {installments.map((installment, index) => (
        <View key={installment.id} style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 0.4 }]}>{index + 1}</Text>
          <Text style={styles.tableCell}>
            {new Date(installment.dueDate).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </Text>
          <Text style={styles.tableCell}>{installment.amount.toLocaleString()} {currency}</Text>
        </View>
      ))}
    </View>
  );
}

function isInstallmentsPlaceholderParagraph(node: TipTapNode): boolean {
  if (node.type !== 'paragraph' || !node.content || node.content.length !== 1) {
    return false;
  }

  return node.content[0].type === 'text'
    && node.content[0].text?.trim() === LOAN_DOCUMENT_INSTALLMENTS_PLACEHOLDER;
}

function isSignaturePlaceholderParagraph(node: TipTapNode): boolean {
  if (node.type !== 'paragraph' || !node.content || node.content.length !== 1) {
    return false;
  }

  return node.content[0].type === 'text'
    && node.content[0].text?.trim() === LOAN_DOCUMENT_SIGNATURE_PLACEHOLDER;
}

function renderBlockPlaceholderFromListItem(
  node: TipTapNode,
  key: string | number,
  loan: LoanDetail,
  signatureProps: SignatureBlockProps,
): React.ReactElement | null {
  const placeholderParagraph = node.content?.find(
    (item) => isInstallmentsPlaceholderParagraph(item) || isSignaturePlaceholderParagraph(item),
  );

  if (!placeholderParagraph) {
    return null;
  }

  if (isInstallmentsPlaceholderParagraph(placeholderParagraph)) {
    return (
      <InstallmentsTable
          key={`installments-table-${key}`}
          installments={loan.installments}
          currency={loan.currency}
      />
    );
  }

  return (
    <SignatureBlock
        key={`signature-block-${key}`}
        loan={loan}
        signatureUrl={signatureProps.signatureUrl}
        signedAt={signatureProps.signedAt}
    />
  );
}

function hasSignaturePlaceholder(content: TipTapNode | null): boolean {
  if (!content) {
    return false;
  }

  if (isSignaturePlaceholderParagraph(content)) {
    return true;
  }

  return content.content?.some(hasSignaturePlaceholder) ?? false;
}

function SignatureBlock({
  loan,
  signatureUrl,
  signedAt,
  isFooter = false,
}: {
  loan: LoanDetail;
  signatureUrl: string | null;
  signedAt: string | null;
  isFooter?: boolean;
}) {
  const signatureSectionStyles = isFooter
    ? [styles.signatureSection, styles.signatureFooterSection]
    : [styles.signatureSection];

  return (
    <View style={signatureSectionStyles}>
      <Text style={styles.signatureLabel}>Borrower&apos;s Signature</Text>
      {signatureUrl ? (
        <View style={{ marginTop: 8 }}>
          <Image src={signatureUrl} style={{ width: 200, height: 80, objectFit: 'contain' }} />
          <Text style={styles.signatureLabel}>
            Signed: {signedAt ? new Date(signedAt).toLocaleString() : '—'}
          </Text>
        </View>
      ) : (
        <View style={styles.signatureLine} />
      )}
      <Text style={[styles.signatureLabel, { marginTop: 8 }]}>{loan.borrower}</Text>
    </View>
  );
}

function replacePlaceholdersInContent(content: TipTapNode | null, loan: LoanDetail): TipTapNode | null {
  if (!content) return null;

  const replacements: Record<string, string> = {
    '{{loan.borrower}}': loan.borrower,
    '{{loan.email}}': loan.email ?? MISSING_PLACEHOLDER_VALUE,
    '{{loan.phone}}': loan.phone ?? MISSING_PLACEHOLDER_VALUE,
    '{{loan.amount}}': `${loan.amount.toLocaleString()} ${loan.currency}`,
    '{{loan.currency}}': loan.currency,
    '{{loan.interestRate}}': loan.interestRate != null ? `${loan.interestRate}%` : MISSING_PLACEHOLDER_VALUE,
    '{{loan.description}}': loan.description ?? MISSING_PLACEHOLDER_VALUE,
    '{{loan.createdAt}}': new Date(loan.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    '{{loan.installmentCount}}': String(loan.installments.length),
    '{{loan.installmentInterval}}': INSTALLMENT_INTERVAL_LABELS[
      loan.installmentInterval as keyof typeof INSTALLMENT_INTERVAL_LABELS
    ].toLowerCase(),
  };

  function replaceNode(node: TipTapNode): TipTapNode {
    if (node.text) {
      let text = node.text;
      for (const [placeholder, value] of Object.entries(replacements)) {
        text = text.replaceAll(placeholder, value);
      }
      return { ...node, text };
    }
    if (node.content) {
      return { ...node, content: node.content.map(replaceNode) };
    }
    return node;
  }

  return replaceNode(content);
}

interface DocumentPDFDocumentProps {
  loan: LoanDetail;
  title: string;
  content: TipTapNode | null;
  requiresSignature?: boolean;
  signatureUrl?: string | null;
  signedAt?: string | null;
}

export function DocumentPDFDocument({
  loan,
  title,
  content,
  requiresSignature = true,
  signatureUrl,
  signedAt,
}: DocumentPDFDocumentProps) {
  const normalizedContent = normalizeTipTapLineBreaks(content);
  const placeholderNormalizedContent = collapseFragmentedPlaceholders(
    normalizedContent,
    LOAN_DOCUMENT_PLACEHOLDER_KEYS,
  );
  const replacedContent = replacePlaceholdersInContent(placeholderNormalizedContent, loan);
  const processedContent = normalizeTipTapLineBreaks(replacedContent);
  const hasInlineSignaturePlaceholder = hasSignaturePlaceholder(processedContent);
  const finalNodes = renderTipTapContentWithSignature(processedContent, loan, {
    signatureUrl: signatureUrl ?? null,
    signedAt: signedAt ?? null,
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{title}</Text>
        {finalNodes}

        {requiresSignature && !hasInlineSignaturePlaceholder && (
          <SignatureBlock
              loan={loan}
              signatureUrl={signatureUrl ?? null}
              signedAt={signedAt ?? null}
              isFooter
          />
        )}
      </Page>
    </Document>
  );
}
