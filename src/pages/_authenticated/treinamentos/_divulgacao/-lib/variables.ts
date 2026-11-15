import type { ClassSituation, MarketingClass, MarketingOverrides, MarketingSettings } from "./types";

/**
 * Variáveis da divulgação, montadas a partir da turma, do curso e das
 * configurações. Usadas na legenda (`{{chave}}`) e na arte.
 */
export const VARIABLES: { key: string; label: string; example: string }[] = [
  { key: "curso", label: "Nome do curso", example: "Acesso por Corda" },
  { key: "curso_maiusculo", label: "Curso em caixa alta", example: "ACESSO POR CORDA" },
  { key: "turma", label: "Nome da turma", example: "Acesso por Corda - Dezembro" },
  { key: "niveis", label: "Níveis", example: "N1, N2 e N3" },
  { key: "niveis_frase", label: "Frase dos níveis", example: "Níveis N1, N2 e N3." },
  { key: "datas", label: "Datas por extenso", example: "23 a 28 de novembro" },
  { key: "periodo", label: "Período curto", example: "23 a 28" },
  { key: "mes", label: "Mês", example: "novembro" },
  { key: "data_inicio", label: "Data de início", example: "23/11" },
  { key: "data_fim", label: "Data de término", example: "28/11" },
  { key: "horario", label: "Horário", example: "Das 08h às 17h" },
  { key: "carga_horaria", label: "Carga horária", example: "40h" },
  { key: "local", label: "Local", example: "Centro de Treinamentos da WorkSafe Brasil, Cabo de Santo Agostinho - PE" },
  { key: "cidade_uf", label: "Cidade - UF", example: "Cabo de Santo Agostinho - PE" },
  { key: "preco", label: "Preço (com desconto, se houver)", example: "R$ 990,00" },
  { key: "preco_de", label: "Preço sem desconto", example: "R$ 1.200,00" },
  { key: "parcelas", label: "Parcelamento", example: "10x de R$ 99,00" },
  { key: "precos_niveis", label: "Preços por nível (lista)", example: "N1 – R$ 2.500,00" },
  { key: "vagas_restantes", label: "Vagas restantes", example: "3" },
  { key: "vagas_frase", label: "Frase das vagas restantes", example: "Restam só 3 vagas." },
  { key: "incluso", label: "Incluso (em linha)", example: "Alojamento, Camisa, Apostila e Certificado" },
  { key: "incluso_lista", label: "Incluso (lista com ✅)", example: "✅ Alojamento" },
  { key: "whatsapp", label: "WhatsApp", example: "(81) 98947-9259" },
  { key: "email", label: "E-mail", example: "treinamentos@worksafebrasil.com.br" },
  { key: "site", label: "Site", example: "www.worksafebrasil.com.br" },
  { key: "link_inscricao", label: "Link de inscrição", example: "https://worksafebrasil.com.br/turma/12" },
  { key: "hashtags", label: "Hashtags", example: "#worksafe #trabalhoemaltura" },
  { key: "empresa", label: "Empresa", example: "WorkSafe Brasil" },
];

const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/** Data do banco → {d, m, y} sem passar por fuso (a turma guarda o dia). */
function parseDay(value?: string | null) {
  if (!value) return null;
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]) - 1, d: Number(m[3]) };
}
const pad = (n: number) => String(n).padStart(2, "0");

export interface DateParts {
  /** "23 a 28 de novembro" */
  extenso: string;
  /** número grande da arte: "23 a 28" | "28/11 a 02/12" | "18" */
  grande: string;
  /** linha de baixo da arte: "NOVEMBRO" | "DE DEZEMBRO" | "" */
  pequeno: string;
  mes: string;
  inicio: string;
  fim: string;
}

