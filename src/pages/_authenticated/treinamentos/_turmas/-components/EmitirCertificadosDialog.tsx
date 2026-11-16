import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import Dialog from "@/components/general-components/Dialog";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { get, put } from "@/services/api";
import { generateSelectiveCertificates } from "@/services/certificateService";
import { themeInfo } from "@/components/general-components/visualizadorCertificados/highlight";

// ============================================================================
// Emitir certificados da turma: lista as inscrições confirmadas, deixa
// escolher quem recebe (padrão: quem ainda não tem e não reprovou na prova)
// e marcar o aluno destaque já na emissão. Usa a emissão seletiva da API
// (novos são criados; os já emitidos são atualizados mantendo o vencimento).
// ============================================================================

interface IssuedCertificate {
  id: number;
  key: string;
  createdAt: string;
  highlightStudent: boolean;
}

interface IssuanceRow {
  subscriptionId: number;
  traineeId: number | null;
  name: string;
  cpf: string;
  workedAt?: string | null;
  imageUrl?: string | null;
  certificate: IssuedCertificate | null;
  examScore: number | null;
  examPassed: boolean | null;
  suggested: boolean;
}

interface IssuanceResponse {
  class: {
    id: number;
    name: string;
    allowExam: boolean;
    highlightTheme: string | null;
    certificate: { id: number; name: string } | null;
  };
  rows: IssuanceRow[];
}

