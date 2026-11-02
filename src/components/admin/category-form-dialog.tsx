"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useState, useTransition, type ReactNode } from "react"
import { Controller, useForm } from "react-hook-form"
import { createCategory, updateCategory } from "@/actions/categories"
import { networkErrorToast, useActionFeedback } from "@/components/admin/action-feedback"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { slugify } from "@/lib/slug"
import { categorySchema, type CategoryInput } from "@/lib/validation/schemas"

type Props = {
  trigger: ReactNode
  category?: { id: string; name: string; slug: string; is_active: boolean }
}

export function CategoryFormDialog({ trigger, category }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category ? "Editar categoria" : "Nova categoria"}</DialogTitle>
          <DialogDescription>Categorias inativas e seus produtos ficam ocultos na loja.</DialogDescription>
        </DialogHeader>
        {open ? <CategoryForm category={category} onDone={() => setOpen(false)} /> : null}
      </DialogContent>
    </Dialog>
  )
}

function CategoryForm({ category, onDone }: { category?: Props["category"]; onDone: () => void }) {
  const feedback = useActionFeedback()
  const [isPending, startTransition] = useTransition()
  const [slugEdited, setSlugEdited] = useState(Boolean(category))

  const form = useForm<CategoryInput>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: category?.name ?? "",
      slug: category?.slug ?? "",
      isActive: category?.is_active ?? true,
    },
  })
  const { errors } = form.formState

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      try {
        const result = category ? await updateCategory(category.id, values) : await createCategory(values)
        if (!result.ok && result.fieldErrors) {
          for (const [field, messages] of Object.entries(result.fieldErrors)) {
            if (messages?.[0]) form.setError(field as keyof CategoryInput, { message: messages[0] })
          }
        }
        if (feedback(result)) onDone()
      } catch {
        networkErrorToast()
      }
    })
  })

  return (
    <form method="post" onSubmit={onSubmit} noValidate className="space-y-6">
      <FieldGroup>
        <Field data-invalid={Boolean(errors.name)}>
          <FieldLabel htmlFor="category-name">Nome</FieldLabel>
          <Input
            id="category-name"
            aria-invalid={Boolean(errors.name)}
            {...form.register("name", {
              onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
                if (!slugEdited) form.setValue("slug", slugify(event.target.value), { shouldValidate: false })
              },
            })}
          />
          <FieldError errors={[errors.name]} />
        </Field>
        <Field data-invalid={Boolean(errors.slug)}>
          <FieldLabel htmlFor="category-slug">Slug (endereço)</FieldLabel>
          <Input
            id="category-slug"
            aria-invalid={Boolean(errors.slug)}
            aria-describedby="category-slug-hint"
            {...form.register("slug", { onChange: () => setSlugEdited(true) })}
          />
          <FieldDescription id="category-slug-hint">Usado na URL do catálogo. Ex.: decoracao</FieldDescription>
          <FieldError errors={[errors.slug]} />
        </Field>
        <Controller
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <Field orientation="horizontal">
              <Switch id="category-active" checked={field.value} onCheckedChange={field.onChange} />
              <FieldLabel htmlFor="category-active">Categoria ativa (visível na loja)</FieldLabel>
            </Field>
          )}
        />
      </FieldGroup>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={isPending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Salvando…" : "Salvar"}
        </Button>
      </DialogFooter>
    </form>
  )
}
