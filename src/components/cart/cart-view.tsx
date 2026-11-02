"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useState, useTransition } from "react"
import { FaWhatsapp } from "react-icons/fa6"
import { HiOutlinePhoto, HiOutlineShoppingBag, HiOutlineTrash } from "react-icons/hi2"
import { toast } from "sonner"
import { checkCart, createWhatsAppOrder, type CartCheck } from "@/actions/cart"
import { QuantityInput } from "@/components/cart/quantity-input"
import { StateMessage } from "@/components/shared/state-message"
import { Badge } from "@/components/ui/badge"
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

const TOAST_UNAVAILABLE = "carrinho-indisponiveis"
const TOAST_PRICES = "carrinho-precos"
const TOAST_SYNC_ERROR = "carrinho-verificacao"

/** Avisos do carrinho como toasts: itens indisponíveis, preços atualizados e falha na verificação. */
function useCartToasts(sync: SyncState) {
  const unavailableKey = sync.status === "ok" ? [...sync.unavailable].sort().join(",") : ""
  const priceChanged = sync.status === "ok" && sync.priceChanged
  const errorMessage = sync.status === "error" ? sync.message : ""
  const errorIsConfig = sync.status === "error" && sync.isConfig

  useEffect(() => {
    if (!unavailableKey) return
    const ids = new Set(unavailableKey.split(","))
    toast.error("Alguns produtos não estão mais disponíveis", {
      id: TOAST_UNAVAILABLE,
      description: "Foram removidos do catálogo ou estão indisponíveis e não entram no pedido.",
      duration: Infinity,
      action: {
        label: "Remover indisponíveis",
        // A lista de produtos muda e o carrinho é revalidado automaticamente.
        onClick: () => setCartItems((current) => current.filter((item) => !ids.has(item.productId))),
      },
    })
    return () => {
      toast.dismiss(TOAST_UNAVAILABLE)
    }
  }, [unavailableKey])

  useEffect(() => {
    if (!priceChanged) return
    toast.info("Preços atualizados", {
      id: TOAST_PRICES,
      description: "Alguns valores mudaram desde que você adicionou os produtos.",
    })
    return () => {
      toast.dismiss(TOAST_PRICES)
    }
  }, [priceChanged])

  useEffect(() => {
    if (!errorMessage) return
    if (errorIsConfig) {
      toast.warning("Configuração pendente", { id: TOAST_SYNC_ERROR, description: errorMessage, duration: Infinity })
    } else {
      toast.warning("Não foi possível verificar os preços", {
        id: TOAST_SYNC_ERROR,
        description: `${errorMessage} Os valores serão conferidos novamente ao finalizar.`,
      })
    }
    return () => {
      toast.dismiss(TOAST_SYNC_ERROR)
    }
  }, [errorMessage, errorIsConfig])
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

export function CartView() {
  const items = useCartItems()
  const hydrated = useCartHydrated()
  const [sync, setSync] = useCartSync(items, hydrated)
  const [isSubmitting, startSubmit] = useTransition()
  const whatsappReady = getWhatsAppConfig().ok
  useCartToasts(sync)

  if (!hydrated) {
    return (
      <div className="space-y-4" aria-hidden>
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <StateMessage
        icon={HiOutlineShoppingBag}
        title="Seu carrinho está vazio"
        description="Explore o catálogo e adicione os produtos que deseja encomendar."
        action={
          <Button asChild>
            <Link href="/catalogo">Ver catálogo</Link>
          </Button>
        }
      />
    )
  }

  const unavailable = sync.status === "ok" ? sync.unavailable : new Set<string>()
  const availableItems = items.filter((item) => !unavailable.has(item.productId))
  const total = availableItems.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0)
  const hasUnavailable = unavailable.size > 0

  const handleCheckout = () => {
    if (!whatsappReady) {
      toast.error("O número de WhatsApp da loja ainda não foi configurado.")
      return
    }
    // Abre a janela já no clique (evita bloqueio de pop-up) e define o endereço depois.
    const popup = window.open("", "_blank")
    startSubmit(async () => {
      try {
        const result = await createWhatsAppOrder(toCartRequest(items), getVisitorIds().sessionId)
        if (!result.ok) {
          popup?.close()
          toast.error(result.error)
          return
        }
        const check = result.data.check
        const state = applyCheck(check)
        setSync(state)
        if (state.status === "ok" && state.priceChanged) {
          toast.info("Alguns preços foram atualizados. O pedido usa os valores atuais.", { id: TOAST_PRICES })
        }
        if (popup) {
          popup.opener = null
          popup.location.href = result.data.url
        } else {
          window.location.href = result.data.url
        }
      } catch {
        popup?.close()
        toast.error("Não foi possível gerar o pedido. Verifique sua conexão e tente novamente.")
      }
    })
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {items.map((item) => (
            <CartLine key={item.productId} item={item} unavailable={unavailable.has(item.productId)} />
          ))}
        </ul>
      </div>

      <aside className="h-fit space-y-5 rounded-xl border border-border bg-card p-6 lg:sticky lg:top-24" aria-labelledby="resumo-titulo">
        <h2 id="resumo-titulo" className="text-lg font-semibold">
          Resumo do pedido
        </h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Itens</dt>
            <dd>{availableItems.reduce((sum, item) => sum + item.quantity, 0)}</dd>
          </div>
          <div className="flex items-baseline justify-between border-t border-border pt-3">
            <dt className="font-semibold">Total estimado</dt>
            <dd className="text-2xl font-bold text-gold" aria-live="polite">
              {formatPrice(total)}
            </dd>
          </div>
        </dl>

        <Button
          size="lg"
          className="w-full"
          onClick={handleCheckout}
          disabled={
            !whatsappReady ||
            isSubmitting ||
            sync.status === "checking" ||
            hasUnavailable ||
            availableItems.length === 0
          }
        >
          <FaWhatsapp className="size-5" aria-hidden />
          {isSubmitting ? "Gerando pedido…" : "Finalizar pelo WhatsApp"}
        </Button>
        {hasUnavailable ? (
          <p className="text-xs text-destructive">Remova os itens indisponíveis para finalizar.</p>
        ) : null}
        <p className="text-xs text-muted-foreground">{siteConfig.texts.orderDisclaimer}</p>
        <Button asChild variant="ghost" className="w-full">
          <Link href="/catalogo">Continuar comprando</Link>
        </Button>
      </aside>
    </div>
  )
}

