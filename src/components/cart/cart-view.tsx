"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useState, useTransition } from "react"
import { FaWhatsapp } from "react-icons/fa6"
import { HiOutlinePhoto, HiOutlineShoppingBag } from "react-icons/hi2"
import SwipeRow from "@/components/SwipeRow"
import StarBorder from "@/components/StarBorder"
import { checkCart, createWhatsAppOrder, type CartCheck } from "@/actions/cart"
import { QuantityInput } from "@/components/cart/quantity-input"
import { StateMessage } from "@/components/shared/state-message"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { siteConfig } from "@/config/site"
import { getVisitorIds } from "@/lib/visitor-ids"
import {
  applySnapshot,
  removeFromCart,
  toCartRequest,
  updateQuantity,
  type CartItem,
} from "@/lib/cart/cart"
import { setCartItems, useCartHydrated, useCartItems } from "@/lib/cart/store"
import { formatPrice } from "@/lib/format"
import { cn } from "@/lib/utils"
import { getWhatsAppConfig } from "@/lib/whatsapp"

type SyncState =
  | { status: "idle" | "checking" }
  | { status: "ok"; unavailable: Set<string>; priceChanged: boolean }
  | { status: "error"; message: string; isConfig: boolean }

/** Sincroniza o carrinho com os dados atuais do servidor e indica o que mudou. */
function useCartSync(items: CartItem[], hydrated: boolean) {
  // O resultado guarda a lista de produtos a que se refere; enquanto a lista atual
  // não tiver resultado, o estado é "checking".
  const [checked, setChecked] = useState<{ ids: string; state: SyncState } | null>(null)
  const ids = items.map((item) => item.productId).sort().join(",")

  useEffect(() => {
    if (!hydrated || !ids) return

    let cancelled = false
    checkCart(toCartRequest(items))
      .then((result) => {
        if (cancelled) return
        setChecked({
          ids,
          state: result.ok
            ? applyCheck(result.data)
            : { status: "error", message: result.error, isConfig: result.code === "config" },
        })
      })
      .catch(() => {
        if (!cancelled) {
          setChecked({
            ids,
            state: { status: "error", message: "Não foi possível verificar o carrinho agora.", isConfig: false },
          })
        }
      })
    return () => {
      cancelled = true
    }
    // Revalida apenas quando a lista de produtos muda (não a cada alteração de quantidade).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids, hydrated])

  const state: SyncState = !ids ? { status: "idle" } : checked?.ids === ids ? checked.state : { status: "checking" }
  const update = (next: SyncState) => setChecked({ ids, state: next })
  return [state, update] as const
}

/** Atualiza os itens salvos com preços/nomes do servidor e retorna o estado de sincronização. */
function applyCheck(check: CartCheck): SyncState {
  let priceChanged = false
  setCartItems((current) => {
    const byId = new Map(check.lines.map((line) => [line.productId, line]))
    priceChanged = current.some((item) => {
      const line = byId.get(item.productId)
      return line !== undefined && line.unitPriceCents !== item.unitPriceCents
    })
    const next = applySnapshot(current, check.lines)
    return next.every((item, i) => item === current[i]) ? current : next
  })
  return { status: "ok", unavailable: new Set(check.unavailableIds), priceChanged }
}

/**
 * Conteúdo da gaveta do carrinho: itens rolando e, fixo embaixo, o total e a finalização pelo WhatsApp.
 * `onNavigate` fecha a gaveta ao seguir um link (produto, catálogo).
 */
export function CartView({ onNavigate }: { onNavigate?: () => void }) {
  const items = useCartItems()
  const hydrated = useCartHydrated()
  const [sync, setSync] = useCartSync(items, hydrated)
  const [isSubmitting, startSubmit] = useTransition()
  const whatsappReady = getWhatsAppConfig().ok
  // Sem toasts na loja: problemas ao gerar o pedido aparecem numa linha discreta no rodapé.
  const [checkoutError, setCheckoutError] = useState<string | null>(null)

  if (!hydrated) {
    return (
      <div className="space-y-3 p-5" aria-hidden>
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-1 items-center p-5">
        <StateMessage
          icon={HiOutlineShoppingBag}
          title="Seu carrinho está vazio"
          description="Explore o catálogo e adicione os produtos que deseja encomendar."
          className="w-full border-0"
          action={
            <Button asChild>
              <Link href="/catalogo" onClick={onNavigate}>
                Ver catálogo
              </Link>
            </Button>
          }
        />
      </div>
    )
  }

  const unavailable = sync.status === "ok" ? sync.unavailable : new Set<string>()
  const availableItems = items.filter((item) => !unavailable.has(item.productId))
  const total = availableItems.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0)
  const hasUnavailable = unavailable.size > 0

  const handleCheckout = () => {
    if (!whatsappReady) {
      setCheckoutError("O número de WhatsApp da loja ainda não foi configurado.")
      return
    }
    setCheckoutError(null)
    // Abre a janela já no clique (evita bloqueio de pop-up) e define o endereço depois.
    const popup = window.open("", "_blank")
    startSubmit(async () => {
      try {
        const result = await createWhatsAppOrder(toCartRequest(items), getVisitorIds().sessionId)
        if (!result.ok) {
          popup?.close()
          setCheckoutError(result.error)
          return
        }
        setSync(applyCheck(result.data.check))
        if (popup) {
          popup.opener = null
          popup.location.href = result.data.url
        } else {
          window.location.href = result.data.url
        }
      } catch {
        popup?.close()
        setCheckoutError("Não foi possível gerar o pedido. Verifique sua conexão e tente novamente.")
      }
    })
  }

  const itemCount = availableItems.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-2">
        {items.map((item) => (
          <CartLine
            key={item.productId}
            item={item}
            unavailable={unavailable.has(item.productId)}
            onNavigate={onNavigate}
          />
        ))}
      </ul>

      <footer className="space-y-3 border-t border-border px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-muted-foreground">
            Total{itemCount > 0 ? ` · ${itemCount === 1 ? "1 item" : `${itemCount} itens`}` : ""}
          </span>
          <span className="text-xl font-bold tabular-nums" aria-live="polite">
            {formatPrice(total)}
          </span>
        </div>
        <StarBorder
          color="#ffffff"
          trailColor="#ffffff"
          duration={4}
          direction="clockwise"
          stars={1}
          trailLength={0.3}
          thickness={1}
          radius={29}
          glow={0.6}
          hover="lap"
          sparkle={false}
          clickPulse
          theme="dark"
          className="cart-checkout-star"
          onClick={handleCheckout}
          // Itens indisponíveis só ficam marcados na lista e não entram no pedido; o resto segue normalmente.
          disabled={!whatsappReady || isSubmitting || sync.status === "checking" || availableItems.length === 0}
        >
          <FaWhatsapp className="size-5" aria-hidden />
          {isSubmitting ? "Gerando pedido…" : "Finalizar pelo WhatsApp"}
        </StarBorder>
        {checkoutError ? (
          <p className="text-center text-xs text-destructive" role="alert">
            {checkoutError}
          </p>
        ) : null}
        <p className="text-center text-[11px] leading-snug text-muted-foreground">
          {whatsappReady ? null : "O WhatsApp da loja ainda não foi configurado. "}
          {hasUnavailable ? "Itens indisponíveis não entram no pedido. " : null}
          {siteConfig.texts.orderDisclaimer}
        </p>
      </footer>
    </div>
  )
}

