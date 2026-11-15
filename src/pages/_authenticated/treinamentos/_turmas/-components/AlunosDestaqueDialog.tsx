import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Dialog from "@/components/general-components/Dialog";
import Icon from "@/components/general-components/Icon";
import Input from "@/components/general-components/Input";
import Select from "@/components/general-components/Select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { get, put } from "@/services/api";
import {
  HIGHLIGHT_DEFAULT_LABEL,
  HIGHLIGHT_THEMES,
  themeInfo,
} from "@/components/general-components/visualizadorCertificados/highlight";

// ============================================================================
// Alunos destaque da turma: lista os certificados emitidos com a nota da
// prova (sugestão: maior nota) e deixa marcar quem é destaque, com tema e
// texto da faixa opcionais. A decisão é sempre manual.
// ============================================================================

type Theme = "ouro" | "prata" | "holografico";

interface CandidateRow {
  id: number;
  key: string;
  traineeId: number;
  highlightStudent: boolean;
  highlightTheme: Theme | null;
  highlightLabel: string | null;
  trainee?: { id: number; name: string; imageUrl?: string | null } | null;
  examScore: number | null;
  examPassed: boolean | null;
  suggested: boolean;
}

interface CandidatesResponse {
  class: { id: number; name: string; highlightTheme: Theme | null; highlightLabel: string | null };
  rows: CandidateRow[];
}

type Draft = Pick<CandidateRow, "highlightStudent" | "highlightTheme" | "highlightLabel">;

const initials = (name?: string) =>
  (name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

const formatScore = (score: number | null) =>
  score === null ? "Sem prova" : `Nota ${score.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}`;

export default function AlunosDestaqueDialog({
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
  const [drafts, setDrafts] = useState<Record<number, Draft>>({});

  const { data, isLoading } = useQuery<CandidatesResponse | undefined>({
    queryKey: ["highlightCandidates", classId],
    queryFn: () => get<CandidatesResponse>("classes", `${classId}/highlight-candidates`),
    enabled: open,
  });

  // estado editável começa igual ao que está salvo
  useEffect(() => {
    if (!data?.rows) return;
    setDrafts(
      Object.fromEntries(
        data.rows.map((r) => [
          r.id,
          { highlightStudent: r.highlightStudent, highlightTheme: r.highlightTheme, highlightLabel: r.highlightLabel },
        ]),
      ),
    );
  }, [data]);

  const changed = useMemo(
    () =>
      (data?.rows ?? []).filter((r) => {
        const d = drafts[r.id];
        return (
          d &&
          (d.highlightStudent !== r.highlightStudent ||
            (d.highlightTheme ?? null) !== (r.highlightTheme ?? null) ||
            (d.highlightLabel || null) !== (r.highlightLabel || null))
        );
      }),
    [data, drafts],
  );

  const { mutate: save, isPending } = useMutation({
    mutationFn: async () => {
      for (const row of changed) {
        const d = drafts[row.id];
        // vazio = usar o padrão (a API trata "" como limpar)
        await put("trainee-certificate", `${row.id}`, {
          highlightStudent: d.highlightStudent,
          highlightTheme: d.highlightStudent ? d.highlightTheme || "" : "",
          highlightLabel: d.highlightStudent ? d.highlightLabel || "" : "",
        } as never);
      }
    },
    onSuccess: () => {
      toast({ title: "Alunos destaque salvos", variant: "success" });
      queryClient.invalidateQueries({ queryKey: ["highlightCandidates", classId] });
      queryClient.invalidateQueries({ queryKey: ["listCertificados"] });
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast({
        title: "Erro ao salvar",
        description: error.response?.data?.message || "Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const update = (id: number, patch: Partial<Draft>) =>
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const classTheme = themeInfo(data?.class.highlightTheme);
  const themeOptions = HIGHLIGHT_THEMES.map((t) => ({ id: t.id, name: t.name }));

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Alunos destaque"
      description="Marque quem é destaque nesta turma. O certificado ganha brilho na página e o selo nos arquivos baixados e impressos."
      showBttn={false}
      className="sm:max-w-2xl"
      classNameContent="h-auto max-h-[65vh] pb-2"
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            {changed.length > 0 ? `${changed.length} alteração(ões) para salvar` : "Nenhuma alteração"}
          </span>
          <Button type="button" disabled={!changed.length || isPending} onClick={() => save()}>
            {isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      }
    >
      {data?.class && (
        <p className="mb-3 text-sm">
          Turma: <span className="font-medium">{data.class.name}</span>
        </p>
      )}
      {classTheme && (
        <div className="mb-3 flex items-center gap-2 rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <Icon name={classTheme.icon} className="h-4 w-4" />
          Esta turma já é especial (tema {classTheme.name}): todos os certificados saem com destaque.
          Aqui você marca quem é destaque além disso.
        </div>
      )}

      {isLoading && <p className="py-6 text-center text-sm text-muted-foreground">Carregando...</p>}
      {!isLoading && !data?.rows?.length && (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Esta turma ainda não tem certificados emitidos.
        </p>
      )}

      <div className="divide-y">
        {data?.rows.map((row) => {
          const d = drafts[row.id];
          if (!d) return null;
          return (
            <div key={row.id} className="py-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  {row.trainee?.imageUrl && <AvatarImage src={row.trainee.imageUrl} alt="" />}
                  <AvatarFallback className="text-xs">{initials(row.trainee?.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{row.trainee?.name ?? "Aluno"}</p>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    <span>{formatScore(row.examScore)}</span>
                    {row.suggested && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                        <Icon name="sparkles" className="h-3 w-3" />
                        Sugerido: maior nota
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <label htmlFor={`destaque-${row.id}`} className="cursor-pointer">
                    Destaque
                  </label>
                  <Switch
                    id={`destaque-${row.id}`}
                    checked={d.highlightStudent}
                    onCheckedChange={(checked) => update(row.id, { highlightStudent: checked })}
                    aria-label={`Aluno destaque: ${row.trainee?.name ?? ""}`}
                  />
                </div>
              </div>

              {d.highlightStudent && (
                <div className="mt-3 grid gap-2 pl-12 sm:grid-cols-2">
                  <Select
                    name={`theme-${row.id}`}
                    options={themeOptions}
                    state={d.highlightTheme ?? ""}
                    onChange={(_, value) => update(row.id, { highlightTheme: (value as Theme) || null })}
                    placeholder={`Tema: ${classTheme?.name ?? "Ouro"} (padrão)`}
                    clearable
                  />
                  <Input
                    name={`label-${row.id}`}
                    placeholder={HIGHLIGHT_DEFAULT_LABEL.aluno}
                    value={d.highlightLabel ?? ""}
                    onValueChange={(_, value) => update(row.id, { highlightLabel: (value as string) || null })}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Dialog>
  );
}
