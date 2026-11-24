import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { patch } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { useLoader } from "@/context/GeneralContext";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import TagBadge from "@/components/general-components/TagBadge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import Dialog from "@/components/general-components/Dialog";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import RichTextViewer from "@/components/general-components/RichTextViewer";
import { RowActionsTrigger } from "@/components/general-components/DataTable";
import { IDefaultEntity } from "@/general-interfaces/defaultEntity.interface";
import { ApiError } from "@/general-interfaces/api.interface";
import { IPost } from "../-interfaces/entity.interface";
import { PostStatusBadge, formatPostDate } from "./postColumns";

type Action = "publish" | "archive" | "draft";
type ConfirmKind = "publish" | "archive" | "republish";

/** Menu ⋯ de um post: visualizar, editar, publicar, arquivar e republicar. */
export default function PostRowActions({ item, entity, onEdit }: { item: IPost; entity: IDefaultEntity; onEdit: (item: IPost) => void }) {
  const { can } = useVerify();
  const queryClient = useQueryClient();
  const { showLoader, hideLoader } = useLoader();
  const [viewOpen, setViewOpen] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmKind | null>(null);

  const { mutate: changeStatus } = useMutation({
    mutationFn: (action: Action) => {
      const actionLabels = { publish: "Publicando", archive: "Arquivando", draft: "Voltando para rascunho" };
      showLoader(`${actionLabels[action]} ${entity.name}...`);
      return patch(`${entity.model}/${action}/${item.id}`, "");
    },
    onSuccess: (_, action) => {
      hideLoader();
      const successLabels = { publish: "publicado", archive: "arquivado", draft: "movido para rascunho" };
      toast({
        title: `${entity.name} ${successLabels[action]}!`,
        description: `${entity.name} ${successLabels[action]} com sucesso.`,
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: [`list${entity.pluralName}`] });
    },
    onError: (error: ApiError) => {
      hideLoader();
      toast({ title: "Erro ao alterar status", description: error.response?.data?.message || "Erro desconhecido.", variant: "destructive" });
    },
  });

  const canUpdate = can(`update_${entity.ability}`);

  const CONFIRMS: Record<ConfirmKind, { title: string; description: string; action: Action }> = {
    publish: { title: `Publicar "${item.title}"?`, description: "Ao prosseguir, o post será publicado e ficará visível no blog.", action: "publish" },
    archive: { title: `Arquivar "${item.title}"?`, description: "Ao prosseguir, o post será arquivado e não ficará mais visível no blog.", action: "archive" },
    republish: { title: `Republicar "${item.title}"?`, description: "Ao prosseguir, o post será publicado novamente e ficará visível no blog.", action: "publish" },
  };

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild><RowActionsTrigger label={`Ações do post ${item.title}`} /></DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem className="gap-2" onSelect={() => setViewOpen(true)}><Icon name="eye" className="w-3.5 h-3.5" /> Visualizar</DropdownMenuItem>
          {canUpdate && <DropdownMenuItem className="gap-2" onSelect={() => onEdit(item)}><Icon name="pencil" className="w-3.5 h-3.5" /> Editar</DropdownMenuItem>}
          {canUpdate && ["draft", "published", "archived"].includes(item.status) && <DropdownMenuSeparator />}
          {canUpdate && item.status === "draft" && <DropdownMenuItem className="gap-2" onSelect={() => setConfirm("publish")}><Icon name="send" className="w-3.5 h-3.5" /> Publicar</DropdownMenuItem>}
          {canUpdate && item.status === "published" && <DropdownMenuItem className="gap-2" onSelect={() => setConfirm("archive")}><Icon name="archive" className="w-3.5 h-3.5" /> Arquivar</DropdownMenuItem>}
          {canUpdate && item.status === "archived" && <DropdownMenuItem className="gap-2" onSelect={() => setConfirm("republish")}><Icon name="refresh-cw" className="w-3.5 h-3.5" /> Republicar</DropdownMenuItem>}
        </DropdownMenuContent>
      </DropdownMenu>

      {confirm && (
        <ConfirmDialog open onOpenChange={(open) => { if (!open) setConfirm(null); }} title={CONFIRMS[confirm].title} description={CONFIRMS[confirm].description}
          onConfirm={() => { changeStatus(CONFIRMS[confirm].action); setConfirm(null); }} />
      )}

      {/* Visualização do post */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen} showBttn={false} title={item.title} description="" className="sm:max-w-4xl">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {item.author && (
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={item.author.imageUrl || undefined} />
                  <AvatarFallback className="text-xs">{item.author.name?.[0]}</AvatarFallback>
                </Avatar>
                <span>{item.author.name}</span>
              </div>
            )}
            {item.publishedAt && (
              <>
                <span>•</span>
                <span>{formatPostDate(item.publishedAt)}</span>
              </>
            )}
            {item.category && (
              <>
                <span>•</span>
                <TagBadge icon="folder">{item.category.name}</TagBadge>
              </>
            )}
            <PostStatusBadge status={item.status} />
          </div>

          {item.coverImage && <img src={item.coverImage} alt={item.title} className="w-full h-64 object-cover rounded-lg" />}

          {item.excerpt && <p className="text-muted-foreground italic border-l-4 border-primary pl-4">{item.excerpt}</p>}

          <div className="border-t pt-4">
            <RichTextViewer content={item.content} />
          </div>

          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-4 border-t">
              {item.tags.map((tagItem) => (
                <TagBadge key={tagItem.tag.id} icon="tag">{tagItem.tag.name}</TagBadge>
              ))}
            </div>
          )}
        </div>
      </Dialog>
    </>
  );
}
