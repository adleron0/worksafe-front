import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";
import Select from "@/components/general-components/Select";
import TagBadge from "@/components/general-components/TagBadge";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Empresas do grupo: os CNPJs da WorkSafe (Treinamentos, Serviços...) num sistema só.
 * Cada registro diz de qual CNPJ é. Com um CNPJ só, nada disto aparece na tela.
 */
export type EntityKind = "treinamento" | "servico" | "locacao";

export interface CompanyEntity {
  id: number;
  cnpj: string;
  corporateName: string;
  tradeName: string;
  kinds: EntityKind[];
  isDefault: boolean;
  color: string | null;
  logoUrl: string | null;
  stateId: number | null;
  cityId: number | null;
  cityName: string | null;
  uf: string | null;
  zipCode: string | null;
  address: string | null;
  addressNumber: string | null;
  addressComplement: string | null;
  neighborhood: string | null;
  email: string | null;
  phone: string | null;
  municipalRegistration: string | null;
  stateRegistration: string | null;
  brand: Record<string, unknown> | null;
  active: boolean;
  inactiveAt: string | null;
}

export const ENTITY_KINDS: Array<{ id: EntityKind; name: string }> = [
  { id: "treinamento", name: "Treinamentos" },
  { id: "servico", name: "Serviços" },
  { id: "locacao", name: "Locação" },
];

export const ENTITIES_KEY = "companyEntities";

export const formatCnpj = (value?: string | null) => {
  const d = String(value ?? "").replace(/\D/g, "");
  return d.length === 14 ? d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5") : value ?? "";
};

/** CNPJs ativos do grupo. `multi` diz se a tela precisa mostrar o campo "Empresa". */
export function useEntities(all = false) {
  const query = useQuery({
    queryKey: [ENTITIES_KEY, all],
    queryFn: async () => (await api.get<CompanyEntity[]>("company-entities", { params: all ? { all: 1 } : {} })).data,
    staleTime: 5 * 60_000,
  });
  const entities = query.data ?? [];
  const active = entities.filter((e) => e.active);
  const byId = new Map(entities.map((e) => [e.id, e]));
  /** o CNPJ que o sistema usaria para uma frente (o mesmo critério da API) */
  const defaultFor = (kind?: EntityKind | null) => (kind ? active.find((e) => e.kinds.includes(kind)) : undefined) ?? active.find((e) => e.isDefault) ?? active[0];
  return { ...query, entities: active, all: entities, byId, multi: active.length > 1, defaultFor };
}

/**
 * Campo "Empresa" (CNPJ do grupo). Some quando o grupo tem um CNPJ só. Sem
 * escolha, mostra qual CNPJ o sistema vai usar (o da frente ou o padrão).
 */
export function EntitySelect({ value, onChange, kind, label = "Empresa (CNPJ)", hint, disabled, className, clearable = false, name = "entityId", emptyLabel }: {
  value: number | string | null | undefined;
  onChange: (id: number | null) => void;
  /** frente do registro: decide o CNPJ sugerido */
  kind?: EntityKind | null;
  label?: string | null;
  hint?: string;
  disabled?: boolean;
  className?: string;
  /** permite voltar para "automático" (o da origem ou o da frente) */
  clearable?: boolean;
  name?: string;
  /** texto quando nada foi escolhido (padrão: o CNPJ automático) */
  emptyLabel?: string;
}) {
  const { entities, multi, defaultFor, isLoading } = useEntities();
  if (!multi) return null;
  const suggested = defaultFor(kind);
  const options = entities.map((e) => ({ id: String(e.id), name: `${e.tradeName} · ${formatCnpj(e.cnpj)}` }));
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && <Label>{label}</Label>}
      <Select name={name} options={options} state={value ? String(value) : ""} isLoading={isLoading} disabled={disabled} clearable={clearable}
        placeholder={emptyLabel ?? (suggested ? `${suggested.tradeName} (automático)` : "Escolha o CNPJ")}
        onChange={(_, v) => { const id = Number(Array.isArray(v) ? v[0] : v); onChange(id > 0 ? id : null); }} />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Filtro "Empresa" das listas e relatórios ("Todas" = o grupo todo). Some com um CNPJ só. */
export function EntityFilter({ value, onChange, className }: { value: number | null; onChange: (id: number | null) => void; className?: string }) {
  const { entities, multi } = useEntities();
  if (!multi) return null;
  const options = [{ id: "0", name: "Todas as empresas" }, ...entities.map((e) => ({ id: String(e.id), name: e.tradeName }))];
  return (
    <div className={cn("min-w-44", className)}>
      <Select name="entityFilter" options={options} state={String(value ?? 0)} placeholder="Todas as empresas"
        onChange={(_, v) => { const id = Number(Array.isArray(v) ? v[0] : v); onChange(id > 0 ? id : null); }} />
    </div>
  );
}

/** Etiqueta com o nome curto do CNPJ (nas linhas das listas). Some com um CNPJ só. */
export function EntityBadge({ id, entity, className }: { id?: number | null; entity?: { tradeName: string; color?: string | null } | null; className?: string }) {
  const { byId, multi } = useEntities();
  if (!multi) return null;
  const e = entity ?? (id ? byId.get(id) : undefined);
  if (!e) return null;
  return <TagBadge icon="building-2" color={e.color ?? undefined} className={className}>{e.tradeName}</TagBadge>;
}
