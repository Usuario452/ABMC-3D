import { createHash, createHmac } from "node:crypto"
import { NextRequest } from "next/server"
import { POST } from "@/app/api/admin/product-images/route"
import { AwsClient } from "aws4fetch"
import sharp from "sharp"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { putObject } from "@/lib/r2"
import { storeImageFromForm } from "@/lib/product-image-store"

vi.mock("server-only", () => ({}))
vi.mock("@/lib/auth/admin", () => ({ authorizeAdminAction: vi.fn(async () => ({ ok: true })) }))
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


describe("compatibilidade S3 e diagnóstico pela rota administrativa", () => {
  it("valida SigV4 independentemente do assinador, sem checksum de streaming", async () => {
    const body = new Uint8Array([0, 1, 2, 127, 128, 255])
    expect(await putObject(KEY, body, "image/webp")).toEqual({ ok: true })
    const { request, bytes } = sent[0]
    const url = new URL(request.url)
    const auth = request.headers.get("authorization")!
    const credential = auth.match(/Credential=([^, ]+)/)![1].split("/")
    const signedHeaders = auth.match(/SignedHeaders=([^, ]+)/)![1]
    const signature = auth.match(/Signature=([a-f0-9]{64})/)![1]
    const datetime = request.headers.get("x-amz-date")!
    const hash = (text: string) => createHash("sha256").update(text).digest("hex")
    const hmac = (key: string | Buffer, text: string) => createHmac("sha256", key).update(text).digest()
    const canonicalHeaders = signedHeaders.split(";").map(name =>
      name + ":" + (name === "host" ? url.host : request.headers.get(name)!).trim().replace(/\s+/g, " "),
    ).join("\n") + "\n"
    const canonical = ["PUT", url.pathname, "", canonicalHeaders, signedHeaders, "UNSIGNED-PAYLOAD"].join("\n")
    const scope = credential.slice(1).join("/")
    const stringToSign = ["AWS4-HMAC-SHA256", datetime, scope, hash(canonical)].join("\n")
    const signingKey = hmac(hmac(hmac(hmac("AWS4segredo-ficticio-local", datetime.slice(0, 8)), "auto"), "s3"), "aws4_request")
    expect(createHmac("sha256", signingKey).update(stringToSign).digest("hex")).toBe(signature)
    expect(credential.slice(2)).toEqual(["auto", "s3", "aws4_request"])
    expect(request.headers.get("content-length")).toBe(String(bytes.byteLength))
    expect(bytes).toEqual(body)
    expect(request.headers.get("content-type")).toBe("image/webp")
    expect(request.headers.get("x-amz-content-sha256")).toBe("UNSIGNED-PAYLOAD")
    for (const name of ["content-encoding", "transfer-encoding", "x-amz-trailer", "x-amz-sdk-checksum-algorithm", "x-amz-checksum-crc32"]) {
      expect(request.headers.has(name)).toBe(false)
    }
  })

  it("propaga InvalidArgument com nome minúsculo para log seguro e mantém resposta genérica", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    try {
      vi.mocked(fetch).mockResolvedValue(new Response(
        "<Error><Code>InvalidArgument</Code><ArgumentName>content-length</ArgumentName>" +
        "<ArgumentValue>segredo-ficticio-nao-publicavel</ArgumentValue><Message>mensagem-nao-publicavel</Message></Error>",
        { status: 400 },
      ))
      const png = await sharp({ create: { width: 4, height: 4, channels: 3, background: "red" } }).png().toBuffer()
      const form = new FormData()
      form.set("productId", PRODUCT)
      form.set("file", new File([new Uint8Array(png)], "teste.png", { type: "image/png" }))
      const response = await POST(new NextRequest("https://preview.example/api/admin/product-images", {
        method: "POST", headers: { origin: "https://preview.example", host: "preview.example" }, body: form,
      }))
      expect(response.status).toBe(400)
      expect(await response.json()).toEqual({ ok: false, error: "Falha ao enviar a imagem para o armazenamento. Tente novamente." })
      expect(log).toHaveBeenCalledExactlyOnceWith("[images] upload R2:", "R2 respondeu 400. Código S3: InvalidArgument. Argumento: content_length.")
      expect(fetch).toHaveBeenCalledTimes(1)
    } finally {
      log.mockRestore()
    }
  })
})
