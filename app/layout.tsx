import type { Metadata } from "next";
import "./globals.css";
import { ClientProviders } from "@/components/providers";

export const metadata: Metadata = {
  title: "Sociality — Share moments, discover stories",
  description: "A place to share moments and connect with friends.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><ClientProviders>{children}</ClientProviders></body></html>;
}
