export interface NotificationEmailTheme {
  backgroundColor: string;
  surfaceColor: string;
  mutedSurfaceColor: string;
  borderColor: string;
  textColor: string;
  mutedTextColor: string;
  primaryColor: string;
  primaryForegroundColor: string;
  fontFamily: string;
  contentWidth: string;
}

// Mirrors the shared app brand direction using email-safe static values.
export const notificationEmailTheme: NotificationEmailTheme = {
  backgroundColor: '#f6f8f4',
  surfaceColor: '#ffffff',
  mutedSurfaceColor: '#edf2ea',
  borderColor: '#dce5d9',
  textColor: '#1d261a',
  mutedTextColor: '#637060',
  primaryColor: '#4f8f52',
  primaryForegroundColor: '#f8fff6',
  fontFamily: '"Noto Sans", "Helvetica Neue", Helvetica, Arial, sans-serif',
  contentWidth: '640px',
};
