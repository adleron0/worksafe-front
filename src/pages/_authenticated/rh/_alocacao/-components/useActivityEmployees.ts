import { useQuery } from "@tanstack/react-query";
import { todayIso } from "../../../comercial/-shared/commercial";
import { ALLOCATION_KEY, Allocation } from "../../-shared/allocation";
import { employeesApi } from "../../-shared/employees";

/** Quem pode entrar numa atividade: os funcionários do mapa de alocação que não foram desligados (mesma consulta do mapa). */
export function useActivityEmployees() {
  const today = todayIso();
  const params = { from: today, to: today };
  return useQuery({
    queryKey: [ALLOCATION_KEY, params],
    queryFn: () => employeesApi.get<Allocation>("allocation", params),
    select: (data) => data.employees.filter((employee) => employee.status !== "desligado").map(({ id, name }) => ({ id, name })),
  });
}
