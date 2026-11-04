"use client"

import { useEffect, useRef, type CSSProperties } from "react"
import { cn } from "@/lib/utils"

/**
 * Ilustração original da tela de login: sobre a mesa de impressão, o cubo grande é construído
 * bloco a bloco, um de cada vez, cada um caindo no lugar com um pequeno quique. Depois de pronto ele
 * fica um instante e a construção recomeça. Vetorial, usa os tokens de cor da marca e anima com CSS
 * (com prefers-reduced-motion: cubo pronto e parado).
 *
 * Interação com o mouse: a cena tem parallax em camadas, os blocos perto do cursor sobem e, ao clicar,
 * uma onda de blocos se propaga a partir do ponto clicado.
 */

const N = 5 // blocos por aresta
const EDGE = 30 // aresta de cada bloco no viewBox
const DX = EDGE * Math.cos(Math.PI / 6)
const DY = EDGE / 2
const CX = 300
const BACK_Y = 260 // vértice de trás da base do cubo
const CYCLE = 34 // segundos por construção completa
const BUILD_START = 3 // % do ciclo em que o primeiro bloco cai
const BUILD_END = 80 // % do ciclo em que o último bloco cai
const HOLD_END = 93 // % do ciclo até o cubo pronto começar a sumir

const HOVER_RADIUS = 78 // alcance do cursor (unidades do viewBox)
const HOVER_LIFT = 15 // quanto um bloco sobe ao ficar sob o cursor
const PARALLAX = { x: 9, y: 6 } // deslocamento máximo da camada mais próxima

type Point = readonly [number, number]

const lerp = (a: Point, b: Point, t: number): Point => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
const move = ([x, y]: Point, dy: number): Point => [x, y + dy]
const points = (...list: Point[]) => list.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ")

/** Projeção isométrica de um ponto (a, b, c): a e b descem (direita e esquerda), c sobe. */
const project = (a: number, b: number, c: number): Point => [CX + (a - b) * DX, BACK_Y + (a + b) * DY - c * EDGE]

/** Grade isométrica dentro de um losango (linhas da mesa de impressão). */
function rhombusGrid(back: Point, right: Point, front: Point, left: Point, steps: number) {
  const segments: string[] = []
  for (let k = 1; k < steps; k++) {
    const t = k / steps
    const [ax, ay] = lerp(back, left, t)
    const [bx, by] = lerp(right, front, t)
    const [cx, cy] = lerp(back, right, t)
    const [dx, dy] = lerp(left, front, t)
    segments.push(`M${ax.toFixed(1)} ${ay.toFixed(1)}L${bx.toFixed(1)} ${by.toFixed(1)}`)
    segments.push(`M${cx.toFixed(1)} ${cy.toFixed(1)}L${dx.toFixed(1)} ${dy.toFixed(1)}`)
  }
  return segments.join("")
}

// Mesa de impressão: o losango da base do cubo ampliado em volta do seu centro.
const BIG_DX = N * DX
const BIG_DY = N * DY
const PLATE_SCALE = 1.5
const PLATE_THICKNESS = 10
const baseCenterY = BACK_Y + BIG_DY
const plateF: Point = [CX, baseCenterY + BIG_DY * PLATE_SCALE]
const plateR: Point = [CX + BIG_DX * PLATE_SCALE, baseCenterY]
const plateB: Point = [CX, baseCenterY - BIG_DY * PLATE_SCALE]
const plateL: Point = [CX - BIG_DX * PLATE_SCALE, baseCenterY]

type Block = { top: string; left: string; right: string; cx: number; cy: number }

/** Ordem de construção: camada por camada, de baixo para cima; dentro da camada, do fundo para a frente. */
const BLOCKS: Block[] = []
for (let k = 0; k < N; k++) {
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const [cx, cy] = project(i + 0.5, j + 0.5, k + 0.5)
      BLOCKS.push({
        top: points(project(i, j, k + 1), project(i + 1, j, k + 1), project(i + 1, j + 1, k + 1), project(i, j + 1, k + 1)),
        left: points(project(i, j + 1, k), project(i + 1, j + 1, k), project(i + 1, j + 1, k + 1), project(i, j + 1, k + 1)),
        right: points(project(i + 1, j, k), project(i + 1, j + 1, k), project(i + 1, j + 1, k + 1), project(i + 1, j, k + 1)),
        cx,
        cy,
      })
    }
  }
}

