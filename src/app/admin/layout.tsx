import type { Metadata } from "next"
import { Toaster } from "@/components/ui/sonner"

export const metadata: Metadata = {
  title: { default: "Painel", template: "%s | Painel KuboStudio" },
  robots: { index: false, follow: false },
}

/** Os avisos em toast existem só no painel; a loja dá o retorno no próprio lugar (botão, lista). */
export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      {children}
      <Toaster />
    </div>
  )
}
