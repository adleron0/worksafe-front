import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import DocStatusBadge from "@/components/general-components/DocStatusBadge";
import Icon from "@/components/general-components/Icon";
import Input from "@/components/general-components/Input";
import Select from "@/components/general-components/Select";
import { cn } from "@/lib/utils";
import { dateBr, errorMessage } from "../../comercial/-shared/commercial";
import { ExpiringList, ExpiringRow, FILES_ABILITY, FILES_KEY, filesApi, openFile } from "../-shared/files";

export const Route = createFileRoute("/_authenticated/arquivos/_pastas/vencimentos")({
  component: ExpiringPage,
});

const CARDS = [
  { id: "vencido", title: "Vencidos", hint: "A validade já passou", icon: "circle-alert" },
  { id: "a_vencer", title: "A vencer", hint: "Dentro do prazo de aviso", icon: "calendar-clock" },
  { id: "faltando", title: "Obrigatórios faltando", hint: "Tipos obrigatórios sem arquivo vigente", icon: "file-question" },
] as const;

const whenText = (row: ExpiringRow) => {
  if (row.status === "faltando" || row.days === null) return "nenhum arquivo vigente";
  if (row.days < 0) return `venceu há ${-row.days} ${row.days === -1 ? "dia" : "dias"} (${dateBr(row.expiryDate)})`;
  if (row.days === 0) return `vence hoje (${dateBr(row.expiryDate)})`;
  return `vence em ${row.days} ${row.days === 1 ? "dia" : "dias"} (${dateBr(row.expiryDate)})`;
};

/** Vencimentos: só o que pede ação nos documentos da empresa, nas pastas a que a pessoa tem acesso. */
function ExpiringPage() {
  const { can } = useVerify();
  const [status, setStatus] = useState("");
  const [typeId, setTypeId] = useState("");
  const [search, setSearch] = useState("");

  const params = { ...(status ? { status } : {}), ...(typeId ? { typeId } : {}), ...(search.trim() ? { search: search.trim() } : {}) };
  const { data, isLoading, error } = useQuery({
    queryKey: [FILES_KEY, "expiring", params],
    queryFn: () => filesApi.get<ExpiringList>("expiring", params),
    placeholderData: (previous) => previous,
  });

  if (!can(`view_${FILES_ABILITY}`)) return null;
  const empty = status || typeId || search ? "Nada com esses filtros." : "Nenhum documento vencido, a vencer ou faltando. Tudo em dia.";

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Vencimentos</h1>
          <p className="text-sm text-muted-foreground">Documentos da empresa vencidos, a vencer e tipos obrigatórios que ainda não têm arquivo.</p>
        </div>
        <Button asChild variant="outline"><Link to="/arquivos/tipos-de-documento"><Icon name="folder-cog" className="w-4 h-4 mr-1" /> Tipos de documento</Link></Button>
      </div>

      <div className="my-4 grid sm:grid-cols-3 gap-3">
        {CARDS.map((card) => (
          <button key={card.id} type="button" aria-pressed={status === card.id} onClick={() => setStatus(status === card.id ? "" : card.id)}
            className={cn("rounded-card border bg-card p-4 text-left transition-colors hover:bg-muted/40", status === card.id && "border-primary bg-primary/5")}>
            <p className="flex items-center gap-2 text-sm text-muted-foreground"><Icon name={card.icon} className="w-4 h-4" /> {card.title}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{data?.summary[card.id] ?? "—"}</p>
            <p className="text-xs text-muted-foreground">{card.hint}</p>
          </button>
        ))}
      </div>

      <div className="flex flex-col xl:flex-row xl:items-center gap-3 mb-4 p-4 rounded-card border bg-card">
        <div className="w-full xl:w-72">
          <Select name="typeId" state={typeId} clearable placeholder="Todos os tipos de documento" modal={false} options={(data?.types ?? []).map((type) => ({ id: type.id, name: type.name }))} onChange={(_, value) => setTypeId(String(value ?? ""))} />
        </div>
        <div className="w-full xl:w-80">
          <Input name="search" value={search} onValueChange={(_, value) => setSearch(String(value))} placeholder="Buscar pelo nome do arquivo ou do tipo..." icon="search" />
        </div>
      </div>

      {error && <p className="p-4 text-destructive font-medium">Erro: {errorMessage(error)}</p>}
      {!error && (
        <div className="rounded-card border bg-card overflow-hidden">
          <div className="hidden lg:flex items-center py-2.5 border-b px-4 font-semibold text-[12.5px] text-muted-foreground">
            <div className="flex-1">Documento</div>
            <div className="w-72">Pasta</div>
            <div className="w-32">Situação</div>
            <div className="w-64">Quando</div>
            <div className="w-24 text-right">Ações</div>
          </div>
          {isLoading && Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-12 w-full my-1" />)}
          {!isLoading && !data?.rows.length && <p className="p-6 text-sm text-muted-foreground">{empty}</p>}
          {data?.rows.map((row) => (
            <div key={row.key} className="flex flex-col lg:flex-row lg:items-center gap-1 lg:gap-0 px-4 py-2.5 border-b border-border/70 last:border-b-0 hover:bg-muted/40 transition-colors text-sm hover:bg-muted/40">
              <div className="flex-1 min-w-0 lg:pr-4">
                <p className="font-medium truncate">{row.typeName ?? row.name}</p>
                {row.typeName && row.fileId && <p className="text-xs text-muted-foreground truncate">{row.name}</p>}
              </div>
              <div className="lg:w-72 lg:pr-4 truncate">
                {row.folderId ? <Link to="/arquivos/pastas" search={{ pasta: row.folderId }} className="hover:underline">{row.where}</Link> : <span className="text-muted-foreground">—</span>}
              </div>
              <div className="lg:w-32"><DocStatusBadge status={row.status} label={row.statusLabel} /></div>
              <div className="lg:w-64 text-muted-foreground">{whenText(row)}</div>
              <div className="lg:w-24 flex lg:justify-end gap-1">
                {row.fileId && <Button type="button" variant="ghost" size="sm" className="h-8 px-2" onClick={() => openFile({ id: row.fileId as number, name: row.name })}><Icon name="eye" className="w-4 h-4 mr-1" /> Ver</Button>}
              </div>
            </div>
          ))}
        </div>
      )}
      {data && data.total > data.rows.length && <p className="mt-3 text-xs text-muted-foreground">Mostrando {data.rows.length} de {data.total}. Use os filtros para chegar aos demais.</p>}
    </>
  );
}
