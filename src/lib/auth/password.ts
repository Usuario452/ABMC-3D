import { randomBytes, scrypt, timingSafeEqual } from "node:crypto"

/**
 * Hash de senhas com scrypt (nativo do Node, sem dependências).
 * Formato armazenado: scrypt$N$r$p$<salt base64url>$<hash base64url>
 *
 * Sem "server-only" de propósito: também é usado pelo script db:create-admin.
 */

const N = 2 ** 15
const R = 8
const P = 1
const KEY_LENGTH = 64
// scrypt usa ~128 * N * r bytes; o padrão do Node (32 MB) não comporta N = 2^15.
const MAX_MEMORY = 64 * 1024 * 1024

function derive(password: string, salt: Buffer, n: number, r: number, p: number, length: number) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password.normalize("NFKC"), salt, length, { N: n, r, p, maxmem: MAX_MEMORY }, (error, key) =>
      error ? reject(error) : resolve(key),
    )
  })
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16)
  const key = await derive(password, salt, N, R, P, KEY_LENGTH)
  return ["scrypt", N, R, P, salt.toString("base64url"), key.toString("base64url")].join("$")
}

/** Compara em tempo constante. Retorna false para hashes malformados. */
export async function verifyPassword(password: string, stored: string) {
  const [scheme, n, r, p, salt, hash] = stored.split("$")
  if (scheme !== "scrypt" || !salt || !hash) return false

  const expected = Buffer.from(hash, "base64url")
  const params = [Number(n), Number(r), Number(p)]
  if (expected.length === 0 || params.some((value) => !Number.isSafeInteger(value) || value <= 0)) return false

  try {
    const actual = await derive(password, Buffer.from(salt, "base64url"), params[0], params[1], params[2], expected.length)
    return timingSafeEqual(actual, expected)
  } catch {
    return false
  }
}

/** Hash fixo usado quando o e-mail não existe, para que a resposta leve o mesmo tempo. */
let dummyHash: Promise<string> | null = null
export function getDummyHash() {
  dummyHash ??= hashPassword(randomBytes(16).toString("hex"))
  return dummyHash
}
