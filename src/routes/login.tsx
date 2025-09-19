import { createFileRoute, Link, redirect } from "@tanstack/react-router"
import { Logo } from "@/components/Logo"
import { authClient } from "@/lib/auth-client"
import { useState } from "react"

export const Route = createFileRoute(`/login`)({
  ssr: false,
  beforeLoad: async () => {
    const res = await authClient.getSession()
    if (res.data?.session) {
      throw redirect({ to: "/app" })
    }
  },
  head: () => ({
    meta: [
      { title: "Monozeit — Sign in" },
      { name: "description", content: "Put pen to paper" },
      { property: "og:title", content: "Monozeit" },
      { property: "og:description", content: "Put pen to paper" },
      { property: "og:image", content: "/logo512.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Monozeit" },
      { name: "twitter:description", content: "Put pen to paper" },
      { name: "twitter:image", content: "/logo512.png" },
    ],
  }),
  component: LoginPage,
})

function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      let { error } = await authClient.signUp.email(
        {
          email,
          password,
          name: email,
        },
        {
          onSuccess: () => {
            window.location.href = "/"
          },
        }
      )

      if (error?.code === `USER_ALREADY_EXISTS`) {
        const result = await authClient.signIn.email(
          {
            email,
            password,
          },
          {
            onSuccess: async () => {
              await authClient.getSession()
              window.location.href = "/"
            },
          }
        )

        error = result.error
      }

      if (error) {
        console.log(`error logging in`, error)
        setError(JSON.stringify(error, null, 4))
      }
    } catch (_) {
      setError("An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground cyber-font">
      {/* Header */}
      <header className="relative z-10">
        <div className="max-w-7xl mx-auto px-8 py-8 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-foreground">
            <Logo size={24} className="text-foreground" aria-label="Monozeit" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 cyber-border rounded-full flex items-center justify-center">
              <span className="text-xs">®</span>
            </div>
            <span className="text-xs tracking-wider opacity-70">
              A CALMER PLACE TO THINK, WORK AND BE
            </span>
          </div>
          <div className="flex items-center gap-6 text-xs">
            <span className="opacity-70">NORTH BEACH, SF</span>
            <nav className="flex items-center gap-4">
              <Link
                to="/"
                className="text-foreground/70 hover:text-foreground transition-colors"
              >
                Home
              </Link>
              <Link
                to="/app"
                className="cyber-border px-3 py-1 hover:bg-foreground hover:text-background transition-all duration-200"
              >
                Open the app
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative">
        <div className="max-w-7xl mx-auto px-8 py-16">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            {/* Left Side */}
            <div className="relative">
              {/* Dotted Pattern */}
              <div className="absolute -left-8 top-0 w-8 h-full dotted-pattern opacity-30"></div>

              <div className="mb-8">
                <div className="text-sm mb-6 tracking-wider opacity-70">
                  THE WAY WE WORK
                </div>

                {/* Main Heading */}
                <div className="relative">
                  <div className="flex items-baseline gap-8 mb-6">
                    <h1 className="text-6xl lg:text-7xl font-bold leading-tight">
                      Sign in
                      <br />
                    </h1>
                    <div
                      className="text-sm tracking-wider opacity-50"
                      style={{
                        writingMode: "vertical-rl",
                        textOrientation: "mixed",
                      }}
                    >
                      S<br />F
                    </div>
                  </div>

                  {/* Circular Element */}
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-16 h-16 cyber-border rounded-full flex items-center justify-center relative">
                      <div className="w-8 h-8 cyber-border rounded-full"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-12 h-12 border border-foreground/20 rounded-full"></div>
                      </div>
                    </div>
                    <div className="flex-1 h-px bg-foreground opacity-30"></div>
                    <div className="text-2xl opacity-70">→</div>
                  </div>
                </div>

                {/* Operations Menu */}
                <div className="space-y-3">
                  <div className="text-sm tracking-wider opacity-80">
                    REDEFINE
                  </div>
                  <div className="text-sm tracking-wider opacity-80">
                    OPERATIONS
                  </div>
                  <div className="text-xs opacity-50 mb-4">{">".repeat(6)}</div>

                  <div className="space-y-2 text-sm opacity-80">
                    <div>OPTIMIZE</div>
                    <div>ADAPT</div>
                    <div>EVOLVE</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side */}
            <div className="relative">
              <div className="mb-8">
                <h2 className="text-4xl lg:text-5xl font-bold mb-6 leading-tight">
                  Access
                  <br />
                  YOUR ACCOUNT
                </h2>
                <div className="text-lg font-bold tracking-wider opacity-90">
                  MONOZEIT
                </div>
              </div>

              <div className="max-w-md">
                <div className="mb-4 cyber-border px-3 py-2">
                  <p className="text-xs opacity-80">
                    <strong>Note:</strong> I like you.
                  </p>
                </div>
                <form className="space-y-4" onSubmit={handleSubmit}>
                  <div className="space-y-3">
                    <div>
                      <label
                        htmlFor="email"
                        className="block text-xs mb-1 opacity-70"
                      >
                        Email address
                      </label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="block w-full px-3 py-2 cyber-border bg-background placeholder-foreground/50 text-foreground focus:outline-none"
                        placeholder="you@example.com"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="password"
                        className="block text-xs mb-1 opacity-70"
                      >
                        Password
                      </label>
                      <input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="block w-full px-3 py-2 cyber-border bg-background placeholder-foreground/50 text-foreground focus:outline-none"
                        placeholder="Your password"
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="cyber-border p-3">
                      <div className="text-xs text-destructive">{error}</div>
                    </div>
                  )}

                  <div>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full cyber-border px-3 py-2 hover:bg-foreground hover:text-background transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? "Signing in..." : "Sign in"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
