import { NextResponse, type NextRequest } from "next/server"

const LOGIN_PATH = "/admin/login"
// Mesmo valor de SESSION_COOKIE em src/lib/auth/admin.ts (o proxy não importa código de servidor).
const SESSION_COOKIE = "kubo_admin_session"

/**
 * Redireciona para o login quem acessa o painel sem cookie de sessão.
 * É só um atalho de navegação: a sessão é validada no banco pelo layout do
 * painel, por cada página e por cada Server Action (src/lib/auth/admin.ts).
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (pathname === LOGIN_PATH || request.cookies.has(SESSION_COOKIE)) return NextResponse.next()

  const url = request.nextUrl.clone()
  url.pathname = LOGIN_PATH
  url.search = ""
  if (pathname !== "/admin") url.searchParams.set("voltar", pathname)
  return NextResponse.redirect(url)
}

export const config = {
  // O proxy roda apenas no painel administrativo. A vitrine pública não usa sessão.
  matcher: ["/admin", "/admin/:path*"],
}
