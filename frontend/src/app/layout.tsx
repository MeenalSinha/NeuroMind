import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

export const metadata: Metadata = {
  title: "NeuroMind | Enterprise Brain for Ops",
  description: "Autonomous Enterprise Brain for Agentic Operations, built on Splunk.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-background text-heading antialiased" suppressHydrationWarning>
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <Topbar />
            <main className="flex-1 px-4 sm:px-6 py-6">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
