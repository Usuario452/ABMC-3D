import { randomUUID } from "node:crypto"
import { readFileSync } from "node:fs"
import { HeadObjectCommand, S3Client } from "@aws-sdk/client-s3"
import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("@/lib/env", () => ({ getImagesBaseUrl: () => null }))

/** Opt-in explícito. Nunca usa DATABASE_URL nem aceita o bucket de produção. */
describe.skipIf(process.env.ABMC_R2_DEV_SMOKE !== "1")("upload real exclusivo no abmc-dev", () => {
  it("envia, confere os bytes e remove somente o objeto temporário criado", async () => {
    const file = process.env.ABMC_R2_DEV_ENV_FILE
    if (!file) throw new Error("Informe o arquivo privado de credenciais de desenvolvimento.")
    const source = readFileSync(file, "utf8")
    const values: Record<string, string> = {}
    for (const match of source.matchAll(/^\s*(R2_ACCOUNT_ID|R2_ACCESS_KEY_ID|R2_SECRET_ACCESS_KEY|R2_BUCKET)\s*=\s*(.*)$/gm)) {
      const value = match[2].trim()
      values[match[1]] = /^(["']).*\1$/.test(value) ? value.slice(1, -1) : value.replace(/\s+#.*$/, "").trim()
    }
    if (values.R2_BUCKET !== "abmc-dev" || !/^[a-f0-9]{32}$/i.test(values.R2_ACCOUNT_ID ?? "") || !values.R2_ACCESS_KEY_ID || !values.R2_SECRET_ACCESS_KEY) {
      throw new Error("Recusado: destino não é abmc-dev ou credenciais de desenvolvimento estão incompletas.")
    }
    for (const [name, value] of Object.entries(values)) vi.stubEnv(name, value)
    const client = new S3Client({
      region: "auto", endpoint: "https://" + values.R2_ACCOUNT_ID + ".r2.cloudflarestorage.com", forcePathStyle: true,
      credentials: { accessKeyId: values.R2_ACCESS_KEY_ID, secretAccessKey: values.R2_SECRET_ACCESS_KEY },
      requestChecksumCalculation: "WHEN_REQUIRED", responseChecksumValidation: "WHEN_REQUIRED", maxAttempts: 1,
      requestHandler: { connectionTimeout: 5_000, requestTimeout: 20_000 },
    })
    const key = "_diagnostics/abmc-sdk-" + randomUUID() + ".png"
    const body = new Uint8Array(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXioAAAAASUVORK5CYII=", "base64"))
    let attempted = false
    let removed = false
    const status = (error: unknown) => error && typeof error === "object" ? (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode : undefined
    try {
      let absent = false
      try { await client.send(new HeadObjectCommand({ Bucket: "abmc-dev", Key: key })) }
      catch (error) { if (status(error) === 404) absent = true; else throw new Error("Não foi possível validar o destino de testes por leitura.") }
      if (!absent) throw new Error("O objeto temporário já existe; teste cancelado sem sobrescrever.")
      const { putObject, getObject, deleteObjects } = await import("@/lib/r2")
      try {
        attempted = true
        const upload = await putObject(key, body, "image/png")
        if (!upload.ok) throw new Error(upload.error)
        const object = await getObject(key)
        if (!object) throw new Error("Falha ao ler o objeto temporário.")
        expect(object.headers.get("content-type")).toBe("image/png")
        expect(new Uint8Array(await object.arrayBuffer())).toEqual(body)
      } finally {
        if (attempted) {
          const cleanup = await deleteObjects([key])
          if (!cleanup.ok) throw new Error("Falha ao remover apenas o objeto temporário: " + key)
          removed = true
        }
      }
      let absentAfter = false
      try { await client.send(new HeadObjectCommand({ Bucket: "abmc-dev", Key: key })) }
      catch (error) { if (status(error) === 404) absentAfter = true; else throw new Error("Não foi possível confirmar a remoção do objeto temporário.") }
      expect(absentAfter).toBe(true)
      console.info("R2 dev: envio, leitura idêntica e remoção do objeto temporário confirmados.")
    } finally {
      client.destroy()
      vi.unstubAllEnvs()
      if (attempted && !removed) console.error("Limpeza pendente somente para a chave temporária: " + key)
    }
  }, 90_000)
})