function CartLine({ item, unavailable }: { item: CartItem; unavailable: boolean }) {
  const subtotal = item.unitPriceCents * item.quantity

  return (
    <li className="flex gap-4 p-4">
      <Link
        href={`/produtos/${item.slug}`}
        className="relative size-20 shrink-0 overflow-hidden rounded-lg border border-border bg-surface-elevated sm:size-24"
        tabIndex={-1}
        aria-hidden
      >
        {item.imageUrl ? (
          <Image src={item.imageUrl} alt="" fill sizes="96px" className="object-cover" />
        ) : (
          <span className="flex h-full items-center justify-center text-muted-foreground">
            <HiOutlinePhoto className="size-6" />
          </span>
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link href={`/produtos/${item.slug}`} className="line-clamp-2 font-semibold hover:text-gold">
              {item.name}
            </Link>
            <p className="mt-1 text-sm text-muted-foreground">{formatPrice(item.unitPriceCents)} cada</p>
            {unavailable ? (
              <Badge variant="destructive" className="mt-2">
                Indisponível
              </Badge>
            ) : null}
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Remover ${item.name} do carrinho`}
            onClick={() => setCartItems((current) => removeFromCart(current, item.productId))}
          >
            <HiOutlineTrash className="size-5" aria-hidden />
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <QuantityInput
            id={`qty-${item.productId}`}
            label={`Quantidade de ${item.name}`}
            value={item.quantity}
            disabled={unavailable}
            onChange={(value) => setCartItems((current) => updateQuantity(current, item.productId, value))}
          />
          <p className="text-sm">
            <span className="text-muted-foreground">Subtotal: </span>
            <span className={unavailable ? "font-semibold text-muted-foreground line-through" : "font-semibold"}>
              {formatPrice(subtotal)}
            </span>
          </p>
        </div>
      </div>
    </li>
  )
}
