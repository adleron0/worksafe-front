import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import Dialog from "@/components/general-components/Dialog";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import Select from "@/components/general-components/Select";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { get } from "@/services/api";
import {
  ClassSeats, Reservation, ReservationClass, ReservationStudent, StudentResult,
  dateBr, errorMessage, formatCnpj, formatCpf, money, parseStudents, reservationsApi, seatsLabel,
} from "./api";
import RelatorioEmpresaDialog from "./RelatorioEmpresaDialog";

// ============================================================================
// Vagas de empresas numa turma aberta: a empresa compra N vagas (por venda ou
// cortesia), o site para de vender essas vagas e a equipe inscreve os alunos
// dela aqui — confirmados, sem checkout e sem cobrança. O certificado desses
// alunos sai com a empresa contratante.
// ============================================================================

export const reservationKeys = {
  ofClass: (classId: number) => ["classReservations", classId] as const,
  all: ["classReservations"] as const,
};

const STATUS_TEXT: Record<StudentResult["status"], string> = {
  inscrito: "Inscrito", convertido: "Passou para a empresa", ja_estava: "Já estava", erro: "Não entrou",
};

export default function VagasEmpresas({ classId, isClosed = false }: { classId: number; isClosed?: boolean }) {
  const { can } = useVerify();
  const canWrite = can("update_classes") || can("update_comercial");
  const [creating, setCreating] = useState(false);

  const { data: availability } = useQuery({
    queryKey: ["classSeats", classId],
    queryFn: () => reservationsApi.get<{ class: ReservationClass; seats: ClassSeats }>(`availability/${classId}`),
  });
  const { data: reservations, isLoading } = useQuery({
    queryKey: reservationKeys.ofClass(classId),
    queryFn: () => reservationsApi.get<Reservation[]>("", { classId }),
  });

  if (isClosed) {
    return (
      <div className="rounded-lg border p-4 text-sm text-muted-foreground">
        Turma fechada de um cliente: os alunos são todos dele e o certificado já sai com a empresa da turma. Vagas avulsas para empresas existem só em turma aberta.
      </div>
    );
  }

  const seats = availability?.seats;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
        <div className="text-sm">
          <p className="font-medium">{seatsLabel(seats)}</p>
          {seats && (
            <p className="text-xs text-muted-foreground">
              {seats.confirmed} confirmado{seats.confirmed === 1 ? "" : "s"} · {seats.reserved} vaga{seats.reserved === 1 ? "" : "s"} de empresas
              {seats.reservedOpen > 0 ? ` (${seats.reservedOpen} ainda sem nome)` : ""}
            </p>
          )}
        </div>
        {canWrite && (
          <Button size="sm" onClick={() => setCreating(true)}>
            <Icon name="building-2" className="w-4 h-4 mr-1" /> Reservar vagas para empresa
          </Button>
        )}
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
      {!isLoading && !reservations?.length && (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Nenhuma empresa comprou vagas nesta turma. Vagas vendidas por proposta podem ser reservadas aqui ou na própria venda.
        </div>
      )}
      {reservations?.map((r) => <ReservationCard key={r.id} reservation={r} canWrite={canWrite} />)}

      {creating && <NovaReservaDialog classId={classId} seats={seats} onClose={() => setCreating(false)} />}
    </div>
  );
}

function useInvalidate(classId: number) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: reservationKeys.all });
    queryClient.invalidateQueries({ queryKey: ["classSeats", classId] });
    queryClient.invalidateQueries({ queryKey: ["listSubscriptionsPresenca"] });
    queryClient.invalidateQueries({ queryKey: ["contractReservations"] });
  };
}

