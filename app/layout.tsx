import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TRPCReactProvider } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: { default: "SWE Resume — Resume & cover letter builder", template: "%s · SWE Resume" },
  description: "Write a polished resume and matching cover letter in minutes. Live preview, real pages, one-click PDF.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={cn("h-full antialiased", inter.variable, geistMono.variable)}>
      <body className="flex min-h-full flex-col font-sans">
        <TRPCReactProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </TRPCReactProvider>
        <Toaster position="bottom-center" />
      </body>
    </html>
  );
}
