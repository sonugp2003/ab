
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { ToasterProvider } from "@/hooks/use-toast";
import { UseCaseProvider } from "@/context/use-case-context";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Roommate Hub",
  description: "Manage your properties and tenants with ease.",
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} safe-area`}>
        <UseCaseProvider>
          <ToasterProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              {children}
              <Toaster />
            </ThemeProvider>
          </ToasterProvider>
        </UseCaseProvider>
      </body>
    </html>
  );
}
