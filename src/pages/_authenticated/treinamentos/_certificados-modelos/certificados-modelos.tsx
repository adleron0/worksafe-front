import { createFileRoute } from '@tanstack/react-router';
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { get } from "@/services/api";
import useVerify from "@/hooks/use-verify";
import Pagination from "@/components/general-components/Pagination";
import HeaderLists from "@/components/general-components/HeaderLists";
import SideForm from "@/components/general-components/SideForm";
import Dialog from '@/components/general-components/Dialog';
import ConfirmDialog from '@/components/general-components/ConfirmDialog';
import GeradorCertificados from '@/components/general-components/geradorCertificados/gerador';
import ItemSkeleton from "./-skeletons/ItemSkeleton";
import CertificateItem from "./-components/CertificateItem";
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
  const [searchParams, setSearchParams] = useState({
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

  const { 
    data, 
    isLoading,
  } = useQuery<Response | undefined, ApiError>({
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
  
  const handleLimitChange = (name: string, value: string | number) => {
    setSearchParams((prev) => ({ ...prev, [name]: value }));
  };

  const handlePageChange = (page: number) => {
    setSearchParams((prev) => ({ ...prev, page }));
  };


  const skeletons = Array(5).fill(null);

  const { width } = useWindowSize();
  const isDesktop = width ? width > 768 : true;

  if (!can(`view_${entity.ability}`)) return null;

  return (
    <>
      <HeaderLists
        titlePage={`${entity.pluralName}`}
        descriptionPage={`Gerencie os modelos de certificados dos cursos`}
        entityName={entity.name}
        ability={entity.ability}
        limit={data?.total || 0}
        searchParams={searchParams}
        onlimitChange={handleLimitChange}
        openSearch={setOpenSearch}
        openForm={() => {
          setEditingCertificate(undefined);
          setOpenEditor(true);
        }}
        setFormData={setEditingCertificate}
        setFormType={() => {}}
        showCreate={isDesktop}
        addButtonName="Criar Template"
      />

      {/* Lista de certificados */}
      <div className="space-y-2 mt-4">
        {isLoading ? (
          skeletons.map((_, i) => <ItemSkeleton key={i} index={i} />)
        ) : data?.rows && data.rows.length > 0 ? (
          data.rows.map((item: ICertificate, i: number) => (
            <CertificateItem
              key={item.id}
              item={item}
              index={i}
              entity={entity}
              setFormData={setEditingCertificate}
              setOpenForm={setOpenEditor}
              isDesktop={isDesktop}
            />
          ))
        ) : (
          <div className="w-full flex justify-center items-center font-medium text-primary py-4 rounded border border-primary">
            <p>Nenhum {entity.name} encontrado!</p>
          </div>
        )}
      </div>

      {/* Paginação */}
      {data && data.total > searchParams.limit && (
        <div className="mt-6">
          <Pagination
            currentPage={searchParams.page}
            totalItems={data.total}
            itemsPerPage={searchParams.limit}
            onPageChange={handlePageChange}
          />
        </div>
      )}

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