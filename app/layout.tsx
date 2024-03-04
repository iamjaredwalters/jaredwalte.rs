import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Fathom from "./fathom";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Jared Walters",
  description: "Software Engineer | Champion of the Sun",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Fathom />
        {children}
      </body>
    </html>
  );
}
