"use client"

import { Geist_Mono } from "next/font/google"
import { useEffect, useRef, useState } from "react"
import TechText from "@/components/TechText/TechText"

const geistMono = Geist_Mono({ subsets: ["latin"], weight: "500", display: "swap" })
const text = "Camada a camada, a sua ideia ganha forma."

export function HeroTechTitle() {
  const rootRef = useRef<HTMLSpanElement>(null)
  const [fontSize, setFontSize] = useState(32)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const resize = () => setFontSize(parseFloat(getComputedStyle(root).fontSize))
    const observer = new ResizeObserver(resize)
    observer.observe(root)
    const frame = requestAnimationFrame(resize)
    window.addEventListener("resize", resize, { passive: true })
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
      window.removeEventListener("resize", resize)
    }
  }, [])

  return (
    <span ref={rootRef} className={`abmc-hero-tech ${geistMono.className}`}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        <TechText
          text={text}
          fontSize={fontSize}
          fontWeight={500}
          reveal="letter"
          dashLength={2}
          dashGap={2}
          specks={32}
          intro="type"
          introDuration={2.5}
          clickKick
          guides={false}
          fontFamily={'"Geist Mono", monospace'}
          letterSpacing={-0.02}
          accentColor="#08292f"
          reach={200}
          softness={0.7}
          lineStyle="dashed"
          strokeWidth={1}
          speed={1}
          bounce={0.5}
          selection
          labels
          color="currentColor"
          align="center"
          draggable
          sweep
        />
      </span>
    </span>
  )
}
