/** @jsxImportSource hono/jsx */

import type { Child } from 'hono/jsx';
import type { NotificationEmailTheme } from './theme';

interface EmailShellProps {
  previewText?: string;
  subject: string;
  theme: NotificationEmailTheme;
  children: Child;
}

interface EmailSectionProps {
  theme: NotificationEmailTheme;
  children: Child;
}

interface EmailBodyProps {
  bodyHtml: string;
  theme: NotificationEmailTheme;
}

export function EmailShell({
  previewText,
  subject,
  theme,
  children,
}: EmailShellProps) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta content="width=device-width, initial-scale=1.0" name="viewport" />
        <meta content="light only" name="color-scheme" />
        <meta content="light" name="supported-color-schemes" />
        <title>{subject || 'RTools Notification'}</title>
      </head>
      <body
        style={`margin:0;padding:0;background-color:${theme.backgroundColor};color:${theme.textColor};font-family:${theme.fontFamily};`}
      >
        {previewText ? (
          <div style="display:none;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">
            {previewText}
          </div>
        ) : null}

        <table
          role="presentation"
          cellPadding="0"
          cellSpacing="0"
          width="100%"
          style={`width:100%;border-collapse:collapse;background-color:${theme.backgroundColor};margin:0;padding:0;`}
        >
          <tbody>
            <tr>
              <td align="center" style="padding:32px 16px;">
                <table
                  role="presentation"
                  cellPadding="0"
                  cellSpacing="0"
                  width="100%"
                  style={`width:100%;max-width:${theme.contentWidth};border-collapse:collapse;`}
                >
                  <tbody>
                    <tr>
                      <td style="padding:0;">
                        <EmailHeader theme={theme} />
                      </td>
                    </tr>
                    <tr>
                      <td>{children}</td>
                    </tr>
                    <tr>
                      <td style="padding:0;">
                        <EmailFooter theme={theme} />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  );
}

export function EmailHeader({ theme }: { theme: NotificationEmailTheme }) {
  return (
    <table
      role="presentation"
      cellPadding="0"
      cellSpacing="0"
      width="100%"
      style={`width:100%;border-collapse:collapse;background-color:${theme.primaryColor};`}
    >
      <tbody>
        <tr>
          <td
            style="height:28px;line-height:28px;font-size:0;"
          >
            &nbsp;
          </td>
        </tr>
      </tbody>
    </table>
  );
}

export function EmailSection({ theme, children }: EmailSectionProps) {
  return (
    <table
      role="presentation"
      cellPadding="0"
      cellSpacing="0"
      width="100%"
      style={`width:100%;border-collapse:collapse;background-color:${theme.surfaceColor};border-left:1px solid ${theme.borderColor};border-right:1px solid ${theme.borderColor};`}
    >
      <tbody>
        <tr>
          <td style="padding:28px 24px;">
            {children}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

export function EmailBody({ bodyHtml, theme }: EmailBodyProps) {
  return (
    <div
      style={`font-size:15px;line-height:24px;color:${theme.textColor};word-break:break-word;`}
      dangerouslySetInnerHTML={{ __html: bodyHtml }}
    />
  );
}

export function EmailButton({
  href,
  label,
  theme,
}: {
  href: string;
  label: string;
  theme: NotificationEmailTheme;
}) {
  return (
    <table role="presentation" cellPadding="0" cellSpacing="0" style="border-collapse:separate;">
      <tbody>
        <tr>
          <td
            align="center"
            style={`border-radius:12px;background-color:${theme.primaryColor};`}
          >
            <a
              href={href}
              style={`display:inline-block;padding:12px 18px;font-size:14px;line-height:20px;font-weight:600;color:${theme.primaryForegroundColor};text-decoration:none;`}
            >
              {label}
            </a>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

export function EmailFooter({ theme }: { theme: NotificationEmailTheme }) {
  return (
    <table
      role="presentation"
      cellPadding="0"
      cellSpacing="0"
      width="100%"
      style={`width:100%;border-collapse:collapse;background-color:${theme.mutedSurfaceColor};border:1px solid ${theme.borderColor};border-top:none;`}
    >
      <tbody>
        <tr>
          <td style={`padding:18px 24px;color:${theme.mutedTextColor};font-size:12px;line-height:18px;text-align:center;`}>
            <p style="margin:0;font-style:italic;">
              This is an automated message, do not reply.
            </p>
          </td>
        </tr>
      </tbody>
    </table>
  );
}
