import type { Metadata } from "next"
import { CartView } from "@/components/cart/cart-view"
import { ConfigToast } from "@/components/shared/config-toast"
import { ToastOnMount } from "@/components/shared/toast-on-mount"
import { getDatabaseEnv } from "@/lib/env"
import { getWhatsAppConfig } from "@/lib/whatsapp"

export const metadata: Metadata = {
  title: "Carrinho",
  robots: { index: false },
}

export default function CartPage() {
  const env = getDatabaseEnv()
  const whatsapp = getWhatsAppConfig()

  return (
    <div className="page-container py-10 sm:py-14">
      <h1 className="mb-8 text-3xl font-bold sm:text-4xl">Carrinho</h1>

      {!env.ok ? <ConfigToast issues={env.issues} /> : null}
      {!whatsapp.ok ? (
        <ToastOnMount
          id="whatsapp-config"
          variant="warning"
          duration={Infinity}
          message="WhatsApp não configurado"
          description={
            whatsapp.reason === "ausente"
              ? "Defina NEXT_PUBLIC_WHATSAPP_NUMBER (ex.: 5511999999999) para habilitar a finalização de pedidos."
              : "O valor de NEXT_PUBLIC_WHATSAPP_NUMBER é inválido. Use somente números com DDI 55 e DDD (ex.: 5511999999999)."
          }
        />
      ) : null}

      <CartView />
    </div>
  )
}