function ReservationCard({ reservation: r, canWrite }: { reservation: Reservation; canWrite: boolean }) {
  const invalidate = useInvalidate(r.classId);
  const [dialog, setDialog] = useState<"students" | "seats" | "transfer" | "report" | "cancel" | null>(null);
  const [swap, setSwap] = useState<ReservationStudent | null>(null);
  const [removing, setRemoving] = useState<ReservationStudent | null>(null);

  const remove = useMutation({
    mutationFn: (sub: ReservationStudent) => reservationsApi.delete<Reservation>(`${r.id}/students/${sub.id}`),
    onSuccess: () => { invalidate(); toast({ title: "Aluno retirado", description: "A vaga continua reservada para a empresa.", variant: "success" }); },
    onError: (error) => toast({ title: "Não deu para tirar o aluno", description: errorMessage(error), variant: "destructive" }),
  });
  const cancel = useMutation({
    mutationFn: () => reservationsApi.post<Reservation>(`${r.id}/cancel`, {}),
    onSuccess: () => { invalidate(); toast({ title: "Reserva cancelada", description: "As vagas voltaram para o site.", variant: "success" }); },
    onError: (error) => toast({ title: "Não deu para cancelar", description: errorMessage(error), variant: "destructive" }),
  });

  return (
    <div className="rounded-lg border">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b p-3">
        <div className="min-w-0">
          <p className="font-medium truncate">{r.customer.corporateName || r.customer.name}</p>
          <p className="text-xs text-muted-foreground">
            {formatCnpj(r.customer.cnpj)}
            {r.unitValue !== null ? ` · ${money(r.unitValue)} por vaga` : ""}
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {r.contract ? (
              <Link to="/comercial/contratos/$contractId" params={{ contractId: String(r.contract.id) }}>
                <Badge variant="outline" className="gap-1"><Icon name="file-signature" className="w-3 h-3" /> Venda {r.contract.number}</Badge>
              </Link>
            ) : (
              <Badge variant="outline">Sem venda (cortesia)</Badge>
            )}
            <Badge variant={r.open > 0 ? "secondary" : "default"}>{r.used} de {r.seats} com nome</Badge>
          </div>
          {r.notes && <p className="mt-1 text-xs text-muted-foreground">{r.notes}</p>}
        </div>
        <div className="flex items-center gap-2">
          {canWrite && (
            <Button size="sm" onClick={() => setDialog("students")} disabled={r.open === 0}>
              <Icon name="user-plus" className="w-4 h-4 mr-1" /> Inscrever alunos
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline"><Icon name="ellipsis" className="w-4 h-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setTimeout(() => setDialog("report"), 0)}><Icon name="file-text" className="w-3 h-3 mr-2" /> Relatório da empresa</DropdownMenuItem>
              {canWrite && <DropdownMenuItem onSelect={() => setTimeout(() => setDialog("seats"), 0)}><Icon name="pencil" className="w-3 h-3 mr-2" /> Alterar vagas</DropdownMenuItem>}
              {canWrite && <DropdownMenuItem onSelect={() => setTimeout(() => setDialog("transfer"), 0)}><Icon name="arrow-right-left" className="w-3 h-3 mr-2" /> Transferir para outra turma</DropdownMenuItem>}
              {canWrite && <DropdownMenuItem onSelect={() => setTimeout(() => setDialog("cancel"), 0)}><Icon name="ban" className="w-3 h-3 mr-2" /> Cancelar reserva</DropdownMenuItem>}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {r.students.length > 0 ? (
        <ul className="divide-y">
          {r.students.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
              <div className="min-w-0">
                <p className="truncate">{s.name}</p>
                <p className="text-xs text-muted-foreground">{formatCpf(s.cpf)}</p>
              </div>
              {canWrite && (
                <div className="flex gap-1">
                  <Tooltip><TooltipTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setSwap(s)}><Icon name="replace" className="w-4 h-4" /></Button>
                  </TooltipTrigger><TooltipContent>Trocar por outra pessoa</TooltipContent></Tooltip>
                  <Tooltip><TooltipTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setRemoving(s)}><Icon name="user-minus" className="w-4 h-4" /></Button>
                  </TooltipTrigger><TooltipContent>Tirar da turma (a vaga fica com a empresa)</TooltipContent></Tooltip>
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-3 py-2 text-sm text-muted-foreground">A empresa ainda não mandou os nomes.</p>
      )}
      {r.open > 0 && r.students.length > 0 && <p className="px-3 pb-2 text-xs text-muted-foreground">{r.open} vaga{r.open === 1 ? "" : "s"} ainda sem nome.</p>}

      {dialog === "students" && <InscreverAlunosDialog reservation={r} onClose={() => setDialog(null)} />}
      {dialog === "seats" && <AlterarVagasDialog reservation={r} onClose={() => setDialog(null)} />}
      {dialog === "transfer" && <TransferirDialog reservation={r} onClose={() => setDialog(null)} />}
      {dialog === "report" && <RelatorioEmpresaDialog reservationId={r.id} onClose={() => setDialog(null)} />}
      {swap && <TrocarAlunoDialog reservation={r} student={swap} onClose={() => setSwap(null)} />}
      <ConfirmDialog
        open={dialog === "cancel"} onOpenChange={(open) => !open && setDialog(null)}
        title="Cancelar a reserva?" description={`As ${r.seats} vaga(s) de ${r.customer.name} voltam para o site. Só dá para cancelar sem alunos inscritos.`}
        onConfirm={() => { cancel.mutate(); setDialog(null); }}
      />
      <ConfirmDialog
        open={Boolean(removing)} onOpenChange={(open) => !open && setRemoving(null)}
        title="Tirar o aluno?" description={`${removing?.name ?? ""} sai da turma. A vaga continua reservada para a empresa.`}
        onConfirm={() => { if (removing) remove.mutate(removing); setRemoving(null); }}
      />
    </div>
  );
}

function NovaReservaDialog({ classId, seats, onClose }: { classId: number; seats?: ClassSeats; onClose: () => void }) {
  const { can } = useVerify();
  const invalidate = useInvalidate(classId);
  const [form, setForm] = useState({ customerId: "", seats: "1", unitValue: "", notes: "", raiseLimit: false });
  const [error, setError] = useState("");
  const { data: customers } = useQuery({
    queryKey: ["listClientes"],
    queryFn: () => get<{ rows: Array<{ id: number; name: string }> }>("customer", "", [{ key: "limit", value: "all" }, { key: "order-name", value: "asc" }]),
  });
  const wanted = Number(form.seats) || 0;
  const missing = seats && seats.free !== null ? Math.max(0, wanted - seats.free) : 0;
  const { mutate, isPending } = useMutation({
    mutationFn: () => reservationsApi.post<Reservation>("", { classId, customerId: Number(form.customerId), seats: wanted, unitValue: form.unitValue || null, notes: form.notes, raiseLimit: form.raiseLimit }),
    onSuccess: () => { invalidate(); toast({ title: "Vagas reservadas", description: "O site já não vende essas vagas. Inscreva os alunos quando a empresa mandar os nomes.", variant: "success" }); onClose(); },
    onError: (e) => setError(errorMessage(e)),
  });
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()} showBttn={false} className="sm:max-w-xl" classNameContent="h-auto max-h-[70vh] pb-2" title="Reservar vagas para empresa" description="Sem venda, a reserva fica como cortesia. Vagas vendidas por proposta: reserve pela venda (Comercial → Vendas) para ficarem ligadas a ela.">
      <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); if (!form.customerId) return setError("Escolha a empresa"); if (wanted < 1) return setError("Informe as vagas"); setError(""); mutate(); }}>
        <div>
          <Label>Empresa <span>*</span></Label>
          <Select name="customerId" modal searchable options={customers?.rows ?? []} state={form.customerId} onChange={(_, v) => setForm({ ...form, customerId: String(v ?? "") })} placeholder="Escolha o cliente" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label htmlFor="seats">Vagas <span>*</span></Label><Input id="seats" inputMode="numeric" value={form.seats} onChange={(e) => setForm({ ...form, seats: e.target.value.replace(/\D/g, "") })} /></div>
          <div><Label htmlFor="unitValue">Valor por vaga</Label><Input id="unitValue" inputMode="decimal" placeholder="0,00" value={form.unitValue} onChange={(e) => setForm({ ...form, unitValue: e.target.value })} /></div>
        </div>
        <div><Label htmlFor="notes">Observação</Label><Input id="notes" value={form.notes} maxLength={300} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        {missing > 0 && (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm dark:bg-amber-950/30">
            <p>A turma tem {seats?.free} vaga(s) livre(s). Faltam {missing}.</p>
            {can("update_classes") ? (
              <label className="mt-2 flex items-center gap-2"><Checkbox checked={form.raiseLimit} onCheckedChange={(v) => setForm({ ...form, raiseLimit: v === true })} /> Aumentar o limite da turma em {missing}</label>
            ) : <p className="text-xs text-muted-foreground mt-1">Escolha outra turma ou peça a quem gerencia turmas para aumentar o limite.</p>}
          </div>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Voltar</Button><Button type="submit" disabled={isPending}>{isPending ? "Reservando..." : "Reservar"}</Button></div>
      </form>
    </Dialog>
  );
}

