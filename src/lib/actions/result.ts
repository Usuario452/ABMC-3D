import { z } from "zod"

/** Resultado padrão das Server Actions, serializável para o cliente. */
export type ActionFailure = {
  ok: false
  error: string
  code?: "unauthenticated" | "config"
  fieldErrors?: Record<string, string[] | undefined>
}

export type ActionSuccess<T> = { ok: true; data: T; message?: string }

export type ActionResult<T = null> = ActionSuccess<T> | ActionFailure

export function success<T = null>(data: T = null as T, message?: string): ActionSuccess<T> {
  return { ok: true, data, message }
}

export function failure(error: string, extra: Omit<ActionFailure, "ok" | "error"> = {}): ActionFailure {
  return { ok: false, error, ...extra }
}

export function validationFailure(error: z.ZodError): ActionFailure {
  return failure("Verifique os campos destacados.", {
    fieldErrors: z.flattenError(error).fieldErrors as Record<string, string[] | undefined>,
  })
}

/** Traduz erros comuns do Postgres (código SQLSTATE) para mensagens claras. */
export function describeDbError(error: { code?: string }, context: { duplicate?: string } = {}) {
  switch (error.code) {
    case "23505":
      return context.duplicate ?? "Já existe um registro com esses dados."
    case "23001":
    case "23503":
      return "A operação viola um relacionamento entre registros."
    case "23514":
      return "Algum valor não atende às regras de validação."
    case "42501":
      return "Você não tem permissão para realizar esta operação."
    default:
      return "Não foi possível concluir a operação. Tente novamente."
  }
}
