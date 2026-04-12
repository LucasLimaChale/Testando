import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata = {
  title: 'VideoFlow — Aprovação de Vídeos',
  description: 'Sistema profissional de aprovação de vídeos',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className={`${inter.className} bg-slate-50 min-h-screen`}>{children}</body>
    </html>
  );
}
