import { createFileRoute, Link, redirect } from "@tanstack/react-router"
import { authClient } from "@/lib/auth-client"

export const Route = createFileRoute(`/`)({
  ssr: false,
  beforeLoad: async () => {
    const res = await authClient.getSession()
    if (res.data?.session) {
      throw redirect({ to: "/app" })
    }
  },
  head: () => ({
    meta: [
      { title: "Stones — Collaborative workspace for projects and files" },
      {
        name: "description",
        content:
          "Organize projects, collaborate in real-time, and edit content with a flexible workbench.",
      },
      { property: "og:title", content: "Stones" },
      {
        property: "og:description",
        content:
          "Organize projects, collaborate in real-time, and edit content with a flexible workbench.",
      },
      { property: "og:image", content: "/logo512.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Stones" },
      {
        name: "twitter:description",
        content:
          "Organize projects, collaborate in real-time, and edit content with a flexible workbench.",
      },
      { name: "twitter:image", content: "/logo512.png" },
    ],
  }),
  component: LandingPage,
})

function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white cyber-font">
      {/* Header */}
      <header className="relative z-10">
        <div className="max-w-7xl mx-auto px-8 py-8 flex items-center justify-between">
          <div className="text-sm opacity-70">2149821-003</div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 cyber-border rounded-full flex items-center justify-center">
              <span className="text-xs">®</span>
            </div>
            <span className="text-xs tracking-wider opacity-70">
              COMPANY PERFORMANCE ENHANCERS
            </span>
          </div>
          <div className="flex items-center gap-6 text-xs">
            <span className="opacity-70">USA</span>
            <nav className="flex items-center gap-4">
              <Link
                to="/login"
                className="text-white/70 hover:text-white transition-colors"
              >
                Log in
              </Link>
              <Link
                to="/app"
                className="cyber-border px-3 py-1 hover:bg-white hover:text-black transition-all duration-200"
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
                      Start from
                      <br />
                      zero
                    </h1>
                    <div
                      className="text-sm tracking-wider opacity-50"
                      style={{
                        writingMode: "vertical-rl",
                        textOrientation: "mixed",
                      }}
                    >
                      N<br />Y<br />C
                    </div>
                  </div>

                  {/* Circular Element */}
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-16 h-16 cyber-border rounded-full flex items-center justify-center relative">
                      <div className="w-8 h-8 cyber-border rounded-full"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-12 h-12 border border-white/20 rounded-full"></div>
                      </div>
                    </div>
                    <div className="flex-1 h-px bg-white opacity-30"></div>
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
                  Field
                  <br />
                  testing
                </h2>
                <div className="text-sm leading-relaxed mb-6 opacity-80 max-w-md">
                  At its core, this platform functions as a modular intelligence
                  engine. Each deployment is powered by AI-CORE 7.5, designed to
                  operate at REAL-TIME / ADAPTIVE speeds.
                </div>
                <div className="text-lg font-bold tracking-wider opacity-90">
                  FORRA.AI
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-8 text-center">
          <h2 className="text-5xl lg:text-6xl font-bold leading-tight mb-8">
            Scale to
            <br />
            infinity
          </h2>
          <div className="text-sm leading-relaxed max-w-2xl mx-auto opacity-80 mb-12">
            Work is no longer static. It shifts, adapts, and reshapes itself
            with every new challenge. Forra builds the infrastructure that keeps
            you ahead of that curve. By aligning AI-driven insight with startup
            speed, we give teams the ability to experiment, scale, and refine
            without losing focus. The result is not just efficiency — it&apos;s
            evolution.
          </div>

          <div className="text-xs tracking-wider opacity-50 mb-6">
            REDEFINING THE WAY WE WORK AT SCALE ///
          </div>
          <div className="text-xs opacity-50">
            {">".repeat(9)}
            <br />
            001
          </div>
        </div>
      </section>

      {/* Technical Status Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid lg:grid-cols-3 gap-12 items-start">
            {/* Technical Specs */}
            <div>
              <div className="text-sm mb-6 tracking-wider opacity-70">
                ONSET
              </div>
              <div className="text-xs leading-relaxed mb-6 opacity-70 max-w-xs">
                At its core, this platform functions as a modular intelligence
                engine. Each deployment is powered by AI-CORE 7.5, designed to
                operate at REAL-TIME / ADAPTIVE speeds.
              </div>
              <div className="text-xs mb-6 opacity-50">{">".repeat(10)}</div>
              <div className="flex items-center justify-between text-xs max-w-xs">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-white"></div>
                  <span className="opacity-70">USA</span>
                </div>
                <div className="cyber-border px-3 py-1 text-xs">
                  FIELD TESTED
                </div>
              </div>
            </div>

            {/* Status Info */}
            <div>
              <div className="text-xs mb-6 opacity-50">{">".repeat(6)}</div>
              <div className="text-xs mb-2 opacity-70">STATUS:</div>
              <div className="text-xs mb-8 opacity-80">BETA TESTING</div>
              <div className="flex justify-between text-xs max-w-xs">
                <span className="opacity-70">2149821-003</span>
                <div className="text-right opacity-80">
                  <div>VERSION:</div>
                  <div>V 1.3</div>
                </div>
              </div>
            </div>

            {/* Large FWD */}
            <div className="lg:text-right">
              <div className="text-6xl lg:text-8xl font-bold opacity-40 tracking-wider">
                FWD
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
