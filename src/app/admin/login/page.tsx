import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { Suspense } from "react"
import { HiArrowLeft } from "react-icons/hi2"
import { LoginForm, type LoginNotice } from "@/components/admin/login-form"
import { LoginShowcase } from "@/components/admin/login-showcase"
import { BrandLogo } from "@/components/brand/brand-logo"
import { ConfigToast } from "@/components/shared/config-toast"
import { Skeleton } from "@/components/ui/skeleton"
import { getAdminStatus } from "@/lib/auth/admin"

export const metadata: Metadata = { title: "Entrar" }

const REASONS: Record<string, LoginNotice> = {
  "sessao-expirada": {
    variant: "info",
    message: "Sua sessão expirou ou você ainda não entrou. Faça login para continuar.",
  },
  saiu: { variant: "success", message: "Você saiu do painel com segurança." },
}

export default function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  return (
    <div className="relative flex min-h-dvh flex-1 flex-col overflow-hidden">
      {/* Fundo único, contínuo de ponta a ponta: grade discreta e brilhos dourados. */}
      <div aria-hidden className="bg-grid-faint absolute inset-0" />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-gold/15 blur-3xl lg:left-[28%] lg:h-[34rem] lg:w-[34rem]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -bottom-32 hidden h-96 w-96 rounded-full bg-gold-dark/10 blur-3xl lg:block"
      />

      <div className="relative mx-auto flex w-full max-w-[2200px] flex-1 flex-col px-6 sm:px-10 lg:px-14 xl:px-20 2xl:px-28">
        <header className="flex justify-center py-8 lg:justify-start lg:py-12">
          <Link href="/" aria-label="Ir para a loja" className="block w-44 xl:w-48">
            <BrandLogo preload />
          </Link>
        </header>

        <div className="grid flex-1 items-center gap-12 pb-12 lg:grid-cols-[1.15fr_1fr] lg:gap-16 xl:gap-24">
          <LoginShowcase />

          <main className="w-full max-w-md space-y-8 justify-self-center 2xl:max-w-lg">
            <div>
              <div className="mb-8 space-y-2">
                <p className="text-xs font-semibold tracking-[0.2em] text-gold uppercase">Painel administrativo</p>
                <h1 className="text-3xl font-bold">Bem-vindo de volta</h1>
                <p className="text-sm text-muted-foreground">
                  Entre com a conta de administrador para gerenciar produtos, categorias e imagens.
                </p>
              </div>

              <Suspense fallback={<LoginSkeleton />}>
                <LoginContent searchParams={searchParams} />
              </Suspense>
            </div>

            <p className="text-center text-sm text-muted-foreground">
              <Link
                href="/"
                className="inline-flex items-center gap-2 transition-colors hover:text-gold focus-visible:text-gold"
              >
                <HiArrowLeft className="size-4" aria-hidden />
                Voltar para a loja
              </Link>
            </p>
          </main>
        </div>
      </div>
    </div>
  )
}

async function LoginContent({ searchParams }: { searchParams: PageProps<"/admin/login">["searchParams"] }) {
  const params = await searchParams
  const status = await getAdminStatus()

  if (status.status === "ok") redirect("/admin")

  const reasonKey = typeof params.motivo === "string" ? params.motivo : ""
  const redirectTo = typeof params.voltar === "string" ? params.voltar : undefined

  return (
    <>
      {status.status === "unconfigured" ? <ConfigToast issues={status.issues} /> : null}
      <LoginForm notice={Object.hasOwn(REASONS, reasonKey) ? REASONS[reasonKey] : undefined} redirectTo={redirectTo} />
    </>
  )
}

function LoginSkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      <Skeleton className="h-12" />
      <Skeleton className="h-12" />
      <Skeleton className="h-12" />
    </div>
  )
}
