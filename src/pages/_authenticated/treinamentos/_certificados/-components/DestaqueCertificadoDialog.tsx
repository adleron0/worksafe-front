import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Dialog from "@/components/general-components/Dialog";
import Icon from "@/components/general-components/Icon";
import Input from "@/components/general-components/Input";
import Select from "@/components/general-components/Select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { put } from "@/services/api";
import {
  DEFAULT_PATTERN,
  HIGHLIGHT_DEFAULT_LABEL,
  HIGHLIGHT_PATTERN_OPTIONS,
  HIGHLIGHT_THEMES,
  patternInfo,
  themeInfo,
  type HighlightPattern,
} from "@/components/general-components/visualizadorCertificados/highlight";
import { ICertificate } from "../-interfaces/entity.interface";

// ============================================================================
// Destaque de um certificado emitido (aluno destaque), direto da lista de
// Certificados — o mesmo que o menu da turma → Alunos destaque, para um só.
// ============================================================================

type Theme = "ouro" | "prata" | "holografico";

export default function DestaqueCertificadoDialog({
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
  const [student, setStudent] = useState(!!item.highlightStudent);
  const [theme, setTheme] = useState<Theme | null>((item.highlightTheme as Theme) || null);
  const [label, setLabel] = useState(item.highlightLabel || "");
  const [pattern, setPattern] = useState<HighlightPattern | null>(
    (item.highlightPattern as HighlightPattern) || null,
  );
  const classTheme = themeInfo(item.class?.highlightTheme);

  const { mutate: save, isPending } = useMutation({
    // vazio = usar o padrão (a API trata "" como limpar)
    mutationFn: () =>
      put("trainee-certificate", `${item.id}`, {
        highlightStudent: student,
        highlightTheme: student ? theme || "" : "",
        highlightLabel: student ? label.trim() : "",
        highlightPattern: student ? pattern || "" : "",
      } as never),
    onSuccess: () => {
      toast({
        title: student ? "Aluno destaque marcado" : "Destaque removido",
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: ["listCertificados"] });
      queryClient.invalidateQueries({ queryKey: ["highlightCandidates"] });
      onOpenChange(false);
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast({
        title: "Erro ao salvar",
        description: error.response?.data?.message || "Tente novamente.",
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Destaque do certificado"
      description={`${item.trainee?.name ?? "Aluno"} — ${item.course?.name ?? ""}`}
      showBttn={false}
      className="sm:max-w-md"
      classNameContent="h-auto max-h-[65vh] pb-2"
      footer={
        <div className="flex w-full justify-end">
          <Button type="button" disabled={isPending} onClick={() => save()}>
            {isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {classTheme && (
          <div className="flex items-start gap-2 rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            <Icon name={classTheme.icon} className="mt-0.5 h-4 w-4 shrink-0" />
            A turma {item.class?.name} é especial (tema {classTheme.name}): este certificado já tem
            destaque. Marcar como aluno destaque soma a faixa própria.
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <div>
            <label htmlFor={`destaque-cert-${item.id}`} className="cursor-pointer text-sm font-medium">
              Aluno destaque
            </label>
            <p className="text-xs text-muted-foreground">
              Brilho na página do certificado e selo nos arquivos baixados e impressos.
            </p>
          </div>
          <Switch id={`destaque-cert-${item.id}`} checked={student} onCheckedChange={setStudent} />
        </div>

        {student && (
          <div className="grid gap-3">
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Tema</p>
              <Select
                name="highlightTheme"
                options={HIGHLIGHT_THEMES.map((t) => ({ id: t.id, name: t.name }))}
                state={theme ?? ""}
                onChange={(_, value) => setTheme((value as Theme) || null)}
                placeholder={`${classTheme?.name ?? "Ouro"} (padrão)`}
                clearable
              />
            </div>
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Padronagem do centro</p>
              <Select
                name="highlightPattern"
                options={HIGHLIGHT_PATTERN_OPTIONS}
                state={pattern ?? ""}
                onChange={(_, value) => setPattern((value as HighlightPattern) || null)}
                placeholder={`${
                  patternInfo(
                    item.class?.highlightPattern ??
                      DEFAULT_PATTERN[theme ?? (item.class?.highlightTheme as Theme) ?? "ouro"],
                  )?.name
                } (padrão)`}
                clearable
              />
            </div>
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Texto da faixa</p>
              <Input
                name="highlightLabel"
                placeholder={HIGHLIGHT_DEFAULT_LABEL.aluno}
                value={label}
                onValueChange={(_, value) => setLabel(String(value ?? ""))}
              />
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}
