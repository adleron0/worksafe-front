import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import Icon from "@/components/general-components/Icon";
import PageHeader from "@/components/general-components/PageHeader";
import ListCard from "@/components/general-components/ListCard";
import DataTable, { DataColumn, EmptyState } from "@/components/general-components/DataTable";
import { sizeText } from "@/lib/open-file";
import { dateBr, errorMessage } from "../../comercial/-shared/commercial";
import { FILES_ABILITY, FILES_KEY, TrashList, fileIcon, filesApi } from "../-shared/files";
import TrashRowActions from "./-components/TrashRowActions";

export const Route = createFileRoute("/_authenticated/arquivos/_pastas/lixeira")({
  component: TrashPage,
});

const leftText = (days: number) => (days <= 0 ? "some hoje" : `some em ${days} ${days === 1 ? "dia" : "dias"}`);

/** Pastas e arquivos da lixeira numa lista só (pastas primeiro, como antes). */
interface TrashItem { key: string; kind: "files" | "folders"; id: number; name: string; icon: string; detail: string; trashedAt: string; trashedBy: string | null; daysLeft: number; extra: string }
const itemsOf = (data: TrashList): TrashItem[] => [
  ...data.folders.map((folder) => ({
    key: `p${folder.id}`, kind: "folders" as const, id: folder.id, name: folder.name, icon: "folder", trashedAt: folder.trashedAt, trashedBy: folder.trashedBy, daysLeft: folder.daysLeft,
    detail: `Pasta com ${folder.files} ${folder.files === 1 ? "arquivo" : "arquivos"} · estava em ${folder.from}`, extra: ` e os ${folder.files} arquivos dentro dela`,
  })),
  ...data.files.map((file) => ({
    key: `a${file.id}`, kind: "files" as const, id: file.id, name: file.name, icon: fileIcon(file), trashedAt: file.trashedAt, trashedBy: file.trashedBy, daysLeft: file.daysLeft,
    detail: `${sizeText(file.size)} · estava em ${file.from}`, extra: "",
  })),
];
const COLUMNS: DataColumn<TrashItem>[] = [
  {
    id: "name", header: "Item", className: "min-w-[260px]",
    cell: (item) => (
      <div className="flex items-center gap-2.5 min-w-0">
        <Icon name={item.icon} className="w-5 h-5 shrink-0 text-muted-foreground" />
        <div className="min-w-0 max-w-[24rem]">
          <p className="font-medium truncate">{item.name}</p>
          <p className="text-xs text-muted-foreground truncate">{item.detail}</p>
        </div>
      </div>
    ),
  },
  {
    id: "trashed", header: "Apagado em",
    cell: (item) => (
      <div className="whitespace-nowrap">
        <p className="tabular-nums">{dateBr(item.trashedAt)}</p>
        {item.trashedBy && <p className="text-xs text-muted-foreground">por {item.trashedBy}</p>}
      </div>
    ),
  },
  { id: "left", header: "Prazo", cell: (item) => <span className="text-muted-foreground whitespace-nowrap">{leftText(item.daysLeft)}</span> },
];

/** Lixeira dos arquivos da empresa: o que foi apagado fica 30 dias e pode voltar; apagar de vez é de quem administra. */
function TrashPage() {
  const { can } = useVerify();
  const queryClient = useQueryClient();
  const canWrite = can(`update_${FILES_ABILITY}`) || can(`manage_${FILES_ABILITY}`);
  const canManage = can(`manage_${FILES_ABILITY}`);
  const { data, isLoading, error } = useQuery({ queryKey: [FILES_KEY, "trash"], queryFn: () => filesApi.get<TrashList>("trash"), enabled: canWrite });

  const done = (title: string) => () => { queryClient.invalidateQueries({ queryKey: [FILES_KEY] }); toast({ title, variant: "success" }); };
  const failed = (title: string) => (err: unknown) => toast({ title, description: errorMessage(err), variant: "destructive" });
  const { mutate: restore, isPending: restoring } = useMutation({
    mutationFn: (item: { kind: "files" | "folders"; id: number }) => filesApi.post(`${item.kind}/${item.id}/restore`),
    onSuccess: done("Restaurado"), onError: failed("Não foi possível restaurar"),
  });
  const { mutate: purge, isPending: purging } = useMutation({
    mutationFn: (item: { kind: "files" | "folders"; id: number }) => filesApi.delete(`${item.kind}/${item.id}/purge`),
    onSuccess: done("Apagado de vez"), onError: failed("Não foi possível apagar"),
  });

  if (!can(`view_${FILES_ABILITY}`)) return null;
  const days = data?.trashDays ?? 30;

  return (
    <>
      <PageHeader title="Lixeira" description={`O que foi apagado dos Arquivos fica aqui por ${days} dias e pode ser restaurado. Depois disso some de verdade.`} />

      {!canWrite && <p className="p-4 rounded-card border bg-card text-sm text-muted-foreground">Seu perfil só pode ver os arquivos; a lixeira é de quem pode enviar e apagar.</p>}
      {canWrite && (
        <ListCard>
          <DataTable rows={data ? itemsOf(data) : undefined} columns={COLUMNS} getRowId={(item) => item.key} ariaLabel="Lixeira" minWidth={640}
            loading={isLoading} error={error ? errorMessage(error) : null}
            actions={(item) => (
              <TrashRowActions name={item.name} extra={item.extra} canManage={canManage} restoring={restoring} purging={purging}
                onRestore={() => restore({ kind: item.kind, id: item.id })} onPurge={() => purge({ kind: item.kind, id: item.id })} />
            )}
            empty={<EmptyState icon="trash-2" title="A lixeira está vazia." />} />
        </ListCard>
      )}
    </>
  );
}
