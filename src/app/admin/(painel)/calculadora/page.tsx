import type { Metadata } from "next"
import { PageHeader } from "@/components/admin/page-header"
import { PriceCalculator } from "@/components/admin/price-calculator"
import { requireAdminPage } from "@/lib/auth/admin"

export const metadata: Metadata = { title: "Calculadora" }

// Página do painel: valida a sessão antes de mostrar.
export const instant = false

/** Calculadora de preço de peças impressas em 3D. O cálculo roda no navegador e não grava nada no banco. */
export default async function AdminCalculatorPage() {
  await requireAdminPage()

  return (
    <>
      <PageHeader
        title="Calculadora"
        description="Custo e preço de venda das peças impressas."
      />
      <PriceCalculator />
    </>
  )
}
