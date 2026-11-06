import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { describeR2HttpError, uploadResponseResult } from "@/lib/r2"

vi.mock("server-only", () => ({}))
// Estes testes não devem consultar configuração nem acessar a rede.
vi.mock("@/lib/env", () => ({ getImagesBaseUrl: vi.fn(() => { throw new Error("Configuração não deve ser consultada") }) }))

const REQUEST_ID = "0123456789abcdef"
const BASE = "R2 respondeu 400."
const errorResponse = (body: BodyInit | null, headers?: HeadersInit) => new Response(body, { status: 400, headers })
const encode = (value: string) => new TextEncoder().encode(value)
const chunk = (value: Uint8Array) => ({ done: false, value })
const eof = { done: true, value: undefined }
const readerResponse = (
  read: () => Promise<ReadableStreamReadResult<Uint8Array>>,
  cancel: () => Promise<void> = vi.fn().mockResolvedValue(undefined),
) => ({ status: 400, headers: new Headers(), body: { getReader: () => ({ read, cancel }) } }) as unknown as Response

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Rede proibida nestes testes") }))
})

afterEach(() => {
  expect(fetch).not.toHaveBeenCalled()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe("diagnóstico seguro de erro HTTP do R2", () => {
  it("extrai somente código permitido e ID seguro, descartando campos sensíveis", async () => {
    const body = `<?xml version="1.0" encoding="UTF-8"?>
      <Error xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
        <Code>InvalidArgument</Code>
        <Message>segredo-ficticio &amp; assinatura-ficticia</Message>
        <Resource>https://exemplo.invalid/bucket-ficticio/foto.webp</Resource>
        <RequestId>${REQUEST_ID}</RequestId>
        <HostId>identificador-livre</HostId>
      </Error>`
    expect(await describeR2HttpError(errorResponse(body))).toBe(
      `${BASE} Código S3: InvalidArgument. ID da requisição: ${REQUEST_ID}.`,
    )
  })

  it("prioriza o ID seguro do cabeçalho", async () => {
    const response = errorResponse(
      "<Error><Code>InvalidBucketName</Code><RequestId>abcdef0123456789</RequestId></Error>",
      { "x-amz-request-id": REQUEST_ID, authorization: "nao-deve-ser-lido" },
    )
    expect(await describeR2HttpError(response)).toBe(
      `${BASE} Código S3: InvalidBucketName. ID da requisição: ${REQUEST_ID}.`,
    )
  })

  it.each([
    "", "texto livre", "<html><Code>InvalidArgument</Code></html>",
    "<Error><Code>InvalidArgument</Code>",
    "<Error><Code>InvalidArgument</Other></Error>",
    "<Error><Code>InvalidArgument</Code><Message>inválido & desconhecido</Message></Error>",
    "<Error><Code>InvalidArgument</Code><Code>AccessDenied</Code></Error>",
    '<!DOCTYPE Error [<!ENTITY x SYSTEM "file:///arquivo">]><Error><Code>InvalidArgument</Code></Error>',
  ])("descarta XML inválido, ambíguo ou conteúdo inesperado (%#)", async (body) => {
    expect(await describeR2HttpError(errorResponse(body))).toBe(BASE)
  })

  it("não devolve código desconhecido nem ID com URL ou texto livre", async () => {
    const response = errorResponse(
      "<Error><Code>segredo-ficticio</Code><RequestId>bucket-ficticio</RequestId></Error>",
      { "x-amz-request-id": "https://exemplo.invalid/assinatura-ficticia" },
    )
    expect(await describeR2HttpError(response)).toBe(BASE)
  })

  it("preserva código conhecido quando um ID é rejeitado", async () => {
    expect(await describeR2HttpError(errorResponse(
      "<Error><Code>IncompleteBody</Code><RequestId>id livre</RequestId></Error>",
    ))).toBe(`${BASE} Código S3: IncompleteBody.`)
  })

  it("aceita ID hexadecimal de 32 caracteres mesmo sem corpo", async () => {
    const id = REQUEST_ID.repeat(2)
    expect(await describeR2HttpError(errorResponse(null, { "x-amz-request-id": id }))).toBe(
      `${BASE} ID da requisição: ${id}.`,
    )
  })

  it.each([REQUEST_ID.toUpperCase(), REQUEST_ID.repeat(2).toUpperCase()])(
    "aceita somente IDs completos de 16 ou 32 caracteres, inclusive maiúsculas (%#)", async (id) => {
      expect(await describeR2HttpError(errorResponse(`<Error><RequestId>${id}</RequestId></Error>`))).toBe(
        `${BASE} ID da requisição: ${id}.`,
      )
    },
  )

  it.each([
    ...[REQUEST_ID, REQUEST_ID.repeat(2)].flatMap((id) => [id + "\n", id + "\r", id + "\r\n"]),
    "", "a".repeat(15), "a".repeat(17), "a".repeat(31), "a".repeat(33), "a".repeat(64),
    "a".repeat(15) + "\n", "a".repeat(31) + "\n", "g".repeat(16), " " + REQUEST_ID,
  ])("rejeita IDs com tamanho incorreto, caracteres extras ou quebras de linha (%#)", async (id) => {
    expect(await describeR2HttpError(errorResponse(`<Error><RequestId>${id}</RequestId></Error>`))).toBe(BASE)
    // Headers normaliza espaços/quebras de linha; o stub testa o validador sem normalização.
    const response = { status: 400, headers: { get: () => id }, body: null } as unknown as Response
    expect(await describeR2HttpError(response)).toBe(BASE)
  })

  it("mantém erro original com corpo ausente", async () => {
    expect(await describeR2HttpError(errorResponse(null))).toBe(BASE)
  })

  it("aceita corpo de exatamente 8 KiB", async () => {
    const body = "<Error><Code>InvalidArgument</Code></Error>"
    expect(await describeR2HttpError(errorResponse(body.padEnd(8192)))).toBe(
      `${BASE} Código S3: InvalidArgument.`,
    )
  })

  it("não solicita outra leitura ao atingir exatamente 8 KiB em vários blocos", async () => {
    const bytes = encode("<Error><Code>InvalidArgument</Code></Error>".padEnd(8192))
    const read = vi.fn()
      .mockResolvedValueOnce(chunk(bytes.subarray(0, 4096)))
      .mockResolvedValueOnce(chunk(bytes.subarray(4096)))
      .mockRejectedValueOnce(new Error("Não deve procurar EOF"))
    const cancel = vi.fn().mockResolvedValue(undefined)
    expect(await describeR2HttpError(readerResponse(read, cancel))).toBe(`${BASE} Código S3: InvalidArgument.`)
    expect(read).toHaveBeenCalledTimes(2)
    expect(cancel).toHaveBeenCalledOnce()
  })

  it("acumula blocos e decodifica UTF-8 dividido entre eles", async () => {
    const bytes = encode(`<Error><Code>InvalidArgument</Code><Message>ação 🔒</Message><RequestId>${REQUEST_ID}</RequestId></Error>`)
    // Um byte por bloco divide também os caracteres UTF-8 de dois e quatro bytes.
    const read = vi.fn()
    for (let index = 0; index < bytes.length; index++) read.mockResolvedValueOnce(chunk(bytes.subarray(index, index + 1)))
    read.mockResolvedValueOnce(eof)
    expect(await describeR2HttpError(readerResponse(read))).toBe(
      `${BASE} Código S3: InvalidArgument. ID da requisição: ${REQUEST_ID}.`,
    )
    expect(read).toHaveBeenCalledTimes(bytes.length + 1)
  })

  it("descarta UTF-8 inválido sem expor bytes ou mensagens", async () => {
    const bytes = new Uint8Array([...encode("<Error><Code>InvalidArgument</Code><Message>"), 0xff, ...encode("</Message></Error>")])
    expect(await describeR2HttpError(errorResponse(bytes))).toBe(BASE)
  })

  it("limita por bytes e cancela o stream sem ler os próximos blocos", async () => {
    const read = vi.fn()
      .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode("á".repeat(4097)) })
      .mockRejectedValueOnce(new Error("Este bloco não pode ser lido"))
    const cancel = vi.fn().mockResolvedValue(undefined)
    const response = {
      status: 400, headers: new Headers(),
      body: { getReader: () => ({ read, cancel }) },
    } as unknown as Response
    expect(await describeR2HttpError(response)).toBe(BASE)
    expect(read).toHaveBeenCalledTimes(1)
    expect(cancel).toHaveBeenCalledOnce()
  })

  it("não extrai código de uma resposta truncada pelo limite", async () => {
    const body = `<Error><Code>InvalidArgument</Code><Message>${"x".repeat(8192)}</Message></Error>`
    expect(await describeR2HttpError(errorResponse(body))).toBe(BASE)
  })

  it("mantém erro original quando a leitura falha", async () => {
    const stream = new ReadableStream({
      start(controller) { controller.error(new Error("erro com URL e segredo fictícios")) },
    })
    expect(await describeR2HttpError(errorResponse(stream))).toBe(BASE)
  })

  it("descarta diagnóstico parcial se o corpo é interrompido entre blocos", async () => {
    const read = vi.fn()
      .mockResolvedValueOnce(chunk(encode("<Error><Code>InvalidArgument</Code>")))
      .mockRejectedValueOnce(new Error("Interrupção com detalhes que não podem aparecer"))
    const cancel = vi.fn().mockResolvedValue(undefined)
    expect(await describeR2HttpError(readerResponse(read, cancel))).toBe(BASE)
    expect(read).toHaveBeenCalledTimes(2)
    expect(cancel).toHaveBeenCalledOnce()
  })

  it("conclui resposta lenta que termina antes do prazo total", async () => {
    vi.useFakeTimers()
    const read = vi.fn()
      .mockImplementationOnce(() => new Promise((resolve) => setTimeout(() => resolve(chunk(encode("<Error><Code>InvalidArgument"))), 400)))
      .mockImplementationOnce(() => new Promise((resolve) => setTimeout(() => resolve(chunk(encode("</Code></Error>"))), 400)))
      .mockResolvedValueOnce(eof)
    const result = describeR2HttpError(readerResponse(read))
    await vi.advanceTimersByTimeAsync(800)
    expect(await result).toBe(`${BASE} Código S3: InvalidArgument.`)
    expect(vi.getTimerCount()).toBe(0)
  })

  it("interrompe resposta lenta no prazo total e não retoma ao chegar um bloco tardio", async () => {
    vi.useFakeTimers()
    const read = vi.fn()
      .mockImplementationOnce(() => new Promise((resolve) => setTimeout(() => resolve(chunk(encode("<Error><Code>InvalidArgument"))), 400)))
      .mockImplementationOnce(() => new Promise((resolve) => setTimeout(() => resolve(chunk(encode("</Code></Error>"))), 800)))
      .mockResolvedValueOnce(eof)
    const cancel = vi.fn().mockRejectedValue(new Error("Cancelamento falhou com dados sensíveis fictícios"))
    const result = describeR2HttpError(readerResponse(read, cancel))
    await vi.advanceTimersByTimeAsync(1000)
    expect(await result).toBe(BASE)
    expect(cancel).toHaveBeenCalledOnce()
    await vi.advanceTimersByTimeAsync(200)
    expect(read).toHaveBeenCalledTimes(2)
  })

  it("não espera um cancelamento que nunca termina", async () => {
    vi.useFakeTimers()
    const read = vi.fn(() => new Promise<ReadableStreamReadResult<Uint8Array>>(() => {}))
    const cancel = vi.fn(() => new Promise<void>(() => {}))
    const result = describeR2HttpError(readerResponse(read, cancel))
    await vi.advanceTimersByTimeAsync(1000)
    expect(await result).toBe(BASE)
    expect(read).toHaveBeenCalledOnce()
    expect(cancel).toHaveBeenCalledOnce()
  })

  it("preserva diagnóstico se cancelar lança um erro síncrono", async () => {
    const read = vi.fn().mockResolvedValueOnce(chunk(encode("<Error><Code>InvalidArgument</Code></Error>"))).mockResolvedValueOnce(eof)
    const cancel = vi.fn(() => { throw new Error("Falha síncrona com detalhes fictícios") })
    expect(await describeR2HttpError(readerResponse(read, cancel))).toBe(`${BASE} Código S3: InvalidArgument.`)
  })

  it("limita o tempo de diagnóstico e cancela um corpo que não termina", async () => {
    vi.useFakeTimers()
    const cancel = vi.fn()
    const stream = new ReadableStream({ start() {}, cancel })
    const result = describeR2HttpError(errorResponse(stream))
    await vi.advanceTimersByTimeAsync(1000)
    expect(await result).toBe(BASE)
    expect(cancel).toHaveBeenCalledOnce()
  })

  it("não abre nem lê o corpo de uma resposta HTTP bem-sucedida", async () => {
    const body = vi.fn(() => { throw new Error("Diagnóstico não pode acessar este corpo") })
    const headers = vi.fn(() => { throw new Error("Diagnóstico não pode acessar estes cabeçalhos") })
    const response = { ok: true, get body() { return body() }, get headers() { return headers() } } as unknown as Response
    expect(await uploadResponseResult(response)).toEqual({ ok: true })
    expect(body).not.toHaveBeenCalled()
    expect(headers).not.toHaveBeenCalled()
  })

  it("encaminha somente o diagnóstico seguro em uma resposta HTTP de erro", async () => {
    expect(await uploadResponseResult(errorResponse("<Error><Code>InvalidArgument</Code><Message>segredo fictício</Message></Error>"))).toEqual({
      ok: false, error: `${BASE} Código S3: InvalidArgument.`,
    })
  })
})
