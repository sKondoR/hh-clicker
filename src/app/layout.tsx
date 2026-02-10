import './globals.css';

export const metadata = {
  title: 'HH Clicker',
  description: 'HH Clicker - Автоматическое повышение активности на HeadHunter',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">{children}</div>
      </body>
    </html>
  )
}
