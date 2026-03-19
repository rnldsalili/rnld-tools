/** @jsxImportSource hono/jsx */

import { renderToString } from 'hono/jsx/dom/server';
import {
  EmailBody,
  EmailSection,
  EmailShell,
} from './components';
import { notificationEmailTheme } from './theme';

export interface RenderNotificationEmailInput {
  bodyHtml: string;
  subject: string;
}

export interface RenderedNotificationEmail {
  html: string;
  subject: string;
}

export function renderNotificationEmail({
  bodyHtml,
  subject,
}: RenderNotificationEmailInput): RenderedNotificationEmail {
  const theme = notificationEmailTheme;
  const previewText = createPreviewText(subject, bodyHtml);
  const html = renderToString(
    <EmailShell
      previewText={previewText}
      subject={subject}
      theme={theme}
    >
      <EmailSection theme={theme}>
        <EmailBody bodyHtml={bodyHtml} theme={theme} />
      </EmailSection>
    </EmailShell>,
  );

  return {
    subject,
    html: `<!doctype html>${html}`,
  };
}

function createPreviewText(subject: string, bodyHtml: string) {
  const normalizedBody = bodyHtml
    .replaceAll(/<style[\s\S]*?<\/style>/g, ' ')
    .replaceAll(/<[^>]+>/g, ' ')
    .replaceAll(/\s+/g, ' ')
    .trim();

  if (!normalizedBody) {
    return subject;
  }

  if (!subject) {
    return normalizedBody.slice(0, 140);
  }

  const combinedPreview = `${subject} - ${normalizedBody}`;
  return combinedPreview.slice(0, 180);
}
