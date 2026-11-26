import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api, { get } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import Input from "@/components/general-components/Input";
import Select from "@/components/general-components/Select";
import Icon from "@/components/general-components/Icon";
import ColorPickerInput from "@/components/general-components/ColorPickerInput";
import { FormPageGrid, FormSection, SummaryRow } from "@/components/general-components/FormPage";
import { CompanyEntity, ENTITIES_KEY, ENTITY_KINDS, EntityKind, formatCnpj } from "@/components/general-components/EntitySelect";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { buscarCnpj, isValidCNPJ, onlyDigits, sameName } from "@/utils/documento";
import { Response } from "@/general-interfaces/api.interface";
import { errorMessage } from "../../comercial/-shared/commercial";
import DistributeDialog from "./DistributeDialog";

type FormState = {
  cnpj: string; corporateName: string; tradeName: string; kinds: EntityKind[]; isDefault: boolean; color: string; logoUrl: string;
  zipCode: string; address: string; addressNumber: string; addressComplement: string; neighborhood: string; stateId: string; cityId: string;
  email: string; phone: string; municipalRegistration: string; stateRegistration: string; payment: string; registrations: string; active: boolean;
};

const fromEntity = (e: CompanyEntity | null): FormState => ({
  cnpj: e?.cnpj ?? "", corporateName: e?.corporateName ?? "", tradeName: e?.tradeName ?? "", kinds: e?.kinds ?? [], isDefault: e?.isDefault ?? false,
  color: e?.color ?? "", logoUrl: e?.logoUrl ?? "", zipCode: e?.zipCode ?? "", address: e?.address ?? "", addressNumber: e?.addressNumber ?? "",
  addressComplement: e?.addressComplement ?? "", neighborhood: e?.neighborhood ?? "", stateId: e?.stateId ? String(e.stateId) : "", cityId: e?.cityId ? String(e.cityId) : "",
  email: e?.email ?? "", phone: e?.phone ?? "", municipalRegistration: e?.municipalRegistration ?? "", stateRegistration: e?.stateRegistration ?? "",
  payment: String((e?.brand as { payment?: string } | null)?.payment ?? ""), registrations: String((e?.brand as { registrations?: string } | null)?.registrations ?? ""),
  active: e ? e.active : true,
});

