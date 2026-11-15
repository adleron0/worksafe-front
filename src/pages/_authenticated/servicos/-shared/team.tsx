import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input as ShadInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import CalendarPicker from "@/components/general-components/Calendar";
import Icon from "@/components/general-components/Icon";
import Input from "@/components/general-components/Input";
import Select from "@/components/general-components/Select";
import { cn } from "@/lib/utils";
import { Tip, dateBr } from "../../comercial/-shared/commercial";
import { TeamMember, ordersApi } from "./orders";

/** Equipe da OS a partir do cadastro de funcionários: quem está livre, em outra obra, de férias ou com documento pendente. */
export interface TeamDocIssue { typeId: number; typeName: string; kind: "vencido" | "faltando" | "vence_antes" | "a_vencer"; expiryDate: string | null }
export interface TeamOption {
  id: number; name: string; userId: number | null; roles: Array<{ id: number; name: string; isPrimary: boolean }>;
  busy: Array<{ orderId: number; number: string; title: string; start: string | null; end: string | null }>;
  unavailable: Array<{ label: string; start: string; end: string | null }>;
  documents: TeamDocIssue[]; free: boolean;
}
export interface TeamOptions { from: string | null; to: string | null; employees: TeamOption[]; professionals: Array<{ id: number; name: string }> }
export const TEAM_OPTIONS_KEY = "serviceOrderTeamOptions";

const norm = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
const span = (start: string | null, end: string | null) => (!start ? "sem data" : !end || end === start ? dateBr(start) : `${dateBr(start)} a ${dateBr(end)}`);
const issueText = (issue: TeamDocIssue) =>
  `${issue.typeName} ${issue.kind === "vencido" ? "vencido" : issue.kind === "faltando" ? "faltando" : issue.kind === "vence_antes" ? `vence em ${dateBr(issue.expiryDate)}, antes do fim da obra` : `vence em ${dateBr(issue.expiryDate)}`}`;
/** Só o que atrapalha a obra: o "a vencer" depois do fim dela fica de fora dos avisos. */
const serious = (option?: TeamOption) => (option?.documents ?? []).filter((issue) => issue.kind !== "a_vencer");

/** Os avisos de uma pessoa: nada disso impede de escalar, só informa. */
function Warnings({ option }: { option?: TeamOption }) {
  if (!option) return null;
  const docs = serious(option);
  if (option.free && !docs.length) return <p className="flex items-center gap-1 text-xs text-green-700 dark:text-green-400"><Icon name="circle-check" className="w-3 h-3" /> Livre no período</p>;
  return (
    <div className="grid gap-0.5 text-xs">
      {option.busy.map((busy) => <p key={busy.orderId} className="flex items-center gap-1 text-amber-700 dark:text-amber-400"><Icon name="hard-hat" className="w-3 h-3 shrink-0" /> Em {busy.number} ({span(busy.start, busy.end)})</p>)}
      {option.unavailable.map((item, index) => <p key={index} className="flex items-center gap-1 text-amber-700 dark:text-amber-400"><Icon name="calendar-off" className="w-3 h-3 shrink-0" /> {item.label} ({span(item.start, item.end)})</p>)}
      {docs.length > 0 && (
        <Tip text={docs.map(issueText).join("; ")}>
          <p className="flex w-fit items-center gap-1 text-red-600 dark:text-red-400"><Icon name="file-warning" className="w-3 h-3 shrink-0" /> {docs.length === 1 ? issueText(docs[0]) : `${docs.length} documentos pendentes`}</p>
        </Tip>
      )}
    </div>
  );
}

interface TeamEditorProps {
  orderId: number; team: TeamMember[]; onChange: (team: TeamMember[]) => void; editable: boolean;
  /** Datas da obra na tela (podem ainda não estar salvas): é para elas que a disponibilidade é calculada. */
  from: string; to: string; users: Array<{ id: number; name: string }>;
}