export function dateParts(initial?: string | null, final?: string | null): DateParts | null {
  const a = parseDay(initial);
  if (!a) return null;
  const b = parseDay(final) ?? a;
  const thisYear = new Date().getFullYear();
  const year = (y: number) => (y !== thisYear ? ` de ${y}` : "");
  const inicio = `${pad(a.d)}/${pad(a.m + 1)}`;
  const fim = `${pad(b.d)}/${pad(b.m + 1)}`;
  const same = a.y === b.y && a.m === b.m && a.d === b.d;
  if (same) {
    return { extenso: `${a.d} de ${MONTHS[a.m]}${year(a.y)}`, grande: pad(a.d), pequeno: `DE ${MONTHS[a.m].toUpperCase()}`, mes: MONTHS[a.m], inicio, fim };
  }
  if (a.y === b.y && a.m === b.m) {
    const conj = b.d - a.d === 1 ? "e" : "a";
    return { extenso: `${a.d} ${conj} ${b.d} de ${MONTHS[a.m]}${year(a.y)}`, grande: `${pad(a.d)} ${conj} ${pad(b.d)}`, pequeno: MONTHS[a.m].toUpperCase(), mes: MONTHS[a.m], inicio, fim };
  }
  const extenso = a.y === b.y
    ? `${a.d} de ${MONTHS[a.m]} a ${b.d} de ${MONTHS[b.m]}${year(b.y)}`
    : `${a.d} de ${MONTHS[a.m]} de ${a.y} a ${b.d} de ${MONTHS[b.m]} de ${b.y}`;
  return { extenso, grande: `${inicio} a ${fim}`, pequeno: `${MONTHS[a.m].slice(0, 3).toUpperCase()} / ${MONTHS[b.m].slice(0, 3).toUpperCase()}`, mes: MONTHS[a.m], inicio, fim };
}

const toNumber = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

export const money = (v: number, cents = true) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 });

/** "R$ 990" quando não tem centavos, "R$ 1.234,50" quando tem (para a arte). */
export const moneyShort = (v: number) => money(v, !Number.isInteger(v));

/** Junta itens como "A, B e C". */
export const joinPt = (items: string[]) =>
  items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} e ${items[items.length - 1]}`;

export const splitLines = (text?: string | null) =>
  String(text ?? "").split(/\r?\n|;/).map((s) => s.replace(/^[-•✅✔*\s]+/, "").trim()).filter(Boolean);

/** Preços por nível escritos como "N1 = 2500" ou "N1 - R$ 2.500,00", um por linha. */
export function parseLevelPrices(text: string): { level: string; value: number | null; raw: string }[] {
  return splitLines(text).map((line) => {
    const m = line.match(/^(.+?)\s*[:=–-]\s*(?:R\$\s*)?([\d.,]+)\s*$/);
    if (!m) return { level: line, value: null, raw: line };
    const value = Number(m[2].replace(/\./g, "").replace(",", "."));
    return { level: m[1].trim(), value: Number.isFinite(value) ? value : null, raw: line };
  });
}

export function remainingSeats(turma: MarketingClass): number | null {
  if (turma.unlimitedSubscriptions) return null;
  const max = toNumber(turma.maxSubscriptions);
  if (!max) return null;
  return Math.max(0, max - Number(turma._count?.subscriptions ?? 0));
}

export function situationOf(turma: MarketingClass, settings: MarketingSettings): ClassSituation {
  const remaining = remainingSeats(turma);
  if (remaining !== null && remaining <= 0) return "lotada";
  if (remaining !== null && remaining <= (settings.ultimasVagasLimite ?? 5)) return "ultimas_vagas";
  if (toNumber(turma.discountPrice) && toNumber(turma.price) && Number(turma.discountPrice) < Number(turma.price)) return "promocao";
  return "vagas_abertas";
}

/** Ajustes iniciais (editáveis no diálogo) a partir da turma e das configurações. */
export function defaultOverrides(turma: MarketingClass, settings: MarketingSettings): MarketingOverrides {
  const address = [turma.address && `${turma.address}${turma.addressNumber ? `, ${turma.addressNumber}` : ""}`, turma.neighborhood]
    .filter(Boolean).join(" - ");
  const cityUf = [turma.city, turma.state].filter(Boolean).join(" - ");
  const local = address
    ? [address, cityUf].filter(Boolean).join(", ")
    : [settings.localPadrao, cityUf].filter(Boolean).join(", ");
  const gifts = splitLines(turma.gifts);
  return {
    titulo: (turma.course?.name || turma.name || "").toUpperCase(),
    niveis: "",
    horario: settings.horarioPadrao ?? "",
    local,
    incluso: (gifts.length ? gifts : settings.inclusoPadrao ?? []).join("\n"),
    precosNiveis: "",
    ocultarPreco: false,
  };
}

/** "81989479259" → "(81) 98947-9259"; o que não for número de telefone fica como está. */
export function formatPhone(value?: string | null): string {
  const raw = String(value ?? "").trim();
  const d = raw.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return raw;
}

const siteLabel = (url?: string) => String(url ?? "").replace(/^https?:\/\//, "").replace(/\/$/, "");

export function enrollmentLink(turma: MarketingClass, settings: MarketingSettings, siteDomain?: string | null) {
  const base = (settings.site || (siteDomain ? `https://${siteDomain}` : "")).replace(/\/$/, "");
  switch (settings.linkInscricao) {
    case "personalizado": return settings.linkPersonalizado || base;
    case "site": return base;
    case "pagina_curso": return turma.course?.slug && base ? `${base}/cursos/${turma.course.slug}` : base;
    default: return base ? `${base}/turma/${turma.id}` : "";
  }
}

