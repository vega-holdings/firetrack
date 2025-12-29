"use client";

import { useEffect } from "react";
import { SessionProvider } from "next-auth/react";
import { useDarkMode } from "@/lib/store/index";

export function Providers({ children }: { children: React.ReactNode }) {
  const { darkMode } = useDarkMode();

  // Update theme class on document when darkMode changes
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  return (
    <SessionProvider>
      <div className={darkMode ? "dark" : ""}>
        {children}
      </div>
    </SessionProvider>
  );
}
