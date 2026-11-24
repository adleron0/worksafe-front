import { useState } from "react";
// Serviços
import { useQuery } from "@tanstack/react-query";
import { get } from "@/services/api";
import useVerify from "@/hooks/use-verify";
// Template Page list-form
import ListToolbar from "@/components/general-components/ListToolbar";
import ListFooter from "@/components/general-components/ListFooter";
import DataTable, { EmptyState } from "@/components/general-components/DataTable";
import SideForm from "@/components/general-components/SideForm";
import Icon from "@/components/general-components/Icon";
import { Button } from "@/components/ui/button";
import Form from "./TurmasInstrutoresForm";
import TurmasInstrutoresRowActions from "./TurmasInstrutoresRowActions";
import { turmasInstrutoresColumns } from "./turmasInstrutoresColumns";
import { LIMITS } from "../../-shared/lista";
// Interfaces
import { IEntity } from "./interfaces/entity.interface";
import { ApiError } from "@/general-interfaces/api.interface";

const List = ({ classId }: { classId: number }) => {
  const { can } = useVerify();
  const [openForm, setOpenForm] = useState(false);
  const [formData, setFormData] = useState<IEntity>();
  const [searchParams, setSearchParams] = useState({
    limit: 10,
    page: 0,
    show: ['class', 'instructor'],
    classId: classId,
    'order-id': 'desc',
  });

  // Define variáveis de entidade
  const entity = {
    name: "Instrutor da Turma",
    pluralName: "Instrutores da Turma",
    model: "class-instructors",
    ability: "classes",
  }

  interface Response {
    rows: IEntity[];
    total: number;
  }

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery<Response | undefined, ApiError>({
    queryKey: [`list${entity.pluralName}`, searchParams],
    queryFn: async () => {
      const params = Object.keys(searchParams).map((key) => ({
        key,
        value: searchParams[key as keyof typeof searchParams]
      }));
      return get(entity.model, '', params);
    },
  });

  if (!can(`view_${entity.ability}`)) return null;

  const canCreate = can(`create_${entity.ability}`);
  const openNew = () => { setFormData(undefined); setOpenForm(true); };

  return (
    <div className="flex flex-col gap-3">
      {canCreate && (
        <ListToolbar>
          <Button onClick={openNew}><Icon name="plus" className="w-4 h-4" /> <span className="hidden sm:inline">Vincular instrutor</span></Button>
        </ListToolbar>
      )}

      <DataTable rows={data?.rows} columns={turmasInstrutoresColumns} getRowId={(item) => item.id ?? item.instructorId ?? 0} ariaLabel={entity.pluralName} minWidth={480}
        loading={isLoading || isFetching} error={isError ? error?.response?.data?.message || "erro desconhecido" : null} onRetry={() => refetch()}
        rowClassName={(item) => (item.inactiveAt ? "opacity-60" : undefined)}
        actions={(item) => <TurmasInstrutoresRowActions item={item} entity={entity} />}
        empty={<EmptyState title="Nenhum instrutor vinculado a esta turma." action={canCreate && <Button size="sm" onClick={openNew}><Icon name="plus" className="w-4 h-4" /> Vincular instrutor</Button>} />} />

      <ListFooter total={data?.total ?? 0} page={searchParams.page} limit={searchParams.limit} limits={LIMITS}
        onPageChange={(page) => setSearchParams((prev) => ({ ...prev, page }))}
        onLimitChange={(limit) => setSearchParams((prev) => ({ ...prev, limit, page: 0 }))} />

      {/* Formulário de cadastro */}
      <SideForm
        openSheet={openForm}
        setOpenSheet={setOpenForm}
        title={formData 
          ? `Editar ${entity.name}`
          : `Vincular ${entity.name}`}
        description={formData 
          ? `Atenção com a ação a seguir, ela irá alterar os dados do ${entity.name}.`
          : `Por favor, preencha com atenção todas as informações necessárias para vincular ${entity.name}.`}
        side="right"
        form={ <Form formData={formData} openSheet={setOpenForm} entity={entity} classId={classId} /> }
      />
    </div>
  );
};

export default List;
