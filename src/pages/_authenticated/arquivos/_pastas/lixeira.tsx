import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import { sizeText } from "@/lib/open-file";
import { dateBr, errorMessage } from "../../comercial/-shared/commercial";
import { FILES_ABILITY, FILES_KEY, TrashList, fileIcon, filesApi } from "../-shared/files";

export const Route = createFileRoute("/_authenticated/arquivos/_pastas/lixeira")({
  component: TrashPage,
});

const leftText = (days: number) => (days <= 0 ? "some hoje" : `some em ${days} ${days === 1 ? "dia" : "dias"}`);

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
  const empty = data && !data.folders.length && !data.files.length;

  const actions = (kind: "files" | "folders", id: number, name: string, extra = "") => (
    <div className="flex items-center gap-1">
      <Button type="button" variant="outline" size="sm" disabled={restoring} onClick={() => restore({ kind, id })}><Icon name="undo-2" className="w-3 h-3 mr-1" /> Restaurar</Button>
      {canManage && (
        <ConfirmDialog title="Apagar de vez?" description={`"${name}"${extra} sai do sistema e do armazenamento. Não dá para desfazer.`} slideLabel="Deslize para apagar de vez" onConfirm={() => purge({ kind, id })}>
          <Button type="button" variant="ghost" size="sm" disabled={purging} className="text-red-600 dark:text-red-400"><Icon name="trash-2" className="w-3 h-3 mr-1" /> Apagar de vez</Button>
        </ConfirmDialog>
      )}
    </div>
  );

  return (
    <>
      <div>
        <h1 className="text-xl font-bold">Lixeira</h1>
        <p className="text-sm text-muted-foreground">O que foi apagado dos Arquivos fica aqui por {days} dias e pode ser restaurado. Depois disso some de verdade.</p>
      </div>

      {!canWrite && <p className="mt-4 p-4 rounded-card border bg-card text-sm text-muted-foreground">Seu perfil só pode ver os arquivos; a lixeira é de quem pode enviar e apagar.</p>}
      {error && <p className="mt-4 p-4 text-destructive font-medium">Erro: {errorMessage(error)}</p>}
      {canWrite && isLoading && <Skeleton className="mt-4 h-32 w-full" />}
      {empty && <p className="mt-4 p-6 rounded-lg border text-sm text-muted-foreground">A lixeira está vazia.</p>}

      {data && !empty && (
        <div className="mt-4 rounded-card border bg-card overflow-x-auto">
          {data.folders.map((folder) => (
            <div key={`p${folder.id}`} className="flex flex-col lg:flex-row lg:items-center gap-2 px-4 py-2.5 border-b border-border/70 last:border-b-0 hover:bg-muted/40 transition-colors text-sm hover:bg-muted/40">
              <div className="flex flex-1 min-w-0 items-start gap-3">
                <Icon name="folder" className="w-5 h-5 mt-0.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="font-medium truncate">{folder.name}</p>
                  <p className="text-xs text-muted-foreground truncate">Pasta com {folder.files} {folder.files === 1 ? "arquivo" : "arquivos"} · estava em {folder.from}</p>
                  <p className="text-xs text-muted-foreground">Apagada em {dateBr(folder.trashedAt)}{folder.trashedBy ? ` por ${folder.trashedBy}` : ""} · {leftText(folder.daysLeft)}</p>
                </div>
              </div>
              {actions("folders", folder.id, folder.name, ` e os ${folder.files} arquivos dentro dela`)}
            </div>
          ))}
          {data.files.map((file) => (
            <div key={file.id} className="flex flex-col lg:flex-row lg:items-center gap-2 px-4 py-2.5 border-b border-border/70 last:border-b-0 hover:bg-muted/40 transition-colors text-sm hover:bg-muted/40">
              <div className="flex flex-1 min-w-0 items-start gap-3">
                <Icon name={fileIcon(file)} className="w-5 h-5 mt-0.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{sizeText(file.size)} · estava em {file.from}</p>
                  <p className="text-xs text-muted-foreground">Apagado em {dateBr(file.trashedAt)}{file.trashedBy ? ` por ${file.trashedBy}` : ""} · {leftText(file.daysLeft)}</p>
                </div>
              </div>
              {actions("files", file.id, file.name)}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