function CartLine({
  item,
  unavailable,
  onNavigate,
}: {
  item: CartItem
  unavailable: boolean
  onNavigate?: () => void
}) {
  const subtotal = item.unitPriceCents * item.quantity

  return (
    <li>
      <SwipeRow
        drawer="one"
        disabled={false}
        actions={[{ id: "delete", label: "Excluir" }]}
        actionColor="#888888"
        drawerColor="#3f3f46"
        rowColor="#27272a"
        textColor="#ffffff"
        height={64}
        radius={17}
        actionWidth={68}
        direction="left"
        snapBounce={0.2}
        resistance={0.6}
        collapseMs={200}
        commitAt={0.6}
        fullSwipe
        label={`Produto no carrinho: ${item.name}`}
        className="cart-swipe-row"
        onCommit={() => setCartItems((current) => removeFromCart(current, item.productId))}
      >
      <Link
        href={`/produtos/${item.slug}`}
        onClick={onNavigate}
        className={cn(
          "relative size-12 shrink-0 overflow-hidden rounded-lg bg-white/10",
          unavailable && "opacity-50 grayscale",
        )}
        tabIndex={-1}
        aria-hidden
      >
        {item.imageUrl ? (
          <Image src={item.imageUrl} alt="" fill sizes="48px" className="object-cover" />
        ) : (
          <span className="flex h-full items-center justify-center text-white/60">
            <HiOutlinePhoto className="size-6" />
          </span>
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              href={`/produtos/${item.slug}`}
              onClick={onNavigate}
              className={cn(
                "line-clamp-1 text-xs leading-[14px] font-medium hover:underline",
                unavailable && "text-white/60",
              )}
            >
              {item.name}
            </Link>
            <p className="text-[10px] leading-3 text-white/70">
              {unavailable ? (
                <span className="font-medium text-destructive">Indisponível · não entra no pedido</span>
              ) : (
                `${formatPrice(item.unitPriceCents)} cada`
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <QuantityInput
            id={`qty-${item.productId}`}
            label={`Quantidade de ${item.name}`}
            value={item.quantity}
            size="sm"
            className="border-white/25 [&_button]:text-white [&_button:hover]:bg-white/10 [&_button:hover]:text-white"
            disabled={unavailable}
            onChange={(value) => setCartItems((current) => updateQuantity(current, item.productId, value))}
          />
          <p
            className={cn(
              "text-xs font-semibold tabular-nums",
              unavailable && "text-white/60 line-through",
            )}
          >
            {formatPrice(subtotal)}
          </p>
        </div>
      </div>
      </SwipeRow>
    </li>
  )
}
