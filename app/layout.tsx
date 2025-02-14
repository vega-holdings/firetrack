import { Inter } from "next/font/google";
import "./globals.css";
import { headers } from "next/headers";
import { Providers } from "./providers";
import { Navigation } from "./components/Navigation";
import { ChatModal } from "./components/ChatModal";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Firearms Legislation Tracker",
  description: "Track and monitor firearms legislation across jurisdictions",
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen bg-background text-foreground">
            <Navigation />
            <main className="flex min-h-screen flex-col">
              <div className="flex-1 container mx-auto px-4">
                {children}
              </div>
            </main>
            <ChatModal />
          </div>
        </Providers>
      </body>
    </html>
  );
}
