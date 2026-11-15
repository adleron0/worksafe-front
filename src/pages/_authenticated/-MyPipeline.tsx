import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";
import Icon from "@/components/general-components/Icon";
import { cn } from "@/lib/utils";
import { money } from "./comercial/-shared/commercial";

/**
 * "Minha esteira": o que está esperando por quem abriu o sistema, em cada área
 * em que a pessoa atua (retornos, OS, RDO, compras, faturamento, contas a pagar).
 * A API só devolve os blocos das áreas que a pessoa pode ver.
 */
/** Link com "?a=b": a rota vai em `to` e os parâmetros em `search`. */
const linkTo = (link: string) => {
  const [to, query] = link.split("?");
  return { to, search: query ? Object.fromEntries(new URLSearchParams(query)) : undefined } as { to: never; search: never };
};

interface PipelineItem { id: number; title: string; subtitle: string; link: string; value: number | null; late: boolean }
interface PipelineBlock { key: string; area: string; title: string; hint: string; count: number; total: number | null; link: string; items: PipelineItem[] }
interface Pipeline { today: string; blocks: PipelineBlock[] }
export const PIPELINE_KEY = "myPipeline";

const AREA_ICON: Record<string, string> = { Comercial: "handshake", "Operação": "drill", Suprimentos: "shopping-cart", Financeiro: "circle-dollar-sign", RH: "id-card" };

export default function MyPipeline() {
  const { data } = useQuery({ queryKey: [PIPELINE_KEY], staleTime: 60 * 1000, queryFn: async () => (await api.get<Pipeline>("my-pipeline")).data });
  // quem não atua em nenhuma dessas áreas (ou enquanto carrega) não vê o bloco
  if (!data || data.blocks.length === 0) return null;
  const waiting = data.blocks.filter((block) => block.count > 0);
  const quiet = data.blocks.filter((block) => block.count === 0);

  return (
    <section className="mb-6" aria-label="Minha esteira">
      <div className="mb-3">
        <h2 className="text-xl font-bold">Minha esteira</h2>
        <p className="text-sm text-muted-foreground">
          {waiting.length ? "O que está esperando por você agora." : "Nada esperando por você agora."}
        </p>
      </div>
      {waiting.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {waiting.map((block) => (
            <div key={block.key} className="rounded-lg border p-4 flex flex-col">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Icon name={AREA_ICON[block.area] ?? "circle"} className="w-3 h-3" /> {block.area}</p>
                  <p className="font-semibold">{block.title}</p>
                  <p className="text-xs text-muted-foreground">{block.hint}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-2xl font-bold tabular-nums leading-none">{block.count}</p>
                  {block.total !== null && <p className="mt-1 text-xs text-muted-foreground tabular-nums">{money(block.total)}</p>}
                </div>
              </div>
              <ul className="mt-3 divide-y text-sm flex-1">
                {block.items.map((item) => (
                  <li key={item.id}>
                    <Link {...linkTo(item.link)} className="flex items-center gap-3 py-2 hover:bg-muted/40 rounded">
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium truncate">{item.title}</span>
                        <span className={cn("block text-xs truncate", item.late ? "text-red-600 dark:text-red-400" : "text-muted-foreground")}>{item.subtitle}{item.late ? " · atrasado" : ""}</span>
                      </span>
                      {item.value !== null && <span className="shrink-0 tabular-nums">{money(item.value)}</span>}
                      <Icon name="chevron-right" className="w-4 h-4 shrink-0 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
              <Link {...linkTo(block.link)} className="mt-2 text-sm underline hover:text-foreground text-muted-foreground w-fit">
                {block.count > block.items.length ? `Ver os ${block.count}` : "Abrir a tela"}
              </Link>
            </div>
          ))}
        </div>
      )}
      {quiet.length > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">Em dia: {quiet.map((block) => block.title.toLowerCase()).join(" · ")}.</p>
      )}
    </section>
  );
}
