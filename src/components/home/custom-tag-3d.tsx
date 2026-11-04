/**
 * Chaveiro personalizado "impresso" em 3D, feito só com CSS: a placa e as letras são pilhas de camadas em
 * profundidade (como as camadas da impressora), com faixas alternadas que lembram as linhas de impressão.
 */
const PLATE_LAYERS = 14
const TEXT_LAYERS = 6
const LAYER_GAP = 1.4

// Balanço lento da peça (o CSS global já anula animações com "reduzir movimento").
const SWAY_CSS = `
@keyframes custom-tag-sway {
  0%, 100% { transform: rotateX(16deg) rotateY(-30deg) rotateZ(-8deg) translateY(0); }
  50% { transform: rotateX(22deg) rotateY(-14deg) rotateZ(-5deg) translateY(-6px); }
}
.custom-tag-sway {
  transform: rotateX(16deg) rotateY(-30deg) rotateZ(-8deg);
  animation: custom-tag-sway 7s ease-in-out infinite;
}
`

export function CustomTag3D({ text = "SEU NOME", className }: { text?: string; className?: string }) {
  return (
    <div aria-hidden className={className} style={{ perspective: "700px" }}>
      <style href="custom-tag-sway" precedence="default">
        {SWAY_CSS}
      </style>
      <div className="custom-tag-sway relative h-28 w-60" style={{ transformStyle: "preserve-3d" }}>
        {/* Placa: camadas de baixo mais escuras; linhas de impressão alternando o tom. */}
        {Array.from({ length: PLATE_LAYERS }, (_, i) => {
          const top = i === PLATE_LAYERS - 1
          const shade = top ? 100 : 68 + (i / PLATE_LAYERS) * 22 - (i % 2) * 4
          return (
            <div
              key={`p${i}`}
              className="absolute inset-0 rounded-[22px]"
              style={{
                transform: `translateZ(${i * LAYER_GAP}px)`,
                background: top
                  ? "linear-gradient(140deg, #ffffff, #ece9e1)"
                  : `color-mix(in srgb, #f4f1ea ${shade}%, #0a0a0b)`,
                boxShadow: i === 0 ? "0 18px 30px -8px rgb(0 0 0 / 0.55)" : undefined,
              }}
            >
              {/* Furo da argola, atravessando todas as camadas. */}
              <span
                className="absolute top-1/2 left-4 size-5 -translate-y-1/2 rounded-full"
                style={{ background: "#2a2620", boxShadow: "inset 0 2px 3px rgb(0 0 0 / 0.6)" }}
              />
            </div>
          )
        })}

        {/* Letras em relevo, também em camadas, sobre a placa. */}
        {Array.from({ length: TEXT_LAYERS }, (_, i) => {
          const top = i === TEXT_LAYERS - 1
          return (
            <span
              key={`t${i}`}
              className="absolute inset-y-0 right-5 left-12 flex items-center justify-center text-[1.7rem] font-extrabold tracking-tight whitespace-nowrap"
              style={{
                transform: `translateZ(${(PLATE_LAYERS + i) * LAYER_GAP}px)`,
                color: top ? "#0a0a0b" : `color-mix(in srgb, var(--brand-gold-dark) ${60 + i * 6}%, #0a0a0b)`,
              }}
            >
              {text}
            </span>
          )
        })}

        {/* Argola de metal presa ao furo. */}
        <span
          className="absolute top-1/2 -left-7 size-14 -translate-y-1/2 rounded-full border-[5px] border-[#d8d4cb]"
          style={{
            transform: `translateZ(${(PLATE_LAYERS / 2) * LAYER_GAP}px) rotateY(70deg)`,
            boxShadow: "inset 0 0 0 1px rgb(0 0 0 / 0.25), 0 0 0 1px rgb(0 0 0 / 0.2)",
          }}
        />
      </div>
    </div>
  )
}
