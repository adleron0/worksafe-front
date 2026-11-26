import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import CalendarPicker from "@/components/general-components/Calendar";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import StatusBadge from "@/components/general-components/StatusBadge";
import Input from "@/components/general-components/Input";
import Select from "@/components/general-components/Select";
import { EntitySelect } from "@/components/general-components/EntitySelect";
import { Tip, dateBr, errorMessage } from "../../comercial/-shared/commercial";
import {
  EMPLOYEES_ABILITY, EMPLOYEES_KEY, EMPLOYEE_KEY, EMPLOYEE_OPTIONS_KEY, Employee, EmployeeEvent, EmployeeEventDialog, EmployeeOptions, EmployeeStatusBadge, employeesApi, periodText,
} from "../-shared/employees";
import { DOCS_ABILITY, EmployeeDocuments } from "../-shared/documents";
import { EmployeeAllocation } from "../-shared/allocation";
import { EmployeePpeTab } from "../../suprimentos/-shared/ppe";
import { useBotContext } from "@/pages/_authenticated/bots/-shared/bot-chat";

export const Route = createFileRoute("/_authenticated/rh/_funcionarios/funcionarios_/$employeeId")({
  component: EmployeePage,
});

interface Draft {
  name: string; registration: string; contractType: string; admissionDate: string; phone: string; roles: string[]; primaryRoleId: string; userId: string; notes: string;
  cpf: string; rg: string; birthDate: string; email: string; emergencyName: string; emergencyPhone: string;
  /** empregador (CNPJ do grupo); null = o padrão */
  entityId: number | null;
}
const draftOf = (employee?: Employee): Draft => ({
  name: employee?.name ?? "", registration: employee?.registration ?? "", contractType: employee?.contractType ?? "clt", admissionDate: employee?.admissionDate ?? "", phone: employee?.phone ?? "",
  roles: employee?.roles.map((role) => String(role.id)) ?? [], primaryRoleId: String(employee?.roles.find((role) => role.isPrimary)?.id ?? ""), userId: employee?.user ? String(employee.user.id) : "",
  notes: employee?.notes ?? "", cpf: employee?.cpf ?? "", rg: employee?.rg ?? "", birthDate: employee?.birthDate ?? "", email: employee?.email ?? "",
  emergencyName: employee?.emergencyName ?? "", emergencyPhone: employee?.emergencyPhone ?? "",
  entityId: employee?.entityId ?? null,
});
const PERIOD_TYPES = ["ferias", "afastamento", "suspensao"];

