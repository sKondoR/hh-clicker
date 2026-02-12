import './globals.css';
import { Providers } from './providers';

export const metadata = {
  title: 'HH Activity Clicker',
  description: 'HH Activity Clicker - Автоматическое повышение активности на HeadHunter',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">{children}</div>
        </Providers>
      </body>
    </html>
  )
}
