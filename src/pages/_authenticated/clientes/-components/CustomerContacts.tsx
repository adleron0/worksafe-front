import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { get, patch, post, put } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Input from "@/components/general-components/Input";
import Select from "@/components/general-components/Select";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import { formatPHONE } from "@/utils/phone-mask";
import { cn } from "@/lib/utils";
import { Tip, errorMessage } from "../../comercial/-shared/commercial";

/** Para que o contato é usado. A ordem é a mesma em toda a tela. */
export const CONTACT_ROLES = [
  { flag: "isCommercial", def: "defaultCommercial", label: "Comercial", icon: "handshake", hint: "Vai automaticamente para as propostas deste cliente." },
  { flag: "isFinancial", def: "defaultFinancial", label: "Financeiro", icon: "wallet", hint: "Recebe cobranças, boletos e recibos." },
  { flag: "isFiscal", def: "defaultFiscal", label: "Fiscal", icon: "receipt", hint: "Recebe a nota fiscal." },
] as const;
type RoleFlag = (typeof CONTACT_ROLES)[number]["flag"];
type RoleDefault = (typeof CONTACT_ROLES)[number]["def"];

export interface CustomerContact {
  id: number;
  customerId: number;
  name: string;
  email: string;
  phone: string;
  notes?: string | null;
  roleId?: number | null;
  role?: { id: number; name: string } | null;
  inactiveAt?: string | null;
  isCommercial: boolean;
  isFinancial: boolean;
  isFiscal: boolean;
  defaultCommercial: boolean;
  defaultFinancial: boolean;
  defaultFiscal: boolean;
}

type Draft = Omit<CustomerContact, "id" | "customerId" | "role" | "inactiveAt"> & { id?: number };

const EMPTY: Draft = {
  name: "", email: "", phone: "", notes: "", roleId: null,
  isCommercial: false, isFinancial: false, isFiscal: false,
  defaultCommercial: false, defaultFinancial: false, defaultFiscal: false,
};

export const contactsKey = (customerId: number) => ["customerContacts", customerId];