export function InscreverAlunosDialog({ reservation: r, onClose }: { reservation: Reservation; onClose: () => void }) {
  const invalidate = useInvalidate(r.classId);
  const [text, setText] = useState("");
  const [results, setResults] = useState<StudentResult[] | null>(null);
  const [open, setOpen] = useState(r.open);
  const parsed = useMemo(() => parseStudents(text), [text]);
  const { mutate, isPending } = useMutation({
    mutationFn: () => reservationsApi.post<{ results: StudentResult[]; reservation: Reservation }>(`${r.id}/students`, { students: parsed }),
    onSuccess: (data) => {
      invalidate();
      setResults(data.results);
      setOpen(data.reservation.open);
      const ok = data.results.filter((x) => x.status !== "erro").length;
      toast({ title: `${ok} aluno${ok === 1 ? "" : "s"} na turma`, description: data.results.some((x) => x.status === "erro") ? "Alguns não entraram: veja o motivo de cada um." : "Inscritos sem cobrança, com a empresa no certificado.", variant: "success" });
      setText(data.results.filter((x) => x.status === "erro").map((x) => `${x.name}; ${x.cpf}`).join("\n"));
    },
    onError: (e) => toast({ title: "Não deu para inscrever", description: errorMessage(e), variant: "destructive" }),
  });
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()} showBttn={false} className="sm:max-w-2xl" classNameContent="h-auto max-h-[70vh] pb-2" title={`Alunos de ${r.customer.name}`} description={`Uma pessoa por linha: nome e CPF (pode colar da planilha). ${open} vaga(s) sem nome. Entram confirmados, sem cobrança.`}>
      <div className="grid gap-3">
        <Textarea rows={8} value={text} onChange={(e) => setText(e.target.value)} placeholder={"Maria da Silva; 529.982.247-25\nJoão Souza; 111.444.777-35"} />
        {parsed.length > 0 && <p className="text-xs text-muted-foreground">{parsed.length} pessoa{parsed.length === 1 ? "" : "s"} na lista{parsed.length > open ? ` — a reserva tem ${open} vaga(s) sem nome` : ""}.</p>}
        {results && (
          <ul className="max-h-56 overflow-auto rounded-md border text-sm divide-y">
            {results.map((x, i) => (
              <li key={i} className="flex items-start justify-between gap-2 px-3 py-1.5">
                <span className="min-w-0"><span className="font-medium">{x.name || "(sem nome)"}</span> <span className="text-xs text-muted-foreground">{formatCpf(x.cpf)}</span>{x.message && <span className="block text-xs text-muted-foreground">{x.message}</span>}</span>
                <Badge variant={x.status === "erro" ? "destructive" : "secondary"} className="shrink-0">{STATUS_TEXT[x.status]}</Badge>
              </li>
            ))}
          </ul>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Fechar</Button>
          <Button disabled={!parsed.length || isPending} onClick={() => mutate()}>{isPending ? "Inscrevendo..." : `Inscrever ${parsed.length || ""}`.trim()}</Button>
        </div>
      </div>
    </Dialog>
  );
}

