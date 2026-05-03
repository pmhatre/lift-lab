import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Lift Lab",
  description: "Personal fitness tracking and analytics",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-gray-950 text-gray-100 min-h-screen`}>
        <nav className="border-b border-gray-800 px-6 py-3 flex items-center gap-6">
          <Link href="/" className="text-xl font-bold text-white flex items-center gap-2">
            🏋️ Lift Lab
          </Link>
          <div className="flex gap-4 text-sm">
            <Link href="/" className="text-gray-400 hover:text-white transition-colors">
              Dashboard
            </Link>
            <Link href="/session/new" className="text-gray-400 hover:text-white transition-colors">
              Log Session
            </Link>
            <Link href="/analytics/volume" className="text-gray-400 hover:text-white transition-colors">
              Volume
            </Link>
            <Link href="/analytics/frequency" className="text-gray-400 hover:text-white transition-colors">
              Frequency
            </Link>
            <Link href="/analytics/body-comp" className="text-gray-400 hover:text-white transition-colors">
              Body Comp
            </Link>
            <Link href="/import" className="text-gray-400 hover:text-white transition-colors">
              Import
            </Link>
          </div>
        </nav>
        <main className="px-6 py-6 max-w-7xl mx-auto">
          {children}
        </main>
      </body>
    </html>
  );
}
