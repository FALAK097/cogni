import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";

import { AppProvider } from "@/providers/app-provider";

import "./globals.css";

const THEME_INIT_SCRIPT = `(function(){try{var e=document.documentElement,t=localStorage.getItem("theme");if(!t){var d=localStorage.getItem("dashboard-theme");if(d==="dark"||d==="light"){t=d;localStorage.setItem("theme",d);localStorage.removeItem("dashboard-theme");}}if(t==="dark"||(!t&&window.matchMedia("(prefers-color-scheme: dark)").matches)){e.classList.add("dark");e.style.colorScheme="dark";}else{e.classList.remove("dark");e.style.colorScheme="light";}}catch(t){}})();`;

export const metadata: Metadata = {
  title: {
    default: "widget — AI customer support",
    template: "%s · widget",
  },
  description:
    "AI-first customer support with a shared inbox, grounded answers, and human handoff.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col antialiased" suppressHydrationWarning>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
