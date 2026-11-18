import api from "@/services/api";
import { ApiError } from "@/general-interfaces/api.interface";

/**
 * Vagas de turma aberta compradas por empresas (rotas `class-reservations`).
 * As rotas recebem JSON (o helper padrão envia multipart).
 */
export const reservationsApi = {
  get: async <T,>(path = "", params?: Record<string, unknown>) => (await api.get<T>(`class-reservations${path ? `/${path}` : ""}`, { params })).data,
  post: async <T,>(path: string, body?: unknown) => (await api.post<T>(`class-reservations${path ? `/${path}` : ""}`, body ?? {})).data,
  put: async <T,>(path: string, body?: unknown) => (await api.put<T>(`class-reservations/${path}`, body ?? {})).data,
  delete: async <T,>(path: string) => (await api.delete<T>(`class-reservations/${path}`)).data,
};

export const errorMessage = (error: unknown) => {
  const message = (error as ApiError)?.response?.data?.message as string | string[] | undefined;
  return Array.isArray(message) ? message.join(" ") : message || "Erro desconhecido.";
};

export interface ClassSeats { max: number | null; confirmed: number; reservedOpen: number; reserved: number; occupied: number; free: number | null }
export interface ReservationCustomer { id: number; name: string; corporateName: string; cnpj: string }
export interface ReservationClass {
  id: number; name: string; courseId: number; customerId: number | null; initialDate: string | null; finalDate: string | null;
  inactiveAt: string | null; maxSubscriptions: number | null; unlimitedSubscriptions: boolean; classCode: string | null;
  city: string | null; state: string | null; course: { id: number; name: string } | null; seats?: ClassSeats | null;
}
export interface ReservationStudent { id: number; name: string; cpf: string; email: string; phone: string; occupation: string | null; traineeId: number | null }
export interface Reservation {
  id: number; classId: number; customerId: number; contractId: number | null; contractSlotIndex: number | null;
  seats: number; used: number; open: number; unitValue: number | null; notes: string | null;
  cancelled: boolean; cancelReason: string | null; createdAt: string;
  class: ReservationClass; customer: ReservationCustomer; contract: { id: number; number: string; status: string } | null;
  classSeats: ClassSeats | null; students: ReservationStudent[];
}
export interface StudentResult { name: string; cpf: string; status: "inscrito" | "convertido" | "ja_estava" | "erro"; message?: string }
export interface ContractSlotOption {
  index: number; courseId: number | null; description: string; quantity: number; students: number | null;
  sold: number; reserved: number; missing: number; closedClassIds: number[]; reservations: Reservation[];
}
export interface ContractOptions {
  contract: { id: number; number: string; status: string; customer: ReservationCustomer };
  slots: ContractSlotOption[];
  others: Reservation[];
}
export interface ReservationReport {
  reservation: Reservation;
  days: number[];
  students: Array<{ subscriptionId: number; name: string; cpf: string; attendance: Array<boolean | null>; exam: { passed: boolean; score: number | null } | null; certificate: { key: string; expirationDate: string | null } | null }>;
}

export const dateBr = (value?: string | null) => (value ? value.slice(0, 10).split("-").reverse().join("/") : "sem data");
export const formatCnpj = (value?: string | null) => {
  const d = String(value ?? "").replace(/\D/g, "");
  return d.length === 14 ? `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}` : d;
};
export const formatCpf = (value?: string | null) => {
  const d = String(value ?? "").replace(/\D/g, "");
  return d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : d;
};
export const money = (value?: number | null) => Number(value ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const seatsLabel = (s?: ClassSeats | null) =>
  !s ? "" : s.max === null ? `${s.occupied} ocupadas · sem limite` : `${s.occupied} de ${s.max} ocupadas · ${s.free} livre${s.free === 1 ? "" : "s"}`;

/**
 * Lê "Nome; CPF" (ou tab, ou vírgula antes do CPF) — uma pessoa por linha.
 * Aceita colar direto da planilha da empresa.
 */
export function parseStudents(text: string): Array<{ name: string; cpf: string }> {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = /^(.*?)[\s;,\t|-]*((?:\d[\s.-]?){11})\s*$/.exec(line);
      if (match) return { name: match[1].replace(/[;,\t|]+$/, "").trim(), cpf: match[2].replace(/\D/g, "") };
      const parts = line.split(/[;\t|]/).map((p) => p.trim());
      return { name: parts[0] ?? "", cpf: (parts[1] ?? "").replace(/\D/g, "") };
    });
}
