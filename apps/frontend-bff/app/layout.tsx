import type { Metadata } from "next";
import Script from "next/script";

import "./globals.css";

const THEME_STORAGE_KEY = "codex-webui.theme";
const INITIAL_THEME_SCRIPT = `(() => {
  const storageKey = "${THEME_STORAGE_KEY}";
  const fallbackTheme = "dark";
  let theme = fallbackTheme;

  try {
    const storedTheme = window.localStorage?.getItem?.(storageKey);
    if (storedTheme === "dark" || storedTheme === "light") {
      theme = storedTheme;
    }
  } catch {
    theme = fallbackTheme;
  }

  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
})();`;

export const metadata: Metadata = {
  title: "codex-webui",
  description: "Smartphone-first Codex WebUI shell",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html data-theme="dark" lang="en" style={{ colorScheme: "dark" }} suppressHydrationWarning>
      <head>
        <Script id="theme-bootstrap" strategy="beforeInteractive">
          {INITIAL_THEME_SCRIPT}
        </Script>
      </head>
      <body>{children}</body>
    </html>
  );
}
