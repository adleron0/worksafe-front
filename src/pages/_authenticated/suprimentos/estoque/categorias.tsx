import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import Input from "@/components/general-components/Input";
import Select from "@/components/general-components/Select";
import { NumField, Tip, errorMessage } from "../../comercial/-shared/commercial";
import { Category, Pill, STOCK_ABILITY, STOCK_KEYS, stockApi } from "../-shared/stock";

export const Route = createFileRoute("/_authenticated/suprimentos/estoque/categorias")({
  component: CategoriesPage,
});

/** Categorias do estoque: um nível de subcategoria e o prefixo que dá o código dos itens. */
function CategoriesPage() {
  const { can } = useVerify();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Category | "novo" | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const { data, isLoading, error } = useQuery({
    queryKey: [STOCK_KEYS.categories, showInactive],
    queryFn: () => stockApi.get<Category[]>("categories", showInactive ? { all: "1" } : undefined),
  });
  const refresh = () => { for (const key of [STOCK_KEYS.categories, STOCK_KEYS.options]) queryClient.invalidateQueries({ queryKey: [key] }); };
  const { mutate: toggle } = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) => stockApi.patch<{ ok: boolean }>(`categories/${id}/${active ? "active" : "inactive"}`),
    onSuccess: (_, { active }) => { refresh(); toast({ title: active ? "Categoria reativada" : "Categoria inativada", variant: "success" }); },
    onError: (err) => toast({ title: "Não foi possível alterar a categoria", description: errorMessage(err), variant: "destructive" }),
  });

  if (!can(`view_${STOCK_ABILITY}`)) return null;
  const rows = data ?? [];
  // pai e, logo abaixo, as filhas
  const ordered = rows.filter((row) => !row.parentId || !rows.some((p) => p.id === row.parentId)).flatMap((parent) => [parent, ...rows.filter((child) => child.parentId === parent.id)]);

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Categorias</h1>
          <p className="text-sm text-muted-foreground">Agrupam os itens (com uma subcategoria, se precisar). O prefixo forma o código do item: CRD-0001.</p>
        </div>
        {can(`create_${STOCK_ABILITY}`) && <Button onClick={() => setEditing("novo")}><Icon name="plus" className="w-4 h-4 mr-1" /> Nova categoria</Button>}
      </div>
      <div className="flex items-center gap-2 my-4">
        <Checkbox id="showInactive" checked={showInactive} onCheckedChange={(checked) => setShowInactive(checked === true)} />
        <Label htmlFor="showInactive">Mostrar inativas</Label>
      </div>

      {error && <p className="p-4 text-destructive font-medium">Erro: {errorMessage(error)}</p>}
      {isLoading && <div className="grid gap-2">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>}
      {!isLoading && !error && (
        <div className="rounded-lg border overflow-hidden">
          {ordered.length === 0 && <p className="p-6 text-sm text-muted-foreground">Nenhuma categoria ainda.</p>}
          {ordered.map((row) => (
            <div key={row.id} className="flex flex-col lg:flex-row lg:items-center gap-1 lg:gap-0 px-4 py-3 border-b last:border-b-0 text-sm">
              <div className={`flex-1 min-w-0 font-medium flex items-center gap-2 ${row.parentId ? "lg:pl-6" : ""}`}>
                {row.parentId && <Icon name="corner-down-right" className="w-3 h-3 text-muted-foreground" />} {row.name} {!row.active && <Pill>Inativa</Pill>}
              </div>
              <div className="lg:w-32 text-muted-foreground">{row.prefix ? `Prefixo ${row.prefix}` : "Prefixo IT"}</div>
              <div className="lg:w-32">
                <Link to="/suprimentos/estoque/itens" search={{ categoryId: row.id }} className="text-primary hover:underline">{row.items} item(ns)</Link>
              </div>
              <div className="lg:w-24 flex lg:justify-end gap-1">
                {can(`update_${STOCK_ABILITY}`) && <Tip text="Editar"><Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label={`Editar ${row.name}`} onClick={() => setEditing(row)}><Icon name="pencil" className="w-4 h-4" /></Button></Tip>}
                {row.active && can(`inactive_${STOCK_ABILITY}`) && (
                  <ConfirmDialog title={`Inativar "${row.name}"?`} description="A categoria deixa de aparecer para novos itens. Os itens que já estão nela continuam." onConfirm={() => toggle({ id: row.id, active: false })}>
                    <span><Tip text="Inativar"><Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label={`Inativar ${row.name}`}><Icon name="archive" className="w-4 h-4" /></Button></Tip></span>
                  </ConfirmDialog>
                )}
                {!row.active && can(`activate_${STOCK_ABILITY}`) && <Tip text="Reativar"><Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label={`Reativar ${row.name}`} onClick={() => toggle({ id: row.id, active: true })}><Icon name="archive-restore" className="w-4 h-4" /></Button></Tip>}
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && <CategoryDialog category={editing === "novo" ? undefined : editing} parents={rows.filter((row) => !row.parentId && row.active && (editing === "novo" || row.id !== editing.id))} onClose={() => setEditing(null)} onSaved={refresh} />}
    </>
  );
}

function CategoryDialog({ category, parents, onClose, onSaved }: { category?: Category; parents: Category[]; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(category?.name ?? "");
  const [parentId, setParentId] = useState(category?.parentId ? String(category.parentId) : "");
  const [prefix, setPrefix] = useState(category?.prefix ?? "");
  const [order, setOrder] = useState(category?.order ?? 0);
  const [error, setError] = useState("");
  const { mutate, isPending } = useMutation({
    mutationFn: () => {
      const body = { name: name.trim(), parentId: parentId || null, prefix: prefix.trim(), order };
      return category ? stockApi.put<Category>(`categories/${category.id}`, body) : stockApi.post<Category>("categories", body);
    },
    onSuccess: () => { onSaved(); toast({ title: category ? "Categoria salva" : "Categoria criada", variant: "success" }); onClose(); },
    onError: (err) => setError(errorMessage(err)),
  });
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (name.trim().length < 2) return setError("Informe o nome da categoria.");
    setError(""); mutate();
  };
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{category ? "Editar categoria" : "Nova categoria"}</DialogTitle>
          <DialogDescription>O prefixo vale para os próximos itens cadastrados; os códigos que já existem não mudam.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={submit}>
          <div><Label htmlFor="categoryName">Nome <span>*</span></Label>
            <Input id="categoryName" name="categoryName" value={name} maxLength={100} onValueChange={(_, value) => setName(String(value))} className="mt-1" placeholder="Ex.: Cordas" /></div>
          <div><Label>Dentro de</Label>
            <Select name="parentId" options={parents.map(({ id, name: label }) => ({ id, name: label }))} state={parentId} clearable modal onChange={(_, value) => setParentId(String(value ?? ""))} placeholder="Nenhuma (categoria principal)" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="categoryPrefix">Prefixo do código</Label>
              <Input id="categoryPrefix" name="categoryPrefix" value={prefix} maxLength={8} onValueChange={(_, value) => setPrefix(String(value).toUpperCase().replace(/[^A-Z0-9]/g, ""))} className="mt-1" placeholder="Ex.: CRD" /></div>
            <div><Label className="text-sm">Ordem</Label>
              <NumField value={order} digits={0} ariaLabel="Ordem" className="mt-1" onChange={(value) => setOrder(Math.round(value))} /></div>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
