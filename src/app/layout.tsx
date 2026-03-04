 import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "STASHA POS",
  description: "Hotel & Restaurant Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-900`}>
        {/* AuthProvider wraps everything to manage login state */}
        <AuthProvider>
          <Toaster 
            position="top-right"
            toastOptions={{
              className: 'bg-gray-800 text-white',
              duration: 3000,
            }}
          />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}