"use client"

import SpecularButton from "@/components/SpecularButton"

export function FooterWhatsAppButton({ url }: { url: string }) {
  return (
    <div className="mt-4">
      <SpecularButton
        size="lg"
        radius={18}
        tint="#ffffff"
        tintOpacity={0.04}
        textColor="#f5f5f5"
        lineColor="#ffffff"
        baseColor="#525252"
        intensity={1}
        idleIntensity={0.35}
        shineSize={10}
        shineFade={34}
        thickness={1.2}
        glow={1}
        followMouse
        proximity={250}
        className="footer-whatsapp-button"
        onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
      >
        Fale conosco pelo WhatsApp
      </SpecularButton>
    </div>
  )
}
