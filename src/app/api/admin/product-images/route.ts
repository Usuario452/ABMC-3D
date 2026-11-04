import { NextResponse, type NextRequest } from "next/server"
import { authorizeAdminAction } from "@/lib/auth/admin"
import { failure } from "@/lib/actions/result"
import { storeImageFromForm } from "@/lib/product-image-store"

/**
 * Envio de uma foto de produto (arquivo ou link do MakerWorld) para o R2.
 *
 * É uma rota, e não uma Server Action, para as fotos subirem de verdade em paralelo: o Next envia as Server
 * Actions de um cliente uma de cada vez. Mesma proteção das actions: sessão de admin válida e pedido vindo
 * do próprio site (Origin igual ao host), contra envio forjado a partir de outro site.
 */
export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json(failure("Origem não permitida."), { status: 403 })
  }

  const auth = await authorizeAdminAction()
  if (!auth.ok) return NextResponse.json(auth, { status: auth.code === "unauthenticated" ? 401 : 500 })

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json(failure("Envio inválido."), { status: 400 })
  }

  const result = await storeImageFromForm(formData)
  return NextResponse.json(result, { status: result.ok ? 200 : 400 })
}

function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin")
  if (!origin) return false
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host")
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}
