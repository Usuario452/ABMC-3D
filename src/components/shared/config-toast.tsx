import { ToastOnMount } from "@/components/shared/toast-on-mount"
import type { EnvIssue } from "@/lib/env"

/** Aviso (toast fixo) de variáveis de ambiente ausentes ou inválidas, sem revelar valores. */
export function ConfigToast({ issues }: { issues: EnvIssue[] }) {
  return (
    <ToastOnMount
      id="config-pendente"
      variant="warning"
      duration={Infinity}
      message="Configuração pendente"
      description={`Defina e reinicie a aplicação: ${issues.map((issue) => `${issue.name} (${issue.problem})`).join(", ")}.`}
    />
  )
}
