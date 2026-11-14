import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { post } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input as ShadInput } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import ColorPickerInput from "@/components/general-components/ColorPickerInput";
import Icon from "@/components/general-components/Icon";
import { commercialApi, errorMessage } from "../-shared/commercial";

interface Brand {
  logoUrl: string | null; color: string; tagline: string; about: string;
  highlights: Array<{ value: string; label: string }>;
  differentials: Array<{ title: string; text: string }>;
  testimonials: Array<{ quote: string; author: string; company: string }>;
  phone: string; email: string; website: string; address: string;
  registrations: string; payment: string;
  serviceEmail: string; trainingEmail: string;
}
const KEY = "commercialBrand";

const Card = ({ title, description, children }: { title: string; description: string; children: React.ReactNode }) => (
  <section className="rounded-lg border p-4">
    <h3 className="font-semibold">{title}</h3>
    <p className="text-xs text-muted-foreground">{description}</p>
    <div className="mt-3 grid gap-3">{children}</div>
  </section>
);

/** Identidade que aparece nas propostas: capa, "por que nós" e rodapé. */
export default function BrandTab({ canUpdate }: { canUpdate: boolean }) {
  const queryClient = useQueryClient();
  const file = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<Brand | null>(null);
  const [uploading, setUploading] = useState(false);
  const { data, isLoading, error } = useQuery({ queryKey: [KEY], queryFn: () => commercialApi.get<Brand>("brand") });
  useEffect(() => { if (data) setForm(data); }, [data]);

  const { mutate: save, isPending } = useMutation({
    mutationFn: () => commercialApi.put<Brand>("brand", form),
    onSuccess: (result) => { queryClient.setQueryData([KEY], result); toast({ title: "Identidade salva", description: "As próximas propostas e pré-visualizações já usam.", variant: "success" }); },
    onError: (err) => toast({ title: "Não foi possível salvar", description: errorMessage(err), variant: "destructive" }),
  });
  const uploadLogo = async (list: FileList | null) => {
    const picked = list?.[0];
    if (!picked) return;
    setUploading(true);
    try {
      const response = await post<{ imageUrl: string }, { image: File }>("images", "s3", { image: picked });
      if (!response?.imageUrl) throw new Error("sem endereço");
      const url = response.imageUrl;
      setForm((f) => (f ? { ...f, logoUrl: url } : f));
    } catch {
      toast({ title: "Não foi possível enviar a logo", variant: "destructive" });
    } finally {
      setUploading(false);
      if (file.current) file.current.value = "";
    }
  };

  if (isLoading || !form) return error ? <p className="text-destructive text-sm">{errorMessage(error)}</p> : <Skeleton className="h-64 w-full" />;
  const set = <K extends keyof Brand>(key: K, value: Brand[K]) => setForm((f) => (f ? { ...f, [key]: value } : f));
  const dirty = JSON.stringify(form) !== JSON.stringify(data);
  const list = <K extends "highlights" | "differentials" | "testimonials">(key: K) => ({
    update: (index: number, patch: Partial<Brand[K][number]>) => set(key, form[key].map((row, i) => (i === index ? { ...row, ...patch } : row)) as Brand[K]),
    remove: (index: number) => set(key, form[key].filter((_, i) => i !== index) as Brand[K]),
  });
  const removeButton = (onClick: () => void, label: string) => canUpdate && (
    <Button type="button" variant="ghost" size="sm" className="h-9 w-9 p-0 shrink-0" aria-label={label} onClick={onClick}><Icon name="trash-2" className="w-4 h-4" /></Button>
  );

  return (
    <div className="grid gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground max-w-2xl">
          É o que dá cara à proposta: a capa com a sua logo e a sua cor, a seção "por que nós" e o rodapé. O que ficar em branco usa o cadastro da empresa ou simplesmente não aparece.
        </p>
        {canUpdate && <Button type="button" onClick={() => save()} disabled={!dirty || isPending} className="shrink-0">{isPending ? "Salvando..." : "Salvar identidade"}</Button>}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Logo e cor" description="Aparecem na capa, nos títulos e nos destaques.">
          <div className="flex items-center gap-4">
            <div className="h-16 w-40 rounded-md border bg-white flex items-center justify-center overflow-hidden">
              {form.logoUrl ? <img src={form.logoUrl} alt="Logo" className="max-h-14 max-w-36 object-contain" /> : <span className="text-xs text-muted-foreground">Sem logo</span>}
            </div>
            {canUpdate && (
              <div className="grid gap-1">
                <input ref={file} type="file" accept="image/*" className="hidden" onChange={(event) => uploadLogo(event.target.files)} />
                <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => file.current?.click()}>{uploading ? "Enviando..." : "Trocar a logo"}</Button>
                <p className="text-xs text-muted-foreground">Prefira fundo transparente ou branco.</p>
              </div>
            )}
          </div>
          <div>
            <Label className="text-xs">Cor de destaque</Label>
            <div className="mt-1 flex items-center gap-3">
              <ColorPickerInput value={form.color} onChange={(color) => { if (canUpdate && /^#[0-9a-f]{6}$/i.test(color)) set("color", color.toUpperCase()); }} />
              <span className="inline-block h-8 w-24 rounded-md border" style={{ background: form.color }} aria-hidden="true" />
              <code className="text-xs text-muted-foreground">{form.color}</code>
            </div>
          </div>
          <div>
            <Label htmlFor="brandTagline" className="text-xs">Frase de apresentação (aparece na capa)</Label>
            <ShadInput id="brandTagline" className="mt-1" value={form.tagline} maxLength={200} disabled={!canUpdate} onChange={(event) => set("tagline", event.target.value)}
              placeholder="Ex.: Especialistas em trabalhos em altura e espaços confinados" />
          </div>
        </Card>

        <Card title="Contato (rodapé da proposta)" description="Telefone, e-mail, site e endereço que o cliente vê no fim do documento.">
          <div className="grid sm:grid-cols-2 gap-3">
            <div><Label htmlFor="brandPhone" className="text-xs">Telefone ou WhatsApp</Label>
              <ShadInput id="brandPhone" className="mt-1" value={form.phone} maxLength={60} disabled={!canUpdate} onChange={(event) => set("phone", event.target.value)} /></div>
            <div><Label htmlFor="brandEmail" className="text-xs">E-mail</Label>
              <ShadInput id="brandEmail" type="email" className="mt-1" value={form.email} maxLength={255} disabled={!canUpdate} onChange={(event) => set("email", event.target.value)} /></div>
            <div><Label htmlFor="brandSite" className="text-xs">Site</Label>
              <ShadInput id="brandSite" className="mt-1" value={form.website} maxLength={255} disabled={!canUpdate} onChange={(event) => set("website", event.target.value)} /></div>
            <div><Label htmlFor="brandAddress" className="text-xs">Endereço</Label>
              <ShadInput id="brandAddress" className="mt-1" value={form.address} maxLength={255} disabled={!canUpdate} onChange={(event) => set("address", event.target.value)} /></div>
          </div>
          <p className="text-xs text-muted-foreground">O telefone também vira o botão "Tirar dúvida" (WhatsApp) na página que o cliente abre.</p>
        </Card>
      </div>

      <Card title="Dados do orçamento" description="Aparecem no modelo de orçamento: as inscrições no cabeçalho, ao lado do CNPJ, e os dados bancários depois dos vencimentos.">
        <div className="grid lg:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="brandRegistrations" className="text-xs">Inscrições (uma por linha)</Label>
            <Textarea id="brandRegistrations" className="mt-1" rows={4} maxLength={300} disabled={!canUpdate} value={form.registrations ?? ""} onChange={(event) => set("registrations", event.target.value)}
              placeholder={"Inscrição Estadual: 0000000-00\nInscrição Municipal: 0000"} />
          </div>
          <div>
            <Label htmlFor="brandPayment" className="text-xs">Dados bancários</Label>
            <Textarea id="brandPayment" className="mt-1" rows={4} maxLength={1000} disabled={!canUpdate} value={form.payment ?? ""} onChange={(event) => set("payment", event.target.value)}
              placeholder={"Banco: ...\nAgência: ...\nConta corrente: ...\nChave PIX: ...\nBeneficiário: ..."} />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div><Label htmlFor="brandServiceEmail" className="text-xs">E-mail de tratativas — serviços</Label>
            <ShadInput id="brandServiceEmail" type="email" className="mt-1" value={form.serviceEmail ?? ""} maxLength={255} disabled={!canUpdate} onChange={(event) => set("serviceEmail", event.target.value)} /></div>
          <div><Label htmlFor="brandTrainingEmail" className="text-xs">E-mail de tratativas — treinamentos</Label>
            <ShadInput id="brandTrainingEmail" type="email" className="mt-1" value={form.trainingEmail ?? ""} maxLength={255} disabled={!canUpdate} onChange={(event) => set("trainingEmail", event.target.value)} /></div>
        </div>
        <p className="text-xs text-muted-foreground">
          Em branco, o bloco de dados bancários não aparece na proposta. O endereço do cabeçalho vem do cadastro da empresa.
          O e-mail de tratativas aparece no fim da proposta, conforme o tipo dela; em branco, vale o e-mail do contato.
        </p>
      </Card>

      <Card title="Quem somos" description="Um parágrafo curto sobre a empresa. Fale do que o cliente ganha, não só da sua história.">
        <Textarea value={form.about} rows={4} maxLength={2000} disabled={!canUpdate} aria-label="Quem somos" onChange={(event) => set("about", event.target.value)}
          placeholder="Ex.: Há 12 anos executamos serviços em altura e espaços confinados para a indústria, com equipe própria, certificada e supervisionada por engenheiro de segurança." />
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Números de impacto" description="Até 4. Números concretos convencem mais que adjetivos.">
          {form.highlights.map((row, index) => (
            <div key={index} className="flex items-center gap-2">
              <ShadInput className="w-28" value={row.value} maxLength={20} disabled={!canUpdate} placeholder="+500" aria-label={`Número ${index + 1}`} onChange={(event) => list("highlights").update(index, { value: event.target.value })} />
              <ShadInput className="flex-1" value={row.label} maxLength={60} disabled={!canUpdate} placeholder="profissionais treinados" aria-label={`Descrição do número ${index + 1}`} onChange={(event) => list("highlights").update(index, { label: event.target.value })} />
              {removeButton(() => list("highlights").remove(index), `Remover o número ${index + 1}`)}
            </div>
          ))}
          {canUpdate && form.highlights.length < 4 && (
            <div><Button type="button" variant="outline" size="sm" onClick={() => set("highlights", [...form.highlights, { value: "", label: "" }])}><Icon name="plus" className="w-4 h-4 mr-1" /> Adicionar número</Button></div>
          )}
        </Card>

        <Card title="Diferenciais" description="Até 6. Certificações, equipe, equipamentos, segurança, prazo.">
          {form.differentials.map((row, index) => (
            <div key={index} className="flex items-start gap-2">
              <div className="flex-1 grid gap-1">
                <ShadInput value={row.title} maxLength={80} disabled={!canUpdate} placeholder="Equipe certificada" aria-label={`Diferencial ${index + 1}`} onChange={(event) => list("differentials").update(index, { title: event.target.value })} />
                <ShadInput value={row.text} maxLength={300} disabled={!canUpdate} placeholder="NR-35 e NR-33 em dia, com supervisão de engenheiro" aria-label={`Detalhe do diferencial ${index + 1}`} onChange={(event) => list("differentials").update(index, { text: event.target.value })} />
              </div>
              {removeButton(() => list("differentials").remove(index), `Remover o diferencial ${index + 1}`)}
            </div>
          ))}
          {canUpdate && form.differentials.length < 6 && (
            <div><Button type="button" variant="outline" size="sm" onClick={() => set("differentials", [...form.differentials, { title: "", text: "" }])}><Icon name="plus" className="w-4 h-4 mr-1" /> Adicionar diferencial</Button></div>
          )}
        </Card>
      </div>

      <Card title="Depoimentos de clientes" description="Até 3. Use só depoimentos reais e autorizados pelo cliente.">
        {form.testimonials.map((row, index) => (
          <div key={index} className="flex items-start gap-2">
            <div className="flex-1 grid gap-1">
              <Textarea value={row.quote} rows={2} maxLength={500} disabled={!canUpdate} placeholder="O que o cliente disse" aria-label={`Depoimento ${index + 1}`} onChange={(event) => list("testimonials").update(index, { quote: event.target.value })} />
              <div className="grid sm:grid-cols-2 gap-1">
                <ShadInput value={row.author} maxLength={80} disabled={!canUpdate} placeholder="Nome e cargo" aria-label={`Autor do depoimento ${index + 1}`} onChange={(event) => list("testimonials").update(index, { author: event.target.value })} />
                <ShadInput value={row.company} maxLength={80} disabled={!canUpdate} placeholder="Empresa" aria-label={`Empresa do depoimento ${index + 1}`} onChange={(event) => list("testimonials").update(index, { company: event.target.value })} />
              </div>
            </div>
            {removeButton(() => list("testimonials").remove(index), `Remover o depoimento ${index + 1}`)}
          </div>
        ))}
        {canUpdate && form.testimonials.length < 3 && (
          <div><Button type="button" variant="outline" size="sm" onClick={() => set("testimonials", [...form.testimonials, { quote: "", author: "", company: "" }])}><Icon name="plus" className="w-4 h-4 mr-1" /> Adicionar depoimento</Button></div>
        )}
      </Card>
    </div>
  );
}
