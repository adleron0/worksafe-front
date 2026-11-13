import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { NumField, commercialApi, errorMessage } from "../-shared/commercial";

interface CoursePrice { courseId: number; name: string; hoursDuration: number | null; classPrice: number | null; includedStudents: number | null; studentPrice: number | null }
const KEY = "commercialCoursePrices";

/** Tabela de preço in-company por curso: é o valor sugerido dos itens de treinamento. */
export default function CoursePricesTab({ canUpdate }: { canUpdate: boolean }) {
  const { data, isLoading, error } = useQuery({ queryKey: [KEY], queryFn: () => commercialApi.get<CoursePrice[]>("course-prices") });
  return (
    <section className="rounded-lg border p-4">
      <h3 className="font-semibold">Preço de treinamento in company</h3>
      <p className="text-xs text-muted-foreground max-w-3xl">
        Valor sugerido nas propostas de treinamento. Com preço de turma: turmas × preço da turma + alunos além dos incluídos × preço por aluno.
        Só com preço por aluno: alunos × preço. Sem nada, a proposta pede o valor digitado. É sugestão: na proposta o valor continua editável.
      </p>
      {isLoading && <Skeleton className="h-40 w-full mt-3" />}
      {error && <p className="mt-3 text-sm text-destructive">{errorMessage(error)}</p>}
      {data && data.length === 0 && <p className="mt-3 text-sm text-muted-foreground">Nenhum curso ativo cadastrado em Treinamentos → Cursos.</p>}
      {data && data.length > 0 && (
        <div className="mt-3">
          <div className="hidden lg:flex gap-3 px-1 pb-1 text-xs font-medium text-muted-foreground">
            <div className="flex-1">Curso</div><div className="w-40">Preço da turma</div><div className="w-32">Alunos incluídos</div><div className="w-40">Preço por aluno</div><div className="w-24" />
          </div>
          <div className="divide-y">{data.map((row) => <PriceRow key={row.courseId} row={row} canUpdate={canUpdate} />)}</div>
        </div>
      )}
    </section>
  );
}

function PriceRow({ row, canUpdate }: { row: CoursePrice; canUpdate: boolean }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState({ classPrice: row.classPrice, includedStudents: row.includedStudents, studentPrice: row.studentPrice });
  useEffect(() => setState({ classPrice: row.classPrice, includedStudents: row.includedStudents, studentPrice: row.studentPrice }), [row]);
  const dirty = state.classPrice !== row.classPrice || state.includedStudents !== row.includedStudents || state.studentPrice !== row.studentPrice;
  const { mutate, isPending } = useMutation({
    mutationFn: () => commercialApi.put<CoursePrice>(`course-prices/${row.courseId}`, state),
    onSuccess: () => { toast({ title: `Tabela de ${row.name} salva`, variant: "success" }); queryClient.invalidateQueries({ queryKey: [KEY] }); queryClient.invalidateQueries({ queryKey: ["commercialProposalOptions"] }); },
    onError: (err) => toast({ title: "Não foi possível salvar", description: errorMessage(err), variant: "destructive" }),
  });
  const set = (key: keyof typeof state) => ({
    onChange: (value: number) => setState((prev) => ({ ...prev, [key]: value })),
    onEmpty: () => setState((prev) => ({ ...prev, [key]: null })),
  });
  return (
    <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-3 py-2">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{row.name}</p>
        {row.hoursDuration ? <p className="text-xs text-muted-foreground">{row.hoursDuration} h</p> : null}
      </div>
      <NumField className="lg:w-40" kind="money" value={state.classPrice} disabled={!canUpdate} ariaLabel={`Preço da turma de ${row.name}`} placeholder="Preço da turma" {...set("classPrice")} />
      <NumField className="lg:w-32" digits={0} value={state.includedStudents} disabled={!canUpdate} ariaLabel={`Alunos incluídos em ${row.name}`} placeholder="Alunos incluídos" {...set("includedStudents")} />
      <NumField className="lg:w-40" kind="money" value={state.studentPrice} disabled={!canUpdate} ariaLabel={`Preço por aluno de ${row.name}`} placeholder="Preço por aluno" {...set("studentPrice")} />
      <div className="lg:w-24">
        {canUpdate && <Button type="button" size="sm" variant={dirty ? "default" : "outline"} disabled={!dirty || isPending} onClick={() => mutate()}>Salvar</Button>}
      </div>
    </div>
  );
}
