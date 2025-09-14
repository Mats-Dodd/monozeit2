import { createEnv } from "@t3-oss/env-core"
import { z } from "zod"

export const env = createEnv({
  server: {
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    DATABASE_URL: z.string().url().optional(),
    ELECTRIC_URL: z.string().url().optional(),
    ELECTRIC_SECRET: z.string().min(1).optional(),
    ELECTRIC_SOURCE_ID: z.string().min(1).optional(),
    APP_URL: z.string().url().optional(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
})
