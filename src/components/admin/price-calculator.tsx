"use client";

import {
  useRef,
  useState,
  useSyncExternalStore,
  type ChangeEvent,
  type ReactNode,
} from "react";
import type { IconType } from "react-icons";
import {
  HiOutlineArrowPath,
  HiOutlineBanknotes,
  HiOutlineBolt,
  HiOutlineCalendarDays,
  HiOutlineClipboardDocument,
  HiOutlineClock,
  HiOutlineCube,
  HiOutlineExclamationTriangle,
  HiOutlineReceiptPercent,
  HiOutlineKey,
  HiOutlineLightBulb,
  HiOutlinePrinter,
  HiOutlineQuestionMarkCircle,
  HiOutlineScale,
  HiOutlineSparkles,
  HiOutlineSquare3Stack3D,
  HiOutlineSquares2X2,
  HiOutlineTag,
  HiOutlineWrenchScrewdriver,
  HiOutlineCalculator,
  HiOutlineCheck,
} from "react-icons/hi2";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ModalHeader } from "@/components/admin/modal-header";
import { CalculatorSkeleton } from "@/components/admin/skeletons";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { maskPriceInput } from "@/lib/format";
import {
  caretAfterDigits,
  describeDuration,
  describeWeight,
  digitsBefore,
  formatMasked,
  maskNumber,
  parseMasked,
} from "@/lib/number-mask";
import { calculatePrice, type PricingInput } from "@/lib/pricing";
import { cn } from "@/lib/utils";

type FieldKey = keyof PricingInput;
/** Valores digitados (texto, aceitando vírgula), convertidos só para calcular. */
type Values = Record<FieldKey, string>;

/**
 * Últimos valores digitados, salvos neste navegador para não precisar redigitar (impressora, hora de
 * trabalho, margem…). A chave é a mesma de quando só a oficina era salva, então o que já estava salvo continua.
 */
const STORAGE_KEY = "abmc3d:calculadora:oficina";

/** Casas decimais de cada campo (zero = inteiro). Os de dinheiro completam as duas casas ao sair. */
const DECIMALS: Record<FieldKey, number> = {
  weightGrams: 1,
  printHours: 2,
  laborHours: 2,
  quantity: 0,
  filamentPricePerKg: 2,
  powerWatts: 0,
  energyPricePerKwh: 2,
  machinePrice: 2,
  machineLifeHours: 0,
  laborPricePerHour: 2,
  failureRatePercent: 1,
  saleFeePercent: 1,
  marginPercent: 0,
};

/** Campos em R$: os dígitos entram pela direita como centavos, como o preço do produto. */
const MONEY_KEYS: readonly FieldKey[] = [
  "filamentPricePerKg",
  "energyPricePerKwh",
  "machinePrice",
  "laborPricePerHour",
];

/** Campos em horas decimais ("1,5"), com a leitura "1h 30min" acima. */
const TIME_KEYS: readonly FieldKey[] = ["printHours", "laborHours"];

type FieldKind = "number" | "money";

const kindOf = (key: FieldKey): FieldKind => (MONEY_KEYS.includes(key) ? "money" : "number");

/** Cor do ícone de cada campo: a mesma da parte do custo que ele afeta (veja "De onde vem o custo"). */
const ICON_TONE: Record<FieldKey, string> = {
  weightGrams: "text-gold",
  filamentPricePerKg: "text-gold",
  powerWatts: "text-sky-500",
  energyPricePerKwh: "text-sky-500",
  printHours: "text-violet-500",
  machinePrice: "text-violet-500",
  machineLifeHours: "text-violet-500",
  laborPricePerHour: "text-orange-500",
  laborHours: "text-orange-500",
  failureRatePercent: "text-rose-500",
  saleFeePercent: "text-fuchsia-500",
  quantity: "text-muted-foreground",
  marginPercent: "text-success",
};

/** Leitura amigável mostrada acima do campo: "1h 30min" no tempo, quilos no peso. */
function readableOf(key: FieldKey, text: string) {
  if (TIME_KEYS.includes(key)) return describeDuration(parseMasked(text));
  if (key === "weightGrams") return describeWeight(parseMasked(text));
  return "";
}

