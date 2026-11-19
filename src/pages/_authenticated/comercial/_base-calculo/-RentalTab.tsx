import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import Icon from "@/components/general-components/Icon";
import { cn } from "@/lib/utils";
import {
  Defaults, NumField, RentalDefaults, RentalPreview, RentalPresetRow, RentalStockRow, ResultRow, Row, Tip, commercialApi, errorMessage, money, percent,
} from "../-shared/commercial";
import { stockApi } from "../../suprimentos/-shared/stock";

/** Os mesmos padrões da API (plano 09), para versões antigas da base que ainda não têm a locação. */
const RENTAL_FALLBACK: RentalDefaults = {
  capitalRate: 0.01, insuranceRate: 0.03, residualRate: 0.1, maintenanceRate: 0.05, occupancy: 0.45, lossRate: 0.005,
  handlingCost: 50, inspectionMonths: 6, calibrationMonths: 6, weekFactor: 0.45, dayFactor: 0.15,
  longDiscounts: [{ fromMonths: 3, rate: 0.05 }, { fromMonths: 6, rate: 0.1 }, { fromMonths: 12, rate: 0.15 }],
  marketBand: { min: 0.08, max: 0.2 }, depositRate: 0,
};

const Card = ({ title, description, children, className }: { title: string; description?: string; children: React.ReactNode; className?: string }) => (
  <section className={cn("rounded-lg border p-4", className)}>
    <h3 className="font-semibold">{title}</h3>
    {description && <p className="text-xs text-muted-foreground mb-2">{description}</p>}
    <div className="mt-2">{children}</div>
  </section>
);

const MARKET_TONE: Record<RentalPresetRow["market"], string> = {
  abaixo: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  dentro: "bg-green-100 text-green-900 dark:bg-green-950 dark:text-green-200",
  acima: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
};

interface Props { defaults: Defaults; setDefaults: (updater: (d: Defaults) => Defaults) => void; disabled: boolean; dirty: boolean }

/**
 * Aba "Locação": parâmetros comuns da locação de equipamento ao cliente e a
 * tabela de preços dos equipamentos que a empresa aluga, recalculada pela API a
 * cada mudança (a tela nunca refaz a conta).
 */
