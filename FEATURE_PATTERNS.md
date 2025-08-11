# Padrão de Features - WorkSafe Frontend

Este documento descreve os padrões estabelecidos para criação de features no projeto WorkSafe Frontend.

## 📁 Estrutura de Diretórios

### Feature com Rota Própria
```
src/pages/_authenticated/[modulo]/[feature]/
├── -components/
│   ├── [Feature]Form.tsx      # Formulário de criação/edição
│   ├── [Feature]Item.tsx      # Componente de item da lista
│   └── [Feature]Search.tsx    # Componente de busca/filtros
├── -interfaces/
│   └── entity.interface.ts    # Interface da entidade
├── -skeletons/
│   └── ItemSkeleton.tsx       # Skeleton loading
└── index.tsx ou [feature].tsx # Componente principal
```

### Feature em Dialog (Sub-feature)
```
src/pages/_authenticated/[modulo]/[feature]/-[sub-feature]/
├── components/
│   ├── [SubFeature]Form.tsx   # Formulário (visualização/edição)
│   ├── [SubFeature]Item.tsx   # Item da lista
│   └── [SubFeature]Search.tsx # Busca/filtros
├── interfaces/
│   └── entity.interface.ts    # Interface da entidade
├── skeletons/
│   └── ItemSkeleton.tsx       # Skeleton loading
└── index.tsx                  # Componente principal
```

## 📝 Padrão do index.tsx

### Estrutura Base
```typescript
import { useRef, useState } from "react";
// Serviços
import { useQuery } from "@tanstack/react-query";
import { get } from "@/services/api";
import useVerify from "@/hooks/use-verify";
import Pagination from "@/components/general-components/Pagination";
// Template Page list-form
import HeaderLists from "@/components/general-components/HeaderLists";
import SideForm from "@/components/general-components/SideForm";
import ItemSkeleton from "./skeletons/ItemSkeleton";
import ItemList from "./components/[Feature]Item";
import Form from "./components/[Feature]Form";
import SearchForm from "./components/[Feature]Search";
// Interfaces
import { IEntity } from "./interfaces/entity.interface";
import { ApiError } from "@/general-interfaces/api.interface";

const List = ({ [parentId]: number }) => {
  const { can } = useVerify();
  const [openSearch, setOpenSearch] = useState(false);
  const [openForm, setOpenForm] = useState(false);
  const [formData, setFormData] = useState<IEntity | null>(null);
  const [searchParams, setSearchParams] = useState({
    limit: 10,
    page: 0,
    show: ['relation1', 'relation2'],
    [parentId]: parentId,
    'order-[field]': 'asc',
  });
  const initialFormRef = useRef(searchParams);

  // Define variáveis de entidade
  const entity = {
    name: "Nome Singular",
    pluralName: "Nome Plural",
    model: "model-route",
    ability: "permission-name",
  }

  interface Response {
    rows: IEntity[];
    total: number;
  }

  const { data, isLoading, isError, error } = useQuery<Response | undefined, ApiError>({
    queryKey: [`list${entity.pluralName}`, searchParams],
    queryFn: async () => {
      const params = Object.keys(searchParams).map((key) => ({
        key,
        value: searchParams[key as keyof typeof searchParams]
      }));
      return get(entity.model, '', params);
    },
  });

  const handleSearch = async (params: Record<string, any>) => {
    setSearchParams((prev) => ({ ...prev, ...params }));
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

  const totalPages = data ? Math.ceil(data.total / searchParams.limit) : 0;
  const skeletons = Array(5).fill(null);

  if (!can(`view_${entity.ability}`)) return null;

  return (
    <>
      <HeaderLists
        entityName={entity.name}
        ability={entity.ability}
        limit={data?.total || 0}
        searchParams={searchParams}
        onlimitChange={handleLimitChange}
        openSearch={setOpenSearch}
        openForm={setOpenForm}
        setFormData={setFormData} 
        setFormType={() => {}}
        iconForm="plus"
      />

      {/* Busca avançada */}
      <SideForm
        openSheet={openSearch}
        setOpenSheet={setOpenSearch}
        title={`Buscar ${entity.pluralName}`}
        description={`Preencha os campos abaixo para filtrar ${entity.pluralName}.`}
        side="left"
        form={ <SearchForm onSearch={handleSearch} onClear={handleClear} openSheet={setOpenSearch} params={searchParams} /> }
      />

      {/* Formulário */}
      <SideForm
        openSheet={openForm}
        setOpenSheet={setOpenForm}
        title={formData ? `Editar ${entity.name}` : `Cadastrar ${entity.name}`}
        description={/* descrição apropriada */}
        side="right"
        form={ <Form formData={formData} setOpenForm={setOpenForm} entity={entity} [parentId]={parentId} /> }
      />

      {/* Listagem de items */}
      <div className="space-y-2 mt-4">
        {isLoading
          ? skeletons.map((_, i) => <ItemSkeleton key={i} index={i} />)
          : isError
          ? <div className="w-full flex justify-center items-center font-medium text-destructive py-4 rounded border border-destructive">
              <p>Erro: {error?.response?.data?.message}</p>
            </div>
          : data?.rows && data.rows.length > 0 
          ? data.rows.map((item: IEntity, i: number) => (
              <ItemList 
                key={item.id} 
                item={item} 
                entity={entity}
                index={i} 
                setFormData={setFormData} 
                setOpenForm={setOpenForm}
              />
            ))
          : (
            <div className="w-full flex justify-center items-center font-medium text-primary py-4 rounded border border-primary">
              <p>Nenhum {entity.name} encontrado!</p>
            </div>
          )
        }
      </div>

      {/* Paginação */}
      <div className="mt-4">
        {totalPages >= 1 && (
          <Pagination
            totalItems={data?.total || 0}
            itemsPerPage={searchParams.limit}
            currentPage={searchParams.page}
            onPageChange={handlePageChange}
            maxVisiblePages={5}
          />
        )}
      </div>
    </>
  );
};

export default List;
```

