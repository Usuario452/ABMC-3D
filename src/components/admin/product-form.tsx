"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { createProduct, updateProduct } from "@/actions/products"
import { networkErrorToast, useActionFeedback } from "@/components/admin/action-feedback"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
  FieldLegend,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { centsToInputValue } from "@/lib/format"
import { slugify } from "@/lib/slug"
import { productSchema, type ProductData, type ProductInput } from "@/lib/validation/schemas"
import type { ProductRow } from "@/types/catalog"

type CategoryOption = { id: string; name: string; is_active: boolean }

export function ProductForm({ product, categories }: { product?: ProductRow; categories: CategoryOption[] }) {
  const router = useRouter()
  const feedback = useActionFeedback()
  const [isPending, startTransition] = useTransition()
  const [slugEdited, setSlugEdited] = useState(Boolean(product))

  const form = useForm<ProductInput, unknown, ProductData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name ?? "",
      slug: product?.slug ?? "",
      description: product?.description ?? "",
      price: product ? centsToInputValue(product.price_cents) : "",
      categoryId: product?.category_id ?? "",
      isActive: product?.is_active ?? true,
      isAvailable: product?.is_available ?? true,
      isFeatured: product?.is_featured ?? false,
    },
  })
  const { errors, isDirty } = form.formState
  const slug = useWatch({ control: form.control, name: "slug" })

  const onSubmit = form.handleSubmit((values) => {
    // Envia o texto original do preço; o servidor converte e valida novamente.
    const input: ProductInput = { ...values, price: form.getValues("price") }
    startTransition(async () => {
      try {
        if (product) {
          const result = await updateProduct(product.id, input)
          applyFieldErrors(result)
          if (feedback(result)) form.reset(form.getValues())
        } else {
          const result = await createProduct(input)
          applyFieldErrors(result)
          if (feedback(result, "Produto criado.")) {
            router.push(`/admin/produtos/${result.data.id}?novo=1`)
          }
        }
      } catch {
        networkErrorToast()
      }
    })
  })

  function applyFieldErrors(result: { ok: boolean; fieldErrors?: Record<string, string[] | undefined> }) {
    if (result.ok || !result.fieldErrors) return
    for (const [field, messages] of Object.entries(result.fieldErrors)) {
      if (messages?.[0]) form.setError(field as keyof ProductInput, { message: messages[0] })
    }
  }

  return (
    <form method="post" onSubmit={onSubmit} noValidate className="space-y-6">
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg">Informações do produto</CardTitle>
          <CardDescription>Nome, endereço da página, descrição, preço e categoria.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field data-invalid={Boolean(errors.name)}>
              <FieldLabel htmlFor="product-name">Nome</FieldLabel>
              <Input
                id="product-name"
                aria-invalid={Boolean(errors.name)}
                {...form.register("name", {
                  onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
                    if (!slugEdited) form.setValue("slug", slugify(event.target.value, 140))
                  },
                })}
              />
              <FieldError errors={[errors.name]} />
            </Field>

            <Field data-invalid={Boolean(errors.slug)}>
              <FieldLabel htmlFor="product-slug">Slug (endereço da página)</FieldLabel>
              <Input
                id="product-slug"
                aria-invalid={Boolean(errors.slug)}
                aria-describedby="product-slug-hint"
                {...form.register("slug", { onChange: () => setSlugEdited(true) })}
              />
              <FieldDescription id="product-slug-hint">
                Gerado a partir do nome. A página ficará em /produtos/{slug || "slug"}
              </FieldDescription>
              <FieldError errors={[errors.slug]} />
            </Field>

            <Field data-invalid={Boolean(errors.description)}>
              <FieldLabel htmlFor="product-description">Descrição</FieldLabel>
              <Textarea
                id="product-description"
                rows={6}
                aria-invalid={Boolean(errors.description)}
                {...form.register("description")}
              />
              <FieldDescription>Separe parágrafos com uma linha em branco.</FieldDescription>
              <FieldError errors={[errors.description]} />
            </Field>

            <div className="grid gap-6 sm:grid-cols-2">
              <Field data-invalid={Boolean(errors.price)}>
                <FieldLabel htmlFor="product-price">Preço (R$)</FieldLabel>
                <Input
                  id="product-price"
                  inputMode="decimal"
                  placeholder="0,00"
                  aria-invalid={Boolean(errors.price)}
                  {...form.register("price")}
                />
                <FieldError errors={[errors.price]} />
              </Field>

              <Controller
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <Field data-invalid={Boolean(errors.categoryId)}>
                    <FieldLabel htmlFor="product-category">Categoria</FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger
                        id="product-category"
                        className="w-full"
                        aria-invalid={Boolean(errors.categoryId)}
                        onBlur={field.onBlur}
                      >
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                            {!category.is_active ? " (inativa)" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {categories.length === 0 ? (
                      <FieldDescription>
                        Nenhuma categoria cadastrada.{" "}
                        <Link href="/admin/categorias" className="text-gold underline-offset-4 hover:underline">
                          Criar categoria
                        </Link>
                      </FieldDescription>
                    ) : null}
                    <FieldError errors={[errors.categoryId]} />
                  </Field>
                )}
              />
            </div>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg">Visibilidade</CardTitle>
          <CardDescription>Controle se e como o produto aparece na loja.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldSet>
            <FieldLegend className="sr-only">Visibilidade do produto</FieldLegend>
            <FieldGroup>
              <ToggleField
                control={form.control}
                name="isActive"
                label="Produto ativo"
                description="Produtos inativos não aparecem na loja."
              />
              <ToggleField
                control={form.control}
                name="isAvailable"
                label="Disponível"
                description="Produtos indisponíveis ficam ocultos na loja e são sinalizados nos carrinhos."
              />
              <ToggleField
                control={form.control}
                name="isFeatured"
                label="Destaque na página inicial"
                description="Exibe o produto na seção de destaques."
              />
            </FieldGroup>
          </FieldSet>
        </CardContent>
      </Card>

      <div className="sticky bottom-4 z-10 flex flex-col-reverse gap-3 rounded-2xl border border-border bg-card/90 p-3 shadow-xl shadow-black/10 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between dark:shadow-black/40">
        <p className="px-2 text-sm text-muted-foreground" aria-live="polite">
          {product ? (isDirty ? "Você tem alterações não salvas." : "Tudo salvo.") : "Preencha os dados para criar o produto."}
        </p>
        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          <Button asChild variant="outline" size="lg">
            <Link href="/admin/produtos">{product ? "Voltar" : "Cancelar"}</Link>
          </Button>
          <Button type="submit" size="lg" disabled={isPending || (Boolean(product) && !isDirty)}>
            {isPending ? "Salvando…" : product ? "Salvar alterações" : "Criar produto"}
          </Button>
        </div>
      </div>
    </form>
  )
}

function ToggleField({
  control,
  name,
  label,
  description,
}: {
  control: ReturnType<typeof useForm<ProductInput, unknown, ProductData>>["control"]
  name: "isActive" | "isAvailable" | "isFeatured"
  label: string
  description: string
}) {
  const id = `product-${name}`
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Field orientation="horizontal" className="rounded-xl border border-border p-4">
          <Switch id={id} checked={field.value} onCheckedChange={field.onChange} aria-describedby={`${id}-hint`} />
          <FieldContent>
            <FieldLabel htmlFor={id}>{label}</FieldLabel>
            <FieldDescription id={`${id}-hint`}>{description}</FieldDescription>
          </FieldContent>
        </Field>
      )}
    />
  )
}