export default function RentalTab({ defaults, setDefaults, disabled, dirty }: Props) {
  const { can } = useVerify();
  const rental = defaults.rental ?? RENTAL_FALLBACK;
  const margin = defaults.margins.locacao_cliente ?? 0.25;
  const set = <K extends keyof RentalDefaults>(key: K, value: RentalDefaults[K]) =>
    setDefaults((d) => ({ ...d, rental: { ...(d.rental ?? RENTAL_FALLBACK), [key]: value } }));

  const [preview, setPreview] = useState<RentalPreview | null>(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState("");
  // itens do estoque marcados "Alugável"; a pesquisa de 18/11/2026 fica só de referência
  const [showReference, setShowReference] = useState(false);
  const sequence = useRef(0);
  const serialized = JSON.stringify({ rental, margin });
  useEffect(() => {
    const ticket = ++sequence.current;
    const timer = setTimeout(async () => {
      try {
        const result = await commercialApi.post<RentalPreview>("rental/preview", { rental, margin });
        if (ticket === sequence.current) { setPreview(result); setError(""); }
      } catch (err) {
        if (ticket === sequence.current) setError(errorMessage(err));
      }
    }, 300);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialized]);

  const { mutate: refresh, isPending: refreshing } = useMutation({
    mutationFn: () => stockApi.post<{ updated: number }>("items/rental-prices/refresh"),
    onSuccess: (result) => toast({ title: "Preços de locação atualizados", description: `${result.updated} item(ns) do estoque no modo calculado.`, variant: "success" }),
    onError: (err) => toast({ title: "Não foi possível atualizar", description: errorMessage(err), variant: "destructive" }),
  });

  const pct = (key: keyof RentalDefaults, label: string, hint?: string) => (
    <Row label={label} hint={hint} htmlFor={`rental-${key}`}>
      <NumField id={`rental-${key}`} kind="percent" value={rental[key] as number} disabled={disabled} onChange={(value) => set(key, value as never)} />
    </Row>
  );
  const items = preview?.items ?? [];
  const reference = !!preview && (showReference || !items.length);
  const priced = (r: RentalStockRow): r is RentalStockRow & RentalPresetRow => !r.error && r.cost !== undefined;
  const rows: Array<RentalPresetRow | RentalStockRow> = reference ? preview?.presets ?? [] : items;
  const pricedRows = rows.filter((r): r is RentalPresetRow => !("itemId" in r) || priced(r));
  const row = pricedRows.find((p) => p.key === selected) ?? pricedRows[0];
  const canCreateItem = can("create_itens_estoque");

  return (
    <div className="grid gap-4">
      {preview && !preview.tax.rental && (
        <p className="text-sm rounded-md bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 px-3 py-2">
          A locação está usando o imposto do serviço ({percent(preview.tax.service, 2)}). Locação de bem móvel não paga ISS: no Simples, a conta
          dá perto de 12,51% na faixa atual. Depois que o contador confirmar, cadastre a <b>alíquota da locação</b> na aba Imposto.
        </p>
      )}

      <section className="rounded-lg border">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 p-4 pb-2">
          <div>
            <h3 className="font-semibold">Preço sugerido por equipamento</h3>
            <p className="text-xs text-muted-foreground max-w-3xl">
              {reference
                ? "Referência da pesquisa de 18/11/2026 (tabela do SICRO, lojas e manuais), para comparar e para cadastrar o equipamento no estoque."
                : "Os itens do estoque marcados como alugáveis. Valor do bem, vida útil, inspeção e ocupação vêm do cadastro de cada item; o que estiver vazio lá usa os parâmetros comuns abaixo."}
              {" "}Margem {percent(margin, 0)} · imposto {percent(preview?.tax.inside, 2)}{preview ? ` (${preview.tax.profile})` : ""}.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
          {items.length > 0 && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowReference((v) => !v)}>
              <Icon name={showReference ? "package" : "book-open"} className="w-4 h-4 mr-1" />
              {showReference ? `Ver itens do estoque (${items.length})` : "Ver referência da pesquisa"}
            </Button>
          )}
          {canCreateItem && (
            <Button type="button" variant="outline" size="sm" asChild>
              <Link to="/suprimentos/estoque/itens/$itemId" params={{ itemId: "novo" }} search={{ locacao: "1" }}>
                <Icon name="plus" className="w-4 h-4 mr-1" /> Cadastrar equipamento
              </Link>
            </Button>
          )}
          {can("update_itens_estoque") && items.length > 0 && (
            <Tip text={dirty ? "Salve a base antes: os itens usam a base salva." : "Grava dia, semana e mês de cada item alugável no modo calculado."}>
              <span><Button type="button" variant="outline" size="sm" disabled={dirty || refreshing} onClick={() => refresh()}>
                <Icon name="refresh-cw" className="w-4 h-4 mr-1" /> Atualizar preços dos itens do estoque
              </Button></span>
            </Tip>
          )}
          </div>
        </div>
        {preview && !items.length && (
          <p className="mx-4 mb-2 text-sm rounded-md bg-muted px-3 py-2">
            Nenhum item do estoque está marcado como <b>alugável</b>. Os valores abaixo são só referência da pesquisa.
            {canCreateItem ? " Use \"Cadastrar\" na linha do equipamento para criar o item já preenchido com eles." : ""}
          </p>
        )}
        {error && <p className="mx-4 mb-2 text-sm rounded-md border border-destructive text-destructive px-3 py-2">Não dá para calcular: {error}</p>}
        <div className={cn("overflow-x-auto", error && "opacity-50")}>
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b">
                <th className="text-left font-medium px-4 py-2">Equipamento</th>
                <th className="text-right font-medium px-2 py-2">Valor do bem</th>
                <th className="text-right font-medium px-2 py-2">Custo de ter/mês</th>
                <th className="text-right font-medium px-2 py-2">Custo/mês alugado</th>
                <th className="text-right font-medium px-2 py-2">Mês</th>
                <th className="text-right font-medium px-2 py-2">Semana</th>
                <th className="text-right font-medium px-2 py-2">Dia</th>
                <th className="text-right font-medium px-2 py-2">Preparação</th>
                <th className="text-right font-medium px-2 py-2">% do bem/mês</th>
                <th className="text-right font-medium px-4 py-2">Mês c/ imposto do serviço</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const stock = "itemId" in p ? p : null;
                if (stock && !priced(stock)) return (
                  <tr key={p.key} className="border-b last:border-b-0">
                    <td className="px-4 py-2">
                      <Link to="/suprimentos/estoque/itens/$itemId" params={{ itemId: String(stock.itemId) }} className="font-medium hover:underline">{p.label}</Link>
                    </td>
                    <td colSpan={9} className="px-2 py-2 text-sm text-amber-700 dark:text-amber-300">
                      {stock.error?.replace(`${p.label}: `, "").replace(/^./, (c) => c.toUpperCase())} · <Link to="/suprimentos/estoque/itens/$itemId" params={{ itemId: String(stock.itemId) }} className="underline">completar o cadastro</Link>
                    </td>
                  </tr>
                );
                const r = p as RentalPresetRow;
                return (
                <tr key={r.key} className={cn("border-b last:border-b-0 cursor-pointer hover:bg-muted/40", r.key === row?.key && "bg-muted/60")}
                  onClick={() => setSelected(r.key)}>
                  <td className="px-4 py-2">
                    {stock ? (
                      <Link to="/suprimentos/estoque/itens/$itemId" params={{ itemId: String(stock.itemId) }} className="font-medium hover:underline" onClick={(e) => e.stopPropagation()}>{r.label}</Link>
                    ) : <span className="font-medium">{r.label}</span>}
                    {r.source && <span className="block text-xs text-muted-foreground">{r.source}</span>}
                    {stock?.manual && (
                      <span className="block text-xs text-muted-foreground">
                        Preço digitado no cadastro: {[stock.manual.mes != null && `${money(stock.manual.mes)}/mês`, stock.manual.semana != null && `${money(stock.manual.semana)}/semana`, stock.manual.dia != null && `${money(stock.manual.dia)}/dia`].filter(Boolean).join(" · ") || "vazio"}
                      </span>
                    )}
                    {!stock && canCreateItem && (
                      <Link to="/suprimentos/estoque/itens/$itemId" params={{ itemId: "novo" }} search={{ locacao: r.key }} onClick={(e) => e.stopPropagation()}
                        className="mt-0.5 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                        <Icon name="plus" className="w-3 h-3" /> Cadastrar no estoque
                      </Link>
                    )}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">{money(r.cost.value)}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{money(r.cost.ownMonthly)}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{money(r.cost.perRentedMonth)}</td>
                  <td className="px-2 py-2 text-right tabular-nums font-semibold">{money(r.month)}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{money(r.week)}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{money(r.day)}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{money(r.handling)}</td>
                  <td className="px-2 py-2 text-right">
                    <span className={cn("rounded px-1.5 py-0.5 text-xs tabular-nums", MARKET_TONE[r.market])}>{percent(r.valueShare, 1)}</span>
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">{money(r.monthWithServiceTax)}</td>
                </tr>
                );
              })}
              {!preview && !error && <tr><td colSpan={10} className="px-4 py-6 text-center text-muted-foreground">Calculando…</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {row && (
        <div className="grid lg:grid-cols-2 gap-4">
          <Card title={`Conta aberta — ${row.label}`} description={reference ? "Referência da pesquisa. Clique numa linha da tabela para ver outro equipamento." : "Clique numa linha da tabela para ver outro equipamento."}>
            <ResultRow label="Depreciação (valor − residual) ÷ vida" value={money(row.cost.depreciation)} />
            <ResultRow label="Custo do capital parado" value={money(row.cost.capital)} />
            <ResultRow label="Seguro" value={money(row.cost.insurance)} />
            <ResultRow label="Manutenção" value={money(row.cost.maintenance)} />
            <ResultRow label="Inspeção periódica" value={money(row.cost.inspection)} />
            <ResultRow label="Calibração" value={money(row.cost.calibration)} />
            <ResultRow label="Custo de ter, por mês (alugado ou não)" value={money(row.cost.ownMonthly)} strong />
            <ResultRow label={`÷ ocupação ${percent(row.cost.occupancy, 0)} + perdas`} value={money(row.cost.perRentedMonth)} strong />
            <ResultRow label="Preço do mês" value={money(row.month)} strong />
            <ResultRow label="Piso do contrato longo (ocupação de 100%)" value={money(row.floorMonth)} />
          </Card>
          <Card title="Quanto a ocupação pesa" description="O número mais sensível da locação: quanto do ano o equipamento passa alugado.">
            {row.sensitivity.map((s) => (
              <ResultRow key={s.occupancy} label={`Alugado ${percent(s.occupancy, 0)} do tempo`} value={money(s.month)} strong={Math.abs(s.occupancy - row.cost.occupancy) < 0.001} />
            ))}
          </Card>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Parâmetros comuns" description="Valem para todo equipamento que não tiver valor próprio no cadastro do estoque (ou na categoria).">
          <Row label="Margem da locação" hint="Margem padrão da seção de equipamentos da proposta de locação." htmlFor="rental-margin">
            <NumField id="rental-margin" kind="percent" value={margin} disabled={disabled}
              onChange={(value) => setDefaults((d) => ({ ...d, margins: { ...d.margins, locacao_cliente: value } }))} />
          </Row>
          {pct("capitalRate", "Custo de capital ao mês", "O dinheiro parado no equipamento. Perto do CDI, ou o juro do empréstimo da compra.")}
          {pct("insuranceRate", "Seguro ao ano", "Percentual do valor do bem. Zero se não há apólice.")}
          {pct("residualRate", "Valor residual", "Quanto vale no fim da vida. Têxtil (cinto, corda) = 0.")}
          {pct("maintenanceRate", "Manutenção ao ano", "Peças, sensores e revisão, em % do valor. O SICRO usa 10% a 12% para tripé, detector e exaustor.")}
          {pct("occupancy", "Ocupação esperada", "Parte do ano em que o equipamento fica alugado.")}
          {pct("lossRate", "Perdas por mês alugado", "Só o que não se consegue cobrar do cliente.")}
          <Row label="Preparação por locação" hint="Inspeção de devolução e higienização, por peça." htmlFor="rental-handling">
            <NumField id="rental-handling" kind="money" value={rental.handlingCost} disabled={disabled} onChange={(value) => set("handlingCost", value)} />
          </Row>
          <Row label="Inspeção e calibração a cada (meses)" hint="Quando o item não informa o intervalo." htmlFor="rental-inspection">
            <div className="flex gap-2">
              <NumField id="rental-inspection" digits={1} value={rental.inspectionMonths} disabled={disabled} ariaLabel="Inspeção a cada (meses)" onChange={(value) => set("inspectionMonths", value)} />
              <NumField digits={1} value={rental.calibrationMonths} disabled={disabled} ariaLabel="Calibração a cada (meses)" onChange={(value) => set("calibrationMonths", value)} />
            </div>
          </Row>
          {pct("depositRate", "Caução sugerida", "Percentual do valor de reposição. Zero = sem caução.")}
        </Card>
        <div className="grid gap-4 content-start">
          <Card title="Dia e semana" description="Saem do mês. O sistema sempre cobra o menor entre diárias, semanas e mês cheio.">
            <Row label="Semana vale do mês" htmlFor="rental-week">
              <NumField id="rental-week" kind="percent" value={rental.weekFactor} disabled={disabled} onChange={(value) => set("weekFactor", value)} />
            </Row>
            <Row label="Dia vale do mês" htmlFor="rental-day">
              <NumField id="rental-day" kind="percent" value={rental.dayFactor} disabled={disabled} onChange={(value) => set("dayFactor", value)} />
            </Row>
          </Card>
          <Card title="Desconto do período fechado" description="Contrato fechado em meses: durante ele o equipamento não fica parado.">
            {rental.longDiscounts.map((d, index) => (
              <div key={index} className="flex items-center gap-2 py-1">
                <span className="text-sm text-muted-foreground w-24 shrink-0">A partir de</span>
                <NumField className="w-24" digits={0} value={d.fromMonths} disabled={disabled} suffix="m" ariaLabel={`Meses da faixa ${index + 1}`}
                  onChange={(value) => set("longDiscounts", rental.longDiscounts.map((x, i) => (i === index ? { ...x, fromMonths: value } : x)))} />
                <NumField className="w-28" kind="percent" value={d.rate} disabled={disabled} ariaLabel={`Desconto da faixa ${index + 1}`}
                  onChange={(value) => set("longDiscounts", rental.longDiscounts.map((x, i) => (i === index ? { ...x, rate: value } : x)))} />
                {!disabled && (
                  <Button type="button" variant="ghost" size="icon" aria-label={`Remover faixa ${index + 1}`}
                    onClick={() => set("longDiscounts", rental.longDiscounts.filter((_, i) => i !== index))}>
                    <Icon name="trash-2" className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
            {!disabled && (
              <Button type="button" variant="outline" size="sm" className="mt-2"
                onClick={() => set("longDiscounts", [...rental.longDiscounts, { fromMonths: (rental.longDiscounts.at(-1)?.fromMonths ?? 0) + 6, rate: 0 }])}>
                <Icon name="plus" className="w-4 h-4 mr-1" /> Faixa
              </Button>
            )}
          </Card>
          <Card title="Checagem de mercado" description="Aviso quando o mês sai desta faixa do valor do bem. Estreite quando tiver cotações de concorrentes.">
            <Row label="Mínimo ao mês" htmlFor="band-min">
              <NumField id="band-min" kind="percent" value={rental.marketBand.min} disabled={disabled} onChange={(value) => set("marketBand", { ...rental.marketBand, min: value })} />
            </Row>
            <Row label="Máximo ao mês" htmlFor="band-max">
              <NumField id="band-max" kind="percent" value={rental.marketBand.max} disabled={disabled} onChange={(value) => set("marketBand", { ...rental.marketBand, max: value })} />
            </Row>
          </Card>
        </div>
      </div>
    </div>
  );
}
