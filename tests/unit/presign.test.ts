import { AwsV4Signer } from "aws4fetch"
import { describe, expect, it } from "vitest"
import { MAX_PRESIGN_SECONDS, presignGetUrl, startOfDayAmzDate } from "@/lib/presign"

const credentials = { accessKeyId: "AKIDEXAMPLE", secretAccessKey: "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY" }

describe("presignGetUrl", () => {
  it("gera a mesma assinatura que o aws4fetch", async () => {
    const host = "conta123.r2.cloudflarestorage.com"
    const path = "/kubostudio/products/2f1d7c1e-0000-4000-8000-000000000000/1730000000000-abc.webp"
    const amzDate = "20261102T000000Z"

    const ours = presignGetUrl({ host, path, region: "auto", amzDate, expiresSeconds: MAX_PRESIGN_SECONDS, ...credentials })

    const signer = new AwsV4Signer({
      url: `https://${host}${path}?X-Amz-Expires=${MAX_PRESIGN_SECONDS}`,
      method: "GET",
      service: "s3",
      region: "auto",
      datetime: amzDate,
      signQuery: true,
      ...credentials,
    })
    const reference = new URL((await signer.sign()).url)

    const url = new URL(ours)
    expect(url.pathname).toBe(reference.pathname)
    expect(url.searchParams.get("X-Amz-Signature")).toBe(reference.searchParams.get("X-Amz-Signature"))
    expect(url.searchParams.get("X-Amz-Expires")).toBe(String(MAX_PRESIGN_SECONDS))
  })

  it("codifica caracteres especiais do caminho", () => {
    const url = presignGetUrl({
      host: "h.example",
      path: "/bucket/products/a b(1).webp",
      region: "auto",
      amzDate: "20261102T000000Z",
      expiresSeconds: 60,
      ...credentials,
    })
    expect(new URL(url).pathname).toBe("/bucket/products/a%20b%281%29.webp")
  })
})

describe("startOfDayAmzDate", () => {
  it("usa a meia-noite UTC do dia, para a URL não mudar ao longo do dia", () => {
    expect(startOfDayAmzDate(new Date("2026-11-02T23:59:59Z"))).toBe("20261102T000000Z")
    expect(startOfDayAmzDate(new Date("2026-11-02T00:00:01Z"))).toBe("20261102T000000Z")
  })
})
