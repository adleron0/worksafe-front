import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Dialog from "@/components/general-components/Dialog";
import Icon from "@/components/general-components/Icon";
import Input from "@/components/general-components/Input";
import Select from "@/components/general-components/Select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { get, patch, put } from "@/services/api";
import { ICertificate } from "../-interfaces/entity.interface";

// ============================================================================
// Cancelar um certificado emitido. Quem ler o QR depois vê "Certificado
// cancelado em …" com o motivo e, se houve reemissão, o link para o novo.
// ============================================================================

const REASONS = [
  { id: "Emitido com dados errados e reemitido", name: "Emitido com dados errados (reemitido)" },
  { id: "Emitido por engano", name: "Emitido por engano" },
  { id: "Aluno não concluiu o treinamento", name: "Aluno não concluiu o treinamento" },
  { id: "Uso indevido do certificado", name: "Uso indevido do certificado" },
  { id: "outro", name: "Outro motivo" },
];

export default function CancelarCertificadoDialog({
  item,
  open,
  onOpenChange,
}: {
  item: ICertificate;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [reason, setReason] = useState<string>(REASONS[0].id);
  const [other, setOther] = useState("");
  const [replacedBy, setReplacedBy] = useState<string>("");

  // outros certificados ativos do mesmo aluno: candidatos a substituto
  const { data: siblings = [] } = useQuery({
    queryKey: ["cancel-siblings", item.traineeId, item.id],
    enabled: open && !!item.traineeId,
    queryFn: async () => {
      const res = await get<{ rows: ICertificate[] }>("trainee-certificate", "", [
        { key: "traineeId", value: item.traineeId },
        { key: "active", value: true },
        { key: "show", value: ["course", "class"] },
        { key: "order-createdAt", value: "desc" },
        { key: "limit", value: 30 },
      ]);
      return (res?.rows ?? []).filter((c) => c.id !== item.id && c.key);
    },
  });

  const finalReason = reason === "outro" ? other.trim() : reason;

  const { mutate: cancel, isPending } = useMutation({
    mutationFn: async () => {
      await put("trainee-certificate", `${item.id}`, {
        cancelReason: finalReason || null,
        replacedByKey: replacedBy || null,
      } as never);
      return patch("trainee-certificate", `inactive/${item.id}`);
    },
    onSuccess: () => {
      toast({ title: "Certificado cancelado", variant: "success" });
      queryClient.invalidateQueries({ queryKey: ["listCertificados"] });
      onOpenChange(false);
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast({
        title: "Erro ao cancelar",
        description: error.response?.data?.message || "Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const fmt = (d?: string | Date) => (d ? new Date(d).toLocaleDateString("pt-BR") : "");

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Cancelar certificado"
      description={`${item.trainee?.name ?? "Aluno"} — ${item.course?.name ?? ""}`}
      showBttn={false}
      className="sm:max-w-md"
      classNameContent="h-auto max-h-[65vh] pb-2"
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Voltar
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={isPending || (reason === "outro" && !other.trim())}
            onClick={() => cancel()}
          >
            {isPending ? "Cancelando..." : "Cancelar certificado"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-2 rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0" />
          Quem ler o QR verá “Certificado cancelado”, com a data e o motivo. O certificado deixa de
          aparecer na vitrine e não pode mais ser baixado. Dá para reativar depois.
        </div>

        <div>
          <p className="mb-1 text-xs text-muted-foreground">Motivo</p>
          <Select
            name="cancelReason"
            options={REASONS}
            state={reason}
            onChange={(_, value) => setReason(String(value || REASONS[0].id))}
          />
          {reason === "outro" && (
            <div className="mt-2">
              <Input
                name="cancelReasonOther"
                placeholder="Descreva o motivo (aparece na página pública)"
                value={other}
                onValueChange={(_, value) => setOther(String(value ?? "").slice(0, 255))}
              />
            </div>
          )}
        </div>

        <div>
          <p className="mb-1 text-xs text-muted-foreground">Substituído por (opcional)</p>
          <Select
            name="replacedByKey"
            options={siblings.map((c) => ({
              id: String(c.key),
              name: `${c.course?.name ?? "Certificado"}${c.class?.name ? ` · ${c.class.name}` : ""} · ${fmt(c.createdAt)}`,
            }))}
            state={replacedBy}
            onChange={(_, value) => setReplacedBy(String(value || ""))}
            placeholder={siblings.length ? "Nenhum" : "O aluno não tem outro certificado ativo"}
            disabled={!siblings.length}
            clearable
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            A página do certificado cancelado vai levar a quem ler o QR para o novo.
          </p>
        </div>
      </div>
    </Dialog>
  );
}
