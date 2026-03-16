import { renderLoanDocumentHtmlWithGenerator } from './core';
import type {
  LoanDocumentRenderInput,
  LoanDocumentRenderInstallment,
  LoanDocumentRenderLoan,
  TipTapNode,
} from './core';

export type {
  LoanDocumentRenderInput,
  LoanDocumentRenderInstallment,
  LoanDocumentRenderLoan,
  TipTapNode,
};
export { createLoanDocumentPdfHtmlDocument } from './core';

export function renderLoanDocumentHtml(params: LoanDocumentRenderInput): string {
  return renderLoanDocumentHtmlWithGenerator(params);
}
