import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Toaster } from "@/components/ui/sonner";
import { AuthSessionProvider } from "@/components/providers/session-provider";
import { UserMenu } from "@/components/layout/user-menu";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "NSGP Builder",
  description: "Nonprofit Security Grant Program Application Builder",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex">
        <AuthSessionProvider>
          <div className="hidden md:flex md:flex-shrink-0">
            <Sidebar />
          </div>
          <div className="flex-1 flex flex-col bg-background overflow-auto min-w-0">
            <header className="h-12 border-b border-border bg-card flex items-center justify-between px-4 shrink-0 sticky top-0 z-30">
              <MobileNav />
              <UserMenu />
            </header>
            <main className="flex-1">
              {children}
            </main>
          </div>
          <Toaster />
        </AuthSessionProvider>
      </body>
    </html>
  );
}
