"use client"

import { signOut, useSession } from "next-auth/react"
import Link from "next/link"
import { ThemeToggle } from "./ThemeToggle"

export function Header() {
  const { data: session } = useSession()

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface-header backdrop-blur-md">
      <div className="flex items-center justify-between h-16 px-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-signal-600 flex items-center justify-center">
            <span className="text-xs font-bold text-white">N</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-text-primary leading-tight">NexaCore</span>
            <span className="text-[10px] text-text-muted leading-tight">Cotizaciones</span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          {session?.user && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-text-secondary hidden sm:block">
                {session.user.name}
              </span>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="text-sm text-text-muted hover:text-text-primary transition-colors"
              >
                Salir
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
