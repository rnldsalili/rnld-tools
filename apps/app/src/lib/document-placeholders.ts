export interface LoanDocumentPlaceholderDefinition {
  key: string;
  label: string;
  isBlock: boolean;
}

export const LOAN_DOCUMENT_SIGNATURE_PLACEHOLDER = '{{loan.signature}}';
export const LOAN_DOCUMENT_INSTALLMENTS_PLACEHOLDER = '{{loan.installments}}';

export const LOAN_DOCUMENT_PLACEHOLDERS: Array<LoanDocumentPlaceholderDefinition> = [
  { key: '{{currentDate}}', label: 'Current Date', isBlock: false },
  { key: '{{loan.borrower}}', label: 'Borrower Name', isBlock: false },
  { key: '{{loan.email}}', label: 'Borrower Email', isBlock: false },
  { key: '{{loan.phone}}', label: 'Borrower Phone', isBlock: false },
  { key: '{{loan.amount}}', label: 'Loan Amount', isBlock: false },
  { key: '{{loan.currency}}', label: 'Currency', isBlock: false },
  { key: '{{loan.interestRate}}', label: 'Interest Rate', isBlock: false },
  { key: '{{loan.description}}', label: 'Loan Description', isBlock: false },
  { key: '{{loan.loanDate}}', label: 'Loan Date', isBlock: false },
  { key: '{{loan.installmentCount}}', label: 'Total Installments', isBlock: false },
  { key: '{{loan.installmentInterval}}', label: 'Installment Interval', isBlock: false },
  { key: LOAN_DOCUMENT_INSTALLMENTS_PLACEHOLDER, label: 'Installments Table', isBlock: true },
  { key: LOAN_DOCUMENT_SIGNATURE_PLACEHOLDER, label: 'Borrower Signature', isBlock: true },
];

export const LOAN_DOCUMENT_PLACEHOLDER_KEYS = LOAN_DOCUMENT_PLACEHOLDERS.map(
  (placeholder) => placeholder.key,
);
