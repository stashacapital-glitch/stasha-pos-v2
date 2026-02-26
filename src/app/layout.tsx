 import type { Metadata } from "next";
import { Inter } from "next/font/google"; // 1. Import font
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "react-hot-toast";

// 2. Initialize font with subset optimization
const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap', // Prevents layout shift
});

export const metadata: Metadata = {
  title: "Stasha POS",
  description: "Bar Point of Sale System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* 3. Apply font class to body */}
      <body className={`${inter.className} antialiased`}>
        <Toaster 
            position="top-right"
            toastOptions={{
                style: {
                    background: '#333',
                    color: '#fff',
                },
            }}
        />
        <AuthProvider>
            {children}
        </AuthProvider>
      </body>
    </html>
  );
}