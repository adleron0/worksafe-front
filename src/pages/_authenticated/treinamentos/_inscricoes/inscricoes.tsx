import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useRef, useState, useEffect } from "react";
// Serviços
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, put } from "@/services/api";
import useVerify from "@/hooks/use-verify";
import { useLoader } from "@/context/GeneralContext";
import { toast } from "@/hooks/use-toast";
import { useSelection } from "@/hooks/useSelection";
import { generateSelectiveCertificates } from "@/services/certificateService";
// Template Page list-form
import PageHeader from "@/components/general-components/PageHeader";
import ListCard from "@/components/general-components/ListCard";
import ListToolbar from "@/components/general-components/ListToolbar";
import ListFooter from "@/components/general-components/ListFooter";
import ActionsMenu from "@/components/general-components/ActionsMenu";
import DataTable, { EmptyState } from "@/components/general-components/DataTable";
import SideForm from "@/components/general-components/SideForm";
import SubscriptionRowActions from "./-components/SubscriptionRowActions";
import { subscriptionColumns } from "./-components/subscriptionColumns";
import { LIMITS, countFilters } from "../-shared/lista";
import SearchForm from "./-components/SubscriptionSearch";
import SubscriptionForm from "./-components/SubscriptionForm";
import SubscriptionCard from "./-components/SubscriptionCard";
import KanbanView, { KanbanColumn } from "@/components/general-components/KanbanView";
// UI Components
import { Button } from "@/components/ui/button";
import Icon from "@/components/general-components/Icon";
import Select from "@/components/general-components/Select";
// Interfaces
import { IEntity } from "./-interfaces/entity.interface";
import { SUBSCRIPTION_ENTITY } from "./-entity";
import { ApiError } from "@/general-interfaces/api.interface";

const SELECTION_KEY = "inscricoes-curso-turma";

export const Route = createFileRoute('/_authenticated/treinamentos/_inscricoes/inscricoes')({
  component: List,
})

