import { createFileRoute } from '@tanstack/react-router';
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { get } from "@/services/api";
import useVerify from "@/hooks/use-verify";
import PageHeader from "@/components/general-components/PageHeader";
import ListCard from "@/components/general-components/ListCard";
import ListToolbar from "@/components/general-components/ListToolbar";
import ListFooter from "@/components/general-components/ListFooter";
import DataTable, { EmptyState } from "@/components/general-components/DataTable";
import Icon from "@/components/general-components/Icon";
import { Button } from "@/components/ui/button";
import SideForm from "@/components/general-components/SideForm";
import Dialog from '@/components/general-components/Dialog';
import ConfirmDialog from '@/components/general-components/ConfirmDialog';
import GeradorCertificados from '@/components/general-components/geradorCertificados/gerador';
import CertificateRowActions from "./-components/CertificateRowActions";
import { certificateColumns } from "./-components/certificateColumns";
import { LIMITS, countFilters } from "../-shared/lista";
import CertificateSearch from "./-components/CertificateSearch";
import { ICertificate } from "./-interfaces/entity.interface";
import { ApiError } from "@/general-interfaces/api.interface";
import useWindowSize from "@/hooks/use-windowSize";

export const Route = createFileRoute('/_authenticated/treinamentos/_certificados-modelos/certificados-modelos')({
  component: CertificadosPage,
});

function CertificadosPage() {
  const { can } = useVerify();
  const queryClient = useQueryClient();
  const [openSearch, setOpenSearch] = useState(false);
  const [openEditor, setOpenEditor] = useState(false);
  const [editingCertificate, setEditingCertificate] = useState<ICertificate | undefined>();
  // editor com alterações não gravadas: fechar pede confirmação
  const editorDirty = useRef(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const closeEditor = () => {
    editorDirty.current = false;
    setOpenEditor(false);
    setEditingCertificate(undefined);
  };
  const [searchParams, setSearchParams] = useState<Record<string, any>>({
    limit: 10,
    page: 0,
    'order-name': 'asc',
    active: 'true',
    show: ['course']
  });
  const initialFormRef = useRef(searchParams);

  // Define variáveis de entidade
  const entity = {
    name: "Certificado",
    pluralName: "Certificados",
    model: "certificate",
    ability: "certificados",
  };

  interface Response {
    rows: ICertificate[];
    total: number;
  }

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery<Response | undefined, ApiError>({
    queryKey: [`list_${entity.pluralName}`, searchParams],
    queryFn: async () => {
      const params = Object.keys(searchParams).map((key) => ({
        key,
        value: searchParams[key as keyof typeof searchParams]
      }));
      return get(entity.model, '', params);
    },
  });



  const handleSearch = async (data: any) => {
    const params: Record<string, any> = {};
    
    if (data['like-name']) params['like-name'] = data['like-name'];
    if (data.active !== undefined) params.active = data.active;
    if (data.courseId) params.courseId = data.courseId;
    
    setSearchParams((prev) => ({
      ...prev,
      ...params,
      page: 0, // Reset para primeira página ao buscar
    }));
  };

  const handleClear = () => {
    setSearchParams(initialFormRef.current);
  };
  
  const { width } = useWindowSize();
  const isDesktop = width ? width > 768 : true;

  if (!can(`view_${entity.ability}`)) return null;

  const canCreate = can(`create_${entity.ability}`) && isDesktop;
  const canEdit = can(`update_${entity.ability}`) && isDesktop;
  const openNew = () => { setEditingCertificate(undefined); setOpenEditor(true); };
  const openEdit = (item: ICertificate) => { setEditingCertificate(item); setOpenEditor(true); };
  const filterCount = countFilters(searchParams, initialFormRef.current);

  return (
    <>
      <PageHeader title={entity.pluralName} description="Gerencie os modelos de certificados dos cursos" />

      <ListCard>
        <ListToolbar onOpenFilters={() => setOpenSearch(true)} filterCount={filterCount}>
          {canCreate && <Button onClick={openNew}><Icon name="plus" className="w-4 h-4" /> <span className="hidden sm:inline">Criar Template</span></Button>}
        </ListToolbar>

        <DataTable rows={data?.rows} columns={certificateColumns} getRowId={(item) => item.id} ariaLabel="Modelos de certificado"
          loading={isLoading || isFetching} error={isError ? error?.response?.data?.message || "erro desconhecido" : null} onRetry={() => refetch()}
          onRowClick={canEdit ? openEdit : undefined}
          rowClassName={(item) => (!item.active ? "opacity-60" : undefined)}
          actions={(item) => <CertificateRowActions item={item} entity={entity} onEdit={openEdit} isDesktop={isDesktop} />}
          empty={filterCount > 0
            ? <EmptyState icon="search-x" title="Nenhum modelo com esses filtros." action={<Button variant="outline" size="sm" onClick={handleClear}>Limpar filtros</Button>} />
            : <EmptyState title="Nenhum modelo de certificado encontrado." action={canCreate && <Button size="sm" onClick={openNew}><Icon name="plus" className="w-4 h-4" /> Criar Template</Button>} />} />

        <ListFooter total={data?.total ?? 0} page={searchParams.page} limit={searchParams.limit} limits={LIMITS}
          onPageChange={(page) => setSearchParams((prev) => ({ ...prev, page }))}
          onLimitChange={(limit) => setSearchParams((prev) => ({ ...prev, limit, page: 0 }))} />
      </ListCard>

      {/* Modal de busca */}
      <SideForm
        openSheet={openSearch}
        setOpenSheet={setOpenSearch}
        title="Buscar Certificados"
        description="Filtre os certificados por nome, empresa, curso ou status"
        side="left"
        form={
          <CertificateSearch
            onSubmit={handleSearch}
            onClear={handleClear}
            openSheet={setOpenSearch}
            params={searchParams}
          />
        }
      />

      {/* Dialog do Editor de Certificados */}
      <Dialog
        showBttn={false}
        showHeader={false}
        preventDismiss
        // editor em tela cheia: precisa de espaço para as abas, o certificado e o painel do selecionado
        className="h-[100dvh] max-h-[100dvh] w-screen max-w-[100vw] gap-0 rounded-none p-0 pr-0 sm:max-w-[100vw] sm:rounded-none"
        classNameContent="h-[100dvh] overflow-hidden p-0 pr-0"
        title={editingCertificate ? "Editar Certificado" : "Criar Novo Certificado"}
        description={
          editingCertificate 
            ? `Editando: ${editingCertificate.name}` 
            : "Crie um novo modelo de certificado"
        }
        open={openEditor}
        onOpenChange={(open) => {
          if (open) return setOpenEditor(true);
          if (editorDirty.current) return setConfirmClose(true);
          closeEditor();
        }}
      >
        <GeradorCertificados 
          editingData={editingCertificate}
          onDirtyChange={(d) => { editorDirty.current = d; }}
          onClose={() => {
            setOpenEditor(false);
            setEditingCertificate(undefined);
            // Recarregar lista após salvar
            queryClient.invalidateQueries({ queryKey: [`list_${entity.pluralName}`] });
          }}
        />
      </Dialog>

      <ConfirmDialog
        open={confirmClose}
        onOpenChange={setConfirmClose}
        title="Sair sem salvar?"
        description="Há alterações no modelo que ainda não foram gravadas no sistema. Se sair agora, elas se perdem."
        onConfirm={closeEditor}
      />
    </>
  );
}

export default CertificadosPage;