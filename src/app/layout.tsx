import "@/styles/globals.css";
import Link from "next/link";
import type { ReactNode } from "react";
import { TRPCReactProvider } from "@/trpc/react";
import { SessionProvider } from "next-auth/react";
import Nav from "@/components/Nav";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="flex min-h-screen flex-col bg-gradient-to-br from-indigo-50 to-indigo-100 font-sans text-gray-900 antialiased">
        <SessionProvider>
          <TRPCReactProvider>
            <header className="sticky top-0 z-50 bg-white/90 shadow-sm backdrop-blur-sm">
              <nav className="container mx-auto flex items-center justify-between px-6 py-4">
                <Link href="/" className="text-2xl font-semibold text-gray-800">
                  DrugStock
                </Link>
                <Nav />
              </nav>
            </header>
            <main className="container mx-auto flex-1 px-4 py-6 md:px-6 md:py-8">
              {children}
            </main>
            <footer className="border-t bg-white">
              <div className="container mx-auto px-4 py-4 text-center text-sm text-gray-500">
                &copy; {new Date().getFullYear()} DrugStock
              </div>
            </footer>
          </TRPCReactProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
