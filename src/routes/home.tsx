import { createFileRoute, redirect } from "@tanstack/react-router"
import { authClient } from "@/lib/auth-client"

export const Route = createFileRoute(`/home`)({
  ssr: false,
  beforeLoad: async () => {
    const res = await authClient.getSession()
    if (!res.data?.session) {
      throw redirect({
        to: `/login`,
        search: {
          redirect: location.href,
        },
      })
    }
    throw redirect({ to: `/app` })
  },
  component: () => null,
})
