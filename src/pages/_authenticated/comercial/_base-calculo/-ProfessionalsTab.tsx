import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { patch, post, put } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input as ShadInput } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import { NumField, ProfessionalRow, errorMessage, money } from "../-shared/commercial";

interface Props {
  professionals: ProfessionalRow[];
  canCreate: boolean; canUpdate: boolean; canInactivate: boolean;
  /** recalcula a tabela depois de mexer no cadastro */
  onChanged: () => void;
}

/** Tabela MDO: salário → custo hora e adicionais, sempre calculados pela base em edição. */
export default function ProfessionalsTab({ professionals, canCreate, canUpdate, canInactivate, onChanged }: Props) {
  const [form, setForm] = useState<{ row?: ProfessionalRow } | null>(null);
  const [open, setOpen] = useState<number | null>(null);

  const { mutate: inactivate } = useMutation({
    mutationFn: (row: ProfessionalRow) => patch(`commercial-professionals/inactive/${row.id}`, ""),
    onSuccess: () => { toast({ title: "Profissional inativado!", variant: "success" }); onChanged(); },
    onError: (error) => toast({ title: "Não foi possível inativar", description: errorMessage(error), variant: "destructive" }),
  });

  return (
    <section className="rounded-lg border p-4">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold">Profissionais</h3>
          <p className="text-xs text-muted-foreground">Só o salário é cadastrado. O custo hora e os adicionais vêm da base de cálculo e mudam junto com ela.</p>
        </div>
        {canCreate && <Button type="button" size="sm" onClick={() => setForm({})}><Icon name="plus" className="w-4 h-4 mr-1" /> Novo profissional</Button>}
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="text-xs text-muted-foreground border-b">
              <th className="text-left font-medium py-2">Profissional</th>
              <th className="text-right font-medium">Salário bruto</th>
              <th className="text-right font-medium">Custo hora</th>
              <th className="text-right font-medium">Noturno</th>
              <th className="text-right font-medium">Viagem</th>
              <th className="text-right font-medium">FDS/feriado</th>
              <th className="w-20" />
            </tr>
          </thead>
          <tbody>
            {professionals.length === 0 && <tr><td colSpan={7} className="py-4 text-muted-foreground">Nenhum profissional cadastrado.</td></tr>}
            {professionals.map((row) => (
              <React.Fragment key={row.id}>
                <tr className="border-b tabular-nums hover:bg-muted/40">
                  <td className="py-2">
                    <button type="button" className="flex items-center gap-1 text-left font-medium" aria-expanded={open === row.id}
                      onClick={() => setOpen(open === row.id ? null : row.id)}>
                      <Icon name={open === row.id ? "chevron-down" : "chevron-right"} className="w-3 h-3 shrink-0" /> {row.name}
                    </button>
                  </td>
                  <td className="text-right">{money(row.salary)}</td>
                  <td className="text-right font-semibold">{money(row.hourCost)}</td>
                  <td className="text-right">{money(row.nightPerHour)}</td>
                  <td className="text-right">{money(row.travelPerHour)}</td>
                  <td className="text-right">{money(row.weekendPerHour)}</td>
                  <td className="text-right whitespace-nowrap">
                    {canUpdate && (
                      <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label={`Editar ${row.name}`} onClick={() => setForm({ row })}>
                        <Icon name="pencil" className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    {canInactivate && (
                      <span className="inline-block align-middle">
                        <ConfirmDialog title={`Inativar ${row.name}?`} description="Deixa de aparecer para novas propostas. Propostas já feitas não mudam."
                          onConfirm={() => inactivate(row)}>
                          <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label={`Inativar ${row.name}`}>
                            <Icon name="power-off" className="w-3.5 h-3.5" />
                          </Button>
                        </ConfirmDialog>
                      </span>
                    )}
                  </td>
                </tr>
                {open === row.id && (
                  <tr className="border-b bg-muted/30 text-xs">
                    <td colSpan={7} className="py-2 px-4">
                      De onde vem o custo hora: salário com encargos <b>{money(row.parts.labor)}</b> · benefícios <b>{money(row.parts.benefits)}</b> ·
                      pessoal indireto <b>{money(row.parts.indirect)}</b> · outros custos <b>{money(row.parts.other)}</b> · dívidas <b>{money(row.parts.debt)}</b> ·
                      desconto de vale-transporte <b>− {money(row.parts.fareDiscount)}</b>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {form && <ProfessionalDialog row={form.row} onClose={() => setForm(null)} onSaved={onChanged} />}
    </section>
  );
}

function ProfessionalDialog({ row, onClose, onSaved }: { row?: ProfessionalRow; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(row?.name ?? "");
  const [salary, setSalary] = useState<number>(row?.salary ?? 0);
  const [error, setError] = useState("");
  const { mutate, isPending } = useMutation({
    mutationFn: () => (row ? put("commercial-professionals", String(row.id), { name, salary }) : post("commercial-professionals", "", { name, salary })),
    onSuccess: () => { toast({ title: row ? "Profissional atualizado!" : "Profissional cadastrado!", variant: "success" }); onSaved(); onClose(); },
    onError: (err) => setError(errorMessage(err)),
  });

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{row ? `Editar ${row.name}` : "Novo profissional"}</DialogTitle>
          <DialogDescription>O custo hora é calculado a partir do salário e da base de cálculo.</DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={(event) => {
          event.preventDefault();
          if (name.trim().length < 2) return setError("Informe o nome do profissional");
          if (!(salary > 0)) return setError("Informe o salário bruto");
          setError(""); mutate();
        }}>
          <div>
            <Label htmlFor="professionalName">Nome <span>*</span></Label>
            <ShadInput id="professionalName" value={name} maxLength={120} autoFocus className="mt-1" placeholder="Ex.: Alpinista N2" onChange={(event) => setName(event.target.value)} />
          </div>
          <div>
            <Label htmlFor="professionalSalary">Salário bruto <span>*</span></Label>
            <NumField id="professionalSalary" kind="money" value={salary} onChange={setSalary} className="mt-1" />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>{row ? "Salvar" : "Cadastrar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
