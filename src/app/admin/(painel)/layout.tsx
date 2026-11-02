import { redirect } from "next/navigation"
import { Suspense } from "react"
import { AdminMobileBar, AdminSidebar } from "@/components/admin/admin-nav"
import { Skeleton } from "@/components/ui/skeleton"
import { getAdminStatus, requireAdminPage } from "@/lib/auth/admin"

// O painel depende da sessão: pode bloquear a navegação enquanto verifica o acesso.
export const instant = false

export default function AdminPanelLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Suspense fallback={<PanelSkeleton />}>
      <AdminGate>{children}</AdminGate>
    </Suspense>
  )
}

async function AdminGate({ children }: { children: React.ReactNode }) {
  const status = await getAdminStatus()
  // Sem configuração do banco, o login exibe o aviso (toast) com o que falta.
  if (status.status === "unconfigured") redirect("/admin/login")

  // Redireciona para o login (sem sessão) ou para "acesso negado" (sem permissão).
  const user = await requireAdminPage()

  return (
    <div className="relative flex flex-1 overflow-x-clip">
      {/* Fundo do painel: só a grade discreta, fixa enquanto a página rola (sem brilhos). */}
      <div aria-hidden className="bg-grid-panel pointer-events-none fixed inset-0" />

      <aside className="sticky top-0 z-20 hidden h-dvh shrink-0 p-4 pr-0 lg:block">
        <AdminSidebar email={user.email} />
      </aside>

      <div className="relative flex min-w-0 flex-1 flex-col">
        <AdminMobileBar email={user.email} />
        <main id="conteudo" className="page-container flex-1 pt-2 pb-12 lg:pt-10">
          {children}
        </main>
      </div>
    </div>
  )
}

function PanelSkeleton() {
  return (
    <div className="flex flex-1" aria-hidden>
      <div className="hidden p-4 pr-0 lg:block">
        <Skeleton className="h-full w-60 rounded-lg xl:w-64" />
      </div>
      <div className="page-container space-y-6 py-10">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-44 w-full rounded-2xl" />
      </div>
    </div>
  )
}