const DEFAULTS: Values = {
  weightGrams: "12",
  printHours: "1",
  laborHours: "0,15",
  quantity: "1",
  filamentPricePerKg: "120,00",
  powerWatts: "250",
  energyPricePerKwh: "1,00",
  machinePrice: "3.500,00",
  machineLifeHours: "8.000",
  laborPricePerHour: "25,00",
  failureRatePercent: "5",
  saleFeePercent: "0",
  marginPercent: "120",
};

/** Campos que um modelo de peça preenche (os valores da oficina não mudam). */
type PresetKey =
  "weightGrams" | "printHours" | "laborHours" | "quantity" | "marginPercent";

const PRESET_KEYS: readonly PresetKey[] = ["weightGrams", "printHours", "laborHours", "quantity", "marginPercent"];

const pick = <T extends object, K extends keyof T>(object: T, keys: readonly K[]) =>
  Object.fromEntries(keys.map((key) => [key, object[key]])) as Pick<T, K>;

/** Modelos de peça: pontos de partida para os dados da peça. */
const PRESETS: {
  label: string;
  icon: IconType;
  values: Pick<Values, PresetKey>;
}[] = [
  {
    label: "Chaveiro",
    icon: HiOutlineKey,
    values: {
      weightGrams: "12",
      printHours: "1",
      laborHours: "0,15",
      quantity: "1",
      marginPercent: "120",
    },
  },
  {
    label: "Peça média",
    icon: HiOutlineCube,
    values: {
      weightGrams: "60",
      printHours: "4",
      laborHours: "0,3",
      quantity: "1",
      marginPercent: "100",
    },
  },
  {
    label: "Miniatura",
    icon: HiOutlineSparkles,
    values: {
      weightGrams: "25",
      printHours: "6",
      laborHours: "0,5",
      quantity: "1",
      marginPercent: "150",
    },
  },
  {
    label: "Lote",
    icon: HiOutlineSquares2X2,
    values: {
      weightGrams: "15",
      printHours: "1,2",
      laborHours: "0,1",
      quantity: "10",
      marginPercent: "90",
    },
  },
];

/** Resumo do que o modelo preenche: "12 g · 1 h" (e a quantidade, se for lote). */
function presetSummary(values: Pick<Values, PresetKey>) {
  const parts = [`${values.weightGrams} g`, describeDuration(parseMasked(values.printHours))];
  if (values.quantity !== "1") parts.push(`${values.quantity} un`);
  return parts.join(" · ");
}

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const integer = new Intl.NumberFormat("pt-BR");
const decimal = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

/** Texto salvo antes da máscara ("1234.5" ou "1.234,5") → número. */
function parseLegacy(text: string) {
  const clean = text.trim().replace(/\s/g, "");
  if (!clean) return Number.NaN;
  return Number(
    clean.includes(",") ? clean.replace(/\./g, "").replace(",", ".") : clean,
  );
}

/** Os valores ficam salvos como números; textos de versões antigas ainda são lidos. */
function readSaved(): Partial<Values> {
  try {
    const saved = JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) ?? "{}",
    ) as Record<string, unknown>;
    return Object.fromEntries(
      (Object.keys(DEFAULTS) as FieldKey[]).flatMap((key) => {
        const raw = saved[key];
        const value =
          typeof raw === "number"
            ? raw
            : typeof raw === "string"
              ? parseLegacy(raw)
              : Number.NaN;
        return Number.isFinite(value)
          ? [
              [
                key,
                formatMasked(value, DECIMALS[key], MONEY_KEYS.includes(key)),
              ],
            ]
          : [];
      }),
    );
  } catch {
    return {};
  }
}

function saveValues(values: Values) {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(
        Object.fromEntries(
          (Object.keys(values) as FieldKey[]).flatMap((key) => {
            const value = parseMasked(values[key]);
            return Number.isFinite(value) ? [[key, value]] : [];
          }),
        ),
      ),
    );
  } catch {
    // Sem armazenamento: os valores valem só nesta visita.
  }
}

const subscribeNothing = () => () => {};

/**
 * Calculadora de preço de peças impressas em 3D. Monta só no navegador (os valores da oficina vêm do
 * localStorage); no servidor e na hidratação, mostra o esqueleto.
 */
export function PriceCalculator({ onUse }: CalculatorProps = {}) {
  const mounted = useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  );
  return mounted ? <Calculator onUse={onUse} /> : <CalculatorSkeleton compact={Boolean(onUse)} />;
}

