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
    <div className="min-h-screen bg-white">
      <header className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo192.png" alt="Stones" className="h-8 w-8" />
          <span className="font-semibold text-lg">Stones</span>
        </div>
        <nav className="flex items-center gap-4">
          <Link
            to="/login"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Log in
          </Link>
          <Link
            to="/app"
            className="inline-flex items-center rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-black"
          >
            Open the app
          </Link>
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-16 md:py-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-gray-900">
              A collaborative workspace for your projects and files
            </h1>
            <p className="mt-4 text-lg text-gray-600">
              Build, edit, and organize with real-time collaboration, a flexible
              file tree, and a powerful workbench. Powered by TanStack Router,
              DB, and Electric.
            </p>
            <div className="mt-8 flex items-center gap-3">
              <Link
                to="/app"
                className="inline-flex items-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black"
              >
                Open the app
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50"
              >
                Log in
              </Link>
            </div>
          </div>
          <div className="relative">
            <div className="aspect-[4/3] w-full rounded-xl border border-gray-200 bg-gray-50 overflow-hidden">
              <img
                src="/logo512.png"
                alt="Product preview"
                className="h-full w-full object-contain opacity-90"
              />
            </div>
          </div>
        </div>
      </main>

      <footer className="max-w-6xl mx-auto px-6 py-10 text-sm text-gray-500">
        <div className="flex items-center justify-between">
          <span>© {new Date().getFullYear()} Stones</span>
          <div className="flex items-center gap-4">
            <a
              href="https://tanstack.com"
              target="_blank"
              rel="noreferrer"
              className="hover:text-gray-700"
            >
              Built with TanStack
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