## 🔍 Padrão do SearchForm

```typescript
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Input from "@/components/general-components/Input";
import Select from "@/components/general-components/Select";

interface SearchData {
  field1?: string;
  field2?: string;
  active?: boolean;
}

interface SearchFormProps {
  onSearch: (data: SearchData) => void;
  onClear: () => void;
  openSheet: (open: boolean) => void;
  params: Record<string, unknown>;
}

const SearchForm: React.FC<SearchFormProps> = ({ onSearch, onClear, openSheet, params }) => {
  const [searchData, setSearchData] = useState<SearchData>({
    field1: "",
    field2: "",
    active: undefined,
  });

  useEffect(() => {
    // Carregar params no form state
  }, [params]);

  const handleChange = (name: string, value: string | number | null) => {
    setSearchData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchData);
    openSheet(false);
  };

  const handleClear = () => {
    setSearchData({ /* valores iniciais */ });
    onClear();
    openSheet(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Campos do formulário */}
      <div className="flex gap-2">
        <Button type="submit" className="flex-1">Buscar</Button>
        <Button type="button" variant="outline" onClick={handleClear} className="flex-1">Limpar</Button>
      </div>
    </form>
  );
};

export default SearchForm;
```

## 📋 Padrão do Item

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { patch } from "@/services/api";
import { useLoader } from "@/context/GeneralContext";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
// Componentes UI
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
// Interfaces
import { IEntity } from "../interfaces/entity.interface";
import { IDefaultEntity } from "@/general-interfaces/defaultEntity.interface";

interface ItemsProps {
  item: IEntity;
  index: number;
  entity: IDefaultEntity;
  setFormData: (data: IEntity) => void;
  setOpenForm: (open: boolean) => void;
}

const Item = ({ item, index, entity, setFormData, setOpenForm }: ItemsProps) => {
  const { can } = useVerify();
  const queryClient = useQueryClient();
  const { showLoader, hideLoader } = useLoader();

  // Mutations para ativar/inativar
  // ...

  return (
    <>
      {/* Header apenas no primeiro item */}
      {index === 0 && (
        <div className="hidden lg:flex items-center justify-between py-2 px-4 w-full bg-primary rounded-t-lg font-semibold text-sm text-inverse-foreground">
          {/* Colunas do header */}
        </div>
      )}

      {/* Conteúdo do item */}
      <div className={`${index % 2 === 0 ? "bg-background" : "bg-background/50"} shadow-sm rounded relative gap-2 lg:gap-0 flex flex-col lg:flex-row lg:items-center justify-between p-4 w-full border-b`}>
        {/* Campos do item */}
        
        {/* Ações */}
        <div className="absolute top-2 right-2 lg:static lg:w-1/12">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Icon name="ellipsis-vertical" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {/* Menu items */}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </>
  );
};

export default Item;
```

## 🎯 Uso em Dialog

Quando a feature é usada dentro de um Dialog (como sub-feature):

```typescript
// No componente pai (ex: AlunosItem.tsx)
import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import SubFeature from "../-sub-feature";

const ParentItem = ({ item }) => {
  const [openSubFeature, setOpenSubFeature] = useState(false);

  return (
    <>
      {/* Botão para abrir */}
      <Button onClick={() => setOpenSubFeature(true)}>
        Ver Sub-feature
      </Button>

      {/* Dialog com a sub-feature */}
      <Dialog open={openSubFeature} onOpenChange={setOpenSubFeature}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <SubFeature 
            parentId={item.id} 
            parentName={item.name}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};
```

## 🔑 Convenções Importantes

1. **Nomenclatura de Arquivos**:
   - Diretórios de componentes internos começam com `-` (ex: `-components/`)
   - Componentes seguem PascalCase
   - Interfaces e types em camelCase

2. **Entity Object**:
   ```typescript
   const entity = {
     name: "Nome Singular",       // Ex: "Aluno"
     pluralName: "Nome Plural",   // Ex: "Alunos"
     model: "api-route",          // Ex: "trainee"
     ability: "permission",       // Ex: "treinamentos"
   }
   ```

3. **Permissões**:
   - Sempre verificar com `can()` no início do componente
   - Padrão: `view_`, `create_`, `update_`, `inactive_`, `activate_`

4. **Query Keys**:
   - Sempre usar: `[list${entity.pluralName}, searchParams]`
   - Isso garante invalidação correta do cache

5. **Mensagens de Feedback**:
   - Usar `toast()` para feedback de ações
   - Mensagens claras e específicas
   - Variantes: `success`, `destructive`, `default`

6. **Loading States**:
   - Sempre usar skeletons para loading
   - Array de 5 skeletons por padrão

7. **Error Handling**:
   - Sempre tratar erros com mensagens específicas
   - Exibir erro da API quando disponível

## 📦 Dependências Comuns

- `@tanstack/react-query` - Gerenciamento de estado do servidor
- `@/services/api` - Funções de API (get, post, put, patch, del)
- `@/hooks/use-verify` - Verificação de permissões
- `@/components/general-components/*` - Componentes reutilizáveis
- `@/components/ui/*` - Componentes UI base (shadcn)

## 🚀 Criando uma Nova Feature

1. Copie a estrutura de uma feature similar
2. Ajuste o `entity` object
3. Atualize as interfaces em `entity.interface.ts`
4. Customize os componentes Item, Form e Search
5. Ajuste as permissões necessárias
6. Teste as operações CRUD
7. Verifique responsividade mobile/desktop