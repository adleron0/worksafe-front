/**
 * Tela de permissões em cards (perfil ou usuário).
 *
 * Inspirada na tela de perfis do Boon: em vez de um painel lateral com tudo
 * recolhido e cada clique já gravando, uma página com um card por recurso,
 * busca, contador e uma barra que junta as mudanças até a pessoa salvar.
 *
 *  - O card é o RECURSO (Ordens de serviço, Turmas…) e os itens são as ações.
 *    Os grupos do cadastro (`Permission.group`) viram seções.
 *  - Quem não é super só concede o que ele mesmo tem: o item aparece com
 *    cadeado (a API recusa do mesmo jeito).
 *  - No usuário, o que vem do perfil aparece marcado e travado: é herdado, não
 *    se tira por aqui.
 */
import { useMemo, useRef, useState } from "react";
import { Link, useBlocker } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckIcon, Lock, MinusIcon, Search, ShieldCheck } from "lucide-react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import api from "@/services/api";
import { listPermissions } from "@/services/specific/permissionsService";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import TagBadge from "@/components/general-components/TagBadge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import { Tip } from "../../comercial/-shared/commercial";

export interface Permission { id: number; name: string; description: string; group?: string | null }
interface Action { perm: Permission; label: string; long: boolean }
interface Resource { key: string; title: string; actions: Action[] }
interface Group { key: string; title: string; resources: Resource[] }

const GROUP_LABELS: Record<string, string> = {
  almox: "Almoxarifado", arquivos: "Arquivos", blog: "Blog", bots: "Bots e IA", clientes: "Clientes", comercial: "Comercial",
  empresa: "Empresa", financeiro: "Financeiro", integracoes: "Integrações", inventarios: "Inventários", perfil: "Perfis de acesso",
  produtos: "Produtos", rh: "RH", servicos: "Serviços", site: "Site", suprimentos: "Suprimentos", treinamentos: "Treinamentos", user: "Usuários",
};
const GROUP_ORDER = ["user", "perfil", "comercial", "clientes", "servicos", "suprimentos", "financeiro", "rh", "treinamentos", "site", "blog", "arquivos", "produtos", "almox", "inventarios", "empresa", "integracoes", "bots"];

const RESOURCE_LABELS: Record<string, string> = {
  treinamentos_orcamentos: "Orçamentos de treinamento", servicos_orcamentos: "Orçamentos de serviço", produtos_orcamentos: "Orçamentos de produtos",
  area_inventarios: "Áreas", subarea_inventarios: "Subáreas", servicos_site: "Serviços do site", loja_site: "Loja do site", site: "Páginas do site",
  ordens_de_servico: "Ordens de serviço", pedidos_de_compra: "Pedidos de compra", itens_estoque: "Itens do estoque", entregas_epi: "Entregas de EPI",
  estoque: "Estoque", base_calculo: "Base de cálculo", acompanhamento: "Acompanhamento", rdo: "RDO", company: "Dados da empresa", profile: "Perfis",
  user: "Usuários", cupoms: "Cupons", classes: "Turmas", divulgacao: "Divulgação", funcionarios: "Funcionários", locais: "Locais", alocacao: "Mapa de alocação",
  documentos_funcionarios: "Documentos dos funcionários", ocorrencias_funcionarios: "Histórico dos funcionários", inspecoes_equipamentos: "Inspeções",
  notas_fiscais: "Notas fiscais", equipamentos: "Equipamentos", locacoes: "Locações", compras: "Compras", financeiro: "Financeiro", bots: "Bots", comercial: "Propostas e vendas", servicos: "Serviços", arquivos: "Arquivos", fornecedores_suprimentos: "Fornecedores",
};

const VERB_ORDER = ["view", "list", "all", "create", "update", "approve", "manage", "inactive", "activate"];
const VERB_LABELS: Record<string, string> = { view: "Ver no menu", list: "Listar", create: "Criar", update: "Editar", inactive: "Inativar", activate: "Reativar" };

