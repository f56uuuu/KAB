import './globals.css';

export const metadata = {
  title: 'KAP — Super Admin',
  description: 'External Super Admin dashboard for KAP',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
