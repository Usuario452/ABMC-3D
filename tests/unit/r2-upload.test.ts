import { createHash, createHmac } from "node:crypto"
import { Readable } from "node:stream"
import type { S3ClientConfig } from "@aws-sdk/client-s3"
import { NextRequest } from "next/server"
import sharp from "sharp"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { transport, configs } = vi.hoisted(() => ({ transport: vi.fn(), configs: [] as S3ClientConfig[] }))
vi.mock("server-only", () => ({}))
vi.mock("@/lib/auth/admin", () => ({ authorizeAdminAction: vi.fn(async () => ({ ok: true })) }))
vi.mock("@/lib/env", () => ({ getImagesBaseUrl: () => null }))
vi.mock("@/lib/makerworld", () => ({ fetchMakerWorldImage: () => { throw new Error("Rede externa proibida") } }))
vi.mock("@aws-sdk/client-s3", async importOriginal => {
  const actual = await importOriginal<typeof import("@aws-sdk/client-s3")>()
  return { ...actual, S3Client: class extends actual.S3Client {
    constructor(config: S3ClientConfig) {
      configs.push(config)
      super({ ...config, requestHandler: { handle: transport } })
    }
  } }
})

type WireRequest = {
  method: string; hostname: string; path: string; headers: Record<string, string>
  query: Record<string, string | string[]>; body?: Uint8Array
}
const ACCOUNT = "00000000000000000000000000000000"
const PRODUCT = "00000000-0000-4000-8000-000000000001"
const KEY = "products/" + PRODUCT + "/ficticia.webp"
const REQUEST_ID = "0123456789abcdef"
let sent: WireRequest[]
let r2: typeof import("@/lib/r2")
const response = (statusCode = 200, body = "", headers: Record<string, string> = {}) => ({
  response: { statusCode, headers, body: Readable.from([Buffer.from(body)]) },
})
const header = (request: WireRequest, name: string) => Object.entries(request.headers).find(([key]) => key.toLowerCase() === name)?.[1]