const EMPTY: number[] = [];

export interface Assigned { id: number; name: string; profileName?: string | null; granted: number[]; inherited: number[] }
/** Nome do alvo e o que ele já tem (no usuário, também o que vem do perfil). */
export function useAssigned(mode: "profile" | "user", id: string) {
  return useQuery<Assigned>({
    queryKey: ["permissionsOf", mode, id],
    queryFn: async () => (await api.get<Assigned>(`/permissions/${mode}/${id}`)).data,
  });
}

const split = (name: string) => {
  const i = name.indexOf("_");
  return i < 0 ? { verb: name, suffix: name } : { verb: name.slice(0, i), suffix: name.slice(i + 1) };
};
const capitalize = (text: string) => text.replace(/^./, (c) => c.toUpperCase());
const humanize = (key: string) => capitalize(key.replace(/_/g, " "));
const normalize = (value: string) => value.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/\p{Diacritic}/gu, "");

/**
 * Monta seções → cards → ações a partir dos nomes (`verbo_recurso`).
 * Um recurso com uma permissão só (ex.: `view_dados_pessoais_funcionarios`)
 * entra no card do recurso maior que termina igual (`funcionarios`). Sobrando
 * três ou mais avulsas num grupo, elas viram um card "Outras permissões".
 */
export function buildGroups(perms: Permission[]): Group[] {
  const byGroup = new Map<string, Permission[]>();
  for (const perm of perms) {
    const group = perm.group || "outros";
    byGroup.set(group, [...(byGroup.get(group) ?? []), perm]);
  }
  const groups: Group[] = [];
  for (const [groupKey, list] of byGroup) {
    const bySuffix = new Map<string, Permission[]>();
    for (const perm of list) {
      const { suffix } = split(perm.name);
      bySuffix.set(suffix, [...(bySuffix.get(suffix) ?? []), perm]);
    }
    const standalone = [...bySuffix.keys()].filter((key) => (bySuffix.get(key)?.length ?? 0) > 1);
    const buckets = new Map<string, Permission[]>();
    const loose: Permission[] = [];
    for (const [suffix, items] of bySuffix) {
      if (items.length > 1) { buckets.set(suffix, [...(buckets.get(suffix) ?? []), ...items]); continue; }
      const parent = standalone.filter((key) => suffix.endsWith(`_${key}`) || suffix.startsWith(`${key}_`)).sort((a, b) => b.length - a.length)[0];
      if (parent) buckets.set(parent, [...(buckets.get(parent) ?? []), ...items]);
      else loose.push(...items);
    }
    if (loose.length >= 3) buckets.set("__outras", loose);
    else for (const perm of loose) buckets.set(split(perm.name).suffix, [perm]);

    const resources: Resource[] = [...buckets.entries()].map(([key, items]) => {
      const titleFromDesc = items.find((p) => p.name === `view_${key}` || p.name === `list_${key}`)?.description.replace(/^(Ver|Listar)\s+/i, "");
      const title = key === "__outras" ? "Outras permissões" : RESOURCE_LABELS[key] ?? (items.length === 1 ? items[0].description : titleFromDesc ? capitalize(titleFromDesc) : humanize(key));
      const actions = items
        .map((perm) => {
          const { verb, suffix } = split(perm.name);
          const short = suffix === key && VERB_LABELS[verb] && items.length > 1;
          return { perm, label: short ? VERB_LABELS[verb] : perm.description, long: !short, rank: suffix === key ? VERB_ORDER.indexOf(verb) : 50 };
        })
        .sort((a, b) => (a.rank < 0 ? 40 : a.rank) - (b.rank < 0 ? 40 : b.rank) || a.perm.name.localeCompare(b.perm.name))
        .map(({ perm, label, long }) => ({ perm, label, long }));
      return { key, title, actions };
    });
    resources.sort((a, b) => (a.key === "__outras" ? 1 : 0) - (b.key === "__outras" ? 1 : 0) || b.actions.length - a.actions.length || a.title.localeCompare(b.title, "pt-BR"));
    groups.push({ key: groupKey, title: GROUP_LABELS[groupKey] ?? humanize(groupKey), resources });
  }
  const order = (key: string) => (GROUP_ORDER.indexOf(key) < 0 ? 99 : GROUP_ORDER.indexOf(key));
  return groups.sort((a, b) => order(a.key) - order(b.key) || a.title.localeCompare(b.title, "pt-BR"));
}

