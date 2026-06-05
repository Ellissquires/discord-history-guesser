import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Guess the Author — Discord Bot',
  description:
    'A Discord bot that hides message authors and challenges your server to guess who wrote what.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
