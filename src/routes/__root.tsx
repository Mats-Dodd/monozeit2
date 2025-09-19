import {
  Outlet,
  HeadContent,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router"
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools"

import appCss from "../styles/styles.css?url"

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: `utf-8`,
      },
      {
        name: `viewport`,
        content: `width=device-width, initial-scale=1`,
      },
      {
        title: `Monozeit`,
      },
    ],
    links: [
      {
        rel: `stylesheet`,
        href: appCss,
      },
      {
        rel: `icon`,
        href: `/logo.svg?v=1`,
        type: `image/svg+xml`,
        sizes: `any`,
      },
      {
        rel: `icon`,
        href: `/logo192.png`,
        sizes: `192x192`,
        type: `image/png`,
      },
      {
        rel: `icon`,
        href: `/logo512.png`,
        sizes: `512x512`,
        type: `image/png`,
      },
      {
        rel: `apple-touch-icon`,
        href: `/logo192.png`,
      },
    ],
  }),

  component: () => (
    <RootDocument>
      <Outlet />
      <TanStackRouterDevtools />
    </RootDocument>
  ),
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
