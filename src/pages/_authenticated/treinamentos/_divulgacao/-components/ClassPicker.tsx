import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/services/api";
import Icon from "@/components/general-components/Icon";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useMarketingSettings } from "../-lib/data";
import type { MarketingClass } from "../-lib/types";
import { dateParts, money, situationOf, remainingSeats } from "../-lib/variables";
import DivulgarDialog from "./DivulgarDialog";

const SITUATION: Record<string, { label: string; className: string }> = {
  vagas_abertas: { label: "Vagas abertas", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  ultimas_vagas: { label: "Últimas vagas", className: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  lotada: { label: "Lotada", className: "bg-red-500/15 text-red-700 dark:text-red-300" },
  promocao: { label: "Promoção", className: "bg-sky-500/15 text-sky-700 dark:text-sky-300" },
};

/** Próximas turmas (a partir de hoje), com atalho para divulgar. */
export default function ClassPicker() {
  const [search, setSearch] = useState("");
  const [classId, setClassId] = useState<number | null>(null);
  const settings = useMarketingSettings();
  const today = new Date().toISOString().slice(0, 10);

  const { data, isLoading } = useQuery({
    queryKey: ["marketing-upcoming-classes", search],
    queryFn: async () => {
      const res = await get<{ rows: MarketingClass[] }>("classes", "", [
        { key: "limit", value: 30 },
        { key: "active", value: "true" },
        { key: "order-initialDate", value: "asc" },
        { key: "show", value: ["course", "_count"] },
        { key: "gte-initialDate", value: today },
        ...(search ? [{ key: "like-name", value: search }] : []),
      ]);
      return res?.rows ?? [];
    },
  });

  return (
    <div className="space-y-3">
      <div className="relative max-w-md">
        <Icon name="search" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar turma" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : !data?.length ? (
        <div className="w-full flex justify-center items-center font-medium text-primary py-4 rounded border border-primary">
          <p>Nenhuma turma com data a partir de hoje.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((t) => {
            const d = dateParts(t.initialDate, t.finalDate);
            const sit = settings.data ? situationOf(t, settings.data.settings) : "vagas_abertas";
            const left = remainingSeats(t);
            const price = Number(t.discountPrice) || Number(t.price) || 0;
            return (
              <Card key={t.id} className="overflow-hidden py-0">
                <CardContent className="p-0 flex">
                  <div className="w-24 shrink-0 bg-muted">
                    {t.imageUrl || t.course?.imageUrl ? (
                      <img src={t.imageUrl || t.course?.imageUrl || ""} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                        <Icon name="image" className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 p-3 space-y-1.5 min-w-0">
                    <p className="font-semibold leading-tight truncate">{t.course?.name || t.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{t.name}</p>
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      {d && (
                        <span className="flex items-center gap-1">
                          <Icon name="calendar" className="w-3 h-3" /> {d.extenso}
                        </span>
                      )}
                      {price > 0 && <span className="text-muted-foreground">· {money(price)}</span>}
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <Badge variant="secondary" className={SITUATION[sit].className}>
                        {SITUATION[sit].label}
                        {left !== null && sit !== "lotada" ? ` · ${left} vaga${left === 1 ? "" : "s"}` : ""}
                      </Badge>
                      <Button size="sm" onClick={() => setClassId(t.id)}>
                        <Icon name="megaphone" className="w-3.5 h-3.5" /> Divulgar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      <DivulgarDialog classId={classId} open={classId !== null} onOpenChange={(o) => !o && setClassId(null)} />
    </div>
  );
}
