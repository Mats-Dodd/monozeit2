import { createServerFileRoute } from "@tanstack/react-start/server"
import { auth } from "@/lib/auth"
import { env } from "@/env/server"

const serve = async ({ request }: { request: Request }) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    })
  }

  const url = new URL(request.url)
  const isProd = env.NODE_ENV === "production"
  const originUrl = new URL(
    isProd
      ? `${env.ELECTRIC_URL ?? ""}/v1/shape`
      : "http://localhost:3000/v1/shape"
  )

  url.searchParams.forEach((value, key) => {
    // Pass through the Electric protocol query parameters.
    if (["live", "handle", "offset", "cursor"].includes(key)) {
      originUrl.searchParams.set(key, value)
    }
  })

  originUrl.searchParams.set("table", "files")
  // No filter for now - just get all folders
  if (isProd && env.ELECTRIC_SECRET) {
    originUrl.searchParams.set("secret", env.ELECTRIC_SECRET)
  }
  if (isProd && env.ELECTRIC_SOURCE_ID) {
    originUrl.searchParams.set("source_id", env.ELECTRIC_SOURCE_ID)
  }

  const response = await fetch(originUrl)
  const headers = new Headers(response.headers)
  headers.delete("content-encoding")
  headers.delete("content-length")
  headers.set("Vary", "Cookie")

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

export const ServerRoute = createServerFileRoute("/api/files").methods({
  GET: serve,
})
