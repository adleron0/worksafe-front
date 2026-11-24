import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import Icon from "@/components/general-components/Icon";
import Input from "@/components/general-components/Input";
import Select from "@/components/general-components/Select";
import PageHeader from "@/components/general-components/PageHeader";
import ListCard from "@/components/general-components/ListCard";
import ListToolbar from "@/components/general-components/ListToolbar";
import DataTable, { DataColumn, EmptyState } from "@/components/general-components/DataTable";
import StatusBadge from "@/components/general-components/StatusBadge";
import { NumField, errorMessage } from "../../comercial/-shared/commercial";
import RowActions from "../-shared/row-actions";
import { Category, STOCK_ABILITY, STOCK_KEYS, stockApi } from "../-shared/stock";

export const Route = createFileRoute("/_authenticated/suprimentos/estoque/categorias")({
  component: CategoriesPage,
});

/** Categorias do estoque: um nível de subcategoria e o prefixo que dá o código dos itens. */
function CategoriesPage() {
  const { can } = useVerify();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Category | "novo" | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const { data, isLoading, error, refetch } = useQuery({
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

  const columns: DataColumn<Category>[] = [
    {
      id: "name", header: "Categoria", cell: (row) => (
        <span className={`font-medium flex items-center gap-2 ${row.parentId ? "pl-6" : ""}`}>
          {row.parentId && <Icon name="corner-down-right" className="w-3 h-3 text-muted-foreground" />} {row.name} {!row.active && <StatusBadge tone="neutral">Inativa</StatusBadge>}
        </span>
      ),
    },
    { id: "prefix", header: "Prefixo", className: "w-32 text-muted-foreground", cell: (row) => row.prefix ?? "IT" },
    { id: "items", header: "Itens", className: "w-32", cell: (row) => <Link to="/suprimentos/estoque/itens" search={{ categoryId: row.id }} className="text-primary hover:underline">{row.items} item(ns)</Link> },
  ];
  const actions = (row: Category) => (
    <RowActions label={`Ações da categoria ${row.name}`} actions={[
      { id: "edit", label: "Editar", icon: "pencil", hidden: !can(`update_${STOCK_ABILITY}`), onSelect: () => setEditing(row) },
      { id: "inactive", label: "Inativar", icon: "archive", hidden: !(row.active && can(`inactive_${STOCK_ABILITY}`)), separator: true, onSelect: () => toggle({ id: row.id, active: false }),
        confirm: { title: `Inativar "${row.name}"?`, description: "A categoria deixa de aparecer para novos itens. Os itens que já estão nela continuam." } },
      { id: "active", label: "Reativar", icon: "archive-restore", hidden: !(!row.active && can(`activate_${STOCK_ABILITY}`)), separator: true, onSelect: () => toggle({ id: row.id, active: true }) },
    ]} />
  );

  return (
    <>
      <PageHeader title="Categorias" description="Agrupam os itens (com uma subcategoria, se precisar). O prefixo forma o código do item: CRD-0001." />
      <ListCard>
        <ListToolbar>
          <div className="flex items-center gap-2 mr-auto">
            <Checkbox id="showInactive" checked={showInactive} onCheckedChange={(checked) => setShowInactive(checked === true)} />
            <Label htmlFor="showInactive">Mostrar inativas</Label>
          </div>
          {can(`create_${STOCK_ABILITY}`) && <Button onClick={() => setEditing("novo")}><Icon name="plus" className="w-4 h-4" /> Nova categoria</Button>}
        </ListToolbar>
        <DataTable rows={ordered} columns={columns} getRowId={(row) => row.id} ariaLabel="Categorias" skeletonRows={4} minWidth={560}
          loading={isLoading} error={error ? errorMessage(error) : null} onRetry={() => refetch()}
          rowClassName={(row) => (row.active ? undefined : "opacity-60")} actions={actions}
          empty={<EmptyState title="Nenhuma categoria ainda." />} />
      </ListCard>

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