beforeEach(async () => {
  vi.resetModules()
  sent = []
  configs.length = 0
  vi.stubEnv("R2_ACCOUNT_ID", ACCOUNT)
  vi.stubEnv("R2_ACCESS_KEY_ID", "id-ficticio-local")
  vi.stubEnv("R2_SECRET_ACCESS_KEY", "segredo-ficticio-local")
  vi.stubEnv("R2_BUCKET", "abmc-dev")
  vi.stubEnv("AWS_REQUEST_CHECKSUM_CALCULATION", "WHEN_SUPPORTED")
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Fetch externo proibido") }))
  transport.mockReset().mockImplementation(async (request: WireRequest) => {
    sent.push(request)
    return response(request.method === "DELETE" ? 204 : 200)
  })
  r2 = await import("@/lib/r2")
})
afterEach(() => { expect(fetch).not.toHaveBeenCalled(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks() })

describe("AWS SDK oficial no R2", () => {
  it.each([78, 64 * 1024, 1024 * 1024])("envia %i bytes com metadados e caminho preservados", async size => {
    const body = new Uint8Array(size).fill(123)
    expect(await r2.putObject(KEY, body, "image/webp")).toEqual({ ok: true })
    expect(transport).toHaveBeenCalledTimes(1)
    const request = sent[0]
    expect(request.method).toBe("PUT")
    expect(request.hostname).toBe(ACCOUNT + ".r2.cloudflarestorage.com")
    expect(request.path).toBe("/abmc-dev/" + KEY)
    expect(request.body).toEqual(body)
    expect(header(request, "content-length")).toBe(String(size))
    expect(header(request, "content-type")).toBe("image/webp")
    expect(header(request, "cache-control")).toBe("public, max-age=31536000, immutable")
    expect(configs[0]).toMatchObject({ region: "auto", forcePathStyle: true,
      endpoint: "https://" + ACCOUNT + ".r2.cloudflarestorage.com",
      requestChecksumCalculation: "WHEN_REQUIRED", responseChecksumValidation: "WHEN_REQUIRED" })
    for (const name of ["x-amz-checksum-crc32", "x-amz-sdk-checksum-algorithm", "x-amz-trailer", "content-encoding", "transfer-encoding"]) {
      expect(header(request, name)).toBeUndefined()
    }
  })

  it("usa o comprimento e o hash somente da fatia efetivamente enviada", async () => {
    const body = new Uint8Array(128).fill(42).subarray(17, 91)
    expect(await r2.putObject(KEY, body, "image/webp")).toEqual({ ok: true })
    expect(sent[0].body).toEqual(body)
    expect(header(sent[0], "content-length")).toBe("74")
    const hash = header(sent[0], "x-amz-content-sha256")
    expect(hash === "UNSIGNED-PAYLOAD" || hash === createHash("sha256").update(body).digest("hex")).toBe(true)
  })

  it("valida independentemente a assinatura SigV4 produzida pelo SDK", async () => {
    await r2.putObject(KEY, new Uint8Array([0, 1, 128, 255]), "image/webp")
    const request = sent[0]
    const auth = header(request, "authorization")!
    const credential = auth.match(/Credential=([^, ]+)/)![1].split("/")
    const signedHeaders = auth.match(/SignedHeaders=([^, ]+)/)![1]
    const signature = auth.match(/Signature=([a-f0-9]{64})/)![1]
    const datetime = header(request, "x-amz-date")!
    const encode = (value: string) => encodeURIComponent(value).replace(/[!'()*]/g, char => "%" + char.charCodeAt(0).toString(16).toUpperCase())
    const query = Object.entries(request.query).flatMap(([name, values]) =>
      (Array.isArray(values) ? values : [values]).map(value => [encode(name), encode(value)]),
    ).sort(([a, av], [b, bv]) => a < b ? -1 : a > b ? 1 : av < bv ? -1 : av > bv ? 1 : 0).map(pair => pair.join("=")).join("&")
    const canonicalHeaders = signedHeaders.split(";").map(name => name + ":" + header(request, name)!.trim().replace(/\s+/g, " ")).join("\n") + "\n"
    const canonical = ["PUT", request.path, query, canonicalHeaders, signedHeaders, header(request, "x-amz-content-sha256")!].join("\n")
    const hmac = (key: string | Buffer, value: string) => createHmac("sha256", key).update(value).digest()
    const signingKey = hmac(hmac(hmac(hmac("AWS4segredo-ficticio-local", datetime.slice(0, 8)), "auto"), "s3"), "aws4_request")
    const stringToSign = ["AWS4-HMAC-SHA256", datetime, credential.slice(1).join("/"), createHash("sha256").update(canonical).digest("hex")].join("\n")
    expect(createHmac("sha256", signingKey).update(stringToSign).digest("hex")).toBe(signature)
    expect(credential.slice(2)).toEqual(["auto", "s3", "aws4_request"])
  })

  it.each(["jpeg", "png", "webp"] as const)("mantém a conversão de %s para WebP antes do envio", async format => {
    const input = await sharp({ create: { width: 1800, height: 1200, channels: 3, background: "red" } }).toFormat(format).toBuffer()
    const form = new FormData()
    form.set("productId", PRODUCT)
    form.set("file", new File([new Uint8Array(input)], "ficticia." + format, { type: "image/" + format }))
    const { storeImageFromForm } = await import("@/lib/product-image-store")
    const result = await storeImageFromForm(form)
    expect(result.ok).toBe(true)
    const bytes = sent[0].body!
    const metadata = await sharp(bytes).metadata()
    expect(metadata.format).toBe("webp")
    expect(metadata.width).toBe(1600)
    expect(header(sent[0], "content-length")).toBe(String(bytes.byteLength))
    expect(sent[0].path).toMatch(new RegExp("^/abmc-dev/products/" + PRODUCT + "/[a-f0-9-]+\\.webp$"))
  })

  it.each([[400, "InvalidArgument"], [403, "AccessDenied"], [411, "MissingContentLength"]] as const)("trata HTTP %i sem expor o XML nem repetir erro permanente", async (status, code) => {
    transport.mockResolvedValue(response(status,
      "<Error><Code>" + code + "</Code><ArgumentName>content-length</ArgumentName><ArgumentValue>segredo-ficticio</ArgumentValue><Message>mensagem-livre-ficticia</Message></Error>",
      { "content-type": "application/xml", "x-amz-request-id": REQUEST_ID }))
    const result = await r2.putObject(KEY, new Uint8Array([1]), "image/webp")
    expect(result).toMatchObject({ ok: false })
    if (!result.ok) {
      expect(result.error).toContain("R2 respondeu " + status)
      expect(result.error).toContain("Código S3: " + code)
      expect(result.error).not.toMatch(/segredo-ficticio|mensagem-livre|ArgumentValue|<Error>/)
    }
    expect(transport).toHaveBeenCalledTimes(1)
  })

  it("não expõe exceções de rede", async () => {
    transport.mockRejectedValue(Object.assign(new Error("segredo-ficticio"), { name: "TypeError" }))
    expect(await r2.putObject(KEY, new Uint8Array([1]), "image/webp")).toEqual({ ok: false, error: "Não foi possível conectar ao R2." })
  })

  it("preserva o contrato de leitura e as URLs assinadas existentes", async () => {
    transport.mockImplementation(async (request: WireRequest) => { sent.push(request); return response(200, "foto", { "content-type": "image/webp", "content-length": "4" }) })
    const object = await r2.getObject(KEY)
    expect(object?.headers.get("content-type")).toBe("image/webp")
    expect(await object?.text()).toBe("foto")
    expect(sent[0].method).toBe("GET")
    expect(sent[0].path).toBe("/abmc-dev/" + KEY)
    const url = new URL(r2.getProductImageUrl(KEY)!)
    expect(url.hostname).toBe(ACCOUNT + ".r2.cloudflarestorage.com")
    expect(url.pathname).toBe("/abmc-dev/" + KEY)
    expect(url.searchParams.get("X-Amz-Expires")).toBe("604800")
  })

  it("remove somente as chaves pedidas e mantém 404 como sucesso", async () => {
    transport.mockImplementation(async (request: WireRequest) => { sent.push(request); return response(404, "<Error><Code>NoSuchKey</Code></Error>") })
    expect(await r2.deleteObjects([KEY])).toEqual({ ok: true })
    expect(sent.map(request => [request.method, request.path])).toEqual([["DELETE", "/abmc-dev/" + KEY]])
    expect(await r2.deleteObjects([])).toEqual({ ok: true })
    expect(sent).toHaveLength(1)
    expect(transport).toHaveBeenCalledTimes(1)
  })

  it.each(["", "/arquivo.webp", "x\0y"])("rejeita chave inválida sem acessar R2 (%j)", async key => {
    expect(await r2.putObject(key, new Uint8Array([1]), "image/webp")).toMatchObject({ ok: false })
    expect(transport).not.toHaveBeenCalled()
  })
  it("rejeita imagem vazia e tipo inválido", async () => {
    expect(await r2.putObject(KEY, new Uint8Array(), "image/webp")).toMatchObject({ ok: false })
    expect(await r2.putObject(KEY, new Uint8Array([1]), "text/html")).toMatchObject({ ok: false })
    expect(transport).not.toHaveBeenCalled()
  })
  it("não cria cliente quando faltam credenciais", async () => {
    vi.stubEnv("R2_SECRET_ACCESS_KEY", "")
    expect(await r2.putObject(KEY, new Uint8Array([1]), "image/webp")).toMatchObject({ ok: false })
    expect(configs).toHaveLength(0)
    expect(transport).not.toHaveBeenCalled()
  })

  it("mantém erro genérico na rota e registra somente diagnóstico seguro do SDK", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    transport.mockResolvedValue(response(400,
      "<Error><Code>InvalidArgument</Code><ArgumentName>content-length</ArgumentName><ArgumentValue>segredo-ficticio</ArgumentValue><Message>mensagem-livre-ficticia</Message></Error>",
      { "content-type": "application/xml", "x-amz-request-id": REQUEST_ID }))
    const png = await sharp({ create: { width: 4, height: 4, channels: 3, background: "red" } }).png().toBuffer()
    const form = new FormData()
    form.set("productId", PRODUCT)
    form.set("file", new File([new Uint8Array(png)], "teste.png", { type: "image/png" }))
    const { POST } = await import("@/app/api/admin/product-images/route")
    const result = await POST(new NextRequest("https://preview.example/api/admin/product-images", {
      method: "POST", headers: { origin: "https://preview.example", host: "preview.example" }, body: form,
    }))
    expect(result.status).toBe(400)
    expect(await result.json()).toEqual({ ok: false, error: "Falha ao enviar a imagem para o armazenamento. Tente novamente." })
    expect(log).toHaveBeenCalledWith("[images] upload R2:", expect.stringContaining("Código S3: InvalidArgument."))
    expect(JSON.stringify(log.mock.calls)).not.toMatch(/segredo-ficticio|mensagem-livre-ficticia/)
  })
})
