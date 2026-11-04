"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

/**
 * Vídeo de fundo do hero (Pexels, Jakub Zerdzicki): mudo, em loop e sem controles. O arquivo já tem o fim fundido
 * no começo (crossfade de 1,5 s no ffmpeg), então a volta do loop não dá corte. Fica sobre a foto da
 * oficina e só aparece quando já pode tocar; até lá, se falhar ou com "reduzir movimento", fica a foto.
 */
export function HeroVideo() {
  const [ready, setReady] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  // O vídeo pode ficar pronto antes da hidratação, e aí o onCanPlay já passou: confere ao montar.
  useEffect(() => {
    if ((videoRef.current?.readyState ?? 0) >= HTMLMediaElement.HAVE_FUTURE_DATA) queueMicrotask(() => setReady(true))
  }, [])

  return (
    <video
      ref={videoRef}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      aria-hidden
      tabIndex={-1}
      onCanPlay={() => setReady(true)}
      // Se o vídeo começou antes da hidratação, os eventos acima já passaram; o tempo andando confirma.
      onTimeUpdate={ready ? undefined : () => setReady(true)}
      className={cn(
        "absolute inset-0 -z-20 size-full object-cover transition-opacity duration-700 motion-reduce:hidden",
        ready ? "opacity-100" : "opacity-0",
      )}
    >
      <source src="/hero/oficina-3d-loop.webm" type="video/webm" />
      <source src="/hero/oficina-3d-loop.mp4" type="video/mp4" />
    </video>
  )
}