/** Caixa de marcar com o estado "parcial" (traço), que a do sistema não desenha. */
function Box({ checked, disabled, onChange, label }: { checked: boolean | "indeterminate"; disabled?: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <CheckboxPrimitive.Root
      checked={checked}
      disabled={disabled}
      aria-label={label}
      onCheckedChange={(value) => onChange(value === true)}
      className="peer size-4 shrink-0 rounded-[4px] border border-input shadow-xs outline-none transition-shadow focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground dark:bg-input/30"
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center">
        {checked === "indeterminate" ? <MinusIcon className="size-3.5" /> : <CheckIcon className="size-3.5" />}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

interface Props {
  mode: "profile" | "user";
  targetId: number;
  title: string;
  subtitle?: string;
  backTo: string;
  backLabel: string;
  /** Permissões já concedidas ao alvo (perfil, ou extras do usuário). */
  granted?: number[];
  /** Só no usuário: as que vêm do perfil dele (marcadas e travadas). */
  inherited?: number[];
  loading?: boolean;
  invalidate: string[];
}

export function PermissionMatrix({ mode, targetId, title, subtitle, backTo, backLabel, granted = EMPTY, inherited = EMPTY, loading, invalidate }: Props) {
  const { can, is } = useVerify();
  const queryClient = useQueryClient();
  const canEdit = can("update_profile");
  const isSuper = is("super");
  const { data: catalog, isLoading: loadingCatalog, error } = useQuery<Permission[]>({ queryKey: ["listPermissions"], queryFn: listPermissions });

  const initial = useMemo(() => new Set(granted), [granted]);
  const inheritedSet = useMemo(() => new Set(inherited), [inherited]);
  const [selected, setSelected] = useState<Set<number> | null>(null);
  const current = selected ?? initial;
  const [filter, setFilter] = useState("");
  const [area, setArea] = useState<string | null>(null);
  const [confirmSave, setConfirmSave] = useState(false);

  const groups = useMemo(() => buildGroups(catalog ?? []), [catalog]);
  const adds = [...current].filter((id) => !initial.has(id));
  const removes = [...initial].filter((id) => !current.has(id));
  const dirty = adds.length + removes.length > 0;

  const assignable = (perm: Permission) => canEdit && (isSuper || can(perm.name)) && !inheritedSet.has(perm.id);
  const isOn = (id: number) => current.has(id) || inheritedSet.has(id);
  const toggle = (ids: number[], on: boolean) => {
    const next = new Set(current);
    for (const id of ids) { if (on) next.add(id); else next.delete(id); }
    setSelected(next);
  };

  const visible = useMemo(() => {
    const term = normalize(filter.trim());
    const inArea = area ? groups.filter((group) => group.key === area) : groups;
    if (!term) return inArea;
    return inArea
      .map((group) => ({
        ...group,
        resources: group.resources.filter((resource) =>
          normalize(group.title).includes(term) || normalize(resource.title).includes(term) ||
          resource.actions.some((action) => normalize(action.label).includes(term) || normalize(action.perm.description).includes(term))),
      }))
      .filter((group) => group.resources.length > 0);
  }, [groups, filter, area]);
  const countIn = (group: Group) => {
    const ids = group.resources.flatMap((resource) => resource.actions.map((action) => action.perm.id));
    return { on: ids.filter(isOn).length, total: ids.length };
  };

  const total = catalog?.length ?? 0;
  const effective = (catalog ?? []).filter((perm) => isOn(perm.id)).length;

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: () => api.put(`/permissions/${mode}/${targetId}`, { grant: adds, revoke: removes }),
    onSuccess: () => {
      toast({ title: "Permissões salvas", description: [adds.length && `${adds.length} concedida(s)`, removes.length && `${removes.length} retirada(s)`].filter(Boolean).join(" · "), variant: "success" });
      setSelected(null);
      for (const key of invalidate) queryClient.invalidateQueries({ queryKey: [key] });
    },
    onError: (err: any) => toast({ title: "Nada foi salvo", description: err?.response?.data?.message ?? "Erro ao salvar as permissões.", variant: "destructive" }),
  });
  const askSave = () => (removes.length ? setConfirmSave(true) : save());

  // Sair com mudança não salva pede confirmação (no diálogo do sistema, não no do navegador).
  // Recarregar ou fechar a aba só pergunta se houver mudança: sem isto o roteador pergunta sempre.
  const blocker = useBlocker({ shouldBlockFn: () => dirty && !saving, enableBeforeUnload: () => dirty && !saving, withResolver: true });
  const leaving = useRef(false);

  return (
    <>
      <div className="min-w-0">
        <Link to={backTo} className="text-xs text-muted-foreground hover:underline inline-flex items-center gap-1"><Icon name="arrow-left" className="w-3 h-3" /> {backLabel}</Link>
        <h1 className="text-xl font-bold mt-1">{title}</h1>
        <p className="text-sm text-muted-foreground">{subtitle ?? "Marque o que pode ser feito em cada área. As mudanças só valem depois de salvar."}</p>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={filter} onChange={(e) => setFilter(e.target.value)} className="pl-9" placeholder="Buscar área, recurso ou ação…" aria-label="Buscar permissões" maxLength={120} />
        </div>
        <p className="text-sm tabular-nums text-muted-foreground">{effective} de {total} concedidas</p>
      </div>

      {groups.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-1.5" role="tablist" aria-label="Áreas">
          {[{ key: null as string | null, title: "Todas", count: { on: effective, total } }, ...groups.map((group) => ({ key: group.key as string | null, title: group.title, count: countIn(group) }))].map((chip) => (
            <button
              key={chip.key ?? "todas"}
              type="button"
              role="tab"
              aria-selected={area === chip.key}
              onClick={() => setArea(chip.key)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded border px-2 py-1 text-xs transition-colors",
                area === chip.key ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted",
              )}
            >
              {chip.title}
              <span className={cn("tabular-nums", area === chip.key ? "opacity-80" : chip.count.on ? "font-semibold text-primary" : "text-muted-foreground")}>{chip.count.on}/{chip.count.total}</span>
            </button>
          ))}
        </div>
      )}

      {!canEdit && <p className="mt-3 rounded-md border px-3 py-2 text-sm text-muted-foreground">Você pode ver, mas não alterar, as permissões.</p>}
      {canEdit && !isSuper && (
        <p className="mt-3 flex items-start gap-2 rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span>Itens com cadeado estão fora do seu acesso: só quem tem a permissão pode concedê-la ou retirá-la.</span>
        </p>
      )}
      {mode === "user" && inherited.length > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">Marcadas com <TagBadge>perfil</TagBadge> vêm do perfil do usuário; para tirá-las, mude o perfil. Aqui você dá permissões a mais só para esta pessoa.</p>
      )}

      {error && <p className="mt-4 text-sm text-destructive">Erro ao carregar as permissões.</p>}

      <div className="mt-4 space-y-6 pb-24">
        {loading || loadingCatalog ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-44 rounded-md" />)}</div>
        ) : visible.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{groups.length ? "Nenhuma permissão para essa busca." : "Nenhuma permissão cadastrada."}</p>
        ) : visible.map((group) => (
          <section key={group.key} className="min-w-0 space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group.title}</h2>
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {group.resources.map((resource) => {
                const ids = resource.actions.map((a) => a.perm.id);
                const editable = resource.actions.filter((a) => assignable(a.perm)).map((a) => a.perm.id);
                const on = ids.filter(isOn).length;
                const editableOn = editable.filter((id) => current.has(id)).length;
                const state: boolean | "indeterminate" = on === 0 ? false : on === ids.length ? true : "indeterminate";
                return (
                  <li key={resource.key} className="flex min-w-0 flex-col rounded-md border bg-background">
                    <div className="flex items-center justify-between gap-3 border-b px-3 py-2.5">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="inline-flex size-7 shrink-0 items-center justify-center rounded bg-muted text-xs font-semibold text-muted-foreground" aria-hidden>{resource.title.charAt(0).toUpperCase()}</span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold">{resource.title}</span>
                          <span className={cn("text-[11px] tabular-nums", on > 0 ? "font-semibold text-primary" : "text-muted-foreground")}>{on}/{ids.length}</span>
                        </span>
                      </div>
                      <Box
                        checked={state}
                        disabled={!editable.length || saving}
                        label={`Marcar todas as ações de ${resource.title}`}
                        onChange={() => toggle(editable, editableOn < editable.length)}
                      />
                    </div>
                    <div className="flex flex-col px-3 py-1.5">
                      {resource.actions.map(({ perm, label, long }) => {
                        const fromProfile = inheritedSet.has(perm.id);
                        const locked = !fromProfile && canEdit && !isSuper && !can(perm.name);
                        const row = (
                          <label className={cn("flex min-w-0 items-start gap-2 py-1.5 text-[13px]", assignable(perm) ? "cursor-pointer" : "cursor-default", perm.name.startsWith("view_") && !long && "font-medium")}>
                            <span className="pt-0.5"><Box checked={isOn(perm.id)} disabled={!assignable(perm) || saving} label={perm.description} onChange={(value) => toggle([perm.id], value)} /></span>
                            <span className={cn("min-w-0 flex-1 break-words leading-snug", long && "text-[12.5px]")}>{label}</span>
                            {fromProfile && <TagBadge className="shrink-0">perfil</TagBadge>}
                            {locked && <Lock className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-label="Fora do seu acesso" />}
                          </label>
                        );
                        return <div key={perm.id}>{!long ? <Tip text={perm.description}>{row}</Tip> : row}</div>;
                      })}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      {dirty && canEdit && (
        <div className="sticky bottom-0 z-20 -mx-4 mt-4 border-t bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm">
              {adds.length > 0 && <span className="font-semibold text-green-700 dark:text-green-400">+{adds.length} {adds.length === 1 ? "concessão" : "concessões"}</span>}
              {adds.length > 0 && removes.length > 0 && <span className="text-muted-foreground"> · </span>}
              {removes.length > 0 && <span className="font-semibold text-destructive">−{removes.length} {removes.length === 1 ? "remoção" : "remoções"}</span>}
              <span className="ml-1 text-muted-foreground">a salvar</span>
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" disabled={saving} onClick={() => setSelected(null)}>Descartar</Button>
              <Button type="button" size="sm" disabled={saving} onClick={askSave}>
                <ShieldCheck className="mr-1.5 size-4" aria-hidden /> {saving ? "Salvando…" : "Salvar permissões"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmSave}
        onOpenChange={setConfirmSave}
        title="Retirar acesso?"
        description={`${removes.length} permissão(ões) serão retiradas${adds.length ? ` e ${adds.length} concedidas` : ""}. Quem está com o sistema aberto perde o acesso na hora.`}
        onConfirm={() => { setConfirmSave(false); save(); }}
      />
      <ConfirmDialog
        open={blocker.status === "blocked"}
        onOpenChange={(open) => { if (!open && !leaving.current && blocker.status === "blocked") blocker.reset(); leaving.current = false; }}
        title="Sair sem salvar as permissões?"
        description="Você marcou ou desmarcou permissões que ainda não foram salvas. Se sair agora, elas são descartadas."
        onConfirm={() => { if (blocker.status === "blocked") { leaving.current = true; blocker.proceed(); } }}
      />
    </>
  );
}
