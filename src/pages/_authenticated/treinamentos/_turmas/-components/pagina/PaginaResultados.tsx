import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { get, put } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import { cn } from "@/lib/utils";
import { layoutName } from "./landing";

interface LayoutRow {
  layout: string;
  visitors: number;
  ctaClicks: number;
  formStarts: number;
  submits: number;
  whatsappClicks: number;
  subscriptions: number;
  confirmed: number;
  conversion: number | null;
  enoughData: boolean;
  chanceToBeBest: number | null;
  blocks: { block: string; visitors: number; share: number | null }[];
}
interface Segment { key: string; layout: string; visitors: number; submits: number }
interface Results {
  config: { layout: string; abTest: boolean; abLayouts: string[] };
  minimum: { visitors: number; submits: number };
  layouts: LayoutRow[];
  bySource: Segment[];
  byDevice: Segment[];
}

const pct = (v: number | null | undefined, digits = 1) =>
  v === null || v === undefined ? "—" : `${(v * 100).toLocaleString("pt-BR", { maximumFractionDigits: digits })}%`;
const rate = (part: number, total: number) => (total ? part / total : null);

const BLOCK_LABEL: Record<string, string> = {
  hero: "Topo", galeria: "Galeria", destaques: "Destaques", conteudo: "Conteúdo", incluso: "Incluso",
  historia: "História", avaliacoes: "Avaliações", instrutores: "Instrutores", faq: "Dúvidas", inscricao: "Formulário",
};
const SOURCE_LABEL: Record<string, string> = { direto: "Direto / sem origem", instagram: "Instagram", google: "Google", facebook: "Facebook", whatsapp: "WhatsApp" };
const DEVICE_LABEL: Record<string, string> = { mobile: "Celular", desktop: "Computador", "?": "Não identificado" };

