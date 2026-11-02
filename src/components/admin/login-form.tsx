"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useState, useTransition } from "react"
import { Controller, useForm } from "react-hook-form"
import { HiArrowRight, HiOutlineEnvelope, HiOutlineEye, HiOutlineEyeSlash, HiOutlineLockClosed } from "react-icons/hi2"
import { toast } from "sonner"
import { signIn } from "@/actions/auth"
import { ToastOnMount } from "@/components/shared/toast-on-mount"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { signInSchema, type SignInInput } from "@/lib/validation/schemas"

/** Toda falha de login usa o mesmo título; a descrição (até 2 linhas) explica o motivo. */
function loginErrorToast(description: string) {
  toast.error("Erro ao fazer login", { id: "login-erro", description })
}

const inputIcon = "pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted-foreground"

export type LoginNotice = { message: string; variant: "info" | "success" }

export function LoginForm({ notice, redirectTo }: { notice?: LoginNotice; redirectTo?: string }) {
  const [isPending, startTransition] = useTransition()
  const [showPassword, setShowPassword] = useState(false)
  const form = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "", remember: false },
  })

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      try {
        // Em caso de sucesso, a action redireciona para o painel.
        const result = await signIn(values, redirectTo)
        if (result.fieldErrors) {
          for (const [field, messages] of Object.entries(result.fieldErrors)) {
            if (messages?.[0]) form.setError(field as keyof SignInInput, { message: messages[0] })
          }
        }
        loginErrorToast(result.error)
      } catch (error) {
        // O redirecionamento do Next.js também chega aqui como exceção.
        if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) throw error
        loginErrorToast("Falha de comunicação com o servidor. Verifique sua conexão e tente novamente.")
      }
    })
  })

  return (
    <form method="post" onSubmit={onSubmit} noValidate className="space-y-6">
      {notice ? <ToastOnMount id="login-aviso" variant={notice.variant} message={notice.message} /> : null}

      <FieldGroup>
        <Field data-invalid={Boolean(form.formState.errors.email)}>
          <FieldLabel htmlFor="email">E-mail</FieldLabel>
          <div className="relative">
            <HiOutlineEnvelope className={inputIcon} aria-hidden />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="voce@exemplo.com"
              className="h-12 bg-surface-elevated/60 pl-11 text-base md:text-base"
              aria-invalid={Boolean(form.formState.errors.email)}
              {...form.register("email")}
            />
          </div>
          <FieldError errors={[form.formState.errors.email]} />
        </Field>

        <Field data-invalid={Boolean(form.formState.errors.password)}>
          <FieldLabel htmlFor="password">Senha</FieldLabel>
          <div className="relative">
            <HiOutlineLockClosed className={inputIcon} aria-hidden />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Sua senha"
              className="h-12 bg-surface-elevated/60 pr-12 pl-11 text-base md:text-base"
              aria-invalid={Boolean(form.formState.errors.password)}
              {...form.register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              aria-pressed={showPassword}
              className="absolute top-1/2 right-1.5 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors outline-none hover:text-gold focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {showPassword ? (
                <HiOutlineEyeSlash className="size-5" aria-hidden />
              ) : (
                <HiOutlineEye className="size-5" aria-hidden />
              )}
            </button>
          </div>
          <FieldError errors={[form.formState.errors.password]} />
        </Field>
      </FieldGroup>

      <Controller
        control={form.control}
        name="remember"
        render={({ field }) => (
          <label
            htmlFor="remember"
            className="flex w-fit cursor-pointer items-center gap-2.5 text-sm text-muted-foreground select-none"
          >
            <Checkbox
              id="remember"
              checked={field.value === true}
              onCheckedChange={(checked) => field.onChange(checked === true)}
            />
            Lembrar de mim
          </label>
        )}
      />

      <Button
        type="submit"
        size="lg"
        disabled={isPending}
        className="h-12 w-full text-base"
      >
        {isPending ? (
          <>
            <span
              className="size-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground"
              aria-hidden
            />
            Entrando…
          </>
        ) : (
          <>
            Entrar no painel
            <HiArrowRight aria-hidden />
          </>
        )}
      </Button>
    </form>
  )
}
