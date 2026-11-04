/** Chave em que a escolha de tema é guardada (localStorage). */
export const THEME_STORAGE_KEY = "kubostudio:theme"

/**
 * Roda no <head>, antes da hidratação, para evitar o "piscar" do tema errado:
 * claro é o padrão; só vira escuro se "dark" tiver sido escolhido.
 * Fica fora de theme.ts porque o layout (componente de servidor) o importa.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");document.documentElement.classList.toggle("dark",t==="dark")}catch(e){}})()`
