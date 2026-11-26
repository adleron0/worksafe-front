import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import Input from "@/components/general-components/Input";
import PageHeader from "@/components/general-components/PageHeader";
import Select from "@/components/general-components/Select";
import { cn } from "@/lib/utils";
import { Tip, errorMessage } from "../../comercial/-shared/commercial";
import { CHAT_KEY, ChatTag, QuickReply, TagChip, chatApi, useChatMeta, useChatTags, useQuickReplies } from "../-shared/chat";

export const Route = createFileRoute("/_authenticated/conversas/_conversas/respostas")({
  component: LibraryPage,
});

const VARIABLES = [
  { key: "{primeiro_nome}", hint: "Primeiro nome do contato" },
  { key: "{nome}", hint: "Nome completo do contato" },
  { key: "{empresa}", hint: "Cliente vinculado à conversa" },
  { key: "{atendente}", hint: "Seu primeiro nome" },
];

/** Conversas → Respostas e etiquetas: textos prontos ("/" na conversa) e as etiquetas das conversas. */
function LibraryPage() {
  const { can } = useVerify();
  const canEdit = can("responder_conversas") || can("canais_conversas");
  const replies = useQuickReplies();
  const tags = useChatTags();
  const meta = useChatMeta();
  const [editing, setEditing] = useState<QuickReply | "new" | null>(null);
  const [tagEditing, setTagEditing] = useState<ChatTag | "new" | null>(null);

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader title="Respostas e etiquetas" description='Textos prontos para chamar com "/" dentro da conversa, e as etiquetas que organizam a caixa de entrada.' />

      <section className="rounded-card border bg-card">
        <header className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold">Respostas rápidas</h2>
            <p className="text-xs text-muted-foreground">Na conversa, digite <span className="rounded bg-muted px-1 font-mono">/</span> e o atalho. As mais usadas aparecem primeiro.</p>
          </div>
          {canEdit && <Button size="sm" onClick={() => setEditing("new")}><Icon name="plus" className="mr-1.5 h-4 w-4" />Nova resposta</Button>}
        </header>
        {replies.isLoading && <div className="grid gap-2 p-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14" />)}</div>}
        {replies.data && !replies.data.length && (
          <div className="grid justify-items-center gap-2 px-4 py-10 text-center">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-muted"><Icon name="zap" className="h-5 w-5 text-muted-foreground" /></span>
            <p className="text-sm font-medium">Nenhuma resposta rápida ainda</p>
            <p className="max-w-sm text-xs text-muted-foreground">Crie as respostas que a equipe manda toda hora: horário de atendimento, dados para orçamento, chave PIX…</p>
          </div>
        )}
        {!!replies.data?.length && (
          <ul className="divide-y">
            {replies.data.map((reply) => (
              <li key={reply.id}>
                <button type="button" disabled={!canEdit} onClick={() => setEditing(reply)} className={cn("flex w-full items-start gap-3 px-4 py-3 text-left", canEdit && "cursor-pointer hover:bg-muted/50")}>
                  <span className="mt-0.5 shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-xs">/{reply.shortcut}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{reply.title}</span>
                      {reply.sector && <span className="shrink-0 rounded-full border px-1.5 text-[10px] text-muted-foreground">{meta.data?.sectors.find((s) => s.id === reply.sector)?.name ?? reply.sector}</span>}
                    </span>
                    <span className="mt-0.5 line-clamp-2 block whitespace-pre-wrap text-xs text-muted-foreground">{reply.text}</span>
                  </span>
                  <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">{reply.uses ? `${reply.uses} ${reply.uses === 1 ? "uso" : "usos"}` : ""}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-4 rounded-card border bg-card">
        <header className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold">Etiquetas</h2>
            <p className="text-xs text-muted-foreground">Marque as conversas (Orçamento, Urgente, Pós-venda…) e filtre a caixa por elas.</p>
          </div>
          {canEdit && <Button size="sm" variant="outline" onClick={() => setTagEditing("new")}><Icon name="plus" className="mr-1.5 h-4 w-4" />Nova etiqueta</Button>}
        </header>
        <div className="flex flex-wrap gap-2 p-4">
          {tags.isLoading && <Skeleton className="h-8 w-64" />}
          {tags.data && !tags.data.length && <p className="text-sm text-muted-foreground">Nenhuma etiqueta ainda. Dá para criar aqui ou direto na ficha da conversa.</p>}
          {tags.data?.map((tag) => (
            <button key={tag.id} type="button" disabled={!canEdit} onClick={() => setTagEditing(tag)}
              className={cn("flex items-center gap-2 rounded-full border bg-background px-3 py-1.5 text-sm", canEdit && "cursor-pointer hover:border-foreground/30")}>
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: tag.color }} />{tag.name}
              <span className="text-xs text-muted-foreground tabular-nums">{tag.conversations ?? 0}</span>
            </button>
          ))}
        </div>
      </section>

      <ReplyDialog reply={editing} onClose={() => setEditing(null)} />
      <TagDialog tag={tagEditing} colors={meta.data?.tagColors ?? []} canDelete={can("canais_conversas")} onClose={() => setTagEditing(null)} />
    </div>
  );
}

function ReplyDialog({ reply, onClose }: { reply: QuickReply | "new" | null; onClose: () => void }) {
  const open = reply !== null;
  const current = reply && reply !== "new" ? reply : null;
  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="flex max-h-[90dvh] max-w-lg flex-col">
        <DialogHeader>
          <DialogTitle>{current ? "Editar resposta" : "Nova resposta rápida"}</DialogTitle>
          <DialogDescription>Na conversa, é só digitar / e o atalho.</DialogDescription>
        </DialogHeader>
        {open && <ReplyForm key={current?.id ?? "new"} reply={current} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function ReplyForm({ reply, onDone }: { reply: QuickReply | null; onDone: () => void }) {
  const queryClient = useQueryClient();
  const meta = useChatMeta();
  const [shortcut, setShortcut] = useState(reply?.shortcut ?? "");
  const [title, setTitle] = useState(reply?.title ?? "");
  const [text, setText] = useState(reply?.text ?? "");
  const [sector, setSector] = useState(reply?.sector ?? "");
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);
  const refresh = () => queryClient.invalidateQueries({ queryKey: [CHAT_KEY, "replies"] });

  const save = useMutation({
    mutationFn: () => {
      const body = { shortcut, title, text, sector: sector || null };
      return reply ? chatApi.put(`quick-replies/${reply.id}`, body) : chatApi.post("quick-replies", body);
    },
    onSuccess: () => { refresh(); toast({ title: reply ? "Resposta salva" : "Resposta criada", variant: "success" }); onDone(); },
    onError: (err) => setError(errorMessage(err)),
  });
  const remove = useMutation({
    mutationFn: () => chatApi.delete(`quick-replies/${reply!.id}`),
    onSuccess: () => { refresh(); toast({ title: "Resposta apagada", variant: "success" }); onDone(); },
    onError: (err) => setError(errorMessage(err)),
  });
  const insert = (variable: string) => {
    const el = area.current;
    const at = el?.selectionStart ?? text.length;
    const next = `${text.slice(0, at)}${variable}${text.slice(el?.selectionEnd ?? at)}`;
    setText(next);
    setTimeout(() => { el?.focus(); el?.setSelectionRange(at + variable.length, at + variable.length); }, 0);
  };

  return (
    <form className="flex min-h-0 flex-col gap-4" onSubmit={(event) => { event.preventDefault(); setError(""); save.mutate(); }}>
      <div className="scroll-fino -mx-1 grid min-h-0 gap-4 overflow-y-auto px-1">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="shortcut">Atalho</Label>
            <div className="mt-1 flex items-center rounded-md border bg-background focus-within:border-primary">
              <span className="pl-3 font-mono text-sm text-muted-foreground">/</span>
              <input id="shortcut" value={shortcut} maxLength={40} onChange={(event) => setShortcut(event.target.value)} placeholder="orcamento" className="h-9 min-w-0 flex-1 bg-transparent px-1 font-mono text-sm outline-none" />
            </div>
          </div>
          <div>
            <Label htmlFor="replyTitle">Nome</Label>
            <Input id="replyTitle" name="replyTitle" value={title} maxLength={120} onValueChange={(_, value) => setTitle(String(value))} placeholder="Pedir dados do orçamento" className="mt-1" />
          </div>
        </div>
        <div>
          <Label htmlFor="replyText">Texto</Label>
          <Textarea id="replyText" ref={area} value={text} maxLength={4000} onChange={(event) => setText(event.target.value)} className="mt-1 min-h-32"
            placeholder="Olá {primeiro_nome}! Para o orçamento, me passa o endereço da obra e a altura aproximada?" />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {VARIABLES.map((v) => (
              <Tip key={v.key} text={v.hint}>
                <button type="button" onClick={() => insert(v.key)} className="cursor-pointer rounded-full border bg-background px-2 py-0.5 font-mono text-[11px] text-muted-foreground hover:border-primary/50 hover:text-foreground">{v.key}</button>
              </Tip>
            ))}
          </div>
        </div>
        <div>
          <Label>Setor</Label>
          <div className="mt-1">
            <Select name="replySector" clearable options={meta.data?.sectors ?? []} state={sector} placeholder="Todos os setores" onChange={(_, value) => setSector(String(value ?? ""))} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Com setor, a resposta só aparece nas conversas daquele setor.</p>
        </div>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex items-center gap-2">
        {reply && <Button type="button" variant="ghost" className="text-red-600 hover:text-red-700" onClick={() => setRemoving(true)}><Icon name="trash-2" className="mr-1.5 h-4 w-4" />Apagar</Button>}
        <Button type="button" variant="outline" className="ml-auto" onClick={onDone}>Cancelar</Button>
        <Button type="submit" disabled={save.isPending}>{save.isPending ? "Salvando..." : "Salvar"}</Button>
      </div>
      <ConfirmDialog open={removing} onOpenChange={setRemoving} title={`Apagar /${reply?.shortcut}?`} description="A resposta some para toda a equipe." onConfirm={() => remove.mutate()} />
    </form>
  );
}

function TagDialog({ tag, colors, canDelete, onClose }: { tag: ChatTag | "new" | null; colors: string[]; canDelete: boolean; onClose: () => void }) {
  const open = tag !== null;
  const current = tag && tag !== "new" ? tag : null;
  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{current ? "Editar etiqueta" : "Nova etiqueta"}</DialogTitle>
          <DialogDescription>Aparece na lista de conversas e serve de filtro.</DialogDescription>
        </DialogHeader>
        {open && <TagForm key={current?.id ?? "new"} tag={current} colors={colors} canDelete={canDelete} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function TagForm({ tag, colors, canDelete, onDone }: { tag: ChatTag | null; colors: string[]; canDelete: boolean; onDone: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(tag?.name ?? "");
  const [color, setColor] = useState(tag?.color ?? colors[0] ?? "#149E5E");
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState(false);
  const refresh = () => queryClient.invalidateQueries({ queryKey: [CHAT_KEY] });
  const save = useMutation({
    mutationFn: () => (tag ? chatApi.put(`tags/${tag.id}`, { name, color }) : chatApi.post("tags", { name, color })),
    onSuccess: () => { refresh(); onDone(); },
    onError: (err) => setError(errorMessage(err)),
  });
  const remove = useMutation({
    mutationFn: () => chatApi.delete(`tags/${tag!.id}`),
    onSuccess: () => { refresh(); toast({ title: "Etiqueta apagada", variant: "success" }); onDone(); },
    onError: (err) => setError(errorMessage(err)),
  });
  return (
    <form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); setError(""); save.mutate(); }}>
      <div>
        <Label htmlFor="tagName">Nome</Label>
        <Input id="tagName" name="tagName" value={name} maxLength={40} onValueChange={(_, value) => setName(String(value))} placeholder="Orçamento" className="mt-1" />
      </div>
      <div>
        <Label>Cor</Label>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {colors.map((c) => (
            <button key={c} type="button" onClick={() => setColor(c)} aria-label={`Cor ${c}`}
              className={cn("h-7 w-7 cursor-pointer rounded-full ring-offset-2 ring-offset-background transition", color === c && "ring-2 ring-foreground/60")} style={{ background: c }} />
          ))}
        </div>
        <div className="mt-3"><TagChip tag={{ name: name.trim() || "Etiqueta", color }} /></div>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex items-center gap-2">
        {tag && canDelete && <Button type="button" variant="ghost" className="text-red-600 hover:text-red-700" onClick={() => setRemoving(true)}><Icon name="trash-2" className="mr-1.5 h-4 w-4" />Apagar</Button>}
        <Button type="button" variant="outline" className="ml-auto" onClick={onDone}>Cancelar</Button>
        <Button type="submit" disabled={save.isPending || !name.trim()}>Salvar</Button>
      </div>
      <ConfirmDialog open={removing} onOpenChange={setRemoving} title={`Apagar a etiqueta ${tag?.name}?`} description="Ela sai de todas as conversas marcadas." onConfirm={() => remove.mutate()} />
    </form>
  );
}