export function CustomerContactsPanel({ customerId }: { customerId: number }) {
  const { can } = useVerify();
  const canEdit = can("update_clientes") || can("create_clientes");
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Draft | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: contactsKey(customerId),
    queryFn: () => get<{ rows: CustomerContact[] }>("customer-contacts", "", [
      { key: "customerId", value: customerId },
      { key: "show", value: ["role"] },
      { key: "limit", value: "all" },
      { key: "order-name", value: "asc" },
    ]),
  });
  const contacts = (data?.rows ?? []).filter((c) => !c.inactiveAt);

  const refresh = () => queryClient.invalidateQueries({ queryKey: contactsKey(customerId) });

  const remove = useMutation({
    mutationFn: (id: number) => patch("customer-contacts", `inactive/${id}`),
    onSuccess: () => { refresh(); toast({ title: "Contato removido", variant: "success" }); },
    onError: (error) => toast({ title: "Não foi possível remover", description: errorMessage(error), variant: "destructive" }),
  });

  // marcar como padrão direto no cartão, sem abrir o formulário
  const makeDefault = useMutation({
    mutationFn: ({ id, def }: { id: number; def: RoleDefault }) => put("customer-contacts", String(id), { [def]: true } as never),
    onSuccess: refresh,
    onError: (error) => toast({ title: "Não foi possível alterar", description: errorMessage(error), variant: "destructive" }),
  });

  return (
    <section className="rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-semibold">Contatos</h2>
          <p className="text-xs text-muted-foreground">Marque quem é o comercial, o financeiro e o fiscal. O padrão de cada um é usado automaticamente, e dá para trocar na hora de usar.</p>
        </div>
        {canEdit && (
          <Button type="button" size="sm" className="gap-1" onClick={() => setEditing({ ...EMPTY })}>
            <Icon name="plus" className="w-4 h-4" /> Adicionar contato
          </Button>
        )}
      </div>

      {/* quem responde por cada papel hoje */}
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {CONTACT_ROLES.map((role) => {
          const holder = contacts.find((c) => c[role.def]);
          return (
            <div key={role.flag} className="rounded-md bg-muted/50 px-3 py-2 min-w-0">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Icon name={role.icon} className="w-3 h-3" /> {role.label}</p>
              {holder
                ? <p className="text-sm font-medium truncate">{holder.name}</p>
                : <p className="text-sm text-muted-foreground">Ninguém marcado</p>}
            </div>
          );
        })}
      </div>

      {isLoading && <p className="mt-3 text-sm text-muted-foreground">Carregando contatos...</p>}
      {!isLoading && contacts.length === 0 && (
        <p className="mt-3 text-sm text-muted-foreground">Nenhum contato ainda.</p>
      )}

      <ul className="mt-3 divide-y">
        {contacts.map((contact) => (
          <li key={contact.id} className="py-3 flex flex-col sm:flex-row sm:items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-medium">
                {contact.name}
                {contact.role?.name && <span className="text-xs text-muted-foreground font-normal"> · {contact.role.name}</span>}
              </p>
              <p className="text-xs text-muted-foreground break-all">{[contact.email, formatPHONE(contact.phone)].filter(Boolean).join(" · ")}</p>
              {contact.notes && <p className="text-xs text-muted-foreground">{contact.notes}</p>}
              <div className="mt-1.5 flex flex-wrap gap-1">
                {CONTACT_ROLES.filter((role) => contact[role.flag]).map((role) => {
                  const isDefault = contact[role.def];
                  const chip = (
                    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs",
                      isDefault ? "border-primary bg-primary/10 text-foreground" : "text-muted-foreground")}>
                      <Icon name={isDefault ? "star" : role.icon} className={cn("w-3 h-3", isDefault && "text-primary fill-primary")} />
                      {role.label}{isDefault ? " · padrão" : ""}
                    </span>
                  );
                  return isDefault || !canEdit ? (
                    <Tip key={role.flag} text={isDefault ? `Contato ${role.label.toLowerCase()} padrão deste cliente` : undefined}>{chip}</Tip>
                  ) : (
                    <Tip key={role.flag} text={`Tornar o ${role.label.toLowerCase()} padrão`}>
                      <button type="button" className="hover:opacity-80" onClick={() => makeDefault.mutate({ id: contact.id, def: role.def })}>{chip}</button>
                    </Tip>
                  );
                })}
                {!contact.isCommercial && !contact.isFinancial && !contact.isFiscal && (
                  <span className="text-xs text-muted-foreground">Sem papel marcado</span>
                )}
              </div>
            </div>
            {canEdit && (
              <div className="flex gap-1 shrink-0">
                <Button type="button" size="sm" variant="outline" className="gap-1" onClick={() => setEditing({ ...contact })}>
                  <Icon name="pencil" className="w-3 h-3" /> Editar
                </Button>
                <ConfirmDialog
                  title={`Remover ${contact.name}?`}
                  description="O contato sai da lista deste cliente. Se ele era o padrão de algum papel, outro contato com o mesmo papel passa a ser."
                  onConfirm={() => remove.mutate(contact.id)}
                >
                  <Button type="button" size="sm" variant="ghost" aria-label={`Remover ${contact.name}`}>
                    <Icon name="trash-2" className="w-3 h-3" />
                  </Button>
                </ConfirmDialog>
              </div>
            )}
          </li>
        ))}
      </ul>

      {editing && (
        <ContactDialog
          customerId={customerId}
          draft={editing}
          others={contacts.filter((c) => c.id !== editing.id)}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); refresh(); }}
        />
      )}
    </section>
  );
}