/** Ficha do funcionário: dados, funções e o histórico de onde sai a situação. */
function EmployeePage() {
  const { employeeId } = Route.useParams();
  const isNew = employeeId === "novo";
  const { can } = useVerify();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(isNew ? draftOf() : null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  const { data: employee, isLoading, error: loadError } = useQuery({
    queryKey: [EMPLOYEE_KEY, employeeId],
    queryFn: () => employeesApi.get<Employee>(employeeId),
    enabled: !isNew,
  });
  // bots nas páginas: o bot sabe qual registro está aberto ("este", "esta")
  useBotContext({ entity: "funcionario", id: Number(employeeId) || undefined, label: "Funcionário", title: employee?.name });
  const { data: options } = useQuery({ queryKey: [EMPLOYEE_OPTIONS_KEY], queryFn: () => employeesApi.get<EmployeeOptions>("options") });
  useEffect(() => { if (employee) setDraft(draftOf(employee)); }, [employee]);

  const apply = (result: Employee) => {
    queryClient.setQueryData([EMPLOYEE_KEY, String(result.id)], result);
    queryClient.invalidateQueries({ queryKey: [EMPLOYEES_KEY] });
    queryClient.invalidateQueries({ queryKey: [EMPLOYEE_OPTIONS_KEY] });
  };
  const editable = isNew ? can(`create_${EMPLOYEES_ABILITY}`) : can(`update_${EMPLOYEES_ABILITY}`);
  const canSeeDocuments = can(`view_${DOCS_ABILITY}`);
  const canSeePpe = can("view_entregas_epi") || can(`view_${EMPLOYEES_ABILITY}`);
  const seesPersonal = isNew ? !!options?.canSeePersonal : !!employee?.canSeePersonal;

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: (value: Draft) => {
      const body = {
        name: value.name.trim(), registration: value.registration.trim(), contractType: value.contractType, admissionDate: value.admissionDate || null, phone: value.phone,
        roles: value.roles.map(Number), primaryRoleId: Number(value.primaryRoleId) || null, userId: value.userId || null, notes: value.notes.trim(),
        // vazio = a API mantém o empregador atual (ou usa o CNPJ padrão no cadastro novo)
        ...(value.entityId ? { entityId: value.entityId } : {}),
        // dados pessoais só vão quando a pessoa pode vê-los; senão a API guarda o que já tem
        ...(seesPersonal ? { cpf: value.cpf, rg: value.rg.trim(), birthDate: value.birthDate || null, email: value.email.trim(), emergencyName: value.emergencyName.trim(), emergencyPhone: value.emergencyPhone } : {}),
      };
      return isNew ? employeesApi.post<Employee>("", body) : employeesApi.put<Employee>(employeeId, body);
    },
    onSuccess: (result) => {
      apply(result);
      toast({ title: isNew ? "Funcionário cadastrado" : "Dados salvos", variant: "success" });
      if (isNew) navigate({ to: "/rh/funcionarios/$employeeId", params: { employeeId: String(result.id) }, replace: true });
    },
    onError: (err) => setError(errorMessage(err)),
  });
  const { mutate: removeEvent } = useMutation({
    mutationFn: (eventId: number) => employeesApi.delete<Employee>(`${employeeId}/events/${eventId}`),
    onSuccess: (result) => { apply(result); toast({ title: "Registro retirado do histórico", variant: "success" }); },
    onError: (err) => toast({ title: "Não foi possível retirar o registro", description: errorMessage(err), variant: "destructive" }),
  });
  const { mutate: endEvent } = useMutation({
    mutationFn: ({ eventId, endDate }: { eventId: number; endDate: string }) => employeesApi.patch<Employee>(`${employeeId}/events/${eventId}`, { endDate }),
    onSuccess: (result) => { apply(result); toast({ title: "Data de volta registrada", variant: "success" }); },
    onError: (err) => toast({ title: "Não foi possível registrar a volta", description: errorMessage(err), variant: "destructive" }),
  });
  const { mutate: setActive } = useMutation({
    mutationFn: (active: boolean) => employeesApi.patch<Employee>(`${employeeId}/${active ? "active" : "inactive"}`),
    onSuccess: (result) => { apply(result); toast({ title: result.inactive ? "Cadastro inativado" : "Cadastro reativado", variant: "success" }); },
    onError: (err) => toast({ title: "Não foi possível alterar o cadastro", description: errorMessage(err), variant: "destructive" }),
  });

  if (!can(`view_${EMPLOYEES_ABILITY}`)) return null;
  if (loadError) return <div className="p-4"><p className="text-destructive font-medium">Erro: {errorMessage(loadError)}</p><Link to="/rh/funcionarios" className="underline text-sm">Voltar para os funcionários</Link></div>;
  if ((!isNew && (isLoading || !employee)) || !draft) return <div className="grid gap-3"><Skeleton className="h-16 w-full" /><Skeleton className="h-64 w-full" /></div>;

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => (current ? { ...current, [key]: value } : current));
  const dirty = isNew || JSON.stringify(draft) !== JSON.stringify(draftOf(employee));
  const professionals = options?.professionals ?? [];
  const chosenRoles = professionals.filter((item) => draft.roles.includes(String(item.id)));
  // usuário já ligado a outro funcionário não é oferecido
  const users = (options?.users ?? []).filter((user) => !user.employeeId || user.employeeId === employee?.id).map(({ id, name }) => ({ id, name }));
  const setRoles = (value: string[]) => setDraft((current) => (current ? { ...current, roles: value, primaryRoleId: value.includes(current.primaryRoleId) ? current.primaryRoleId : value[0] ?? "" } : current));
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (draft.name.trim().length < 3) return setError("Informe o nome completo.");
    if (seesPersonal && draft.cpf && draft.cpf.length !== 11) return setError("O CPF está incompleto.");
    setError(""); save(draft);
  };

  return (
    <>
      <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-3">
        <div className="min-w-0">
          <Link to="/rh/funcionarios" className="text-xs text-muted-foreground hover:underline inline-flex items-center gap-1"><Icon name="arrow-left" className="w-3 h-3" /> Funcionários</Link>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <h1 className="text-xl font-bold">{employee?.name ?? "Novo funcionário"}</h1>
            {employee && <EmployeeStatusBadge status={employee.status} label={employee.statusLabel} until={employee.statusUntil} />}
            {employee?.inactive && <StatusBadge tone="neutral">Cadastro inativo</StatusBadge>}
          </div>
          {employee && <p className="text-sm text-muted-foreground truncate">{[employee.primaryRole ?? "Sem função", employee.registration && `matrícula ${employee.registration}`].filter(Boolean).join(" · ")}</p>}
        </div>
        {employee && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {!employee.inactive && can(`inactive_${EMPLOYEES_ABILITY}`) && (
              <ConfirmDialog title="Inativar este cadastro?" description="Use para um cadastro feito por engano: ele some das listas. Para quem saiu da empresa, lance o desligamento no histórico." onConfirm={() => setActive(false)}>
                <Button type="button" variant="outline" size="sm"><Icon name="archive" className="w-4 h-4 mr-1" /> Inativar cadastro</Button>
              </ConfirmDialog>
            )}
            {employee.inactive && can(`activate_${EMPLOYEES_ABILITY}`) && <Button type="button" variant="outline" size="sm" onClick={() => setActive(true)}><Icon name="archive-restore" className="w-4 h-4 mr-1" /> Reativar cadastro</Button>}
          </div>
        )}
      </div>

      <Tabs defaultValue="dados" className="mt-4">
        {employee && (
          <TabsList>
            <TabsTrigger value="dados">Dados</TabsTrigger>
            {canSeeDocuments && <TabsTrigger value="documentos">Documentos</TabsTrigger>}
            <TabsTrigger value="alocacao">Alocação</TabsTrigger>
            {canSeePpe && <TabsTrigger value="epi">EPI e equipamentos</TabsTrigger>}
          </TabsList>
        )}
        {employee && <TabsContent value="alocacao" className="mt-4"><EmployeeAllocation employeeId={employee.id} /></TabsContent>}
        {employee && canSeePpe && <TabsContent value="epi" className="mt-4"><EmployeePpeTab employeeId={employee.id} /></TabsContent>}
        {employee && canSeeDocuments && <TabsContent value="documentos" className="mt-4"><EmployeeDocuments employeeId={employee.id} /></TabsContent>}
        <TabsContent value="dados" className="mt-4">
      <div className="grid xl:grid-cols-3 gap-4 items-start">
        <form onSubmit={submit} className="xl:col-span-2 grid gap-4">
          <section className="rounded-card border bg-card p-4 grid gap-4">
            <h2 className="font-semibold">Dados do funcionário</h2>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <Label htmlFor="name">Nome completo <span>*</span></Label>
                <Input id="name" name="name" value={draft.name} maxLength={160} disabled={!editable} onValueChange={(_, value) => set("name", String(value))} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="registration">Matrícula</Label>
                <Input id="registration" name="registration" value={draft.registration} maxLength={30} disabled={!editable} onValueChange={(_, value) => set("registration", String(value))} className="mt-1" />
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <Label>Vínculo</Label>
                <Select name="contractType" options={options?.contractTypes ?? []} state={draft.contractType} disabled={!editable} onChange={(_, value) => set("contractType", String(value ?? "clt"))} placeholder="Selecione" />
              </div>
              <div>
                <Label>Admissão</Label>
                <CalendarPicker mode="single" name="admissionDate" className="mt-1 w-full" value={draft.admissionDate} placeholder="Não informada" fromYear={1980} toYear={2040} disabled={!editable}
                  onValueChange={(_, value) => set("admissionDate", String(value ?? ""))} />
              </div>
              <div>
                <Label htmlFor="phone">Telefone</Label>
                <Input id="phone" name="phone" format="phone" value={draft.phone} disabled={!editable} onValueChange={(_, value) => set("phone", String(value))} className="mt-1" />
              </div>
            </div>
            <EntitySelect label="Empregador (CNPJ)" clearable disabled={!editable} value={draft.entityId} onChange={(id) => set("entityId", id)}
              hint="O CNPJ que registra a pessoa. Ela pode trabalhar em obra ou turma de outro CNPJ do grupo." />
          </section>

          <section className="rounded-card border bg-card p-4 grid gap-4">
            <div>
              <h2 className="font-semibold">Funções</h2>
              <p className="text-xs text-muted-foreground">São as mesmas funções da base de cálculo do Comercial: é por elas que o custo de mão de obra da obra é calculado.</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Funções que exerce</Label>
                <Select name="roles" multiple options={professionals} state={draft.roles} disabled={!editable} onChange={(_, value) => setRoles(Array.isArray(value) ? value.map(String) : value ? [String(value)] : [])} placeholder="Escolha uma ou mais" />
                {!professionals.length && <p className="text-xs text-muted-foreground mt-1">Nenhuma função cadastrada. Cadastre os profissionais em Comercial → Base de cálculo.</p>}
              </div>
              <div>
                <Label>Função principal</Label>
                <Select name="primaryRoleId" options={chosenRoles} state={draft.primaryRoleId} disabled={!editable || chosenRoles.length < 2} onChange={(_, value) => set("primaryRoleId", String(value ?? ""))}
                  placeholder={chosenRoles.length ? "Selecione" : "Escolha as funções primeiro"} />
              </div>
            </div>
          </section>

          <section className="rounded-card border bg-card p-4 grid gap-4">
            <h2 className="font-semibold">Dados pessoais</h2>
            {!seesPersonal && <p className="text-sm text-muted-foreground">CPF, RG, nascimento, e-mail e contato de emergência só aparecem para quem tem a permissão de ver dados pessoais.</p>}
            {seesPersonal && (
              <>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="cpf">CPF</Label>
                    <Input id="cpf" name="cpf" format="cpf" value={draft.cpf} disabled={!editable} onValueChange={(_, value) => set("cpf", String(value))} className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="rg">RG</Label>
                    <Input id="rg" name="rg" value={draft.rg} maxLength={30} disabled={!editable} onValueChange={(_, value) => set("rg", String(value))} className="mt-1" />
                  </div>
                  <div>
                    <Label>Nascimento</Label>
                    <CalendarPicker mode="single" name="birthDate" className="mt-1 w-full" value={draft.birthDate} placeholder="Não informado" fromYear={1940} toYear={2015} disabled={!editable}
                      onValueChange={(_, value) => set("birthDate", String(value ?? ""))} />
                  </div>
                </div>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="email">E-mail</Label>
                    <Input id="email" name="email" value={draft.email} maxLength={160} disabled={!editable} onValueChange={(_, value) => set("email", String(value))} className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="emergencyName">Contato de emergência</Label>
                    <Input id="emergencyName" name="emergencyName" value={draft.emergencyName} maxLength={120} disabled={!editable} onValueChange={(_, value) => set("emergencyName", String(value))} className="mt-1" placeholder="Nome e parentesco" />
                  </div>
                  <div>
                    <Label htmlFor="emergencyPhone">Telefone de emergência</Label>
                    <Input id="emergencyPhone" name="emergencyPhone" format="phone" value={draft.emergencyPhone} disabled={!editable} onValueChange={(_, value) => set("emergencyPhone", String(value))} className="mt-1" />
                  </div>
                </div>
              </>
            )}
          </section>

          <section className="rounded-card border bg-card p-4 grid gap-4">
            <div>
              <Label>Usuário do sistema</Label>
              <Select name="userId" options={users} state={draft.userId} disabled={!editable} clearable onChange={(_, value) => set("userId", String(value ?? ""))} placeholder="Não tem acesso ao sistema" />
              <p className="text-xs text-muted-foreground mt-1">Para quem entra no sistema: liga o funcionário ao login dele.</p>
            </div>
            <div>
              <Label htmlFor="notes">Observações</Label>
              <Textarea id="notes" className="mt-1" rows={3} maxLength={1000} disabled={!editable} value={draft.notes} onChange={(event) => set("notes", event.target.value)} />
            </div>
          </section>

          {error && <p className="text-red-500 text-sm">{error}</p>}
          {editable && (
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={saving || !dirty}>{saving ? "Salvando..." : isNew ? "Cadastrar funcionário" : "Salvar"}</Button>
              {!isNew && dirty && <Button type="button" variant="outline" onClick={() => { setDraft(draftOf(employee)); setError(""); }}>Desfazer alterações</Button>}
            </div>
          )}
        </form>

        <aside className="grid gap-4">
          {isNew && <p className="rounded-card border bg-card p-4 text-sm text-muted-foreground">Depois de cadastrar, o histórico (férias, afastamentos, advertências e desligamento) fica nesta coluna.</p>}
          {employee && (
            <section className="rounded-card border bg-card p-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-semibold">Histórico</h2>
                {employee.canWriteOccurrences && employee.status !== "desligado" && (
                  <Button type="button" variant="outline" size="sm" onClick={() => setAdding(true)}><Icon name="plus" className="w-3 h-3 mr-1" /> Lançar</Button>
                )}
              </div>
              <ul className="mt-3 grid gap-3 text-sm">
                {employee.canSeeOccurrences && employee.events.map((event) => (
                  <EventLine key={event.id} event={event} canWrite={employee.canWriteOccurrences} onRemove={() => removeEvent(event.id)} onEnd={(endDate) => endEvent({ eventId: event.id, endDate })} />
                ))}
                {!employee.canSeeOccurrences && employee.unavailable.map((period, index) => (
                  <li key={index} className="border-l-2 pl-3">
                    <p className="font-medium">{period.label}</p>
                    <p className="text-xs text-muted-foreground">{periodText(period.startDate, period.endDate, true)}</p>
                  </li>
                ))}
                {employee.admissionDate && (
                  <li className="border-l-2 pl-3">
                    <p className="font-medium">Admissão</p>
                    <p className="text-xs text-muted-foreground">{dateBr(employee.admissionDate)}</p>
                  </li>
                )}
              </ul>
              {employee.canSeeOccurrences && !employee.events.length && !employee.admissionDate && <p className="mt-3 text-sm text-muted-foreground">Nada lançado ainda.</p>}
              {!employee.canSeeOccurrences && <p className="mt-3 text-xs text-muted-foreground">Advertências, suspensões e motivos só aparecem para quem tem a permissão de ver o histórico.</p>}
            </section>
          )}
        </aside>
      </div>
        </TabsContent>
      </Tabs>

      {adding && employee && options && <EmployeeEventDialog employee={employee} types={options.eventTypes} onClose={() => setAdding(false)} />}
    </>
  );
}

