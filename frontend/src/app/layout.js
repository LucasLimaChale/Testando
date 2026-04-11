import './globals.css';

export const metadata = {
  title: 'Aprovação de Vídeos',
  description: 'Sistema de aprovação de vídeos para clientes',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body className="bg-gray-50 min-h-screen antialiased">{children}</body>
    </html>
  );
}