const pct = (value: number) => `${value.toFixed(2)}%`
const STEP = (BUILD_END - BUILD_START) / BLOCKS.length

/** Um quadro-chave por bloco: cai, quica, brilha ao assentar e fica até o fim do ciclo. */
const ANIMATION_CSS = `
.cube-block{animation-duration:${CYCLE}s;animation-timing-function:cubic-bezier(.33,0,.2,1);animation-iteration-count:infinite;transition:translate .8s cubic-bezier(.22,1,.36,1)}
.cube-depth{transition:translate 1s cubic-bezier(.22,1,.36,1)}
${BLOCKS.map((_, i) => {
  const at = BUILD_START + i * STEP
  return `@keyframes kb${i}{0%,${pct(at)}{opacity:0;transform:translateY(-64px);filter:brightness(1)}${pct(at + 1.6)}{opacity:1}${pct(at + 3.0)}{transform:translateY(2px);filter:brightness(1.5)}${pct(at + 4.8)}{transform:translateY(0);filter:brightness(1)}${HOLD_END}%{opacity:1}97%,100%{opacity:0;transform:translateY(0)}}`
}).join("\n")}
@media (prefers-reduced-motion: reduce){.cube-block{animation:none;transition:none}.cube-depth{transition:none}}
`

const SPARKS = [
  { x: 96, y: 168, size: 9, opacity: 0.55 },
  { x: 506, y: 128, size: 12, opacity: 0.4 },
  { x: 540, y: 300, size: 7, opacity: 0.5 },
  { x: 62, y: 352, size: 6, opacity: 0.35 },
]

const stop = (color: string): CSSProperties => ({ stopColor: color })
const sparkVars = (value: number): CSSProperties => ({ ["--i" as string]: value }) as CSSProperties