const initials = (name?: string) =>
  (name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

const maskCpf = (cpf?: string) => {
  const d = (cpf || "").replace(/\D/g, "");
  return d.length === 11 ? `${d.slice(0, 3)}.***.***-${d.slice(9)}` : cpf || "";
};

export default function EmitirCertificadosDialog({
  classId,
  open,
  onOpenChange,
}: {
  classId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [highlight, setHighlight] = useState<Record<number, boolean>>({});

  const queryKey = ["certificateIssuance", classId];
  const { data, isLoading } = useQuery<IssuanceResponse | undefined>({
    queryKey,
    queryFn: () => get<IssuanceResponse>("classes", `${classId}/certificate-issuance`),
    enabled: open,
  });
  const rows = useMemo(() => data?.rows ?? [], [data]);

  // estado inicial: seleciona quem ainda não tem certificado e não reprovou
  useEffect(() => {
    if (!data) return;
    setSelected(
      new Set(
        data.rows
          .filter((r) => !r.certificate && r.examPassed !== false)
          .map((r) => r.subscriptionId),
      ),
    );
    setHighlight(
      Object.fromEntries(data.rows.map((r) => [r.subscriptionId, !!r.certificate?.highlightStudent])),
    );
  }, [data]);

  const toggle = (id: number, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  const allChecked = rows.length > 0 && rows.every((r) => selected.has(r.subscriptionId));
  const someChecked = rows.some((r) => selected.has(r.subscriptionId));

  const reissue = rows.filter((r) => selected.has(r.subscriptionId) && r.certificate).length;
  const highlightChanges = rows.filter(
    (r) =>
      (r.certificate || selected.has(r.subscriptionId)) &&
      highlight[r.subscriptionId] !== !!r.certificate?.highlightStudent,
  ).length;
  const noModel = data && !data.class.certificate;
  const canSubmit = !noModel && (selected.size > 0 || highlightChanges > 0);

  const { mutate: submit, isPending } = useMutation({
    mutationFn: async () => {
      let summary = { created: 0, updated: 0, skipped: 0 };
      if (selected.size > 0) {
        const res = await generateSelectiveCertificates(classId, [...selected]);
        summary = {
          created: res.data.newCertificates,
          updated: res.data.updatedCertificates,
          skipped: res.data.skippedStudents.length,
        };
      }
      // destaque: aplica nos certificados (inclusive os recém-criados)
      const fresh = await get<IssuanceResponse>("classes", `${classId}/certificate-issuance`);
      let marked = 0;
      for (const r of fresh?.rows ?? []) {
        const want = highlight[r.subscriptionId];
        if (!r.certificate || want === undefined || want === r.certificate.highlightStudent) continue;
        // vazio = usar o padrão (a API trata "" como limpar)
        await put("trainee-certificate", `${r.certificate.id}`, {
          highlightStudent: want,
          ...(want ? {} : { highlightTheme: "", highlightLabel: "", highlightPattern: "", highlightBorder: "" }),
        } as never);
        marked++;
      }
      return { ...summary, marked };
    },
    onSuccess: ({ created, updated, skipped, marked }) => {
      const parts = [
        created && `${created} emitido(s)`,
        updated && `${updated} atualizado(s)`,
        skipped && `${skipped} ignorado(s)`,
        marked && `${marked} destaque(s) alterado(s)`,
      ].filter(Boolean);
      toast({ title: "Certificados", description: parts.join(" · ") || "Nada a fazer.", variant: "success" });
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["listCertificados"] });
      queryClient.invalidateQueries({ queryKey: ["highlightCandidates", classId] });
      onOpenChange(false);
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      toast({
        title: "Erro ao emitir certificados",
        description: error.response?.data?.message || error.message || "Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const classTheme = themeInfo(data?.class.highlightTheme);
  const submitLabel = isPending
    ? "Emitindo..."
    : selected.size > 0
      ? `Emitir ${selected.size} certificado${selected.size > 1 ? "s" : ""}`
      : "Salvar destaques";

  const submitButton = (
    <Button type="button" disabled={!canSubmit || isPending} onClick={reissue ? undefined : () => submit()}>
      <Icon name="award" className="mr-2 h-4 w-4" />
      {submitLabel}
    </Button>
  );

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Emitir certificados"
      description="Escolha os alunos confirmados que recebem o certificado e marque quem é destaque."
      showBttn={false}
      className="sm:max-w-3xl"
      classNameContent="h-auto max-h-[62vh] pb-2"
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            {selected.size} selecionado(s)
            {reissue > 0 && ` · ${reissue} já emitido(s) será(ão) atualizado(s)`}
            {highlightChanges > 0 && ` · ${highlightChanges} destaque(s) alterado(s)`}
          </span>
          {reissue > 0 && canSubmit ? (
            <ConfirmDialog
              title="Atualizar certificados já emitidos?"
              description={`${reissue} aluno(s) selecionado(s) já têm certificado. Eles serão gerados de novo com o modelo atual, mantendo a chave, o QR e o vencimento original.`}
              onConfirm={() => submit()}
            >
              {submitButton}
            </ConfirmDialog>
          ) : (
            submitButton
          )}
        </div>
      }
    >
      {data?.class && (
        <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span>
            Turma: <span className="font-medium">{data.class.name}</span>
          </span>
          {data.class.certificate && (
            <span className="text-muted-foreground">
              Modelo: <span className="font-medium text-foreground">{data.class.certificate.name}</span>
            </span>
          )}
        </div>
      )}

      {noModel && (
        <div className="mb-3 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
          <Icon name="triangle-alert" className="mt-0.5 h-4 w-4 shrink-0" />
          Esta turma não tem modelo de certificado. Edite a turma e escolha o modelo antes de emitir.
        </div>
      )}
      {classTheme && (
        <div className="mb-3 flex items-center gap-2 rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <Icon name={classTheme.icon} className="h-4 w-4" />
          Turma especial (tema {classTheme.name}): todos os certificados já saem com destaque.
        </div>
      )}

      {isLoading && <p className="py-6 text-center text-sm text-muted-foreground">Carregando...</p>}
      {!isLoading && rows.length === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma inscrição confirmada nesta turma.</p>
      )}

      {rows.length > 0 && (
        <TooltipProvider delayDuration={200}>
          <div className="mb-1 flex items-center gap-3 border-b border-border/60 px-1 pb-2 text-xs text-muted-foreground">
            <Checkbox
              checked={allChecked ? true : someChecked ? "indeterminate" : false}
              onCheckedChange={(v) =>
                setSelected(v ? new Set(rows.map((r) => r.subscriptionId)) : new Set())
              }
              aria-label="Selecionar todos"
            />
            <span className="flex-1">Aluno</span>
            <span className="w-24 text-center">Situação</span>
            <span className="w-14 text-center">Destaque</span>
          </div>
          <div className="divide-y divide-border/60">
            {rows.map((r) => {
              const isSel = selected.has(r.subscriptionId);
              const canHighlight = !!r.certificate || isSel;
              const isStar = !!highlight[r.subscriptionId];
              return (
                <div key={r.subscriptionId} className="flex items-center gap-3 px-1 py-2.5">
                  <Checkbox
                    checked={isSel}
                    onCheckedChange={(v) => toggle(r.subscriptionId, !!v)}
                    aria-label={`Emitir para ${r.name}`}
                  />
                  <Avatar className="h-8 w-8">
                    {r.imageUrl && <AvatarImage src={r.imageUrl} alt="" />}
                    <AvatarFallback className="text-[10px]">{initials(r.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{r.name}</p>
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      <span>CPF {maskCpf(r.cpf)}</span>
                      {r.examScore !== null && (
                        <span className={r.examPassed === false ? "text-destructive" : ""}>
                          · Nota {r.examScore.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
                          {r.examPassed === false && " (reprovado)"}
                        </span>
                      )}
                      {r.suggested && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                          <Icon name="sparkles" className="h-3 w-3" />
                          Maior nota
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="w-24 text-center">
                    {r.certificate ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                        <Icon name="check" className="h-3 w-3" />
                        {format(new Date(r.certificate.createdAt), "dd/MM/yy")}
                      </span>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">Não emitido</span>
                    )}
                  </div>
                  <div className="flex w-14 justify-center">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            disabled={!canHighlight}
                            aria-pressed={isStar}
                            aria-label={`Aluno destaque: ${r.name}`}
                            className={isStar ? "text-amber-500 hover:text-amber-600" : "text-muted-foreground"}
                            onClick={() =>
                              setHighlight((prev) => ({ ...prev, [r.subscriptionId]: !isStar }))
                            }
                          >
                            <Icon name="star" className={`h-4 w-4 ${isStar ? "fill-current" : ""}`} />
                          </Button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        {canHighlight
                          ? isStar
                            ? "Destaque: o certificado sai com brilho e selo"
                            : "Marcar como aluno destaque"
                          : "Selecione o aluno para emitir antes de marcar"}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              );
            })}
          </div>
        </TooltipProvider>
      )}
    </Dialog>
  );
}
