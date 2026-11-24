import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import CalendarPicker from "@/components/general-components/Calendar";
import Select from "@/components/general-components/Select";
import StatusBadge, { StatusTone } from "@/components/general-components/StatusBadge";
import { dateBr, errorMessage, todayIso } from "../../comercial/-shared/commercial";

/** Funcionários (RH): tipos (espelham a API), situação e o lançamento no histórico. */
export type EmployeeStatus = "ativo" | "ferias" | "afastado" | "suspenso" | "desligado" | "indisponivel";
export interface EmployeeRole { id: number; name: string; isPrimary: boolean }
export interface EmployeeRow {
  id: number; name: string; registration: string | null; phone: string | null; contractType: string;
  roles: EmployeeRole[]; primaryRole: string | null; status: EmployeeStatus; statusLabel: string; statusUntil: string | null;
  admissionDate: string | null; terminationDate: string | null; hasUser: boolean; inactive: boolean;
  /** Sinal dos documentos (só vem para quem pode ver documentos). */
  documents?: "em_dia" | "a_vencer" | "vencido" | "sem_validade" | "faltando" | "vazia" | null;
}
export interface EmployeeList { rows: EmployeeRow[]; total: number; summary: Partial<Record<EmployeeStatus, number>> }
export interface EmployeeEvent {
  id: number; type: string; typeLabel: string; startDate: string; endDate: string | null; reason: string | null; removable: boolean; createdBy: string | null; createdAt: string;
}
export interface Employee extends EmployeeRow {
  notes: string | null; user: { id: number; name: string; email: string } | null;
  canSeePersonal: boolean; cpf: string | null; rg: string | null; birthDate: string | null; email: string | null; emergencyName: string | null; emergencyPhone: string | null;
  canSeeOccurrences: boolean; canWriteOccurrences: boolean; events: EmployeeEvent[];
  unavailable: Array<{ startDate: string; endDate: string | null; label: string }>;
}
export interface EventType { id: string; name: string; period: boolean; endRequired: boolean }
export interface EmployeeOptions {
  professionals: Array<{ id: number; name: string }>; contractTypes: Array<{ id: string; name: string }>; eventTypes: EventType[];
  statuses: Array<{ id: EmployeeStatus; name: string }>; users: Array<{ id: number; name: string; employeeId: number | null }>;
  canSeePersonal: boolean; canSeeOccurrences: boolean; canWriteOccurrences: boolean;
}

export const EMPLOYEES_KEY = "hrEmployees";
export const EMPLOYEE_KEY = "hrEmployee";
export const EMPLOYEE_OPTIONS_KEY = "hrEmployeeOptions";
export const EMPLOYEES_ABILITY = "funcionarios";

/** Rotas de funcionários recebem JSON (o helper padrão envia multipart). */
export const employeesApi = {
  get: async <T,>(path = "", params?: Record<string, unknown>) => (await api.get<T>(`employees${path ? `/${path}` : ""}`, { params })).data,
  post: async <T,>(path: string, body?: unknown) => (await api.post<T>(`employees${path ? `/${path}` : ""}`, body ?? {})).data,
  put: async <T,>(path: string, body?: unknown) => (await api.put<T>(`employees/${path}`, body ?? {})).data,
  patch: async <T,>(path: string, body?: unknown) => (await api.patch<T>(`employees/${path}`, body ?? {})).data,
  delete: async <T,>(path: string) => (await api.delete<T>(`employees/${path}`)).data,
};

const STATUS_TONE: Record<EmployeeStatus, StatusTone> = {
  ativo: "success", ferias: "info", afastado: "warning", suspenso: "danger", indisponivel: "warning", desligado: "neutral",
};

/** Selo da situação, com "até quando" quando a pessoa está fora por um período. */
export function EmployeeStatusBadge({ status, label, until }: { status: EmployeeStatus; label: string; until?: string | null }) {
  return <StatusBadge tone={STATUS_TONE[status] ?? "neutral"} pulse={status !== "desligado"}>{label}{until ? ` até ${dateBr(until)}` : ""}</StatusBadge>;
}

export const periodText = (start: string, end: string | null, period: boolean) => (!period ? dateBr(start) : end ? `${dateBr(start)} a ${dateBr(end)}` : `desde ${dateBr(start)}, sem data de volta`);

/** Lançar férias, afastamento, suspensão, advertência ou desligamento no histórico. */
export function EmployeeEventDialog({ employee, types, onClose }: { employee: Pick<Employee, "id" | "name">; types: EventType[]; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [type, setType] = useState("ferias");
  const [startDate, setStartDate] = useState(todayIso());
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const current = types.find((item) => item.id === type);
  const reasonRequired = type === "advertencia" || type === "suspensao" || type === "desligamento";

  const { mutate, isPending } = useMutation({
    mutationFn: () => employeesApi.post<Employee>(`${employee.id}/events`, { type, startDate, endDate: current?.period ? endDate || null : null, reason: reason.trim() }),
    onSuccess: (result) => {
      queryClient.setQueryData([EMPLOYEE_KEY, String(result.id)], result);
      queryClient.invalidateQueries({ queryKey: [EMPLOYEES_KEY] });
      toast({ title: `${current?.name ?? "Registro"} lançado`, variant: "success" });
      onClose();
    },
    onError: (err) => setError(errorMessage(err)),
  });
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!startDate) return setError("Informe a data.");
    if (current?.endRequired && !endDate) return setError("Informe até quando.");
    if (reasonRequired && !reason.trim()) return setError("Informe o motivo.");
    setError(""); mutate();
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Lançar no histórico</DialogTitle>
          <DialogDescription>{employee.name}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <div>
            <Label>O que aconteceu <span>*</span></Label>
            <Select name="type" options={types.map(({ id, name }) => ({ id, name }))} state={type} modal onChange={(_, value) => { setType(String(value ?? "ferias")); setError(""); }} placeholder="Selecione" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>{current?.period ? "De" : "Data"} <span>*</span></Label>
              <CalendarPicker mode="single" name="startDate" className="mt-1 w-full" value={startDate} placeholder="Escolha" fromYear={2000} toYear={2040} onValueChange={(_, value) => setStartDate(String(value ?? ""))} />
            </div>
            {current?.period && (
              <div>
                <Label>Até {current.endRequired && <span>*</span>}</Label>
                <CalendarPicker mode="single" name="endDate" className="mt-1 w-full" value={endDate} placeholder={current.endRequired ? "Escolha" : "Sem data de volta"} fromYear={2000} toYear={2040}
                  onValueChange={(_, value) => setEndDate(String(value ?? ""))} />
              </div>
            )}
          </div>
          <div>
            <Label htmlFor="reason">Motivo {reasonRequired && <span>*</span>}</Label>
            <Textarea id="reason" className="mt-1" rows={3} maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} />
            {type === "afastamento" && <p className="text-xs text-muted-foreground mt-1">Não escreva diagnóstico nem detalhe de saúde: basta "atestado médico" ou "licença".</p>}
            {type === "desligamento" && <p className="text-xs text-muted-foreground mt-1">A pessoa deixa de aparecer para novas equipes a partir desta data. O que ela já fez continua nos registros.</p>}
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Lançando..." : "Lançar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
