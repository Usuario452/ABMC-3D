import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
import { isChristmasPreview } from "@/lib/christmas-preview"

afterEach(() => vi.unstubAllEnvs())

describe("cenário natalino exclusivo do Preview do PR #5", () => {
  it.each(["production", "development", ""]) ("mantém o Hero anterior em %s", (environment) => {
    vi.stubEnv("VERCEL_ENV", environment)
    vi.stubEnv("VERCEL_GIT_COMMIT_REF", "feat/footer-atendimento-01")
    expect(isChristmasPreview()).toBe(false)
  })

  it("ativa somente na branch do PR em Preview", () => {
    vi.stubEnv("VERCEL_ENV", "preview")
    vi.stubEnv("VERCEL_GIT_COMMIT_REF", "feat/footer-atendimento-01")
    expect(isChristmasPreview()).toBe(true)
    vi.stubEnv("VERCEL_GIT_COMMIT_REF", "main")
    expect(isChristmasPreview()).toBe(false)
    vi.stubEnv("VERCEL_GIT_COMMIT_REF", "")
    expect(isChristmasPreview()).toBe(false)
  })
})