function ContactDialog({ customerId, draft, others, onClose, onSaved }: {
  customerId: number; draft: Draft; others: CustomerContact[]; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState<Draft>(draft);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (name: string, value: unknown) => setForm((prev) => ({ ...prev, [name]: value }));

  const { data: roles } = useQuery({
    queryKey: ["listRoles"],
    queryFn: () => get<{ rows: { id: number; name: string }[] }>("roles", "", [{ key: "limit", value: "all" }, { key: "order-name", value: "asc" }]),
  });

  const save = useMutation({
    mutationFn: () => {
      const body = {
        customerId, name: form.name.trim(), email: form.email.trim(), phone: form.phone, notes: form.notes?.trim() || null,
        roleId: form.roleId || null,
        isCommercial: form.isCommercial, isFinancial: form.isFinancial, isFiscal: form.isFiscal,
        defaultCommercial: form.defaultCommercial, defaultFinancial: form.defaultFinancial, defaultFiscal: form.defaultFiscal,
      };
      return form.id ? put("customer-contacts", String(form.id), body as never) : post("customer-contacts", "", body);
    },
    onSuccess: () => { toast({ title: form.id ? "Contato atualizado" : "Contato adicionado", variant: "success" }); onSaved(); },
    onError: (error) => toast({ title: "Não foi possível salvar", description: errorMessage(error), variant: "destructive" }),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const found: Record<string, string> = {};
    if (form.name.trim().length < 2) found.name = "Informe o nome";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) found.email = "E-mail inválido";
    if (form.phone.replace(/\D/g, "").length < 10) found.phone = "Telefone com DDD";
    setErrors(found);
    if (Object.keys(found).length === 0) save.mutate();
  };

  const toggleRole = (flag: RoleFlag, def: RoleDefault, checked: boolean) => {
    setForm((prev) => ({
      ...prev,
      [flag]: checked,
      // primeiro do papel já entra como padrão; desmarcar o papel tira o padrão
      [def]: checked ? prev[def] || !others.some((c) => c[flag]) : false,
    }));
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{form.id ? `Editar ${draft.name}` : "Novo contato"}</DialogTitle>
          <DialogDescription>Quem fala com vocês por este cliente, e para que.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-3">
          <div>
            <Label htmlFor="contact-name">Nome <span>*</span></Label>
            <Input id="contact-name" name="name" value={form.name} onValueChange={set} placeholder="Nome da pessoa" className="mt-1" />
            {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="contact-email">E-mail <span>*</span></Label>
              <Input id="contact-email" name="email" type="email" value={form.email} onValueChange={set} placeholder="nome@empresa.com.br" className="mt-1" />
              {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
            </div>
            <div>
              <Label htmlFor="contact-phone">Telefone <span>*</span></Label>
              <Input id="contact-phone" name="phone" format="phone" value={form.phone} onValueChange={set} placeholder="(11) 99999-9999" className="mt-1" />
              {errors.phone && <p className="text-red-500 text-sm">{errors.phone}</p>}
            </div>
          </div>
          <div>
            <Label>Cargo</Label>
            <div className="mt-1">
              <Select
                name="roleId"
                options={roles?.rows ?? []}
                state={form.roleId ? String(form.roleId) : ""}
                onChange={(name, value) => set(name, value ? Number(value) : null)}
                placeholder="Opcional"
                clearable
                modal
              />
            </div>
          </div>

          <fieldset className="rounded-md border p-3">
            <legend className="px-1 text-sm font-medium">Para que este contato é usado</legend>
            <div className="grid gap-3">
              {CONTACT_ROLES.map((role) => {
                const holder = others.find((c) => c[role.def]);
                return (
                  <div key={role.flag} className="flex flex-col gap-1">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <Checkbox className="mt-0.5" checked={form[role.flag]} onCheckedChange={(v) => toggleRole(role.flag, role.def, v === true)} />
                      <span>
                        <span className="text-sm font-medium">{role.label}</span>
                        <span className="block text-xs text-muted-foreground">{role.hint}</span>
                      </span>
                    </label>
                    {form[role.flag] && (
                      <label className="ml-6 flex items-center gap-2 cursor-pointer text-xs">
                        <Checkbox checked={form[role.def]} onCheckedChange={(v) => set(role.def, v === true)} />
                        <span>
                          Usar como padrão
                          {holder && !form[role.def] && <span className="text-muted-foreground"> (hoje é {holder.name})</span>}
                          {holder && form[role.def] && <span className="text-muted-foreground"> (no lugar de {holder.name})</span>}
                        </span>
                      </label>
                    )}
                  </div>
                );
              })}
            </div>
          </fieldset>

          <div>
            <Label htmlFor="contact-notes">Observação</Label>
            <Input id="contact-notes" name="notes" value={form.notes ?? ""} onValueChange={set} placeholder="Ex.: só atende à tarde" className="mt-1" />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={save.isPending}>{save.isPending ? "Salvando..." : "Salvar contato"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
