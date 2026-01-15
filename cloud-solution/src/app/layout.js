import './globals.css';
import { ToastProvider } from '@/components/ToastProvider';

export const metadata = {
  title: 'Inventory Tracker - Multi-Store Management',
  description: 'Track inventory and transfers across multiple retail stores',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
