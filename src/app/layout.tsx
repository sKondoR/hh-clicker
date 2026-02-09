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
      <body>{children}</body>
    </html>
  )
}
