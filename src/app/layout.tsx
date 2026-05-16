import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jarvis — AI Assistant",
  description: "OpenJarvis-powered real-time AI on Groq",
  themeColor: "#0a0a0b",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <ClerkProvider>
        <body style={{ height: "100vh", overflow: "hidden" }}>
          {children}
        </body>
      </ClerkProvider>
    </html>
  );
}
