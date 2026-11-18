import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import Dialog from "@/components/general-components/Dialog";
import Icon from "@/components/general-components/Icon";
import Select from "@/components/general-components/Select";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { ContractOptions, ContractSlotOption, Reservation, ReservationClass, dateBr, errorMessage, reservationsApi, seatsLabel } from "./api";
import { InscreverAlunosDialog } from "./VagasEmpresas";

export const contractReservationsKey = (contractId: number) => ["contractReservations", contractId] as const;

/** Reservas da venda por item (uma consulta só para a página toda). */
export function useContractReservations(contractId: number, enabled = true) {
  return useQuery({
    queryKey: contractReservationsKey(contractId),
    queryFn: () => reservationsApi.get<ContractOptions>(`contract/${contractId}`),
    enabled: enabled && contractId > 0,
    retry: false,
  });
}

/**
 * Num item de treinamento da venda: as vagas reservadas em turmas abertas e o
 * botão para reservar (em vez de criar turma fechada). Os alunos da empresa
 * entram pelo próprio item.
 */
export default function VagasDoItem({ contractId, index, disabled }: { contractId: number; index: number; disabled?: boolean }) {
  const { can } = useVerify();
  const { data } = useContractReservations(contractId, can("list_classes") || can("list_comercial"));
  const [reserving, setReserving] = useState(false);
  const [students, setStudents] = useState<Reservation | null>(null);
  const slot = data?.slots.find((s) => s.index === index);
  if (!slot) return null;
  const canWrite = can("update_classes") || can("update_comercial");

  return (
    <div className="mt-2 space-y-1">
      {slot.reservations.map((r) => (
        <div key={r.id} className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Icon name="users" className="w-3 h-3" />
          <Link to="/treinamentos/turmas/$turmaId" params={{ turmaId: String(r.classId) }} search={{ tab: "empresas" } as never} className="underline">{r.class.name}</Link>
          <span className="text-muted-foreground">· {dateBr(r.class.initialDate)} · {r.seats} vaga{r.seats === 1 ? "" : "s"} em turma aberta · {r.used} com nome</span>
          {canWrite && r.open > 0 && !disabled && (
            <Button type="button" size="sm" variant="ghost" className="h-7 px-2" onClick={() => setStudents(r)}>
              <Icon name="user-plus" className="w-3 h-3 mr-1" /> Inscrever alunos
            </Button>
          )}
        </div>
      ))}
      {slot.reserved > 0 && slot.missing > 0 && <p className="text-xs text-muted-foreground">Faltam reservar {slot.missing} de {slot.sold} vaga(s) vendida(s).</p>}
      {canWrite && !disabled && slot.courseId && slot.missing > 0 && (
        <Button type="button" variant="outline" size="sm" onClick={() => setReserving(true)}>
          <Icon name="building-2" className="w-4 h-4 mr-1" /> Usar vagas de turma aberta
        </Button>
      )}
      {reserving && <ReservarDialog contractId={contractId} slot={slot} customerName={data?.contract.customer.name ?? ""} onClose={() => setReserving(false)} />}
      {students && <InscreverAlunosDialog reservation={students} onClose={() => setStudents(null)} />}
    </div>
  );
}

function ReservarDialog({ contractId, slot, customerName, onClose }: { contractId: number; slot: ContractSlotOption; customerName: string; onClose: () => void }) {
  const { can } = useVerify();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ classId: "", seats: String(slot.missing), unitValue: "", notes: "", raiseLimit: false });
  const [error, setError] = useState("");
  const { data: classes, isLoading } = useQuery({
    queryKey: ["openClasses", slot.courseId],
    queryFn: () => reservationsApi.get<ReservationClass[]>("open-classes", { courseId: slot.courseId }),
  });
  const options = (classes ?? []).map((c) => ({ id: c.id, name: `${c.name} · ${dateBr(c.initialDate)}${c.city ? ` · ${c.city}` : ""} · ${seatsLabel(c.seats)}` }));
  const chosen = classes?.find((c) => String(c.id) === form.classId);
  const wanted = Number(form.seats) || 0;
  const short = chosen?.seats && chosen.seats.free !== null ? Math.max(0, wanted - chosen.seats.free) : 0;
  const { mutate, isPending } = useMutation({
    mutationFn: () => reservationsApi.post<Reservation>("", {
      classId: Number(form.classId), contractId, contractSlotIndex: slot.index, seats: wanted,
      unitValue: form.unitValue || null, notes: form.notes, raiseLimit: form.raiseLimit,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contractReservationsKey(contractId) });
      queryClient.invalidateQueries({ queryKey: ["classReservations"] });
      toast({ title: "Vagas reservadas", description: "O site já não vende essas vagas. Inscreva os alunos quando a empresa mandar os nomes.", variant: "success" });
      onClose();
    },
    onError: (e) => setError(errorMessage(e)),
  });
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()} showBttn={false} title="Usar vagas de turma aberta"
      description={`${slot.description}: ${slot.missing} de ${slot.sold} vaga(s) vendida(s) a ${customerName} ainda sem turma. Os alunos entram sem cobrança (quem cobra é a venda) e o certificado sai com a empresa.`}>
      <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); if (!form.classId) return setError("Escolha a turma"); setError(""); mutate(); }}>
        <div>
          <Label>Turma aberta do curso <span>*</span></Label>
          <Select name="classId" modal searchable isLoading={isLoading} options={options} state={form.classId} onChange={(_, v) => setForm({ ...form, classId: String(v ?? "") })}
            placeholder={isLoading ? "Carregando..." : options.length ? "Escolha a turma" : "Nenhuma turma aberta deste curso por vir"} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label htmlFor="rseats">Vagas <span>*</span></Label><Input id="rseats" inputMode="numeric" value={form.seats} onChange={(e) => setForm({ ...form, seats: e.target.value.replace(/\D/g, "") })} /></div>
          <div><Label htmlFor="rvalue">Valor por vaga</Label><Input id="rvalue" inputMode="decimal" placeholder="0,00" value={form.unitValue} onChange={(e) => setForm({ ...form, unitValue: e.target.value })} /></div>
        </div>
        <div><Label htmlFor="rnotes">Observação</Label><Input id="rnotes" value={form.notes} maxLength={300} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        {short > 0 && (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm dark:bg-amber-950/30">
            <p>A turma tem {chosen?.seats?.free} vaga(s) livre(s). Faltam {short}.</p>
            {can("update_classes")
              ? <label className="mt-2 flex items-center gap-2"><Checkbox checked={form.raiseLimit} onCheckedChange={(v) => setForm({ ...form, raiseLimit: v === true })} /> Aumentar o limite da turma em {short}</label>
              : <p className="text-xs text-muted-foreground mt-1">Divida entre turmas (reserve aqui o que cabe e o resto em outra) ou peça a quem gerencia turmas para aumentar o limite.</p>}
          </div>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Voltar</Button><Button type="submit" disabled={isPending}>{isPending ? "Reservando..." : "Reservar vagas"}</Button></div>
      </form>
    </Dialog>
  );
}
