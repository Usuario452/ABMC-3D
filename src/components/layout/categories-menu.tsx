"use client"

import Link from "next/link"
import { HiChevronDown } from "react-icons/hi2"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { CategorySummary } from "@/types/catalog"

export function CategoriesMenu({ categories }: { categories: CategorySummary[] }) {
  if (categories.length === 0) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="font-medium">
          Categorias
          <HiChevronDown aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-52">
        {categories.map((category) => (
          <DropdownMenuItem key={category.id} asChild>
            <Link href={`/catalogo?categoria=${category.slug}`}>{category.name}</Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/catalogo">Ver todo o catálogo</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