type CalculatorProps = {
  /**
   * Usado no modal do produto: o resultado fica só com preço e números-chave, e um botão devolve o
   * preço por peça (em centavos) para o formulário.
   */
  onUse?: (priceCents: number) => void;
};

/** A mesma calculadora num modal largo, para preencher o preço do produto. */
export function PriceCalculatorDialog({
  open,
  onOpenChange,
  onUse,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUse: (priceCents: number) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden p-0 sm:max-h-[calc(100dvh-2rem)] sm:w-[85vw] sm:max-w-[85vw]"
      >
        <ModalHeader
          icon={HiOutlineCalculator}
          title="Calcular preço"
          description="Custo real da peça mais a margem; use o resultado como preço do produto."
          onClose={() => onOpenChange(false)}
        />
        <div className="min-h-0 flex-1 overflow-y-auto bg-background/60 p-3 sm:p-5">
          <PriceCalculator
            onUse={(priceCents) => {
              onUse(priceCents);
              onOpenChange(false);
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Calculator({ onUse }: CalculatorProps) {
  const [values, setValues] = useState<Values>(() => ({
    ...DEFAULTS,
    ...readSaved(),
  }));

  // Modelo escolhido por último; começa sem nenhum e sai ao editar um campo que ele preenche.
  const [preset, setPreset] = useState<string | null>(null);

  // Valores mais recentes: duas mudanças seguidas (antes de a tela atualizar) não se sobrescrevem.
  const latest = useRef(values);
  const commit = (changes: Partial<Values>) => {
    const next = { ...latest.current, ...changes };
    latest.current = next;
    setValues(next);
    saveValues(next);
  };

  const update = (key: FieldKey, text: string) => {
    commit({ [key]: text });
    if (key in PRESETS[0].values) setPreset(null);
  };

  const input = Object.fromEntries(
    Object.entries(values).map(([key, text]) => [key, parseMasked(text)]),
  ) as PricingInput;
  const result = calculatePrice(input);
  const quantity = Math.max(
    1,
    Math.floor(Number.isFinite(input.quantity) ? input.quantity : 1),
  );
  const margin = Number.isFinite(input.marginPercent)
    ? Math.min(Math.max(input.marginPercent, 0), 300)
    : 0;

  const field = (
    key: FieldKey,
    label: string,
    unit: string,
    hint: string,
    icon: IconType,
  ) => (
    <NumberField
      key={key}
      id={`calc-${key}`}
      label={label}
      unit={unit}
      hint={hint}
      icon={icon}
      decimals={DECIMALS[key]}
      kind={kindOf(key)}
      iconTone={ICON_TONE[key]}
      readable={readableOf(key, values[key])}
      value={values[key]}
      onChange={(text) => update(key, text)}
    />
  );

  const parts = [
    {
      key: "filament",
      label: "Filamento",
      value: result.breakdown.filament,
      color: "bg-gold",
    },
    {
      key: "energy",
      label: "Energia",
      value: result.breakdown.energy,
      color: "bg-sky-500",
    },
    {
      key: "machine",
      label: "Máquina",
      value: result.breakdown.machine,
      color: "bg-violet-500",
    },
    {
      key: "labor",
      label: "Trabalho",
      value: result.breakdown.labor,
      color: "bg-orange-500",
    },
    {
      key: "failures",
      label: "Falhas",
      value: result.breakdown.failures,
      color: "bg-rose-500",
    },
  ];

  const printHours = Number.isFinite(input.printHours) ? Math.max(input.printHours, 0) : 0;
  const weightGrams = Number.isFinite(input.weightGrams) ? Math.max(input.weightGrams, 0) : 0;
  const powerWatts = Number.isFinite(input.powerWatts) ? Math.max(input.powerWatts, 0) : 0;
  const energyKwh = (printHours * powerWatts * quantity) / 1000;
  const composition = [
    ...parts,
    // Taxas só aparecem quando há taxa de venda.
    ...(result.saleFees > 0
      ? [{ key: "fees", label: "Taxas de venda", value: result.saleFees, color: "bg-fuchsia-500" }]
      : []),
    { key: "profit", label: "Lucro", value: result.unitProfit, color: "bg-success" },
  ];

  const copy = async () => {
    const text =
      quantity > 1
        ? `${brl.format(result.unitPrice)} por peça · ${brl.format(result.lotPrice)} o lote de ${quantity}`
        : brl.format(result.unitPrice);
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Preço copiado.");
    } catch {
      toast.error("Não foi possível copiar. Selecione o valor e copie à mão.");
    }
  };

  return (
    <div
      className={cn(
        "grid items-start gap-5",
        onUse
          ? "lg:grid-cols-[minmax(0,1fr)_340px]"
          : "lg:grid-cols-[minmax(0,1fr)_400px]",
      )}
    >
      {/* Um card só com todos os dados; grupos separados por rótulos discretos. */}
      <div className="rounded-lg bg-card shadow-panel">
        <div className="border-b border-border/60 px-4 py-3.5 sm:px-5">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Modelo de peça
            </p>
            <button
              type="button"
              onClick={() => {
                // Só os dados da peça voltam ao padrão; oficina, margem e risco ficam como estão.
                commit(pick(DEFAULTS, PRESET_KEYS));
                setPreset(null);
              }}
              title="Volta peso, tempo, trabalho, quantidade e margem ao padrão (oficina e risco não mudam)"
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <HiOutlineArrowPath className="size-3.5" aria-hidden />
              Padrão
            </button>
          </div>
          {/* Cada modelo preenche peso, tempo, trabalho, quantidade e margem. */}
          <div
            className="grid grid-cols-2 gap-x-3 gap-y-1 sm:flex sm:flex-wrap sm:items-center sm:divide-x sm:divide-border"
            role="group"
            aria-label="Modelos de peça"
          >
            {PRESETS.map((item) => {
              const active = preset === item.label;
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    commit(item.values);
                    setPreset(item.label);
                  }}
                  className={cn(
                    "inline-flex min-w-0 cursor-pointer flex-wrap items-center gap-x-2 py-1.5 text-left transition-colors outline-none hover:text-gold focus-visible:ring-2 focus-visible:ring-ring sm:flex-nowrap sm:px-3 sm:first:pl-0",
                    active && "text-gold",
                  )}
                >
                  <Icon className="size-4 shrink-0 text-gold" aria-hidden />
                  <span className="text-xs font-medium">{item.label}</span>
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    {presetSummary(item.values)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-6 p-4 sm:p-5">
          <Group title="Material e tempo">
            {field(
              "weightGrams",
              "Peso da peça",
              "g",
              "Peso total que o fatiador (Bambu Studio, Cura, Orca…) mostra para a peça, já com suportes e brim.",
              HiOutlineScale,
            )}
            {field(
              "filamentPricePerKg",
              "Preço do filamento",
              "R$/kg",
              "Quanto custa 1 kg do material. Comprou um rolo de 500 g por R$ 60? Use R$ 120.",
              HiOutlineTag,
            )}
            {field(
              "printHours",
              "Tempo de impressão",
              "h",
              "Tempo que o fatiador estima para imprimir uma peça, em horas: 1,5 = 1h 30min. Entra no desgaste da máquina e na energia.",
              HiOutlineClock,
            )}
            {field(
              "powerWatts",
              "Potência média",
              "W",
              "Quanto a impressora consome imprimindo, em watts. Veja na etiqueta da fonte ou meça com um medidor de tomada; a maioria fica entre 100 e 300 W.",
              HiOutlineBolt,
            )}
          </Group>

          <Group title="Operação e trabalho">
            {field(
              "energyPricePerKwh",
              "Preço da energia",
              "R$/kWh",
              "Valor de 1 kWh na sua conta de luz, com impostos e bandeira: divida o total da conta pelos kWh consumidos.",
              HiOutlineLightBulb,
            )}
            {field(
              "machinePrice",
              "Preço da impressora",
              "R$",
              "Quanto você pagou na impressora. Vira custo de desgaste: preço ÷ vida útil × horas de impressão.",
              HiOutlinePrinter,
            )}
            {field(
              "machineLifeHours",
              "Vida útil",
              "h",
              "Quantas horas de impressão você espera da máquina antes de trocar ou reformar. 8.000 h ≈ 2 anos imprimindo 11 h por dia.",
              HiOutlineCalendarDays,
            )}
            {field(
              "laborPricePerHour",
              "Valor da hora",
              "R$/h",
              "Quanto você quer ganhar por hora do seu trabalho manual. O tempo da máquina imprimindo não entra aqui.",
              HiOutlineBanknotes,
            )}
            {field(
              "laborHours",
              "Trabalho manual",
              "h",
              "Tempo das suas mãos em cada peça: preparar a mesa, tirar suportes, lixar, pintar e embalar. 0,25 = 15min.",
              HiOutlineWrenchScrewdriver,
            )}
            {field(
              "failureRatePercent",
              "Risco de falha",
              "%",
              "Quantas impressões dão errado. Se 1 em cada 20 falha, use 5%. Cobre o material, a energia e a máquina perdidos; o trabalho manual não, porque só é feito na peça boa.",
              HiOutlineExclamationTriangle,
            )}
            {field(
              "saleFeePercent",
              "Taxa de venda",
              "%",
              "O que sai do preço na venda: comissão do marketplace, taxa do cartão, impostos. Mercado Livre e Shopee ficam entre 11% e 20%. Venda direta no Pix: 0%.",
              HiOutlineReceiptPercent,
            )}
            {field(
              "quantity",
              "Quantidade",
              "un",
              "Peças iguais no mesmo pedido. Todos os valores acima são por peça; o preço do lote multiplica.",
              HiOutlineSquare3Stack3D,
            )}
          </Group>

          <Group title="Margem de lucro">
            <MarginSlider value={margin} onChange={(next) => update("marginPercent", String(next))} />
          </Group>
        </div>
      </div>

      {/* Resultado: cards separados por assunto, fixos ao rolar. */}
      <aside
        className={cn(
          "space-y-4 lg:sticky lg:top-6",
          // No modal, no celular, o preço fica preso no rodapé enquanto os campos rolam.
          onUse && "max-lg:sticky max-lg:-bottom-3 max-lg:z-10 max-lg:-mx-3 max-lg:-mb-3",
        )}
        aria-live="polite"
      >
        <section
          className={cn(
            "rounded-lg bg-card p-4 shadow-panel sm:p-5",
            onUse && "max-lg:rounded-none max-lg:border-t max-lg:border-border/60",
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Preço sugerido por peça</p>
              <p className="mt-1 text-3xl font-bold tracking-tight tabular-nums sm:text-4xl">
                {brl.format(result.unitPrice)}
              </p>
            </div>
            <button
              type="button"
              onClick={copy}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <HiOutlineClipboardDocument className="size-3.5" aria-hidden />
              Copiar
            </button>
          </div>
          {quantity > 1 ? (
            <div className="mt-4 flex items-baseline justify-between gap-3 border-t border-border/60 pt-4 text-sm tabular-nums">
              <span className="text-muted-foreground">Lote de {quantity} peças</span>
              <span>
                <span className="font-semibold">{brl.format(result.lotPrice)}</span>
                <span className="ml-2 text-xs text-success">
                  +{brl.format(result.lotProfit)}
                </span>
              </span>
            </div>
          ) : null}
          <dl className={cn("mt-4 grid grid-cols-2 gap-1", onUse && "max-lg:hidden")}>
            <Stat label="Custo" value={brl.format(result.unitCost)} />
            <Stat label="Lucro" value={brl.format(result.unitProfit)} tone="text-success" />
            <Stat
              label="Lucro por hora"
              value={printHours > 0 ? `${brl.format(result.unitProfit / printHours)}/h` : "—"}
            />
            <Stat
              label="Preço por grama"
              value={weightGrams > 0 ? `${brl.format(result.unitPrice / weightGrams)}/g` : "—"}
            />
          </dl>
          {onUse ? (
            <Button
              type="button"
              className="mt-3 w-full lg:mt-4"
              disabled={!(result.unitPrice > 0)}
              onClick={() => onUse(Math.round(result.unitPrice * 100))}
            >
              <HiOutlineCheck aria-hidden />
              Usar este preço
            </Button>
          ) : null}
        </section>

        {/* No modal do produto o resultado fica simples: sem composição nem produção. */}
        {onUse ? null : (
          <>

        {/* Composição do preço: cada parte do custo mais o lucro, numa barra só. */}
        <section className="rounded-lg bg-card p-4 shadow-panel sm:p-5">
          <SectionTitle
            title="Composição do preço"
            aside={`${integer.format(Math.round(result.profitShare * 100))}% é lucro`}
          />
          <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-muted" aria-hidden>
            {composition.map((part) =>
              part.value > 0 ? (
                <div
                  key={part.key}
                  className={part.color}
                  style={{ width: `${(part.value / result.unitPrice) * 100}%` }}
                />
              ) : null,
            )}
          </div>
          <ul className="mt-4 divide-y divide-border/60 text-sm">
            {composition.map((part) => (
              <li key={part.key} className="flex items-center gap-2.5 py-2 first:pt-0 last:pb-0">
                <span className={cn("size-2.5 shrink-0 rounded-[3px]", part.color)} aria-hidden />
                <span
                  className={cn(
                    "flex-1",
                    part.key === "profit" ? "font-medium" : "text-muted-foreground",
                  )}
                >
                  {part.label}
                </span>
                <span className="w-10 text-right text-xs text-muted-foreground tabular-nums">
                  {result.unitPrice > 0
                    ? `${integer.format(Math.round((part.value / result.unitPrice) * 100))}%`
                    : "—"}
                </span>
                <span
                  className={cn(
                    "w-20 text-right tabular-nums",
                    part.key === "profit" && "font-semibold text-success",
                  )}
                >
                  {brl.format(part.value)}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Dados para planejar a produção. */}
        <section className="rounded-lg bg-card p-4 shadow-panel sm:p-5">
          <SectionTitle title="Produção" />
          <ul className="divide-y divide-border/60 text-sm">
            {[
              {
                icon: HiOutlineClock,
                tone: "text-violet-500",
                label: quantity > 1 ? `Impressão do lote` : "Tempo de impressão",
                value: describeDuration(result.totalPrintHours) || "0min",
              },
              {
                icon: HiOutlineBolt,
                tone: "text-sky-500",
                label: "Energia consumida",
                value: `${decimal.format(energyKwh)} kWh`,
              },
              {
                icon: HiOutlineScale,
                tone: "text-gold",
                label: "Filamento usado",
                value: describeWeight(weightGrams * quantity) || "0 kg",
              },
              {
                icon: HiOutlinePrinter,
                tone: "text-violet-500",
                label: "Impressora se paga em",
                value: result.piecesToPayMachine
                  ? `${integer.format(result.piecesToPayMachine)} peças`
                  : "—",
              },
              {
                icon: HiOutlineTag,
                tone: "text-gold",
                label: "Cobrando só o filamento",
                value: brl.format(result.filamentOnlyPrice),
              },
            ].map((item) => (
              <li key={item.label} className="flex items-center gap-2.5 py-2 first:pt-0 last:pb-0">
                <item.icon className={cn("size-4 shrink-0", item.tone)} aria-hidden />
                <span className="flex-1 text-muted-foreground">{item.label}</span>
                <span className="font-medium tabular-nums">{item.value}</span>
              </li>
            ))}
          </ul>
        </section>
          </>
        )}
      </aside>
    </div>
  );
}

/** Seção de campos em duas colunas, com título discreto, dentro do card único. */
function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-3 flex w-full items-center gap-3 text-xs font-semibold tracking-wide text-foreground uppercase">
        {title}
        <span className="h-px flex-1 bg-border" aria-hidden />
      </legend>
      <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

/** Marcas da régua da margem. */
const MARGIN_MARKS = [0, 50, 100, 150, 200, 250, 300];

/**
 * Margem de lucro em largura total: trilho preenchido até o valor, botão grande e marcas clicáveis.
 */
function MarginSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const percent = (value / 300) * 100;

  return (
    <div className="sm:col-span-2">
      <div className="mb-3 flex items-end justify-between gap-3">
        <FieldLabel
          htmlFor="calc-marginPercent"
          label="Lucro sobre o custo"
          hint="Quanto você ganha em cima do custo real. 100% cobra o dobro do custo; 50% cobra 1,5 vez. Arraste ou clique numa marca."
        />
        <p className="text-right leading-none">
          <span className="text-2xl font-bold text-success tabular-nums">
            {integer.format(value)}%
          </span>
        </p>
      </div>
      <input
        id="calc-marginPercent"
        type="range"
        min={0}
        max={300}
        step={5}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        // Trilho: verde até o valor, cinza depois; botão branco com borda verde.
        style={{
          background: `linear-gradient(to right, var(--success) ${percent}%, var(--muted) ${percent}%)`,
        }}
        className="h-2 w-full cursor-pointer appearance-none rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50 [&::-moz-range-thumb]:size-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-success [&::-moz-range-thumb]:bg-background [&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-success [&::-webkit-slider-thumb]:bg-background [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110"
      />
      <div className="mt-2 flex justify-between">
        {MARGIN_MARKS.map((mark) => (
          <button
            key={mark}
            type="button"
            onClick={() => onChange(mark)}
            className={cn(
              "w-9 cursor-pointer rounded-sm text-center text-[11px] tabular-nums transition-colors outline-none first:text-left last:text-right hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
              // No celular, só as marcas de 100 em 100, para não amontoar.
              mark % 100 !== 0 && "max-sm:hidden",
              value === mark ? "font-semibold text-success" : "text-muted-foreground",
            )}
          >
            {mark}%
          </button>
        ))}
      </div>
    </div>
  );
}

/** Rótulo do campo com a explicação num tooltip, ao lado. */
function FieldLabel({
  htmlFor,
  label,
  hint,
}: {
  htmlFor: string;
  label: string;
  hint: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Label
        htmlFor={htmlFor}
        className="text-xs font-medium text-muted-foreground"
      >
        {label}
      </Label>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={`Sobre ${label.toLowerCase()}`}
            className="rounded-full text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <HiOutlineQuestionMarkCircle className="size-3.5" aria-hidden />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">{hint}</TooltipContent>
      </Tooltip>
    </div>
  );
}

/** Campo numérico: rótulo com tooltip, ícone no início da caixa e a unidade no fim. */
function NumberField({
  id,
  label,
  unit,
  hint,
  icon: Icon,
  decimals,
  kind,
  readable,
  iconTone,
  value,
  onChange,
}: {
  id: string;
  label: string;
  unit: string;
  hint: string;
  icon: IconType;
  decimals: number;
  kind: FieldKind;
  /** Valor por extenso, no canto direito acima do campo. */
  readable: string;
  /** Classe de cor do ícone. */
  iconTone: string;
  value: string;
  onChange: (text: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Aplica a máscara e devolve o cursor para depois do mesmo dígito (o ponto de milhar muda de lugar).
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const typed = event.target.value;
    // Dinheiro: os dígitos entram pela direita como centavos, então o cursor fica no fim.
    if (kind === "money") return onChange(maskPriceInput(typed));
    const digits = digitsBefore(
      typed,
      event.target.selectionStart ?? typed.length,
    );
    const masked = maskNumber(typed, decimals);
    onChange(masked);
    requestAnimationFrame(() => {
      const element = inputRef.current;
      if (!element || document.activeElement !== element) return;
      const caret =
        typed.endsWith(",") || typed.endsWith(".")
          ? masked.length
          : caretAfterDigits(masked, digits);
      element.setSelectionRange(caret, caret);
    });
  };

  // Ao sair, o número perde a vírgula solta (o dinheiro já está sempre completo).
  const handleBlur = () => {
    if (kind === "money") return;
    const number = parseMasked(value);
    if (Number.isFinite(number)) onChange(formatMasked(number, decimals));
  };

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <FieldLabel htmlFor={id} label={label} hint={hint} />
        {readable ? (
          <span className="text-[11px] text-muted-foreground tabular-nums" aria-live="polite">
            {readable}
          </span>
        ) : null}
      </div>
      <div className="relative">
        <Icon
          className={cn("pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2", iconTone)}
          aria-hidden
        />
        <Input
          ref={inputRef}
          id={id}
          inputMode={kind === "number" && decimals > 0 ? "decimal" : "numeric"}
          autoComplete="off"
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          className="h-9 rounded-md pr-14 pl-9 text-sm tabular-nums"
        />
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">
          {unit}
        </span>
      </div>
    </div>
  );
}

/** Título de seção com divisor até o fim da linha e, opcionalmente, um dado à direita. */
function SectionTitle({ title, aside }: { title: string; aside?: string }) {
  return (
    <div className="mb-4 flex items-center gap-3 text-xs">
      <h3 className="font-semibold tracking-wide uppercase">{title}</h3>
      <span className="h-px flex-1 bg-border" aria-hidden />
      {aside ? <span className="text-muted-foreground tabular-nums">{aside}</span> : null}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="rounded-md bg-muted/50 px-2.5 py-1.5">
      <dt className="text-[10px] leading-tight text-muted-foreground">{label}</dt>
      <dd className={cn("text-[13px] font-semibold tabular-nums", tone)}>{value}</dd>
    </div>
  );
}