/** Cadastro de um CNPJ do grupo: dados, frentes que atende, endereço (a cidade dá o IBGE da nota) e identidade dos documentos. */
export default function EntityForm({ entity }: { entity: CompanyEntity | null }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(() => fromEntity(entity));
  const [distributing, setDistributing] = useState(false);
  const [lookup, setLookup] = useState<"idle" | "loading" | "done" | "fail">("idle");
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((prev) => ({ ...prev, [key]: value }));
  useEffect(() => setForm(fromEntity(entity)), [entity]);

  const { data: states } = useQuery<Response | undefined>({
    queryKey: ["listStates"],
    queryFn: () => get("states", "", [{ key: "limit", value: "all" }, { key: "order-name", value: "asc" }]),
  });
  const { data: cities, isFetching: loadingCities } = useQuery<Response | undefined>({
    queryKey: ["listCities", form.stateId],
    queryFn: () => get("cities", "", [{ key: "stateId", value: form.stateId }, { key: "limit", value: "all" }, { key: "order-name", value: "asc" }]),
    enabled: Number(form.stateId) > 0,
  });
  const { data: usage } = useQuery({
    queryKey: ["companyEntityUsage", entity?.id],
    queryFn: async () => (await api.get<Array<{ key: string; label: string; count: number }>>(`company-entities/${entity!.id}/usage`)).data,
    enabled: !!entity,
  });

  // CNPJ completo e novo: completa razão social e endereço pelos dados públicos (BrasilAPI)
  const fillFromCnpj = async () => {
    if (!isValidCNPJ(form.cnpj)) return;
    setLookup("loading");
    try {
      const info = await buscarCnpj(form.cnpj);
      if (!info) { setLookup("fail"); return; }
      const state = info.uf ? (states?.rows ?? []).find((s: { uf?: string }) => s.uf?.toUpperCase() === info.uf) : undefined;
      let cityId = "";
      if (state && info.municipio) {
        const res = await get<Response>("cities", "", [{ key: "stateId", value: state.id }, { key: "limit", value: "all" }]).catch(() => undefined);
        const city = res?.rows?.find((c: { name: string }) => sameName(c.name, info.municipio));
        cityId = city ? String(city.id) : "";
      }
      setForm((prev) => ({
        ...prev,
        corporateName: prev.corporateName || info.razaoSocial, tradeName: prev.tradeName || info.nomeFantasia || info.razaoSocial,
        zipCode: prev.zipCode || info.cep, address: prev.address || info.rua, addressNumber: prev.addressNumber || info.numero,
        addressComplement: prev.addressComplement || info.complemento, neighborhood: prev.neighborhood || info.bairro,
        stateId: prev.stateId || (state ? String(state.id) : ""), cityId: prev.cityId || cityId,
        email: prev.email || info.email, phone: prev.phone || info.telefone,
      }));
      setLookup("done");
    } catch {
      setLookup("fail");
    }
  };

  const save = useMutation({
    mutationFn: async () => {
      const brand = { ...((entity?.brand as Record<string, unknown> | null) ?? {}), payment: form.payment.trim() || undefined, registrations: form.registrations.trim() || undefined };
      const body = {
        cnpj: onlyDigits(form.cnpj), corporateName: form.corporateName, tradeName: form.tradeName, kinds: form.kinds, color: form.color || null, logoUrl: form.logoUrl || null,
        zipCode: onlyDigits(form.zipCode) || null, address: form.address, addressNumber: form.addressNumber, addressComplement: form.addressComplement, neighborhood: form.neighborhood,
        stateId: Number(form.stateId) || null, cityId: Number(form.cityId) || null, email: form.email, phone: onlyDigits(form.phone), municipalRegistration: form.municipalRegistration,
        stateRegistration: form.stateRegistration, brand: Object.values(brand).some(Boolean) ? brand : null,
        ...(form.isDefault && !entity?.isDefault ? { isDefault: true } : {}),
        ...(entity ? { active: form.active } : { isDefault: form.isDefault }),
      };
      return entity ? (await api.put<CompanyEntity>(`company-entities/${entity.id}`, body)).data : (await api.post<CompanyEntity>("company-entities", body)).data;
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: [ENTITIES_KEY] });
      queryClient.invalidateQueries({ queryKey: ["fiscalSettings"] });
      toast({ title: entity ? "CNPJ atualizado" : "CNPJ cadastrado", variant: "success" });
      if (!entity) navigate({ to: "/empresa/cnpjs/$entityId", params: { entityId: String(saved.id) } });
    },
    onError: (error) => toast({ title: "Não foi possível salvar", description: errorMessage(error), variant: "destructive" }),
  });

  const toggleKind = (kind: EntityKind, on: boolean) => set("kinds", on ? [...new Set([...form.kinds, kind])] : form.kinds.filter((k) => k !== kind));
  const cnpjOk = isValidCNPJ(form.cnpj);
  const canSave = cnpjOk && form.corporateName.trim().length > 1 && form.tradeName.trim().length > 1;

  return (
    <FormPageGrid aside={
      <>
        <section className="rounded-card border bg-card p-4 flex flex-col gap-2">
          <SummaryRow label="CNPJ">{cnpjOk ? formatCnpj(form.cnpj) : "—"}</SummaryRow>
          <SummaryRow label="Frentes">{form.kinds.length ? form.kinds.map((k) => ENTITY_KINDS.find((x) => x.id === k)?.name).join(", ") : "nenhuma"}</SummaryRow>
          <SummaryRow label="Padrão">{form.isDefault ? "sim" : "não"}</SummaryRow>
          <Button className="mt-2" disabled={!canSave || save.isPending} onClick={() => save.mutate()}>
            <Icon name="save" className="w-4 h-4" /> {save.isPending ? "Salvando…" : "Salvar"}
          </Button>
          {!cnpjOk && form.cnpj.length > 0 && <p className="text-xs text-destructive">CNPJ inválido.</p>}
        </section>
        {entity && (
          <section className="rounded-card border bg-card p-4 flex flex-col gap-2">
            <h2 className="text-[15px] font-semibold">O que é deste CNPJ</h2>
            {(usage ?? []).map((u) => <SummaryRow key={u.key} label={u.label}>{u.count}</SummaryRow>)}
            <Button variant="outline" className="mt-1" disabled={!entity.active} onClick={() => setDistributing(true)}>
              <Icon name="arrow-right-left" className="w-4 h-4" /> Trazer registros para cá
            </Button>
            <p className="text-xs text-muted-foreground">Passa para este CNPJ tudo de uma frente (ex.: treinamentos) que hoje está em outro. Notas já emitidas não mudam.</p>
          </section>
        )}
      </>
    }>
      <FormSection title="Identificação" description="O nome curto aparece nas listas e nos filtros; a razão social, nos documentos e nas notas.">
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>CNPJ</Label>
            <Input name="cnpj" format="cnpj" value={form.cnpj} onValueChange={(_, v) => { set("cnpj", String(v)); setLookup("idle"); }}
              onBlur={() => { if (!entity) fillFromCnpj(); }} placeholder="00.000.000/0000-00" />
            {lookup === "loading" && <p className="text-xs text-muted-foreground">Buscando os dados públicos do CNPJ…</p>}
            {lookup === "done" && <p className="text-xs text-muted-foreground">Dados públicos preenchidos. Confira.</p>}
            {lookup === "fail" && <p className="text-xs text-muted-foreground">Não achei os dados públicos: preencha à mão.</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Nome curto</Label>
            <Input name="tradeName" value={form.tradeName} onValueChange={(_, v) => set("tradeName", String(v))} placeholder="WorkSafe Treinamentos" />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label>Razão social</Label>
            <Input name="corporateName" value={form.corporateName} onValueChange={(_, v) => set("corporateName", String(v))} />
          </div>
        </div>
      </FormSection>

      <FormSection title="Frentes" description="O que este CNPJ vende. Propostas, cursos e turmas da frente nascem neste CNPJ sem ninguém precisar escolher.">
        <div className="flex flex-col gap-2">
          {ENTITY_KINDS.map((k) => (
            <label key={k.id} className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={form.kinds.includes(k.id)} onCheckedChange={(on) => toggleKind(k.id, !!on)} /> {k.name}
            </label>
          ))}
          <label className="flex items-center gap-2 text-sm cursor-pointer mt-2">
            <Checkbox checked={form.isDefault} disabled={entity?.isDefault} onCheckedChange={(on) => set("isDefault", !!on)} />
            CNPJ padrão do grupo (vale quando nada indica outro)
          </label>
          {entity && !entity.isDefault && (
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={form.active} onCheckedChange={(on) => set("active", !!on)} /> Ativo
            </label>
          )}
        </div>
      </FormSection>

      <FormSection title="Endereço" description="A cidade dá o código IBGE que vai na nota fiscal.">
        <div className="grid sm:grid-cols-6 gap-3">
          <div className="flex flex-col gap-1.5 sm:col-span-2"><Label>CEP</Label><Input name="zipCode" format="cep" value={form.zipCode} onValueChange={(_, v) => set("zipCode", String(v))} /></div>
          <div className="flex flex-col gap-1.5 sm:col-span-4"><Label>Rua</Label><Input name="address" value={form.address} onValueChange={(_, v) => set("address", String(v))} /></div>
          <div className="flex flex-col gap-1.5 sm:col-span-2"><Label>Número</Label><Input name="addressNumber" value={form.addressNumber} onValueChange={(_, v) => set("addressNumber", String(v))} /></div>
          <div className="flex flex-col gap-1.5 sm:col-span-4"><Label>Complemento</Label><Input name="addressComplement" value={form.addressComplement} onValueChange={(_, v) => set("addressComplement", String(v))} /></div>
          <div className="flex flex-col gap-1.5 sm:col-span-2"><Label>Bairro</Label><Input name="neighborhood" value={form.neighborhood} onValueChange={(_, v) => set("neighborhood", String(v))} /></div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label>Estado</Label>
            <Select name="stateId" options={states?.rows ?? []} state={form.stateId} searchable
              onChange={(_, v) => { set("stateId", String(v)); set("cityId", ""); }} />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label>Cidade</Label>
            <Select name="cityId" options={cities?.rows ?? []} state={form.cityId} isLoading={loadingCities} disabled={!form.stateId} searchable
              onChange={(_, v) => set("cityId", String(v))} />
          </div>
        </div>
      </FormSection>

      <FormSection title="Contato e inscrições">
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5"><Label>E-mail</Label><Input name="email" value={form.email} onValueChange={(_, v) => set("email", String(v))} /></div>
          <div className="flex flex-col gap-1.5"><Label>Telefone</Label><Input name="phone" format="phone" value={form.phone} onValueChange={(_, v) => set("phone", String(v))} /></div>
          <div className="flex flex-col gap-1.5"><Label>Inscrição municipal</Label><Input name="municipalRegistration" value={form.municipalRegistration} onValueChange={(_, v) => set("municipalRegistration", String(v))} /></div>
          <div className="flex flex-col gap-1.5"><Label>Inscrição estadual</Label><Input name="stateRegistration" value={form.stateRegistration} onValueChange={(_, v) => set("stateRegistration", String(v))} /></div>
        </div>
      </FormSection>

      <FormSection title="Documentos deste CNPJ" description="Propostas, OS e relatórios deste CNPJ usam estes dados. Em branco, vale a identidade do grupo (Comercial → Identidade e modelos).">
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5 sm:col-span-2"><Label>Logo (endereço https da imagem)</Label><Input name="logoUrl" value={form.logoUrl} onValueChange={(_, v) => set("logoUrl", String(v))} placeholder="https://…" /></div>
          <ColorPickerInput label="Cor" value={form.color || undefined} onChange={(c) => set("color", c)} />
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label>Dados bancários para pagamento</Label>
            <Textarea value={form.payment} onChange={(e) => set("payment", e.target.value)} rows={3} placeholder="Banco, agência, conta e PIX deste CNPJ" />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label>Linha de inscrições no documento (opcional)</Label>
            <Input name="registrations" value={form.registrations} onValueChange={(_, v) => set("registrations", String(v))} placeholder="Em branco: monta com a IE e a IM acima" />
          </div>
        </div>
      </FormSection>

      {entity && <DistributeDialog entity={entity} open={distributing} onOpenChange={setDistributing} />}
    </FormPageGrid>
  );
}
