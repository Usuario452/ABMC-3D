"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useSyncExternalStore } from "react"
import type { IconType } from "react-icons"
import {
  HiBars3,
  HiChevronDoubleLeft,
  HiChevronDoubleRight,
  HiCube,
  HiGlobeAlt,
  HiHome,
  HiCalculator,
  HiChartBar,
  HiOutlineCalculator,
  HiOutlineChartBar,
  HiTag,
  HiOutlineChevronRight,
  HiOutlineCube,
  HiOutlineGlobeAlt,
  HiOutlineHome,
  HiOutlineTag,
} from "react-icons/hi2"
import { SignOutItem } from "@/components/admin/sign-out-item"
import { ThemeSwitchVisual } from "@/components/admin/theme-switch"
import { BrandLogo } from "@/components/brand/brand-logo"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useTheme } from "@/lib/theme"
import { cn } from "@/lib/utils"

type NavItem = {
  href: string
  label: string
  icon: IconType
  /** Versão sólida do ícone, usada no item ativo. */
  activeIcon: IconType
  exact?: boolean
  external?: boolean
}

const MENU: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: HiOutlineHome, activeIcon: HiHome, exact: true },
  { href: "/admin/analytics", label: "Analytics", icon: HiOutlineChartBar, activeIcon: HiChartBar },
  { href: "/admin/produtos", label: "Produtos", icon: HiOutlineCube, activeIcon: HiCube },
  { href: "/admin/categorias", label: "Categorias", icon: HiOutlineTag, activeIcon: HiTag },
  { href: "/admin/calculadora", label: "Calculadora", icon: HiOutlineCalculator, activeIcon: HiCalculator },
]

const STORE: NavItem[] = [
  { href: "/", label: "Ver loja", icon: HiOutlineGlobeAlt, activeIcon: HiGlobeAlt, external: true },
]

// ---------------------------------------------------------------------------
// Estado "recolhido" do painel lateral, lembrado entre visitas (localStorage).
// useSyncExternalStore evita diferença entre o HTML do servidor e o do navegador.
// ---------------------------------------------------------------------------

const STORAGE_KEY = "abmc3d:admin-sidebar-collapsed"
const CHANGE_EVENT = "abmc3d:admin-sidebar"

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange)
  window.addEventListener(CHANGE_EVENT, onChange)
  return () => {
    window.removeEventListener("storage", onChange)
    window.removeEventListener(CHANGE_EVENT, onChange)
  }
}

function readCollapsed() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1"
  } catch {
    return false
  }
}

function useSidebarCollapsed() {
  const collapsed = useSyncExternalStore(subscribe, readCollapsed, () => false)
  const toggle = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, collapsed ? "0" : "1")
    } catch {
      // Sem armazenamento disponível: o menu só não lembra a escolha.
    }
    window.dispatchEvent(new Event(CHANGE_EVENT))
  }
  return [collapsed, toggle] as const
}

// ---------------------------------------------------------------------------

