"use client"

import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useState } from "react"
import Link from "next/link"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || "/"
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const form = new FormData(e.currentTarget)
    const result = await signIn("credentials", {
      email: form.get("email") as string,
      password: form.get("password") as string,
      redirect: false,
    })

    if (result?.error) {
      setError("Credenciales inválidas")
      setLoading(false)
    } else {
      router.push(callbackUrl)
      router.refresh()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium text-text-secondary">
          Correo electrónico
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder="admin@nexacore.mx"
          className="h-10 px-3 rounded-lg bg-ink-900 border border-line text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-signal-500/40 focus:border-signal-500"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium text-text-secondary">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          placeholder="••••••••"
          className="h-10 px-3 rounded-lg bg-ink-900 border border-line text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-signal-500/40 focus:border-signal-500"
        />
      </div>

      {error && (
        <p className="text-sm text-red text-center">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full h-10 rounded-lg bg-signal-600 text-white font-medium hover:bg-signal-700 active:bg-signal-800 transition-colors disabled:opacity-50"
      >
        {loading ? "Entrando..." : "Entrar"}
      </button>
    </form>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-ink-950 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-signal-600 flex items-center justify-center">
              <span className="text-sm font-bold text-white">N</span>
            </div>
            <span className="text-xl font-bold text-text-primary">NexaCore</span>
          </Link>
          <h1 className="text-2xl font-semibold text-text-primary">Iniciar sesión</h1>
          <p className="text-sm text-text-muted mt-1">Sistema de Cotizaciones</p>
        </div>

        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>

        <p className="text-xs text-text-muted text-center mt-6">
          NexaCore Desarrollo e Integración de Sistemas
        </p>
      </div>
    </div>
  )
}
