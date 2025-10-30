import type { Metadata } from "next";
import { Press_Start_2P } from "next/font/google";
import "./globals.css";
import "@solana/wallet-adapter-react-ui/styles.css";
import { Header } from "@/components/Header";
import Footer from "@/components/Footer";
import GlobalProviders  from "@/components/GlobalProviders";

const pixelFont = Press_Start_2P({ 
  weight: "400",
  subsets: ["latin"],
  variable: "--font-pixel"
});

export const metadata: Metadata = {
  title: "Dealifi - User-Owned Discounts",
  description: "A decentralized deal discovery platform powered by Solana.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${pixelFont.className} antialiased`}>
        <GlobalProviders>
          <Header />
          <main className="min-h-screen container mx-auto px-4 py-12 pt-32 relative z-10">
            {children}
          </main>
          <Footer />
        </GlobalProviders>
      </body>
    </html>
  );
}
