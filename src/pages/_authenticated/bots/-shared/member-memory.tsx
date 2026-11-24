import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import Icon from "@/components/general-components/Icon";
import SlideConfirm from "@/components/general-components/SlideConfirm";
import { toast } from "@/hooks/use-toast";
import { Tip, errorMessage } from "../../comercial/-shared/commercial";
import { BotAvatar } from "./avatar";
import { TeamMember, aiApi } from "./bots";

interface MemoryFact {
  id: number; scope: "pessoa" | "empresa"; text: string; createdAt: string; updatedAt: string; lastUsedAt: string; expiresAt: string; author?: string | null;
}
interface BotMemory {
  bot: { id: number; persona: string };
  canManageCompany: boolean;
  limits: { text: number; personal: number; company: number; expiryDays: number };
  mine: MemoryFact[];
  company: MemoryFact[] | null;
}

const dateBr = (value: string) => new Date(value).toLocaleDateString("pt-BR");

/**
 * Painel lateral com o que o assistente lembra: o que é só seu e (com a
 * permissão de memória dos bots) o que vale para a empresa toda. Editar,
 * apagar um fato ou limpar tudo.
 */
export function MemberMemory({ member, onClose }: { member: TeamMember; onClose: () => void }) {
  const key = ["aiBotMemory", member.id];
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: key, queryFn: () => aiApi.get<BotMemory>(`bots/${member.id}/memory`) });
  const refresh = () => queryClient.invalidateQueries({ queryKey: key });
  const fail = (title: string) => (err: unknown) => toast({ title, description: errorMessage(err), variant: "destructive" });
  const [clearing, setClearing] = useState<"pessoa" | "empresa" | null>(null);
  const clear = useMutation({
    mutationFn: (escopo: "pessoa" | "empresa") => aiApi.post<{ removed: number }>(`bots/${member.id}/memory/clear`, { escopo }),
    onSuccess: (result) => { toast({ title: result.removed === 1 ? "1 anotação apagada" : `${result.removed} anotações apagadas` }); setClearing(null); refresh(); },
    onError: fail("Não foi possível limpar"),
  });

  return (
    <Sheet open onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="border-b p-4 text-left">
          <div className="flex items-center gap-3">
            <BotAvatar look={member.avatar} size={44} />
            <div className="min-w-0">
              <SheetTitle>Memória de {member.persona}</SheetTitle>
              <SheetDescription>O que {member.persona} anotou nas conversas para lembrar depois.</SheetDescription>
            </div>
          </div>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4">
          {error && <p className="text-sm text-destructive">Erro: {errorMessage(error)}</p>}
          {isLoading && <div className="grid gap-2">{[0, 1, 2].map((item) => <Skeleton key={item} className="h-14" />)}</div>}
          {data && (
            <div className="grid gap-6">
              <FactGroup
                title="Sobre você"
                hint={`Só você vê. ${member.persona} usa nas conversas com você.`}
                empty={`Nada ainda. Ensine algo na conversa ("lembra que…") e ${member.persona} anota.`}
                facts={data.mine} max={data.limits.text} cap={data.limits.personal}
                onChanged={refresh}
                clearing={clearing === "pessoa"} onClearToggle={() => setClearing(clearing === "pessoa" ? null : "pessoa")}
                onClear={() => clear.mutate("pessoa")} clearPending={clear.isPending && clear.variables === "pessoa"}
                clearLabel="Deslize para esquecer o que é seu"
              />
              {data.company && (
                <FactGroup
                  title="Da empresa"
                  hint={`Vale para todos que conversam com ${member.persona}.`}
                  empty="Nenhuma regra da empresa anotada."
                  facts={data.company} max={data.limits.text} cap={data.limits.company}
                  onChanged={refresh}
                  clearing={clearing === "empresa"} onClearToggle={() => setClearing(clearing === "empresa" ? null : "empresa")}
                  onClear={() => clear.mutate("empresa")} clearPending={clear.isPending && clear.variables === "empresa"}
                  clearLabel="Deslize para limpar a memória da empresa"
                />
              )}
              <p className="text-xs text-muted-foreground">Anotação sem uso há {Math.round(data.limits.expiryDays / 30)} meses é apagada sozinha.</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function FactGroup(props: {
  title: string; hint: string; empty: string; facts: MemoryFact[]; max: number; cap: number;
  onChanged: () => void; clearing: boolean; onClearToggle: () => void; onClear: () => void; clearPending: boolean; clearLabel: string;
}) {
  const { title, hint, empty, facts, max, cap, onChanged, clearing, onClearToggle, onClear, clearPending, clearLabel } = props;
  return (
    <section>
      <div className="flex items-baseline gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="text-xs text-muted-foreground">{facts.length}/{cap}</span>
        {facts.length > 0 && (
          <button type="button" onClick={onClearToggle} className="ml-auto cursor-pointer text-xs text-muted-foreground hover:text-destructive">
            {clearing ? "Cancelar" : "Limpar tudo"}
          </button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{hint}</p>
      {clearing && <SlideConfirm className="mt-2" label={clearLabel} onConfirm={onClear} pending={clearPending} />}
      {facts.length ? (
        <ul className="mt-2 grid gap-2">
          {facts.map((fact) => <FactRow key={fact.id} fact={fact} max={max} onChanged={onChanged} />)}
        </ul>
      ) : (
        <p className="mt-2 rounded-xl border border-dashed p-3 text-sm text-muted-foreground">{empty}</p>
      )}
    </section>
  );
}

function FactRow({ fact, max, onChanged }: { fact: MemoryFact; max: number; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(fact.text);
  const fail = (title: string) => (err: unknown) => toast({ title, description: errorMessage(err), variant: "destructive" });
  const save = useMutation({
    mutationFn: () => aiApi.put(`memory/${fact.id}`, { text }),
    onSuccess: () => { setEditing(false); onChanged(); },
    onError: fail("Não foi possível salvar"),
  });
  const remove = useMutation({
    mutationFn: () => aiApi.delete(`memory/${fact.id}`),
    onSuccess: () => { toast({ title: "Anotação apagada" }); onChanged(); },
    onError: fail("Não foi possível apagar"),
  });
  const clean = text.trim();

  return (
    <li className="min-w-0 rounded-xl border p-3">
      {editing ? (
        <div className="grid gap-2">
          <Textarea value={text} onChange={(event) => setText(event.target.value)} maxLength={max} className="min-h-20" autoFocus aria-label="Texto da anotação" />
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{text.length}/{max}</span>
            <Button size="sm" variant="ghost" className="ml-auto" onClick={() => { setText(fact.text); setEditing(false); }}>Cancelar</Button>
            <Button size="sm" disabled={!clean || clean === fact.text || save.isPending} onClick={() => save.mutate()}>{save.isPending ? "Salvando…" : "Salvar"}</Button>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="whitespace-pre-line break-words text-sm">{fact.text}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {fact.author ? `${fact.author} · ` : ""}anotado em {dateBr(fact.updatedAt)} · usado em {dateBr(fact.lastUsedAt)}
            </p>
          </div>
          <Tip text="Editar">
            <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" aria-label="Editar anotação" onClick={() => setEditing(true)}><Icon name="pencil" className="h-3.5 w-3.5" /></Button>
          </Tip>
          <Tip text="Apagar">
            <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0 hover:text-destructive" aria-label="Apagar anotação" disabled={remove.isPending} onClick={() => remove.mutate()}><Icon name="trash-2" className="h-3.5 w-3.5" /></Button>
          </Tip>
        </div>
      )}
    </li>
  );
}
