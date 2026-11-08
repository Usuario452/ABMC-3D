import "server-only"

/** Tema restrito ao Preview da branch do PR #5, inclusive em builds locais. */
export function isChristmasPreview() {
  return process.env.VERCEL_ENV === "preview" &&
    process.env.VERCEL_GIT_COMMIT_REF === "feat/footer-atendimento-01"
}
