import { describe, expect, it, vi } from "vitest"

// "server-only" bloqueia a importação fora do servidor do Next; nos testes, basta ignorá-lo.
vi.mock("server-only", () => ({}))

const { htmlToMarkdown, isMakerWorldImage, parseMakerWorldId } = await import("@/lib/makerworld")
const { licenseAllowsSale, licenseLabel } = await import("@/lib/makerworld-link")

describe("parseMakerWorldId", () => {
  it("lê o ID de links do MakerWorld, com idioma, slug e âncora", () => {
    expect(parseMakerWorldId("https://makerworld.com/en/models/2450564-kiki-egg-slide#profileId-2690340")).toBe("2450564")
    expect(parseMakerWorldId("https://makerworld.com/models/123")).toBe("123")
    expect(parseMakerWorldId("  https://www.makerworld.com/pt/models/987-vaso?from=search  ")).toBe("987")
    expect(
      parseMakerWorldId("https://makerworld.com/en/models/1031570-under-sink-trash-bag-holder#profileId-1014459"),
    ).toBe("1031570")
  })

  it("aceita o link sem https://", () => {
    expect(parseMakerWorldId("makerworld.com/en/models/1031570-under-sink")).toBe("1031570")
  })

  it("recusa outros sites e links sem modelo", () => {
    expect(parseMakerWorldId("https://evil.com/en/models/123")).toBeNull()
    expect(parseMakerWorldId("https://makerworld.com.evil.com/en/models/123")).toBeNull()
    expect(parseMakerWorldId("https://makerworld.com/en/collections/123")).toBeNull()
    expect(parseMakerWorldId("não é link")).toBeNull()
    expect(parseMakerWorldId("")).toBeNull()
  })
})

describe("licenseAllowsSale", () => {
  it("permite Creative Commons comerciais e CC0", () => {
    for (const license of ["BY", "BY-SA", "BY-ND", "CC BY", "cc-by-sa", "CC0"]) expect(licenseAllowsSale(license)).toBe(true)
  })

  it("recusa não comercial e a Standard Digital File License", () => {
    for (const license of ["BY-NC", "BY-NC-SA", "BY-NC-ND", "CC BY-NC", "Standard Digital File License"]) {
      expect(licenseAllowsSale(license)).toBe(false)
    }
  })

  it("não decide licenças desconhecidas ou ausentes", () => {
    expect(licenseAllowsSale(null)).toBeNull()
    expect(licenseAllowsSale("")).toBeNull()
    expect(licenseAllowsSale("Licença do autor")).toBeNull()
  })

  it("nomeia os códigos Creative Commons", () => {
    expect(licenseLabel("BY-NC-SA")).toBe("CC BY-NC-SA")
    expect(licenseLabel("Standard Digital File License")).toBe("Standard Digital File License")
  })
})

describe("isMakerWorldImage", () => {
  it("aceita só HTTPS do host de imagens do MakerWorld", () => {
    expect(isMakerWorldImage("https://makerworld.bblmw.com/makerworld/model/x/design/a.png")).toBe(true)
    expect(isMakerWorldImage("http://makerworld.bblmw.com/a.png")).toBe(false)
    expect(isMakerWorldImage("https://localhost/a.png")).toBe(false)
    expect(isMakerWorldImage("https://makerworld.bblmw.com.evil.com/a.png")).toBe(false)
  })
})

describe("htmlToMarkdown", () => {
  it("converte títulos, parágrafos, negrito, listas, links e entidades", () => {
    const html =
      '<h2>Kiki Egg Slide</h2><p>Storage for <strong>boiled eggs</strong> &amp; more.</p>' +
      '<ul><li>Holds 6 eggs</li><li>No supports</li></ul><p>See <a href="https://x.com">guide</a><img src="a.png"></p>'
    expect(htmlToMarkdown(html)).toBe(
      "## Kiki Egg Slide\n\nStorage for **boiled eggs** & more.\n\n- Holds 6 eggs\n- No supports\n\nSee [guide](https://x.com)",
    )
  })

  it("remove scripts e estilos", () => {
    expect(htmlToMarkdown("<p>Oi</p><script>alert(1)</script><style>p{}</style>")).toBe("Oi")
  })
})
