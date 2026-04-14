import './globals.css';

export const metadata = {
  title: 'LIMAS CRM',
  description: 'LIMAS CRM — Gestão de vídeos e clientes',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body className="bg-slate-50 min-h-screen">{children}</body>
    </html>
  );
}