export interface ClassVariables {
  values: Record<string, string>;
  dates: DateParts | null;
  price: number | null;
  priceFrom: number | null;
  levels: { level: string; value: number | null; raw: string }[];
  incluso: string[];
  remaining: number | null;
  situation: ClassSituation;
}

export function buildVariables(
  turma: MarketingClass,
  settings: MarketingSettings,
  overrides: MarketingOverrides,
  companyName: string,
  siteDomain?: string | null,
): ClassVariables {
  const dates = dateParts(turma.initialDate, turma.finalDate);
  const full = toNumber(turma.price);
  const discount = toNumber(turma.discountPrice);
  const hasDiscount = !!(full && discount && discount < full);
  const price = overrides.ocultarPreco ? null : hasDiscount ? discount : full;
  const priceFrom = overrides.ocultarPreco || !hasDiscount ? null : full;
  const levels = overrides.ocultarPreco ? [] : parseLevelPrices(overrides.precosNiveis);
  const incluso = splitLines(overrides.incluso);
  const remaining = remainingSeats(turma);
  const hours = toNumber(turma.hoursDuration) ?? toNumber(turma.course?.hoursDuration);
  const cityUf = [turma.city, turma.state].filter(Boolean).join(" - ");
  const course = turma.course?.name || turma.name || "";
  const installments = toNumber(turma.dividedIn);
  const hashtags = (turma.courseId && settings.hashtagsPorCurso?.[String(turma.courseId)]) || settings.hashtagsPadrao || "";

  const values: Record<string, string> = {
    curso: course,
    curso_maiusculo: course.toUpperCase(),
    turma: turma.name ?? "",
    niveis: overrides.niveis,
    niveis_frase: overrides.niveis ? `Níveis ${overrides.niveis}.` : "",
    datas: dates?.extenso ?? "",
    periodo: dates?.grande ?? "",
    mes: dates?.mes ?? "",
    data_inicio: dates?.inicio ?? "",
    data_fim: dates?.fim ?? "",
    horario: overrides.horario,
    carga_horaria: hours ? `${hours}h` : "",
    local: overrides.local,
    cidade_uf: cityUf,
    preco: price ? money(price) : "",
    preco_de: priceFrom ? money(priceFrom) : "",
    parcelas: price && installments && installments > 1 ? `${installments}x de ${money(price / installments)}` : "",
    precos_niveis: levels.map((l) => (l.value ? `${l.level} – ${money(l.value)}` : l.raw)).join("\n"),
    vagas_restantes: remaining !== null && remaining > 0 ? String(remaining) : "",
    vagas_frase: remaining !== null && remaining > 0 ? (remaining === 1 ? "Resta só 1 vaga." : `Restam só ${remaining} vagas.`) : "",
    incluso: joinPt(incluso),
    incluso_lista: incluso.map((i) => `✅ ${i}`).join("\n"),
    whatsapp: formatPhone(settings.whatsapp),
    email: settings.email ?? "",
    site: siteLabel(settings.site),
    link_inscricao: enrollmentLink(turma, settings, siteDomain),
    hashtags,
    empresa: companyName,
  };

  return { values, dates, price, priceFrom, levels, incluso, remaining, situation: situationOf(turma, settings) };
}
