import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex">
        <AuthSessionProvider>
          <Sidebar />
          <div className="flex-1 flex flex-col bg-slate-50 overflow-auto">
            <header className="h-12 border-b border-slate-200 bg-white flex items-center justify-end px-4 shrink-0">
              <UserMenu />
            </header>
            <main className="flex-1 overflow-auto">
              {children}
            </main>
          </div>
          <Toaster />
        </AuthSessionProvider>
      </body>
    </html>
  );
}