export function LoginArtwork({ className }: { className?: string }) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const svg = svgRef.current
    if (!svg || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const blocks = Array.from(svg.querySelectorAll<SVGGElement>("[data-block]"))
    const layers = Array.from(svg.querySelectorAll<SVGGElement>("[data-depth]"))
    let frame = 0
    let pointer: Point | null = null

    /** Posição do cursor em unidades do viewBox (considera o redimensionamento do svg). */
    const toSvg = (event: PointerEvent): Point | null => {
      const matrix = svg.getScreenCTM()
      if (!matrix) return null
      const { x, y } = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse())
      return [x, y]
    }

    const render = () => {
      frame = 0
      if (!pointer) return
      const [px, py] = pointer

      // Parallax: cada camada acompanha o cursor conforme a sua profundidade.
      const nx = Math.max(-1, Math.min(1, (px - 300) / 300))
      const ny = Math.max(-1, Math.min(1, (py - 240) / 240))
      for (const layer of layers) {
        const depth = Number(layer.dataset.depth)
        layer.style.translate = `${(-nx * PARALLAX.x * depth).toFixed(2)}px ${(-ny * PARALLAX.y * depth).toFixed(2)}px`
      }

      // Blocos próximos do cursor sobem e se afastam um pouco dele.
      blocks.forEach((block, index) => {
        const { cx, cy } = BLOCKS[index]
        const dx = cx - px
        const dy = (cy - py) * 1.15
        const distance = Math.hypot(dx, dy)
        const force = Math.max(0, 1 - distance / HOVER_RADIUS) ** 2
        if (force < 0.01) {
          block.style.translate = ""
          return
        }
        const push = distance > 0 ? (force * 7) / distance : 0
        block.style.translate = `${(dx * push).toFixed(2)}px ${(-force * HOVER_LIFT + dy * push * 0.5).toFixed(2)}px`
      })
    }

    const onMove = (event: PointerEvent) => {
      pointer = toSvg(event)
      if (!frame) frame = requestAnimationFrame(render)
    }

    const reset = () => {
      pointer = null
      cancelAnimationFrame(frame)
      frame = 0
      for (const block of blocks) block.style.translate = ""
      for (const layer of layers) layer.style.translate = ""
    }

    /** Clique: onda que sai do ponto clicado e levanta os blocos em sequência. */
    const onClick = (event: PointerEvent) => {
      const origin = toSvg(event)
      if (!origin) return
      blocks.forEach((block, index) => {
        const { cx, cy } = BLOCKS[index]
        const distance = Math.hypot(cx - origin[0], (cy - origin[1]) * 1.15)
        block.animate(
          [{ translate: "0px 0px" }, { translate: "0px -14px", offset: 0.4 }, { translate: "0px 0px" }],
          { duration: 1300, delay: distance * 3.2, easing: "ease-in-out" },
        )
      })
    }

    svg.addEventListener("pointermove", onMove)
    svg.addEventListener("pointerleave", reset)
    svg.addEventListener("pointerdown", onClick)
    return () => {
      svg.removeEventListener("pointermove", onMove)
      svg.removeEventListener("pointerleave", reset)
      svg.removeEventListener("pointerdown", onClick)
      cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <svg ref={svgRef} viewBox="0 0 600 480" aria-hidden focusable="false" className={cn("h-auto w-full", className)}>
      <style>{ANIMATION_CSS}</style>
      <defs>
        <linearGradient id="cube-top" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={stop("#fff6b0")} />
          <stop offset="1" style={stop("var(--brand-gold-light)")} />
        </linearGradient>
        <linearGradient id="cube-left" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" style={stop("var(--brand-gold-light)")} />
          <stop offset="0.5" style={stop("var(--brand-gold)")} />
          <stop offset="1" style={stop("var(--brand-gold-dark)")} />
        </linearGradient>
        <linearGradient id="cube-right" x1="1" y1="0" x2="0.4" y2="1">
          <stop offset="0" style={stop("#c98a00")} />
          <stop offset="1" style={stop("#5e3d00")} />
        </linearGradient>
        <radialGradient id="cube-floor-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" style={stop("var(--brand-gold)")} stopOpacity="0.4" />
          <stop offset="1" style={stop("var(--brand-gold)")} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Brilho e mesa de impressão (camada mais ao fundo) */}
      <g className="cube-depth" data-depth="0.35">
        <ellipse cx={CX} cy={baseCenterY + 40} rx="250" ry="92" fill="url(#cube-floor-glow)" />
        <polygon
          points={points(plateL, plateF, move(plateF, PLATE_THICKNESS), move(plateL, PLATE_THICKNESS))}
          fill="var(--muted)"
          stroke="var(--border)"
        />
        <polygon
          points={points(plateF, plateR, move(plateR, PLATE_THICKNESS), move(plateF, PLATE_THICKNESS))}
          fill="var(--accent)"
          stroke="var(--border)"
        />
        <polygon points={points(plateB, plateR, plateF, plateL)} fill="var(--card)" stroke="var(--border)" />
        <path d={rhombusGrid(plateB, plateR, plateF, plateL, 10)} stroke="var(--border)" strokeWidth="1" fill="none" />
      </g>

      {/* Blocos do cubo, caindo um a um */}
      <g className="cube-depth" data-depth="1">
        {BLOCKS.map((block, i) => (
          <g key={i} data-block className="cube-block" style={{ animationName: `kb${i}` }}>
            <polygon points={block.left} fill="url(#cube-left)" stroke="#000" strokeOpacity="0.4" strokeWidth="0.6" strokeLinejoin="round" />
            <polygon points={block.right} fill="url(#cube-right)" stroke="#000" strokeOpacity="0.45" strokeWidth="0.6" strokeLinejoin="round" />
            <polygon points={block.top} fill="url(#cube-top)" stroke="#8a5a00" strokeOpacity="0.5" strokeWidth="0.6" strokeLinejoin="round" />
          </g>
        ))}
      </g>

      {/* Fagulhas flutuantes (camada mais próxima) */}
      <g className="cube-depth" data-depth="1.7">
        {SPARKS.map((spark, i) => (
          <g key={i} className="login-float" style={sparkVars(i)}>
            <polygon
              points={points(
                [spark.x, spark.y - spark.size],
                [spark.x + spark.size * 0.87, spark.y - spark.size / 2],
                [spark.x + spark.size * 0.87, spark.y + spark.size / 2],
                [spark.x, spark.y + spark.size],
                [spark.x - spark.size * 0.87, spark.y + spark.size / 2],
                [spark.x - spark.size * 0.87, spark.y - spark.size / 2],
              )}
              fill="var(--brand-gold)"
              fillOpacity={spark.opacity}
            />
          </g>
        ))}
      </g>
    </svg>
  )
}
