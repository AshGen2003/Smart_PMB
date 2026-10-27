import type { Metadata } from "next";
import "@fontsource-variable/plus-jakarta-sans";
import "./globals.css";
import { ThemeProvider } from "./components/ThemeProvider";
import { LanguageProvider } from "./components/LanguageProvider";
import TabActivityIndicator from "./components/TabActivityIndicator";
import AutoRefresh from "./components/AutoRefresh";

export const metadata: Metadata = {
  title: "Smart PMB",
  description: "Smart PMB - paddy purchasing, warehouse and farmer platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <LanguageProvider>
          <ThemeProvider>
            <TabActivityIndicator />
            <AutoRefresh />
            {children}
          </ThemeProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