function NavLinks({
  items,
  collapsed,
  onNavigate,
}: {
  items: NavItem[]
  collapsed: boolean
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  // Destaque imediato no clique: o item vira o ativo antes da página nova chegar do servidor.
  // O clique só vale enquanto a rota atual é a de onde ele partiu.
  const [clicked, setClicked] = useState<{ href: string; from: string } | null>(null)
  const target = clicked && clicked.from === pathname ? clicked.href : pathname

  return (
    <ul className="space-y-1">
      {items.map(({ href, label, icon, activeIcon, exact, external }) => {
        const active = !external && (exact ? target === href : target === href || target.startsWith(`${href}/`))
        const Icon = active ? activeIcon : icon
        return (
          <li key={href}>
            <Link
              href={href}
              target={external ? "_blank" : undefined}
              onClick={() => {
                if (!external) setClicked({ href, from: pathname })
                onNavigate?.()
              }}
              aria-current={active ? "page" : undefined}
              aria-label={collapsed ? label : undefined}
              title={collapsed ? label : undefined}
              className={cn(
                "relative flex items-center rounded-md text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                collapsed ? "mx-auto size-11 justify-center" : "gap-3 px-3 py-2.5",
                active ? "bg-gold/10 text-gold" : "text-foreground/75 hover:bg-accent hover:text-foreground",
              )}
            >
              <Icon className="size-5 shrink-0" aria-hidden />
              {collapsed ? null : label}
              {external ? <span className="sr-only">(abre em nova aba)</span> : null}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

function Section({
  label,
  collapsed,
  separated = false,
  children,
}: {
  label: string
  collapsed: boolean
  /** Linha fina acima do bloco, separando-o do anterior. */
  separated?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      {separated ? <div aria-hidden className="mx-3 mb-4 h-px bg-border" /> : null}
      {collapsed ? null : (
        <p className="mb-2 px-3 text-[0.6875rem] font-semibold tracking-[0.18em] text-muted-foreground uppercase">{label}</p>
      )}
      {children}
    </div>
  )
}

function UserMenu({ email, collapsed }: { email: string | null; collapsed: boolean }) {
  const initial = (email ?? "A").trim().charAt(0).toUpperCase()
  const [theme, setTheme] = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Menu do usuário"
          title={collapsed ? (email ?? "Administrador") : undefined}
          className={cn(
            "flex w-full items-center rounded-md text-left transition-colors outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
            collapsed ? "mx-auto size-11 justify-center" : "gap-3 p-2.5",
          )}
        >
          <span
            aria-hidden
            className="bg-gold-gradient flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-primary-foreground"
          >
            {initial}
          </span>
          {collapsed ? null : (
            <>
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block truncate text-sm font-medium">{email ?? "Administrador"}</span>
                <span className="block text-xs text-muted-foreground">Administrador</span>
              </span>
              <HiOutlineChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="end" sideOffset={12} className="w-56">
        <DropdownMenuLabel className="truncate font-normal text-muted-foreground">{email ?? "Administrador"}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {/* A linha toda alterna o tema (clique ou Enter), sem fechar o menu. */}
        <DropdownMenuItem
          role="menuitemcheckbox"
          aria-checked={theme === "dark"}
          aria-label="Tema escuro"
          onSelect={(event) => {
            event.preventDefault()
            setTheme(theme === "dark" ? "light" : "dark")
          }}
          className="justify-between"
        >
          <span>Tema {theme === "dark" ? "escuro" : "claro"}</span>
          <ThemeSwitchVisual theme={theme} />
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <SignOutItem />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Conteúdo do menu: logo, navegação em seções e usuário. Usado no painel flutuante e na gaveta. */
function SidebarContent({
  email,
  collapsed = false,
  onToggle,
  onNavigate,
}: {
  email: string | null
  collapsed?: boolean
  onToggle?: () => void
  onNavigate?: () => void
}) {
  return (
    <div className="flex h-full flex-col gap-6">
      <div className={cn("flex items-center", collapsed ? "flex-col gap-3 pt-1" : "justify-between pt-1 pl-1")}>
        <Link
          href="/admin"
          aria-label="Painel ABMC 3D"
          onClick={onNavigate}
          className="block rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {collapsed ? (
            <Image src="/brand/abmc-icon.png" alt="ABMC 3D" width={44} height={44} className="size-11" />
          ) : (
            <BrandLogo className="w-36" />
          )}
        </Link>
        {onToggle ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onToggle}
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
            aria-expanded={!collapsed}
            title={collapsed ? "Expandir menu" : "Recolher menu"}
            className="text-muted-foreground hover:bg-transparent hover:text-foreground aria-expanded:bg-transparent aria-expanded:hover:bg-transparent"
          >
            {collapsed ? (
              <HiChevronDoubleRight className="size-4" aria-hidden />
            ) : (
              <HiChevronDoubleLeft className="size-4" aria-hidden />
            )}
          </Button>
        ) : null}
      </div>

      <nav aria-label="Painel" className="flex-1 space-y-6">
        <Section label="Menu" collapsed={collapsed}>
          <NavLinks items={MENU} collapsed={collapsed} onNavigate={onNavigate} />
        </Section>
        <Section label="Loja" collapsed={collapsed} separated>
          <NavLinks items={STORE} collapsed={collapsed} onNavigate={onNavigate} />
        </Section>
      </nav>

      <div className="border-t border-border pt-3">
        <UserMenu email={email} collapsed={collapsed} />
      </div>
    </div>
  )
}

/** Painel lateral flutuante (a partir de lg): cartão arredondado, afastado das bordas, recolhível. */
export function AdminSidebar({ email }: { email: string | null }) {
  const [collapsed, toggle] = useSidebarCollapsed()

  return (
    <div
      className={cn(
        "h-full rounded-lg bg-card p-3 shadow-md shadow-black/5 transition-[width] duration-200 dark:shadow-none",
        collapsed ? "w-[4.5rem]" : "w-60 xl:w-64",
      )}
    >
      <SidebarContent email={email} collapsed={collapsed} onToggle={toggle} />
    </div>
  )
}

/** Itens fixos na barra de baixo do celular; o resto fica no "Menu". */
const PINNED: NavItem[] = [
  { ...MENU[0], label: "Início" },
  MENU[1],
  MENU[2],
  MENU[3],
]

const isActive = (target: string, { href, exact }: NavItem) =>
  exact ? target === href : target === href || target.startsWith(`${href}/`)

/**
 * Navegação do celular (abaixo de lg): barra fixa embaixo com as páginas principais e o "Menu", que abre
 * a gaveta com todas as páginas, a loja, o tema e sair. No celular o painel não tem cabeçalho.
 */
export function AdminBottomNav({ email }: { email: string | null }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  // Destaque imediato no toque, antes da página nova chegar (mesma ideia do menu lateral).
  const [clicked, setClicked] = useState<{ href: string; from: string } | null>(null)
  const target = clicked && clicked.from === pathname ? clicked.href : pathname
  const hiddenActive = !PINNED.some((item) => isActive(target, item))

  const tab =
    "flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[10px] leading-none font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring"

  return (
    <>
      <nav
        aria-label="Painel"
        className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 flex gap-1 rounded-xl border border-border bg-card p-1.5 shadow-lg shadow-black/10 lg:hidden"
      >
        {PINNED.map((item) => {
          const active = isActive(target, item)
          const Icon = active ? item.activeIcon : item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setClicked({ href: item.href, from: pathname })}
              aria-current={active ? "page" : undefined}
              className={cn(tab, active ? "bg-gold/10 text-gold" : "text-muted-foreground hover:text-foreground")}
            >
              <Icon className="size-5" aria-hidden />
              {item.label}
            </Link>
          )
        })}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir menu do painel"
          aria-expanded={open}
          className={cn(
            tab,
            open || hiddenActive ? "bg-gold/10 text-gold" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <HiBars3 className="size-5" aria-hidden />
          Menu
        </button>
      </nav>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-[85vw] max-w-xs">
          <SheetHeader className="sr-only">
            <SheetTitle>Painel</SheetTitle>
            <SheetDescription>Navegação do painel administrativo</SheetDescription>
          </SheetHeader>
          <div className="h-full p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <SidebarContent email={email} onNavigate={() => setOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
