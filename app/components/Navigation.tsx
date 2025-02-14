"use client";

import { useDarkMode } from "@/lib/store/index";
import { Moon, Sun, Settings } from "lucide-react";
import Link from "next/link";

export function Navigation() {
  const { darkMode, toggle } = useDarkMode();

  return (
    <nav className="border-b bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between">
          <div className="flex items-center space-x-8">
            <div className="flex flex-shrink-0 items-center">
              <Link href="/" className="text-xl font-bold hover:text-primary">
                Firearms Legislation Tracker
              </Link>
            </div>
            <div className="flex space-x-4">
              <Link
                href="/"
                className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                States
              </Link>
              <Link
                href="/federal"
                className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Federal
              </Link>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {/* Settings */}
            <Link
              href="/settings"
              className="rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Settings"
            >
              <Settings className="h-5 w-5" />
            </Link>

            {/* Dark mode toggle */}
            <button
              onClick={toggle}
              className="rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Toggle dark mode"
            >
              {darkMode ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