function List({ classId, modalPopover }: { classId?: number; modalPopover?: boolean } = {}) {
  const { can } = useVerify();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showLoader, hideLoader } = useLoader();
  const [openSearch, setOpenSearch] = useState(false);
  const [openForm, setOpenForm] = useState(false);
  const [formData, setFormData] = useState<IEntity>();
  
  // Recuperar preferência salva do localStorage
  const getStoredViewMode = (): 'list' | 'kanban' => {
    const stored = localStorage.getItem('subscription-view-mode');
    return (stored as 'list' | 'kanban') || 'list';
  };
  
  // Curso e turma escolhidos na tela de inscrições: guardados na aba para não se perderem
  // ao voltar da tela de cadastro/edição (dentro da turma o classId já vem fixo).
  const [storedSelection] = useState<{ courseId?: number; classId?: number }>(() => {
    if (classId) return {};
    try { return JSON.parse(sessionStorage.getItem(SELECTION_KEY) || "{}"); } catch { return {}; }
  });
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>(getStoredViewMode());
  const [courseId, setCourseId] = useState<number | string | undefined>(storedSelection.courseId);
  const [searchParams, setSearchParams] = useState<Record<string, any>>({
    limit: getStoredViewMode() === 'kanban' ? 'all' : 10,
    page: 0,
    show: ['class', 'financialRecords'],
    classId: classId ? Number(classId) : undefined,
    'order-name': 'asc',
  });
  const initialFormRef = useRef(searchParams);
  // A turma guardada entra depois do estado inicial: "limpar filtros" continua sem turma, como antes.
  useEffect(() => {
    if (storedSelection.classId) setSearchParams((prev) => ({ ...prev, classId: storedSelection.classId }));
  }, [storedSelection]);
  useEffect(() => {
    if (classId) return;
    try { sessionStorage.setItem(SELECTION_KEY, JSON.stringify({ courseId, classId: searchParams.classId })); } catch { /* sem armazenamento: só não lembra */ }
  }, [classId, courseId, searchParams.classId]);

  // Interface para um único item da classe
  interface ClassItem {
    id: number;
    name: string;
    active: boolean;
    initialDate: string;
  }

  // Tipo que o Select espera
  interface SelectOption {
    [key: string]: string | number;
  }

  const { 
    data: courseData, 
    isLoading: isLoadingCourses,
  } = useQuery<SelectOption[], ApiError>({
    queryKey: [`listCoursesOptions`],
    queryFn: async () => {
      const params = [
        { key: 'all', value: true },
        { key: 'order-name', value: 'asc' },
      ];
      const response = await get('courses', '', params) as { rows: ClassItem[] };
      if (!response.rows.length) {
          return [];
        }
      
      return response?.rows?.map((item: ClassItem) => ({
        id: item.id,
        name: item.name,
      }));
    },
    enabled: !classId
  });

  const { 
    data: classesData, 
    isLoading: isLoadingClasses,
  } = useQuery<SelectOption[], ApiError>({
    queryKey: [`listClassesOptions`, courseId],
    queryFn: async () => {
      const params = [
        { key: 'all', value: true },
        { key: 'order-name', value: 'asc' },
        { key: 'courseId', value: courseId || undefined },
      ];
      const response = await get('classes', '', params) as { rows: ClassItem[] };
      if (!response.rows.length) {
          return [];
        }
      
      return response?.rows?.map((item: ClassItem) => ({
        id: item.id,
        name: `${item.name} (${new Date(item.initialDate).toLocaleDateString('pt-BR')})`,
      }));
    },
    enabled: !classId && !!courseId
  });
  
  // Salvar preferência quando mudar
  useEffect(() => {
    localStorage.setItem('subscription-view-mode', viewMode);
  }, [viewMode]);

  // Define variáveis de entidade
  const entity = SUBSCRIPTION_ENTITY;

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
    enabled: !!searchParams.classId || !!classId,
  });

  const handleSearch = async (params: Record<string, unknown>) => {
    setSearchParams((prev) => ({
      ...prev,
      ...params,
    }));
  };

  const handleClear = () => {
    setSearchParams(initialFormRef.current);
  };
  
  // Configuração das colunas do Kanban
  const kanbanColumns: KanbanColumn[] = [
    { 
      id: 'pending', 
      name: 'Pendente', 
      value: 'pending',
      color: '#fbc02d'
    },
    { 
      id: 'confirmed', 
      name: 'Confirmado', 
      value: 'confirmed',
      color: '#22c55e'
    },
    { 
      id: 'declined', 
      name: 'Recusado', 
      value: 'declined',
      color: '#ef4444'
    },
  ];

  // Mutation para alterar status
  const { mutate: changeStatus } = useMutation({
    mutationFn: ({ newStatus, itemId }: { newStatus: string | number; itemId: string | number; item: IEntity }) => {
      showLoader(`Atualizando status...`);
      return put<IEntity>("subscription", `${itemId}`, { 
        // ...item,
        subscribeStatus: newStatus as "pending" | "confirmed" | "declined"
      });
    },
    onSuccess: () => {
      hideLoader();
      toast({
        title: "Status atualizado!",
        description: "O status foi atualizado com sucesso.",
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: [`list${entity.pluralName}`] });
    },
    onError: (error: ApiError) => {
      hideLoader();
      toast({
        title: "Erro ao atualizar status",
        description: error.response?.data?.message || "Erro desconhecido.",
        variant: "destructive",
      });
    }
  });

  // Handler para mudança de status no Kanban
  const handleKanbanStatusChange = (newStatus: string | number, itemId: string | number, item: IEntity) => {
    changeStatus({ newStatus, itemId, item });
  };

  // Sistema de seleção (filtrar items sem id)
  const selection = useSelection(
    (data?.rows || []).filter((item): item is IEntity & { id: number } => typeof item.id === 'number')
  );

  // Mutation para gerar certificados seletivamente
  const { mutate: generateCertificates } = useMutation({
    mutationFn: () => {
      if (!selection.selectedIds.length) {
        throw new Error('Nenhuma inscrição selecionada');
      }

      const classIdToUse = Number(searchParams.classId) || Number(classId);
      if (!classIdToUse) {
        throw new Error('ID da turma não encontrado');
      }

      showLoader('Gerando certificados...');
      return generateSelectiveCertificates(
        classIdToUse,
        selection.selectedIds.map(id => Number(id))
      );
    },
    onSuccess: (response) => {
      hideLoader();

      const { newCertificates, updatedCertificates, skippedStudents } = response.data;

      toast({
        title: "Certificados gerados!",
        description: `${newCertificates} novo(s), ${updatedCertificates} atualizado(s)${
          skippedStudents.length > 0 ? `, ${skippedStudents.length} ignorado(s)` : ''
        }`,
        variant: "default",
      });

      // Limpar seleção após sucesso
      selection.clearSelection();

      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: [`list${entity.pluralName}`] });
    },
    onError: (error: Error) => {
      hideLoader();
      toast({
        title: "Erro ao gerar certificados",
        description: error.message || "Ocorreu um erro ao processar a solicitação",
        variant: "destructive",
      });
    }
  });

  if (!can(`view_${entity.ability}`)) return null;

  const hasClass = !!classId || !!searchParams.classId;
  const canCreate = can(`create_${entity.ability}`) && hasClass;
  // Dentro da turma (classId fixo) o formulário segue na gaveta; na tela de inscrições abre em tela própria.
  const embedded = !!classId;
  const openNew = () => {
    if (embedded) { setFormData(undefined); setOpenForm(true); return; }
    navigate({ to: "/treinamentos/inscricoes/nova", search: { turma: String(searchParams.classId) } });
  };
  const openEdit = (item: IEntity) => {
    if (embedded) { setFormData(item); setOpenForm(true); return; }
    navigate({ to: "/treinamentos/inscricoes/$subscriptionId", params: { subscriptionId: String(item.id) } });
  };
  const filterCount = countFilters(searchParams, initialFormRef.current, ['classId']);
  const errorMessage = isError ? error?.response?.data?.message || `Erro ao carregar ${entity.pluralName}` : null;
  const limit = searchParams.limit === 'all' ? (data?.total || 0) : Number(searchParams.limit);

  return (
    <>
      {!classId && <PageHeader title={entity.pluralName} description={`Administrar ${entity.pluralName}`} />}

      <ListCard className={classId ? "border-0 p-0 sm:p-0" : undefined}>
        <div className="flex flex-col md:flex-row justify-start md:items-center gap-2 md:gap-4">
          {/* Toggle para alternar entre visualizações e Select de turmas */}
          <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => {
                setViewMode('list');
                setSearchParams(prev => ({ ...prev, limit: 10 }));
              }}
              className="gap-2"
            >
              <Icon name="list" className="w-4 h-4" />
              Lista
            </Button>
            <Button
              variant={viewMode === 'kanban' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => {
                setViewMode('kanban');
                setSearchParams(prev => ({ ...prev, limit: 'all' }));
              }}
              className="gap-2"
            >
              <Icon name="columns" className="w-4 h-4" />
              Kanban
            </Button>
          </div>

          {/* Select de curso - só aparece se não houver classId fixo */}
          {!classId && (
            <div className="w-full md:w-[250px]">
              <Select
                name="courseId"
                options={courseData}
                state={courseId?.toString()}
                label="name"
                value="id"
                isLoading={isLoadingCourses}
                placeholder="Selecione um curso"
                clearable
                onChange={(_name, value) => {
                  const selectedValue = value === "all" ? undefined : value ? Number(value) : undefined;
                  setCourseId(selectedValue);
                }}
              />
            </div>
          )}

          {/* Select de turmas - só aparece se não houver classId fixo */}
          {!classId && (
            <div className="w-full md:w-[250px]">
              <Select
                name="classId"
                options={classesData}
                state={searchParams.classId?.toString()}
                label="name"
                value="id"
                isLoading={isLoadingClasses}
                disabled={!courseId}
                clearable
                placeholder="Selecione uma turma"
                onChange={(name, value) => {
                  const selectedValue = value === "all" ? undefined : value ? Number(value) : undefined;
                  setSearchParams((prev) => ({ ...prev, [name]: selectedValue }));
                }}
              />
            </div>
          )}
        </div>

        <ListToolbar onOpenFilters={() => setOpenSearch(true)} filterCount={filterCount}>
          {viewMode === 'list' && (
            <ActionsMenu groups={[{
              label: "Selecionadas",
              items: [
                {
                  id: "certificates", label: "Gerar certificados", icon: "award", count: selection.selectedCount,
                  disabledReason: selection.hasSelection ? undefined : "Marque inscrições na lista",
                  confirm: {
                    title: "Gerar Certificados",
                    description: `Você está prestes a gerar ou atualizar certificados para ${selection.selectedCount} inscrição(ões) selecionada(s).

Os certificados novos serão criados e os existentes serão atualizados mantendo a data de vencimento original (primeira emissão).

Deseja continuar?`,
                  },
                  onSelect: () => generateCertificates(),
                },
                {
                  id: "clear", label: "Limpar seleção", icon: "x", hidden: !selection.hasSelection,
                  onSelect: selection.clearSelection,
                },
              ],
            }]} />
          )}
          {canCreate && <Button onClick={openNew}><Icon name="plus" className="w-4 h-4" /> <span className="hidden sm:inline">Nova {entity.name}</span></Button>}
        </ListToolbar>

        {viewMode === 'list' ? (
          <>
            {selection.hasSelection && (
              <p className="text-[13px] text-muted-foreground">
                {selection.selectedCount} inscrição(ões) selecionada(s) ·{" "}
                <button type="button" className="text-primary hover:underline" onClick={selection.clearSelection}>Limpar seleção</button>
              </p>
            )}

            <DataTable rows={hasClass ? data?.rows : []} columns={subscriptionColumns({ canUpdate: can(`update_${entity.ability}`), onStatusChange: handleKanbanStatusChange })}
              getRowId={(item) => item.id ?? `${item.cpf}-${item.createdAt}`} ariaLabel={entity.pluralName}
              loading={hasClass && (isLoading || isFetching)} error={errorMessage} onRetry={() => refetch()}
              selection={{
                isSelected: (item) => (item.id ? selection.isSelected(item.id) : false),
                toggle: (item, on) => { if (item.id && on !== selection.isSelected(item.id)) selection.toggleSelection(item.id); },
                pageState: selection.isAllSelected ? true : selection.isIndeterminate ? "indeterminate" : false,
                togglePage: (on) => { if (!on) selection.clearSelection(); else if (!selection.isAllSelected) selection.toggleSelectAll(); },
              }}
              onRowClick={can(`update_${entity.ability}`) ? openEdit : undefined}
              actions={(item) => <SubscriptionRowActions item={item} entity={entity} onEdit={openEdit} modalPopover={modalPopover} />}
              empty={!hasClass
                ? <EmptyState icon="list-filter" title="Selecione um curso e uma turma para ver as inscrições." />
                : filterCount > 0
                  ? <EmptyState icon="search-x" title="Nenhuma inscrição com esses filtros." action={<Button variant="outline" size="sm" onClick={handleClear}>Limpar filtros</Button>} />
                  : <EmptyState title="Nenhuma inscrição encontrada" action={canCreate && <Button size="sm" onClick={openNew}><Icon name="plus" className="w-4 h-4" /> Nova {entity.name}</Button>} />} />

            <ListFooter total={data?.total ?? 0} page={searchParams.page} limit={limit} limits={LIMITS}
              onPageChange={(page) => setSearchParams((prev) => ({ ...prev, page }))}
              onLimitChange={(next) => setSearchParams((prev) => ({ ...prev, limit: next, page: 0 }))} />
          </>
        ) : (
          // Visualização em Kanban (sem mudança)
          <>
            {errorMessage && (
              <div className="p-6 text-center">
                <p className="text-red-500">{errorMessage}</p>
              </div>
            )}
            <KanbanView
              data={data?.rows || []}
              columns={kanbanColumns}
              statusField="subscribeStatus"
              onStatusChange={handleKanbanStatusChange}
              isLoading={isLoading}
              emptyMessage="Nenhuma inscrição encontrada"
              storageKey="subscription-kanban-hidden-columns"
            >
              {(item: IEntity, column) => (
                <SubscriptionCard
                  item={item}
                  column={column}
                  entity={entity}
                  onEdit={openEdit}
                  modalPopover={modalPopover}
                />
              )}
            </KanbanView>
          </>
        )}
      </ListCard>

      {/* Search Form */}
      <SideForm
        openSheet={openSearch}
        setOpenSheet={setOpenSearch}
        title="Buscar Inscrições"
        side="left"
        form={<SearchForm onSearch={handleSearch} onClear={handleClear} searchParams={searchParams} />}
      />
      {/* Formulário de cadastro (só dentro da turma; na tela de inscrições é tela própria) */}
      {embedded && <SideForm
        openSheet={openForm}
        setOpenSheet={setOpenForm}
        title={formData 
          ? `Editar ${entity.name} ${formData.name}`
          : `Cadastrar ${entity.name}`}
        description={formData 
          ? `Atenção com a ação a seguir, ela irá alterar os dados do ${entity.name} ${formData.name}.`
          : `Por favor, preencha com atenção todas as informações necessárias para cadastrar ${entity.name}.`}
        side="right"
        form={
          <SubscriptionForm
            formData={formData}
            openSheet={setOpenForm}
            entity={entity}
            classId={Number(searchParams.classId) || Number(classId)}
          />
        }
      />}
    </>
  )
};

export default List;
