import type { Metadata } from "next";
import { Inter, EB_Garamond } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "react-hot-toast";
import AppBoot from "@/components/loading/AppBoot";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const garamond = EB_Garamond({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-book",
});

export const metadata: Metadata = {
  title: "Neighborhood Library",
  description: "A premium library management experience.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${garamond.variable}`}>
      <body className="font-sans antialiased">
        <AuthProvider>
          <ErrorBoundary>
            <AppBoot>{children}</AppBoot>
          </ErrorBoundary>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: "rgba(14,17,30,0.92)",
                color: "#e6e8f0",
                border: "1px solid rgba(255,255,255,0.1)",
                backdropFilter: "blur(12px)",
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
