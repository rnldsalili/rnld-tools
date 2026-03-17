import { describe, expect, it } from 'vitest';
import {
  renderLoanDocumentHtml,
  createLoanDocumentPdfHtmlDocument,
} from '@workspace/document-renderer';

const baseRenderInput = {
  loan: {
    amount: 25000,
    address: '123 Main St',
    borrower: 'Jane Doe',
    currency: 'PHP',
    description: 'Short-term loan',
    email: 'jane@example.com',
    installmentInterval: 'MONTHLY',
    installments: [
      {
        amount: 12500,
        dueDate: '2026-03-20T00:00:00.000Z',
      },
    ],
    interestRate: 5,
    loanDate: '2026-03-17T00:00:00.000Z',
    phone: '+63 900 000 0000',
  },
};

describe('renderLoanDocumentHtml', () => {
  it('serializes heading nodes with their expected levels', () => {
    const html = renderLoanDocumentHtml({
      ...baseRenderInput,
      content: {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: 'Primary heading' }],
          },
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'Secondary heading' }],
          },
          {
            type: 'heading',
            attrs: { level: 3 },
            content: [{ type: 'text', text: 'Tertiary heading' }],
          },
        ],
      },
    });

    expect(html).toContain('<h1>Primary heading</h1>');
    expect(html).toContain('<h2>Secondary heading</h2>');
    expect(html).toContain('<h3>Tertiary heading</h3>');
  });

  it('serializes bullet and ordered lists with list items', () => {
    const html = renderLoanDocumentHtml({
      ...baseRenderInput,
      content: {
        type: 'doc',
        content: [
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'Bullet item' }],
                  },
                ],
              },
            ],
          },
          {
            type: 'orderedList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'Ordered item' }],
                  },
                ],
              },
            ],
          },
        ],
      },
    });

    expect(html).toContain('<ul><li><p>Bullet item</p></li></ul>');
    expect(html).toContain('<ol><li><p>Ordered item</p></li></ol>');
  });

  it('does not prepend a document title to the PDF HTML wrapper', () => {
    const html = createLoanDocumentPdfHtmlDocument('<h1>Manual title</h1><p>Body</p>');

    expect(html).toContain('<main><h1>Manual title</h1><p>Body</p></main>');
    expect(html).not.toContain('<main><h1>Document');
  });
});