function AlterarVagasDialog({ reservation: r, onClose }: { reservation: Reservation; onClose: () => void }) {
  const { can } = useVerify();
  const invalidate = useInvalidate(r.classId);
  const [form, setForm] = useState({ seats: String(r.seats), unitValue: r.unitValue === null ? "" : String(r.unitValue).replace(".", ","), notes: r.notes ?? "", raiseLimit: false });
  const [error, setError] = useState("");
  const { mutate, isPending } = useMutation({
    mutationFn: () => reservationsApi.put<Reservation>(String(r.id), { seats: Number(form.seats), unitValue: form.unitValue || null, notes: form.notes, raiseLimit: form.raiseLimit }),
    onSuccess: () => { invalidate(); toast({ title: "Reserva atualizada", variant: "success" }); onClose(); },
    onError: (e) => setError(errorMessage(e)),
  });
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()} showBttn={false} className="sm:max-w-xl" classNameContent="h-auto max-h-[70vh] pb-2" title="Alterar vagas" description={`${r.customer.name} · ${r.used} aluno(s) já inscrito(s): não dá para ficar com menos vagas que isso.`}>
      <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); setError(""); mutate(); }}>
        <div className="grid grid-cols-2 gap-3">
          <div><Label htmlFor="eseats">Vagas</Label><Input id="eseats" inputMode="numeric" value={form.seats} onChange={(e) => setForm({ ...form, seats: e.target.value.replace(/\D/g, "") })} /></div>
          <div><Label htmlFor="evalue">Valor por vaga</Label><Input id="evalue" inputMode="decimal" value={form.unitValue} onChange={(e) => setForm({ ...form, unitValue: e.target.value })} /></div>
        </div>
        <div><Label htmlFor="enotes">Observação</Label><Input id="enotes" value={form.notes} maxLength={300} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        {can("update_classes") && Number(form.seats) > r.seats && (
          <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.raiseLimit} onCheckedChange={(v) => setForm({ ...form, raiseLimit: v === true })} /> Se faltar vaga, aumentar o limite da turma</label>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Voltar</Button><Button type="submit" disabled={isPending}>Salvar</Button></div>
      </form>
    </Dialog>
  );
}