/** Um registro do histórico, com "registrar volta" no afastamento em aberto e a retirada do que foi lançado por engano. */
function EventLine({ event, canWrite, onRemove, onEnd }: { event: EmployeeEvent; canWrite: boolean; onRemove: () => void; onEnd: (endDate: string) => void }) {
  const [ending, setEnding] = useState(false);
  const period = PERIOD_TYPES.includes(event.type);
  return (
    <li className="border-l-2 pl-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium">{event.typeLabel}</p>
          <p className="text-xs text-muted-foreground">{periodText(event.startDate, event.endDate, period)}{event.createdBy ? ` · lançado por ${event.createdBy}` : ""}</p>
        </div>
        {canWrite && event.removable && (
          <ConfirmDialog title="Retirar este registro do histórico?" description={event.type === "desligamento" ? "A pessoa volta a aparecer como ativa." : "Use quando o registro foi lançado por engano."} onConfirm={onRemove}>
            <span><Tip text="Retirar do histórico"><Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" aria-label={`Retirar ${event.typeLabel} do histórico`}><Icon name="trash-2" className="w-3 h-3" /></Button></Tip></span>
          </ConfirmDialog>
        )}
      </div>
      {event.reason && <p className="mt-1 whitespace-pre-wrap">{event.reason}</p>}
      {canWrite && period && !event.endDate && !ending && <button type="button" className="mt-1 text-xs underline text-primary" onClick={() => setEnding(true)}>Registrar a volta</button>}
      {ending && (
        <div className="mt-2">
          <Label className="text-xs">Último dia fora</Label>
          <CalendarPicker mode="single" name={`end-${event.id}`} className="mt-1 w-full" value="" placeholder="Escolha a data" fromYear={2000} toYear={2040}
            onValueChange={(_, value) => { if (value) { onEnd(String(value)); setEnding(false); } }} />
        </div>
      )}
    </li>
  );
}
