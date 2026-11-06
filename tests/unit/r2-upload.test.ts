import { AwsClient } from "aws4fetch"
import sharp from "sharp"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { putObject } from "@/lib/r2"
import { storeImageFromForm } from "@/lib/product-image-store"

vi.mock("server-only", () => ({}))
vi.mock("@/lib/env", () => ({ getImagesBaseUrl: () => null }))
vi.mock("@/lib/makerworld", () => ({ fetchMakerWorldImage: () => { throw new Error("Rede externa proibida") } }))

const ACCOUNT = "00000000000000000000000000000000"
const PRODUCT = "00000000-0000-4000-8000-000000000001"
const KEY = `products/${PRODUCT}/ficticia.webp`
let sent: { request: Request; bytes: Uint8Array }[]

beforeEach(() => {
  sent = []
  vi.stubEnv("R2_ACCOUNT_ID", ACCOUNT)
  vi.stubEnv("R2_ACCESS_KEY_ID", "id-ficticio-local")
  vi.stubEnv("R2_SECRET_ACCESS_KEY", "segredo-ficticio-local")
  vi.stubEnv("R2_BUCKET", "abmc-dev")
  vi.stubGlobal("fetch", vi.fn(async (input: Request) => {
    // Reproduz a reconstrução feita pelo fetch do Next, sem abrir conexão alguma.
    const request = new Request(input.url, {
      method: input.method, headers: input.headers, body: input.body,
      ...({ duplex: "half" } as RequestInit),
    })
    const bytes = new Uint8Array(await request.arrayBuffer())
    sent.push({ request, bytes })
    if (request.headers.get("Content-Length") !== String(bytes.byteLength)) {
      return new Response("<Error><Code>MissingContentLength</Code></Error>", { status: 411 })
    }
    return new Response(null, { status: 200 })
  }))
})

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })

describe("PUT R2 com tamanho explícito", () => {
  it.each([78, 64 * 1024, 1024 * 1024])("preserva os %i bytes e os cabeçalhos após reconstruir o stream", async (size) => {
    const body = new Uint8Array(size).fill(123)
    expect(await putObject(KEY, body, "image/webp")).toEqual({ ok: true })
    expect(fetch).toHaveBeenCalledTimes(1)
    const { request, bytes } = sent[0]
    expect(bytes).toEqual(body)
    expect(request.url).toBe(`https://${ACCOUNT}.r2.cloudflarestorage.com/abmc-dev/${KEY}`)
    expect(request.method).toBe("PUT")
    expect(request.headers.get("Content-Length")).toBe(String(size))
    expect(request.headers.get("Content-Type")).toBe("image/webp")
    expect(request.headers.get("Cache-Control")).toBe("public, max-age=31536000, immutable")
    expect(request.headers.get("Authorization")).toContain("/auto/s3/aws4_request")
  })

  it("usa byteLength da fatia enviada, preservando offset e a política de assinatura do corpo", async () => {
    const allocation = new Uint8Array(128).fill(99)
    const body = allocation.subarray(17, 91)
    expect(await putObject(KEY, body, "image/webp")).toEqual({ ok: true })
    expect(sent[0].bytes).toEqual(body)
    expect(sent[0].request.headers.get("Content-Length")).toBe("74")
    expect(sent[0].request.headers.get("x-amz-content-sha256")).toBe("UNSIGNED-PAYLOAD")
  })

  it("mantém a assinatura SigV4: Content-Length não é um cabeçalho assinado pelo aws4fetch", async () => {
    const client = new AwsClient({ accessKeyId: "id-ficticio-local", secretAccessKey: "segredo-ficticio-local", service: "s3", region: "auto" })
    const body = new Uint8Array(100)
    const init = { method: "PUT", body, aws: { datetime: "20261106T120000Z" } }
    const url = `https://${ACCOUNT}.r2.cloudflarestorage.com/abmc-dev/${KEY}`
    const headers = { "Content-Type": "image/webp", "Cache-Control": "public, max-age=31536000, immutable" }
    const before = await client.sign(url, { ...init, headers })
    const after = await client.sign(url, { ...init, headers: { ...headers, "Content-Length": String(body.byteLength) } })
    expect(after.headers.get("Authorization")).toBe(before.headers.get("Authorization"))
  })

  it.each(["jpeg", "png", "webp"] as const)("envia uma imagem %s de 1800 px convertida para WebP com comprimento correto", async (format) => {
    const pixels = Buffer.alloc(1800 * 1200 * 3)
    for (let i = 0; i < pixels.length; i++) pixels[i] = (i * 7919) % 251
    const input = await sharp(pixels, { raw: { width: 1800, height: 1200, channels: 3 } }).toFormat(format).toBuffer()
    const form = new FormData()
    form.set("productId", PRODUCT)
    form.set("file", new File([input], `ficticia.${format}`, { type: `image/${format}` }))
    const result = await storeImageFromForm(form)
    expect(result.ok).toBe(true)
    expect(fetch).toHaveBeenCalledTimes(1)
    const { request, bytes } = sent[0]
    const metadata = await sharp(bytes).metadata()
    expect(metadata.format).toBe("webp")
    expect(metadata.width).toBe(1600)
    expect(request.headers.get("Content-Length")).toBe(String(bytes.byteLength))
    expect(request.headers.get("Content-Type")).toBe("image/webp")
  })
})
