import { formatCPF } from "./cpf-mask";
import { formatCNPJ } from "./cpnj-mask";

/**
 * Documento de cliente: CPF (11 dígitos, pessoa física) ou CNPJ (14, empresa).
 * O campo no banco continua se chamando `cnpj`.
 */
export const onlyDigits = (value?: string | null) => (value ?? "").replace(/\D/g, "");

export const isCpf = (value?: string | null) => onlyDigits(value).length === 11;

export const docLabel = (value?: string | null) => (isCpf(value) ? "CPF" : "CNPJ");

export const formatDocumento = (value?: string | null) => {
  const digits = onlyDigits(value);
  if (!digits) return "";
  return digits.length === 11 ? formatCPF(digits) : formatCNPJ(digits);
};

export function isValidCPF(value: string): boolean {
  const d = onlyDigits(value);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const calc = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(d[i]) * (len + 1 - i);
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };
  return calc(9) === Number(d[9]) && calc(10) === Number(d[10]);
}

export function isValidCNPJ(value: string): boolean {
  const d = onlyDigits(value);
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const calc = (len: number) => {
    const weights = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = weights.reduce((acc, w, i) => acc + Number(d[i]) * w, 0);
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };
  return calc(12) === Number(d[12]) && calc(13) === Number(d[13]);
}

/** Dados públicos de um CNPJ (BrasilAPI, gratuita e sem chave). */
export interface CnpjInfo {
  razaoSocial: string;
  nomeFantasia: string;
  email: string;
  telefone: string;
  cep: string;
  rua: string;
  numero: string;
  complemento: string;
  bairro: string;
  uf: string;
  municipio: string;
  situacao: string;
}

export async function buscarCnpj(cnpj: string, signal?: AbortSignal): Promise<CnpjInfo | null> {
  const digits = onlyDigits(cnpj);
  const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`, { signal });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`BrasilAPI ${res.status}`);
  const j = await res.json();
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : v == null ? "" : String(v));
  const rua = [str(j.descricao_tipo_de_logradouro), str(j.logradouro)].filter(Boolean).join(" ");
  return {
    razaoSocial: str(j.razao_social),
    nomeFantasia: str(j.nome_fantasia),
    email: str(j.email).toLowerCase(),
    telefone: onlyDigits(str(j.ddd_telefone_1)),
    cep: onlyDigits(str(j.cep)),
    rua,
    numero: onlyDigits(str(j.numero)),
    complemento: str(j.complemento),
    bairro: str(j.bairro),
    uf: str(j.uf).toUpperCase(),
    municipio: str(j.municipio),
    situacao: str(j.descricao_situacao_cadastral),
  };
}

/** Compara nomes de cidade sem acento e sem caixa ("SAO PAULO" = "São Paulo"). */
export const sameName = (a: string, b: string) => {
  const n = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  return n(a) === n(b);
};