/** Resultado do teste A/B da página da turma, com "fixar vencedor". */
export default function PaginaResultados({ classId }: { classId: number }) {
  const queryClient = useQueryClient();
  const [segment, setSegment] = useState<"source" | "device">("source");
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["landing-results", classId],
    queryFn: async () => (await get<Results>("landing", `results/${classId}`)) as Results,
    staleTime: 60 * 1000,
  });

  const fix = useMutation({
    mutationFn: (layout: string) => put("classes", `${classId}`, { landingLayout: layout, landingAbTest: "false" } as never),
    onSuccess: (_r, layout) => {
      toast({ title: `Página fixada no layout ${layoutName(layout)}`, description: "O teste foi encerrado; os resultados continuam aqui." });
      queryClient.invalidateQueries({ queryKey: ["landing-results", classId] });
      queryClient.invalidateQueries({ queryKey: ["classes", String(classId)] });
    },
    onError: () => toast({ title: "Não foi possível fixar o layout", variant: "destructive" }),
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (isError || !data) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">
        Não foi possível carregar os resultados. <button type="button" className="text-primary hover:underline" onClick={() => refetch()}>Tentar de novo</button>
      </div>
    );
  }

  const rows = data.layouts;
  const anyVisit = rows.some((r) => r.visitors > 0);
  const leader = [...rows].filter((r) => r.chanceToBeBest !== null).sort((a, b) => (b.chanceToBeBest ?? 0) - (a.chanceToBeBest ?? 0))[0];
  const enough = rows.length > 1 && rows.every((r) => r.enoughData);
  const segs = (segment === "source" ? data.bySource : data.byDevice);
  const segKeys = [...new Set(segs.map((s) => s.key))];

  return (
    <div className="space-y-6">
      <section className="rounded-lg border p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium">
            {data.config.abTest
              ? `Teste A/B ligado: ${data.config.abLayouts.map(layoutName).join(", ")}`
              : `Layout fixo: ${layoutName(data.config.layout)}`}
          </p>
          <p className="text-xs text-muted-foreground">
            Conversão = visitantes que enviaram a inscrição ÷ visitantes da página. Prévias do admin (?preview=1) e robôs não contam.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => refetch()}><Icon name="refresh-cw" className="w-3.5 h-3.5 mr-1" /> Atualizar</Button>
      </section>

      {!anyVisit ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Ainda não há visitas registradas nesta página. Os números aparecem aqui assim que alguém abrir a turma no site.</p>
      ) : (
        <>
          {rows.length > 1 && leader && (
            <section className={cn("rounded-lg border p-4", enough ? "border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30" : "border-amber-300 bg-amber-50 dark:bg-amber-950/30")}>
              <p className="text-sm font-medium">
                {enough
                  ? `${layoutName(leader.layout)} tem ${pct(leader.chanceToBeBest, 0)} de chance de ser o melhor layout.`
                  : `Por enquanto ${layoutName(leader.layout)} está na frente (${pct(leader.chanceToBeBest, 0)} de chance), mas ainda há poucos dados.`}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {enough
                  ? "Acima de 95% dá para fixar o vencedor com segurança."
                  : `Para concluir, espere cada layout ter pelo menos ${data.minimum.visitors} visitantes e ${data.minimum.submits} inscrições.`}
              </p>
            </section>
          )}

          <section className="rounded-lg border overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-3 py-2">Layout</th>
                  <th className="text-right font-medium px-3 py-2">Visitantes</th>
                  <th className="text-right font-medium px-3 py-2">Clicaram no botão</th>
                  <th className="text-right font-medium px-3 py-2">Começaram o formulário</th>
                  <th className="text-right font-medium px-3 py-2">Enviaram</th>
                  <th className="text-right font-medium px-3 py-2">Conversão</th>
                  <th className="text-right font-medium px-3 py-2">Confirmadas</th>
                  <th className="text-right font-medium px-3 py-2">Chance de ser o melhor</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {rows.map((r) => (
                  <tr key={r.layout} className="border-t">
                    <td className="px-3 py-2 font-medium">{layoutName(r.layout)}</td>
                    <td className="px-3 py-2 text-right">{r.visitors}</td>
                    <td className="px-3 py-2 text-right">{r.ctaClicks} <span className="text-xs text-muted-foreground">{pct(rate(r.ctaClicks, r.visitors), 0)}</span></td>
                    <td className="px-3 py-2 text-right">{r.formStarts} <span className="text-xs text-muted-foreground">{pct(rate(r.formStarts, r.visitors), 0)}</span></td>
                    <td className="px-3 py-2 text-right">{r.submits}</td>
                    <td className="px-3 py-2 text-right font-semibold">{pct(r.conversion)}</td>
                    <td className="px-3 py-2 text-right">{r.confirmed} <span className="text-xs text-muted-foreground">de {r.subscriptions}</span></td>
                    <td className="px-3 py-2 text-right">{rows.length > 1 ? pct(r.chanceToBeBest, 0) : "—"}</td>
                    <td className="px-3 py-2 text-right">
                      {(data.config.abTest || data.config.layout !== r.layout) && (
                        <ConfirmDialog
                          title={`Fixar o layout ${layoutName(r.layout)}?`}
                          description={data.config.abTest ? "O teste A/B será encerrado e todos os visitantes passam a ver este layout. Os resultados continuam disponíveis." : "A página passa a usar este layout para todos os visitantes."}
                          onConfirm={() => fix.mutate(r.layout)}
                          titleBttn="Fixar"
                          iconBttn="pin"
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-lg border p-4">
              <h3 className="text-sm font-medium mb-1">Até onde as pessoas chegam</h3>
              <p className="text-xs text-muted-foreground mb-3">Parte dos visitantes que viu cada bloco da página.</p>
              <div className="space-y-4">
                {rows.filter((r) => r.blocks.length).map((r) => (
                  <div key={r.layout}>
                    <p className="text-xs font-medium mb-1.5">{layoutName(r.layout)}</p>
                    <div className="space-y-1">
                      {r.blocks.sort((a, b) => (b.share ?? 0) - (a.share ?? 0)).map((b) => (
                        <div key={b.block} className="flex items-center gap-2 text-xs">
                          <span className="w-24 shrink-0 truncate">{BLOCK_LABEL[b.block] ?? b.block}</span>
                          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${Math.round((b.share ?? 0) * 100)}%` }} /></div>
                          <span className="w-10 text-right tabular-nums">{pct(b.share, 0)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {!rows.some((r) => r.blocks.length) && <p className="text-xs text-muted-foreground">O Clássico não mede blocos; os layouts novos medem.</p>}
              </div>
            </section>

            <section className="rounded-lg border p-4">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h3 className="text-sm font-medium">{segment === "source" ? "Por origem" : "Por aparelho"}</h3>
                <div className="flex rounded-md bg-muted p-0.5 text-xs">
                  <button type="button" onClick={() => setSegment("source")} className={cn("px-2 py-1 rounded", segment === "source" && "bg-background shadow-sm font-medium")}>Origem</button>
                  <button type="button" onClick={() => setSegment("device")} className={cn("px-2 py-1 rounded", segment === "device" && "bg-background shadow-sm font-medium")}>Aparelho</button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs tabular-nums">
                  <thead className="text-muted-foreground">
                    <tr><th className="text-left font-medium py-1">{segment === "source" ? "Origem" : "Aparelho"}</th>{rows.map((r) => <th key={r.layout} className="text-right font-medium py-1">{layoutName(r.layout)}</th>)}</tr>
                  </thead>
                  <tbody>
                    {segKeys.map((key) => (
                      <tr key={key} className="border-t">
                        <td className="py-1.5">{(segment === "source" ? SOURCE_LABEL : DEVICE_LABEL)[key] ?? key}</td>
                        {rows.map((r) => {
                          const s = segs.find((x) => x.key === key && x.layout === r.layout);
                          return <td key={r.layout} className="py-1.5 text-right">{s ? <>{pct(rate(s.submits, s.visitors))} <span className="text-muted-foreground">({s.submits}/{s.visitors})</span></> : "—"}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Conversão (enviaram/visitantes). A origem vem do link (utm_source) ou do site de onde a pessoa veio.</p>
            </section>
          </div>

          <p className="text-xs text-muted-foreground">
            Para ver o porquê, abra o Microsoft Clarity e filtre as gravações e o mapa de calor pela tag <span className="font-mono">layout</span> e pela tag <span className="font-mono">turma</span> = {classId}.
          </p>
        </>
      )}
    </div>
  );
}
