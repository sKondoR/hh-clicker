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
      <body className="bg-linear-to-br from-slate-950 via-indigo-950 to-slate-950">
        <Providers>
          <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">{children}</div>
        </Providers>
      </body>
    </html>
  )
}