function TransferirDialog({ reservation: r, onClose }: { reservation: Reservation; onClose: () => void }) {
  const { can } = useVerify();
  const invalidate = useInvalidate(r.classId);
  const [target, setTarget] = useState("");
  const [raiseLimit, setRaiseLimit] = useState(false);
  const [error, setError] = useState("");
  const { data: classes } = useQuery({
    queryKey: ["openClasses", r.class.courseId],
    queryFn: () => reservationsApi.get<ReservationClass[]>("open-classes", { courseId: r.class.courseId }),
  });
  const options = (classes ?? []).filter((c) => c.id !== r.classId).map((c) => ({ id: c.id, name: `${c.name} · ${dateBr(c.initialDate)} · ${seatsLabel(c.seats)}` }));
  const chosen = classes?.find((c) => String(c.id) === target);
  const need = Math.max(r.seats, r.used);
  const short = chosen?.seats && chosen.seats.free !== null && chosen.seats.free < need;
  const { mutate, isPending } = useMutation({
    mutationFn: () => reservationsApi.post<Reservation>(`${r.id}/transfer`, { classId: Number(target), raiseLimit }),
    onSuccess: () => { invalidate(); toast({ title: "Reserva transferida", description: "As vagas e os alunos foram para a outra turma.", variant: "success" }); onClose(); },
    onError: (e) => setError(errorMessage(e)),
  });
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()} showBttn={false} className="sm:max-w-xl" classNameContent="h-auto max-h-[70vh] pb-2" title="Transferir para outra turma" description={`Leva as ${r.seats} vaga(s) e os ${r.used} aluno(s) de ${r.customer.name} para outra turma aberta do mesmo curso. Quem já tem presença, prova ou certificado não se move.`}>
      <div className="grid gap-4">
        <Select name="target" modal searchable options={options} state={target} onChange={(_, v) => setTarget(String(v ?? ""))} placeholder={options.length ? "Escolha a turma" : "Nenhuma outra turma aberta do curso"} />
        {short && (can("update_classes")
          ? <label className="flex items-center gap-2 text-sm"><Checkbox checked={raiseLimit} onCheckedChange={(v) => setRaiseLimit(v === true)} /> A turma tem {chosen?.seats?.free} vaga(s) livre(s): aumentar o limite no que faltar</label>
          : <p className="text-sm text-amber-700">A turma tem só {chosen?.seats?.free} vaga(s) livre(s).</p>)}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2"><Button variant="outline" onClick={onClose}>Voltar</Button><Button disabled={!target || isPending} onClick={() => { setError(""); mutate(); }}>Transferir</Button></div>
      </div>
    </Dialog>
  );
}

function TrocarAlunoDialog({ reservation: r, student, onClose }: { reservation: Reservation; student: ReservationStudent; onClose: () => void }) {
  const invalidate = useInvalidate(r.classId);
  const [form, setForm] = useState({ name: "", cpf: "" });
  const [error, setError] = useState("");
  const { mutate, isPending } = useMutation({
    mutationFn: () => reservationsApi.put<Reservation>(`${r.id}/students/${student.id}`, form),
    onSuccess: () => { invalidate(); toast({ title: "Aluno trocado", variant: "success" }); onClose(); },
    onError: (e) => setError(errorMessage(e)),
  });
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()} showBttn={false} className="sm:max-w-xl" classNameContent="h-auto max-h-[70vh] pb-2" title="Trocar aluno" description={`${student.name} sai e a pessoa nova ocupa a mesma vaga de ${r.customer.name}.`}>
      <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); setError(""); mutate(); }}>
        <div><Label htmlFor="sname">Nome</Label><Input id="sname" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div><Label htmlFor="scpf">CPF</Label><Input id="scpf" inputMode="numeric" value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} /></div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Voltar</Button><Button type="submit" disabled={isPending}>Trocar</Button></div>
      </form>
    </Dialog>
  );
}
