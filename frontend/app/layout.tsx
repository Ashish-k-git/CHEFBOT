import type { Metadata } from "next";
// import { Geist, Geist_Mono } from "next/font/google";
import { Inter} from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import { ClerkProvider } from "@clerk/nextjs";
import { neobrutalism } from '@clerk/ui/themes'
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({subsets:["latin"]})

export const metadata: Metadata = {
  title: "ChefBot",
  description: "AI-Powered Recipe Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider appearance={{
      theme: neobrutalism
    }}>
      <html
        lang="en"
        suppressHydrationWarning
      >
        <body className={`${inter.className}`}>
          <Header />
          <Toaster richColors />
          <main className="min-h-screen">
            {children}
          </main>
          <footer className="py-8 px-4 border-t">
            <div className="max-w-6xl mx-auto flex justify-between items-center">
              <p className="text-stone-500 text-sm">
                Made by Ashish
              </p>
            </div>
          </footer>
        </body>
      </html>
    </ClerkProvider>
  );
}
