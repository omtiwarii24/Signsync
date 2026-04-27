import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SignSync | Cosmic UI",
  description: "AI-powered sign language translation engine.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-[#050505] text-slate-400 min-h-screen relative selection:bg-purple-500/30 selection:text-white overflow-x-hidden`}>
        {/* Background Animations & Visual Effects */}
        <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden">
          {/* The Glowing Eclipse/Aura */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-gradient-to-b from-purple-900/30 to-transparent blur-[120px] opacity-80 animate-pulse"></div>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-gradient-to-t from-cyan-900/20 to-transparent blur-[150px] opacity-60"></div>
          
          {/* Floating Particles/Grid */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff02_1px,transparent_1px),linear-gradient(to_bottom,#ffffff02_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
        </div>

        {/* The dynamic page content */}
        <main className="relative z-0 min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}