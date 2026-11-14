import { createFileRoute } from '@tanstack/react-router'
import { useRef, useState, useEffect } from "react";
// Serviços
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, put } from "@/services/api";
import useVerify from "@/hooks/use-verify";
import { useLoader } from "@/context/GeneralContext";
import { toast } from "@/hooks/use-toast";
import { useSelection } from "@/hooks/useSelection";
import { generateSelectiveCertificates } from "@/services/certificateService";
import Pagination from "@/components/general-components/Pagination";
// Template Page list-form
import HeaderLists from "@/components/general-components/HeaderLists";
import SideForm from "@/components/general-components/SideForm";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import ItemSkeleton from "./-skeletons/ItemSkeleton";
import ItemList from "./-components/SubscriptionItem";
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
import { ApiError } from "@/general-interfaces/api.interface";

export const Route = createFileRoute('/_authenticated/treinamentos/_inscricoes/inscricoes')({
  component: List,
})

function List({ classId, modalPopover }: { classId?: number; modalPopover?: boolean } = {}) {
  const { can } = useVerify();
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
  
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>(getStoredViewMode());
  const [courseId, setCourseId] = useState<number | string | undefined>(undefined);
  const [searchParams, setSearchParams] = useState({
    limit: getStoredViewMode() === 'kanban' ? 'all' : 10,
    page: 0,
    show: ['class', 'financialRecords'],
    classId: classId ? Number(classId) : undefined,
    'order-name': 'asc',
  });
  const initialFormRef = useRef(searchParams);

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
  const entity = {
    name: "Inscrição",
    pluralName: "Inscrições",
    model: "subscription",
    ability: "treinamentos",
  }

  interface Response {
    rows: IEntity[];
    total: number;
  }

  const { 
    data, 
    isLoading, 
    isError, 
    error, 
  } = useQuery<Response | undefined, ApiError>({
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
  
  const handleLimitChange = (name: string, value: string | number) => {
    setSearchParams((prev) => ({ ...prev, [name]: value }));
  };

  const handlePageChange = (page: number) => {
    setSearchParams((prev) => ({ ...prev, page }));
  };

  const totalPages = data && searchParams.limit !== 'all' ? Math.ceil(data.total / Number(searchParams.limit)) : 0;

  const skeletons = Array(5).fill(null);

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

  return (
    <>
      <div className="space-y-4">
        <HeaderLists
          titlePage={classId ? undefined : `${entity.pluralName}`}
          descriptionPage={classId ? undefined : `Administrar ${entity.pluralName}`}
          entityName={entity.name}
          ability={entity.ability}
          limit={searchParams.limit === 'all' ? (data?.total || 0) : Number(searchParams.limit || 0)}
          searchParams={searchParams}
          onlimitChange={handleLimitChange}
          openSearch={setOpenSearch}
          openForm={() => {
            setFormData(undefined);
            setOpenForm(true);
          }}
          setFormData={setFormData}
          setFormType={() => {}}
          iconForm="plus"
          addButtonName="Nova"
          showCreate={!!classId || !!searchParams.classId}
        />

        <div className="flex flex-col md:flex-row justify-start md:items-center px-2 gap-4">
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
            <div className="flex items-center gap-2">
              {/* <label className="text-sm font-medium">Turma:</label> */}
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
            </div>
          )}

          {/* Select de turmas - só aparece se não houver classId fixo */}
          {!classId && (
            <div className="flex items-center gap-2">
              {/* <label className="text-sm font-medium">Turma:</label> */}
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
            </div>
          )}
        </div>

        {/* Barra de ações quando houver seleção */}
        {selection.hasSelection && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-primary/10 rounded-lg border border-primary/20">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">
                {selection.selectedCount} inscrição(ões) selecionada(s)
              </span>
            </div>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <ConfirmDialog
                title="Gerar Certificados"
                description={`Você está prestes a gerar ou atualizar certificados para ${selection.selectedCount} inscrição(ões) selecionada(s).

Os certificados novos serão criados e os existentes serão atualizados mantendo a data de vencimento original (primeira emissão).

Deseja continuar?`}
                onConfirm={() => generateCertificates()}
              >
                <Button
                  variant="default"
                  size="sm"
                  className="gap-2 flex-1 sm:flex-initial"
                >
                  <Icon name="award" className="w-4 h-4" />
                  <span className="hidden sm:inline">Gerar Certificados</span>
                  <span className="sm:hidden">Gerar</span>
                </Button>
              </ConfirmDialog>
              <Button
                variant="outline"
                size="sm"
                onClick={selection.clearSelection}
                className="flex-1 sm:flex-initial"
              >
                Limpar Seleção
              </Button>
            </div>
          </div>
        )}
      </div>
      {/* Error */}
      {isError && (
        <div className="p-6 text-center">
          <p className="text-red-500">
            {error?.response?.data?.message || `Erro ao carregar ${entity.pluralName}`}
          </p>
        </div>
      )}
      {/* Loading */}
      {isLoading && (
        <div className="p-2">
          {skeletons.map((_, index) => (
            <ItemSkeleton key={index} />
          ))}
        </div>
      )}
      {/* Content */}
      {viewMode === 'list' ? (
        // Visualização em Lista
        (data && data.rows.length > 0 ? (<div className='space-y-2 mt-2'>
          {data.rows.map((item, index) => (
            <ItemList
              key={item.id}
              item={item}
              index={index}
              entity={entity}
              setFormData={setFormData}
              setOpenForm={setOpenForm}
              onStatusChange={handleKanbanStatusChange}
              modalPopover={modalPopover}
              selectable
              isSelected={item.id ? selection.isSelected(item.id) : false}
              onToggleSelection={selection.toggleSelection}
              allSelected={selection.isAllSelected}
              isIndeterminate={selection.isIndeterminate}
              onSelectAll={selection.toggleSelectAll}
            />
          ))}
          {totalPages > 1 && (
            <Pagination
              currentPage={searchParams.page}
              totalItems={data.total}
              itemsPerPage={searchParams.limit === 'all' ? data.total : Number(searchParams.limit)}
              onPageChange={handlePageChange}
            />
          )}
        </div>) : (!isLoading && (<div className='p-6 text-center'>
          <p className="text-gray-500">Nenhuma inscrição encontrada</p>
        </div>)))
      ) : (
        // Visualização em Kanban
        (<div className="p-2">
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
                setFormData={setFormData}
                setOpenForm={setOpenForm}
                modalPopover={modalPopover}
              />
            )}
          </KanbanView>
        </div>)
      )}
      {/* Search Form */}
      <SideForm
        openSheet={openSearch}
        setOpenSheet={setOpenSearch}
        title="Buscar Inscrições"
        side="left"
        form={<SearchForm onSearch={handleSearch} onClear={handleClear} searchParams={searchParams} />}
      />
      {/* Formulário de cadastro */}
      <SideForm
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
      />
    </>
  )
};

export default List;