export function TeamEditor({ orderId, team, onChange, editable, from, to, users }: TeamEditorProps) {
  const [picking, setPicking] = useState(false);
  const params = { ...(from ? { from } : {}), ...(to || from ? { to: to || from } : {}) };
  const { data } = useQuery({ queryKey: [TEAM_OPTIONS_KEY, orderId, params], queryFn: () => ordersApi.get<TeamOptions>(`${orderId}/team-options`, params), staleTime: 60 * 1000 });
  const optionOf = new Map((data?.employees ?? []).map((option) => [option.id, option]));
  const patch = (index: number, value: Partial<TeamMember>) => onChange(team.map((current, i) => (i === index ? { ...current, ...value } : current)));
  const linked = new Set(team.map((member) => member.employeeId).filter(Boolean));

  return (
    <div className="mt-1 grid gap-2">
      {team.map((member, index) => {
        const option = member.employeeId ? optionOf.get(member.employeeId) : undefined;
        // pessoa digitada com o mesmo nome de alguém do cadastro: oferece ligar
        const match = !member.employeeId && member.name ? (data?.employees ?? []).find((item) => norm(item.name) === norm(member.name) && !linked.has(item.id)) : undefined;
        const roles = option ? [...option.roles.map(({ id, name }) => ({ id, name })), ...(data?.professionals ?? []).filter((item) => !option.roles.some((role) => role.id === item.id))] : data?.professionals ?? [];
        const partial = !!(member.from || member.to);
        return (
          <div key={member.employeeId ? `e${member.employeeId}` : `a${index}`} className="grid gap-2 rounded-md border p-2">
            {member.employeeId ? (
              <>
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-sm font-medium"><Icon name="id-card" className="w-3.5 h-3.5 shrink-0 text-muted-foreground" /> <span className="truncate">{member.name}</span></p>
                    <Warnings option={option} />
                  </div>
                  {editable && <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0" aria-label={`Tirar ${member.name} da equipe`} onClick={() => onChange(team.filter((_, i) => i !== index))}><Icon name="x" className="w-3 h-3" /></Button>}
                </div>
                <Select name={`teamRole-${index}`} state={member.professionalId ? String(member.professionalId) : ""} disabled={!editable} placeholder={member.role || "Função nesta obra"} modal={false}
                  options={roles.map((role) => ({ id: String(role.id), name: role.name }))}
                  onChange={(_, value) => { const role = roles.find((item) => String(item.id) === String(value ?? "")); if (role) patch(index, { professionalId: role.id, role: role.name }); }} />
                {(editable || partial) && (
                  <div className="grid gap-2">
                    <div className="flex items-center gap-2">
                      <Checkbox id={`teamPartial-${index}`} checked={partial} disabled={!editable} onCheckedChange={(checked) => patch(index, checked === true ? { from: from || null, to: to || from || null } : { from: null, to: null })} />
                      <Label htmlFor={`teamPartial-${index}`} className="text-xs font-normal">Só em parte da obra</Label>
                    </div>
                    {partial && (
                      <div className="grid grid-cols-2 gap-2">
                        <CalendarPicker mode="single" name={`teamFrom-${index}`} className="w-full" value={member.from ?? ""} disabled={!editable} placeholder="De" fromYear={2024} toYear={2040} onValueChange={(_, value) => patch(index, { from: value ? String(value) : null })} />
                        <CalendarPicker mode="single" name={`teamTo-${index}`} className="w-full" value={member.to ?? ""} disabled={!editable} placeholder="Até" fromYear={2024} toYear={2040} onValueChange={(_, value) => patch(index, { to: value ? String(value) : null })} />
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex gap-2">
                  <ShadInput aria-label="Nome" placeholder="Nome" maxLength={120} value={member.name} disabled={!editable} onChange={(event) => patch(index, { name: event.target.value })} />
                  <ShadInput aria-label="Função" placeholder="Função" maxLength={80} value={member.role} disabled={!editable} onChange={(event) => patch(index, { role: event.target.value })} />
                  {editable && <Button type="button" variant="ghost" size="sm" className="h-9 w-9 p-0 shrink-0" aria-label="Remover da equipe" onClick={() => onChange(team.filter((_, i) => i !== index))}><Icon name="x" className="w-3 h-3" /></Button>}
                </div>
                {/* pessoa avulsa (diarista, terceiro): pode ser ligada a um usuário, para a OS aparecer para ela */}
                {(editable || member.userId) && (
                  <Select name={`teamUser-${index}`} state={member.userId ? String(member.userId) : ""} clearable disabled={!editable} placeholder="Sem usuário no sistema" modal={false}
                    options={users.map((user) => ({ id: String(user.id), name: user.name }))}
                    onChange={(_, value) => {
                      const user = users.find((current) => String(current.id) === String(value ?? ""));
                      patch(index, { userId: user?.id ?? null, name: member.name || user?.name || "" });
                    }} />
                )}
                {editable && match && (
                  <button type="button" className="w-fit text-left text-xs underline text-primary"
                    onClick={() => { const primary = match.roles.find((role) => role.isPrimary) ?? match.roles[0]; patch(index, { employeeId: match.id, name: match.name, userId: match.userId, professionalId: primary?.id ?? null, role: member.role || primary?.name || "" }); }}>
                    {match.name} está no cadastro de funcionários: ligar ao cadastro
                  </button>
                )}
              </>
            )}
          </div>
        );
      })}
      {editable && (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setPicking(true)}><Icon name="user-plus" className="w-4 h-4 mr-1" /> Incluir funcionário</Button>
          <Tip text="Diarista ou terceiro que não está no cadastro: conta horas no RDO, mas não entra no mapa de alocação nem nos documentos da obra.">
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange([...team, { name: "", role: "", userId: null }])}><Icon name="plus" className="w-4 h-4 mr-1" /> Pessoa avulsa</Button>
          </Tip>
        </div>
      )}
      {!editable && team.length === 0 && <p className="text-sm text-muted-foreground">Ninguém escalado.</p>}

      {picking && data && (
        <TeamPicker options={data} taken={linked as Set<number>} onClose={() => setPicking(false)}
          onPick={(chosen) => onChange([...team, ...chosen.map((option): TeamMember => {
            const primary = option.roles.find((role) => role.isPrimary) ?? option.roles[0];
            return { name: option.name, role: primary?.name ?? "", userId: option.userId, employeeId: option.id, professionalId: primary?.id ?? null, from: null, to: null };
          })])} />
      )}
    </div>
  );
}

/** A lista para escalar: busca, função e "só quem está livre"; marca-se quantos quiser de uma vez. */
export function TeamPicker({ options, taken, onClose, onPick }: { options: TeamOptions; taken: Set<number>; onClose: () => void; onPick: (chosen: TeamOption[]) => void }) {
  const [search, setSearch] = useState("");
  const [roleId, setRoleId] = useState("");
  const [onlyFree, setOnlyFree] = useState(false);
  const [chosen, setChosen] = useState<number[]>([]);
  const term = norm(search);
  const rows = options.employees.filter((option) => !taken.has(option.id) && (!term || norm(option.name).includes(term)) && (!roleId || option.roles.some((role) => String(role.id) === roleId)) && (!onlyFree || option.free));
  const toggle = (id: number) => setChosen((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Incluir funcionários na equipe</DialogTitle>
          <DialogDescription>{options.from ? `Disponibilidade de ${span(options.from, options.to)}.` : "A obra ainda não tem data: a disponibilidade é a de hoje."} Os avisos não impedem de escalar.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input name="teamSearch" value={search} onValueChange={(_, value) => setSearch(String(value))} placeholder="Buscar pelo nome..." icon="search" />
          <Select name="teamRoleFilter" state={roleId} clearable modal placeholder="Todas as funções" options={options.professionals.map((item) => ({ id: String(item.id), name: item.name }))} onChange={(_, value) => setRoleId(String(value ?? ""))} />
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="teamOnlyFree" checked={onlyFree} onCheckedChange={(checked) => setOnlyFree(checked === true)} />
          <Label htmlFor="teamOnlyFree" className="font-normal">Só quem está livre no período</Label>
        </div>
        <div className="max-h-[50vh] overflow-y-auto rounded-md border">
          {!rows.length && <p className="p-4 text-sm text-muted-foreground">{options.employees.length ? "Ninguém com esses filtros." : "Nenhum funcionário cadastrado. Cadastre em RH → Funcionários."}</p>}
          {rows.map((option) => {
            const checked = chosen.includes(option.id);
            return (
              <button key={option.id} type="button" role="checkbox" aria-checked={checked} onClick={() => toggle(option.id)}
                className={cn("flex w-full items-start gap-3 border-b px-3 py-2 text-left last:border-b-0 hover:bg-muted/40", checked && "bg-primary/5")}>
                <span className={cn("mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border", checked ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40")}>{checked && <Icon name="check" className="w-3 h-3" />}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{option.name}</span>
                  <span className="block text-xs text-muted-foreground">{option.roles.map((role) => role.name).join(", ") || "Sem função"}</span>
                </span>
                <span className="w-56 shrink-0"><Warnings option={option} /></span>
              </button>
            );
          })}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="button" disabled={!chosen.length} onClick={() => { onPick(options.employees.filter((option) => chosen.includes(option.id))); onClose(); }}>
            {chosen.length ? `Incluir ${chosen.length} ${chosen.length === 1 ? "pessoa" : "pessoas"}` : "Incluir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
