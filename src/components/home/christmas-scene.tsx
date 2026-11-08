"use client"

import Image from "next/image"
import { useEffect, useRef, type CSSProperties } from "react"
import "./christmas-scene.css"

const windows = [
  [48.6, 28.5, 8, 7, 0], [35.9, 45, 11, 6, -2], [48.2, 46, 10, 8, -4],
  [59.8, 45, 11, 6.5, -1], [74, 31.3, 8, 7.5, -3], [74.2, 44.7, 9, 9, -5],
  [39, 24.9, 4.5, 5.5, -1.5], [57.6, 24.9, 4.5, 6.8, -3.5],
  [35.2, 32, 5, 7.2, -2.5], [62.2, 32, 5, 5.8, -4.5],
]

/** Cenário decorativo adaptado do projeto natalino, sem interferir nos controles da loja. */
export function ChristmasScene({ ambient = false }: { ambient?: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Activity mantém rotas ocultas no DOM; seus efeitos desmontam ao sair da home.
  useEffect(() => {
    const root = rootRef.current
    if (!ambient || !root) return
    root.dataset.christmasActive = "true"
    return () => { delete root.dataset.christmasActive }
  }, [ambient])

  useEffect(() => {
    const root = rootRef.current
    const stage = stageRef.current
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!root || !canvas || !ctx) return
    const motion = matchMedia("(prefers-reduced-motion: reduce)")
    let width = 0, height = 0, frameId = 0, windTime = 0, last = 0
    let visible = true
    function make(anywhere: boolean) {
      const z = Math.random()
      return {
        x: Math.random() * width, y: anywhere ? Math.random() * height : -10, z,
        r: 0.8 + z * z * (ambient ? 1.6 : 3.2), v: (14 + z * 46) * (ambient ? 0.6 : 1), a: 0.25 + z * 0.6,
        ph: Math.random() * Math.PI * 2, sw: 6 + Math.random() * 18, sp: 0.4 + Math.random() * 0.9,
      }
    }
    let flakes: ReturnType<typeof make>[] = []
    function draw(dt: number) {
      if (!ctx) return
      windTime += dt * 0.15
      const wind = Math.sin(windTime) * 14 + Math.sin(windTime * 2.3) * 6
      ctx.clearRect(0, 0, width, height)
      flakes.forEach((f, index) => {
        f.ph += dt * f.sp
        f.y += f.v * dt
        f.x += (Math.sin(f.ph) * f.sw + wind * (0.3 + f.z)) * dt
        if (f.y > height + 10 || f.x < -20 || f.x > width + 20) {
          flakes[index] = make(false)
          return
        }
        const gradient = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * 1.6)
        gradient.addColorStop(0, `rgba(255,255,255,${f.a})`)
        gradient.addColorStop(0.55, `rgba(255,255,255,${f.a * 0.5})`)
        gradient.addColorStop(1, "rgba(255,255,255,0)")
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(f.x, f.y, f.r * 1.6, 0, Math.PI * 2)
        ctx.fill()
      })
    }
    function frame(time: number) {
      draw(Math.min((time - last) / 1000, 0.05))
      last = time
      frameId = requestAnimationFrame(frame)
    }
    function syncMotion() {
      cancelAnimationFrame(frameId)
      stage?.style.setProperty("--px", "0px")
      stage?.style.setProperty("--py", "0px")
      draw(0)
      if (!motion.matches && visible && !document.hidden) {
        last = performance.now()
        frameId = requestAnimationFrame(frame)
      }
    }
    function resize() {
      const rect = root!.getBoundingClientRect()
      width = rect.width
      height = rect.height
      const dpr = Math.min(devicePixelRatio || 1, ambient ? 1.5 : 2)
      canvas!.width = Math.round(width * dpr)
      canvas!.height = Math.round(height * dpr)
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
      flakes = Array.from({ length: Math.round(Math.min(ambient ? 60 : 160, Math.max(ambient ? 25 : 50, width * height / (ambient ? 24000 : 14000)))) }, () => make(true))
      syncMotion()
    }
    function move(event: PointerEvent) {
      if (motion.matches || !visible || event.pointerType === "touch") return
      const rect = root!.getBoundingClientRect()
      stage?.style.setProperty("--px", `${(event.clientX / rect.width - 0.5) * -14}px`)
      stage?.style.setProperty("--py", `${((event.clientY - rect.top) / rect.height - 0.5) * -8}px`)
    }
    const resizeObserver = new ResizeObserver(resize)
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      root.dataset.paused = String(!visible)
      syncMotion()
    })
    resizeObserver.observe(root)
    intersectionObserver.observe(root)
    motion.addEventListener("change", syncMotion)
    document.addEventListener("visibilitychange", syncMotion)
    if (!ambient) window.addEventListener("pointermove", move, { passive: true })
    return () => {
      cancelAnimationFrame(frameId)
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
      motion.removeEventListener("change", syncMotion)
      document.removeEventListener("visibilitychange", syncMotion)
      window.removeEventListener("pointermove", move)
    }
  }, [ambient])

  return (
    <div ref={rootRef} className={`abmc-christmas-scene${ambient ? " abmc-christmas-ambient" : ""}`} aria-hidden="true" data-christmas-scene data-christmas-ambient={ambient || undefined} data-christmas-active={ambient || undefined}>
      {!ambient ? <div ref={stageRef} className="abmc-christmas-stage">
        <div className="abmc-christmas-breathe">
          <Image src="/hero/casa-natal.webp" alt="" width={1254} height={1254} preload unoptimized className="abmc-christmas-image" />
          {windows.map(([x, y, size, duration, delay], index) => (
            <span key={index} className="abmc-christmas-glow" style={{ "--x": `${x}%`, "--y": `${y}%`, "--s": `${size}%`, "--d": `${duration}s`, "--dl": `${delay}s` } as CSSProperties} />
          ))}
          <span className="abmc-christmas-star" />
          {[ [41.5, 17, 0], [63, 18, -1.5] ].map(([x, y, delay], index) => (
            <div key={index} className="abmc-christmas-smoke" style={{ "--x": `${x}%`, "--y": `${y}%` } as CSSProperties}>
              {[30, 50, 20].map((dx, puff) => <i key={puff} style={{ "--dl": `${delay - puff * 3}s`, "--dx": `${dx}px` } as CSSProperties} />)}
            </div>
          ))}
        </div>
      </div> : null}
      <canvas ref={canvasRef} className="abmc-christmas-snow" />
      {!ambient ? <div className="abmc-christmas-vignette" /> : null}
    </div>
  )
}
