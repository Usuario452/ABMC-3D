const VISITOR_KEY = "kubostudio:visitor"
const SESSION_KEY = "kubostudio:session"

/** Lê (ou cria) um identificador aleatório. Sem armazenamento disponível, vale só para esta página. */
function readId(storage: () => Storage, key: string): { id: string; created: boolean } {
  try {
    const store = storage()
    const existing = store.getItem(key)
    if (existing) return { id: existing, created: false }
    const id = crypto.randomUUID()
    store.setItem(key, id)
    return { id, created: true }
  } catch {
    return { id: crypto.randomUUID(), created: true }
  }
}

/** Identificadores anônimos do navegador (visitante) e da aba (sessão). Só para uso no cliente. */
export function getVisitorIds() {
  const visitor = readId(() => window.localStorage, VISITOR_KEY)
  const session = readId(() => window.sessionStorage, SESSION_KEY)
  return { visitorId: visitor.id, sessionId: session.id, isNewVisitor: visitor.created, isNewSession: session.created }
}
