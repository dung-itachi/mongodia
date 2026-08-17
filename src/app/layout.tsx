import type { Metadata, Viewport } from "next";
import "./globals.css";
import QueryProvider from "@/providers/QueryProvider";
import ThemeProvider from "@/providers/ThemeProvider";
import AuthProvider from "@/providers/AuthProvider";
import AntdProvider from "@/providers/AntdProvider";
export const metadata: Metadata = {
  title: "LMC-GROUP",
  description: "Marketing & Sales CRM System",
  icons: {
    icon: [
      { url: "/favicon.ico?v=2", type: "image/x-icon" },
      { url: "/favicon.ico?v=2", sizes: "any" },
    ],
  },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#13203a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <QueryProvider>
          <ThemeProvider>
            <AntdProvider>
              <AuthProvider>
                {children}
              </AuthProvider>
            </AntdProvider>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}