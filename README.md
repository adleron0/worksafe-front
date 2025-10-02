# WorkSafe Frontend

Interface web desenvolvida em React + TypeScript para plataforma de gestão de treinamentos corporativos, com sistema multi-empresa, área administrativa e portal do aluno.

## 📋 Descrição

O **WorkSafe Frontend** é uma aplicação SPA (Single Page Application) completa para gestão de treinamentos corporativos, oferecendo:

- Sistema multi-empresa com white label (cores, logos, domínios customizados)
- Área administrativa completa para gestão de cursos e alunos
- Portal do aluno para acesso a cursos online e presenciais
- Gestão de turmas, instrutores e certificados
- Sistema de pagamentos integrado
- Emissão e visualização de certificados digitais
- Plataforma de cursos online com vídeos, textos e avaliações
- Sistema de permissões granulares baseado em roles
- Dashboard com métricas e relatórios
- Gestão comercial e financeira
- Sistema de inscrições e cupons de desconto

## 🚀 Tecnologias

### Core
- **React** (v18.3.1) - Biblioteca UI
- **TypeScript** (v5.5.3) - Tipagem estática
- **Vite** (v5.4.1) - Build tool e dev server
- **TanStack Router** (v1.52.3) - Roteamento file-based
- **TanStack Query** (v5.53.1) - State management e cache

### UI & Estilização
- **Tailwind CSS** (v4.0.12) - Framework CSS utility-first
- **Shadcn UI** - Componentes acessíveis (Radix UI)
- **Framer Motion** (v11.18.2) - Animações
- **Lucide React** - Ícones
- **Recharts** - Gráficos e dashboards
- **React Icons** - Biblioteca de ícones

### Formulários & Validação
- **React Hook Form** (v7.53.0) - Gerenciamento de forms
- **Zod** (v3.23.8) - Validação de schemas
- **@hookform/resolvers** - Integração Zod + React Hook Form

### Manipulação de Canvas & Mídia
- **Fabric.js** (v6.7.1) - Editor de canvas para certificados
- **Konva** + **React Konva** - Canvas para gráficos interativos
- **Video.js** (v8.23.4) - Player de vídeo customizável
- **videojs-youtube** - Integração YouTube
- **Sharp** - Processamento de imagens
- **jsPDF** - Geração de PDFs
- **QRCode** - Geração de QR codes

### Editores de Conteúdo
- **Quill** (v2.0.2) - Editor de texto rico
- **React Quill** - Wrapper React para Quill

### Utilidades
- **Axios** (v1.7.7) - Cliente HTTP
- **date-fns** (v3.6.0) - Manipulação de datas
- **jwt-decode** (v4.0.0) - Decodificação de JWT
- **crypto-js** (v4.2.0) - Criptografia client-side
- **canvas-confetti** - Efeitos de confete
- **uuid** - Geração de UUIDs
- **pako** - Compressão/descompressão
- **culori** + **color** - Manipulação de cores

### State Management
- **Jotai** (v2.13.1) - State management atômico
- **TanStack Query** - Server state e cache

### Drag & Drop
- **@dnd-kit** - Biblioteca de drag and drop acessível
  - core, sortable, modifiers, utilities

### Temas
- **next-themes** (v0.3.0) - Sistema de temas (light/dark)

## 📁 Estrutura do Projeto

```
worksafe-front/
├── src/
│   ├── assets/                  # Arquivos estáticos (imagens, fontes)
│   ├── components/              # Componentes React
│   │   ├── ui/                  # Componentes UI base (Shadcn)
│   │   └── general-components/  # Componentes compartilhados
│   ├── context/                 # Contextos React
│   │   ├── AuthContext.tsx      # Autenticação admin
│   │   ├── StudentAuthContext.tsx # Autenticação aluno
│   │   ├── ThemeContext.tsx     # Gerenciamento de temas
│   │   └── GeneralContext.tsx   # Estado global
│   ├── hooks/                   # Hooks customizados
│   │   ├── use-toast.ts         # Notificações
│   │   ├── use-verify.tsx       # Verificação de permissões
│   │   ├── useDebounce.ts       # Debounce
│   │   └── use-windowSize.tsx   # Dimensões da janela
│   ├── pages/                   # Páginas (file-based routing)
│   │   ├── _authenticated/      # Área administrativa
│   │   │   ├── home.tsx         # Dashboard principal
│   │   │   ├── treinamentos/    # Módulo de treinamentos
│   │   │   │   ├── _cursos/     # Cursos presenciais
│   │   │   │   ├── _turmas/     # Turmas
│   │   │   │   ├── _instrutores/ # Instrutores
│   │   │   │   ├── _alunos/     # Alunos
│   │   │   │   ├── _certificados/ # Certificados
│   │   │   │   ├── _certificados-modelos/ # Modelos de certificados
│   │   │   │   ├── _cursos-online/ # Cursos online
│   │   │   │   └── _inscricoes/ # Inscrições
│   │   │   ├── comercial/       # Módulo comercial
│   │   │   │   ├── _vendedores/ # Vendedores
│   │   │   │   └── _cupons/     # Cupons de desconto
│   │   │   ├── financeiro/      # Módulo financeiro
│   │   │   │   └── _receber/    # Contas a receber
│   │   │   ├── integrações/     # Integrações
│   │   │   │   └── _gateways/   # Gateways de pagamento
│   │   │   ├── site/            # Gestão do site
│   │   │   │   ├── _produtos/   # Produtos
│   │   │   │   └── _servicos/   # Serviços
│   │   │   ├── empresa/         # Configurações da empresa
│   │   │   ├── usuarios/        # Gestão de usuários
│   │   │   │   ├── _usuarios/   # Usuários
│   │   │   │   └── _perfis/     # Perfis e permissões
│   │   │   ├── inventarios/     # Inventários
│   │   │   │   ├── areas/       # Áreas
│   │   │   │   └── access-control.tsx
│   │   │   └── clientes/        # Gestão de clientes
│   │   ├── student/             # Portal do aluno
│   │   │   ├── index.tsx        # Dashboard do aluno
│   │   │   ├── profile.tsx      # Perfil do aluno
│   │   │   ├── courses.tsx      # Lista de cursos
│   │   │   ├── course/          # Detalhes do curso
│   │   │   ├── lesson/          # Aulas online
│   │   │   ├── certificates/    # Certificados do aluno
│   │   │   ├── payments/        # Pagamentos
│   │   │   └── institutions/    # Instituições
│   │   ├── _index/              # Páginas públicas
│   │   │   ├── auth/            # Login e autenticação
│   │   │   └── certificados/    # Validação de certificados
│   │   ├── __root.tsx           # Layout raiz
│   │   ├── _authenticated.tsx   # Layout autenticado admin
│   │   └── student.tsx          # Layout portal do aluno
│   ├── services/                # Serviços e API
│   │   ├── api.ts               # Cliente HTTP principal
│   │   ├── api-s.ts             # Cliente HTTP alunos
│   │   ├── auth/                # Serviços de autenticação
│   │   └── specific/            # Serviços específicos
│   ├── template/                # Layout templates
│   │   ├── Header.tsx           # Cabeçalho
│   │   ├── Footer.tsx           # Rodapé
│   │   └── Sidebar/             # Menu lateral
│   ├── utils/                   # Utilitários
│   │   ├── cpf-mask.ts          # Máscara de CPF
│   │   ├── cnpj-mask.ts         # Máscara de CNPJ
│   │   ├── phone-mask.ts        # Máscara de telefone
│   │   ├── cep-mask.ts          # Máscara de CEP
│   │   ├── crypto.ts            # Criptografia
│   │   ├── decodeJwt.ts         # Decodificação JWT
│   │   ├── color-utils.ts       # Manipulação de cores
│   │   ├── domain-utils.ts      # Utilitários de domínio
│   │   └── tailwind.utils.ts    # Utilitários Tailwind
│   ├── general-interfaces/      # Interfaces compartilhadas
│   ├── types/                   # Tipos TypeScript
│   ├── lib/                     # Bibliotecas auxiliares
│   ├── InnerApp.tsx             # App wrapper
│   ├── main.tsx                 # Entry point
│   ├── index.css                # Estilos globais
│   └── routeTree.gen.ts         # Árvore de rotas (gerado)
├── public/                      # Arquivos públicos
├── api/                         # API mock (desenvolvimento)
├── components.json              # Configuração Shadcn UI
├── tailwind.config.js           # Configuração Tailwind
├── vite.config.ts               # Configuração Vite
├── tsconfig.json                # Configuração TypeScript
├── package.json                 # Dependências
├── FEATURE_PATTERNS.md          # Padrões de desenvolvimento
└── QUERY_FILTERS.md             # Documentação de filtros API
```

## 🏗️ Principais Módulos

### Autenticação
- Login de usuários administrativos
- Login de alunos (portal do aluno)
- Recuperação de senha
- Autenticação JWT
- Contextos separados para admin e aluno
- Sistema de permissões granulares

### Treinamentos (Área Administrativa)
- **Cursos Presenciais**: Gestão completa de cursos
- **Turmas**: Agendamento e gerenciamento de turmas
- **Instrutores**: Cadastro de instrutores com assinatura digital
- **Alunos**: Cadastro e acompanhamento de trainees
- **Certificados**: Geração automática com editor Fabric.js
- **Modelos de Certificados**: Criação de templates customizados
- **Cursos Online**: Sistema completo de EAD
  - Gestão de lições e passos
  - Vídeos (YouTube e upload)
  - Textos e downloads
  - Avaliações e quizzes
  - Controle de progresso
- **Inscrições**: Gestão de matrículas e pagamentos

### Portal do Aluno
- Dashboard personalizado
- Acesso a cursos online e presenciais
- Player de vídeo integrado
- Sistema de navegação entre lições
- Avaliações e quizzes interativos
- Certificados digitais para download
- Acompanhamento de progresso
- Modal de conclusão com confete

### Comercial
- Gestão de vendedores
- Sistema de cupons de desconto
- Comissões e splits

### Financeiro
- Contas a receber
- Controle de pagamentos
- Integração com gateways
- Relatórios financeiros

### Integrações
- Gateway Asaas
- Webhooks de pagamento
- Configurações multi-gateway

### Site (White Label)
- Produtos personalizáveis
- Serviços da empresa
- Imagens e galerias
- SEO e meta tags

### Empresa
- Configurações white label
- Cores customizadas (tema automático)
- Logo e favicon
- Domínios personalizados
- Email customizado

### Usuários
- Gestão de usuários
- Perfis e roles
- Permissões granulares
- Controle de acesso

### Inventários
- Áreas e sub-áreas
- Controle de acesso
- Autorizações

### Clientes
- Cadastro de clientes
- Histórico
- Relacionamento

## ⚙️ Configuração

### Pré-requisitos

- Node.js >= 20.x
- npm ou yarn
- Acesso ao WorkSafe API (backend)

### Instalação

```bash
# Instalar dependências
npm install

# Copiar arquivo de ambiente
cp .env.example .env

# Configurar variáveis de ambiente
# Edite o arquivo .env com suas configurações
```

### Variáveis de Ambiente

```env
# API Backend
VITE_API_URL=http://localhost:3000
VITE_API_URL_STUDENT=http://localhost:3000/student

# Ambiente
VITE_NODE_ENV=development

# Outras configurações
VITE_APP_NAME=WorkSafe
```

## 🏃 Executando o Projeto

```bash
# Desenvolvimento (com hot reload)
npm run dev

# Build para produção
npm run build

# Preview do build
npm run preview
```

O servidor de desenvolvimento estará disponível em `http://localhost:5173/`

## 🧪 Testes

```bash
# Executar linter
npm run lint
```

## 📚 Documentação Adicional

O projeto inclui documentações detalhadas sobre:

- **FEATURE_PATTERNS.md** - Padrões de desenvolvimento de features
  - Estrutura de diretórios
  - Padrão de componentes (List, Form, Search, Item)
  - Skeleton loading
  - Permissões e autenticação
  - Uso de Dialog vs Rotas
  - Convenções de código

- **QUERY_FILTERS.md** - Sistema de filtros da API
  - Filtros simples e avançados
  - Operadores especiais (in, like, gt, lt, etc)
  - Filtros OR
  - Agregações
  - Filtros em associações aninhadas
  - Paginação e ordenação

## 🎨 Temas e White Label

O sistema suporta:
- Tema claro/escuro automático
- Cores customizadas por empresa
- Logo e favicon personalizados
- Domínios white label
- CSS variables para theming

### Customização de Cores

```typescript
// As cores são aplicadas automaticamente via ThemeContext
// Baseado nas configurações da empresa no banco de dados
{
  primary: "#1a73e8",
  secondary: "#fbbc04",
  accent: "#34a853",
  // ... outras cores
}
```

## 🔐 Permissões

### Sistema de Verificação

```typescript
// Hook use-verify
const { can } = useVerify();

// Verificar permissão
if (can('view_treinamentos')) {
  // Exibir conteúdo
}

// Verificar múltiplas permissões
if (can(['create_curso', 'update_curso'])) {
  // Permitir edição
}
```

### Permissões Padrão

- `view_*` - Visualizar
- `create_*` - Criar
- `update_*` - Editar
- `delete_*` - Excluir (soft delete)
- `inactive_*` - Inativar
- `activate_*` - Ativar

## 🎯 Features Principais

### Para Empresas
- White label completo (logo, cores, domínio)
- Múltiplos produtos e serviços
- Dashboard de vendas e métricas
- Gestão de instrutores e alunos
- Relatórios financeiros
- Sistema de comissões

### Para Alunos
- Portal personalizado
- Cursos online e presenciais
- Player de vídeo moderno
- Certificados digitais
- Acompanhamento de progresso
- Avaliações e quizzes
- Notificações e feedback

### Para Administradores
- Gestão multi-empresa
- Controle de permissões granulares
- Dashboard com métricas
- Editor de certificados
- Configurações globais
- Integrações com gateways

## 🛠️ Padrões de Desenvolvimento

### File-Based Routing

O projeto usa TanStack Router com file-based routing:

```typescript
// src/pages/_authenticated/treinamentos/cursos/index.tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/treinamentos/cursos/')({
  component: List,
})

function List() {
  // Componente da página
}
```

### Padrão de Feature

Cada feature segue a estrutura:

```
feature/
├── -components/
│   ├── FeatureForm.tsx      # Formulário
│   ├── FeatureItem.tsx      # Item da lista
│   └── FeatureSearch.tsx    # Filtros de busca
├── -interfaces/
│   └── entity.interface.ts  # Tipagem
├── -skeletons/
│   └── ItemSkeleton.tsx     # Loading skeleton
└── index.tsx                # Página principal
```

### TanStack Query

```typescript
// Buscar dados com cache automático
const { data, isLoading, error } = useQuery({
  queryKey: ['listCursos', searchParams],
  queryFn: async () => {
    return get('course', '', params);
  },
});

// Mutação (criar/editar)
const mutation = useMutation({
  mutationFn: (data) => post('course', data),
  onSuccess: () => {
    queryClient.invalidateQueries(['listCursos']);
  },
});
```

### Componentes UI

```typescript
// Shadcn UI + customizações
import { Button } from "@/components/ui/button"
import { Input } from "@/components/general-components/Input"
import { Select } from "@/components/general-components/Select"
```

## 📦 Deploy

### Build

```bash
# Build otimizado para produção
npm run build
```

O build será gerado na pasta `dist/`.

### Deploy em Produção

```bash
# Servir arquivos estáticos
npm install -g serve
serve -s dist

# Ou use qualquer servidor web (Nginx, Apache, etc.)
```

### Variáveis de Ambiente (Produção)

```env
VITE_API_URL=https://api.example.com
VITE_NODE_ENV=production
```

## 🔄 Integração com Backend

O frontend se comunica com o **WorkSafe API** (backend NestJS) via REST API:

- Autenticação JWT
- Endpoints RESTful
- Upload de arquivos (S3)
- Webhooks de pagamento
- Cache com TanStack Query

Consulte o [README do backend](../worksafe-api/README.md) para mais detalhes.

## 📝 Convenções

### Commits
- `feat:` Nova funcionalidade
- `fix:` Correção de bug
- `docs:` Documentação
- `refactor:` Refatoração
- `style:` Estilização
- `test:` Testes
- `chore:` Manutenção

### Branches
- `main` - Produção
- `develop` - Desenvolvimento
- `feature/` - Novas features
- `fix/` - Correções

### Nomenclatura de Arquivos
- Componentes: `PascalCase.tsx`
- Hooks: `use-nome.ts`
- Utilitários: `kebab-case.ts`
- Interfaces: `entity.interface.ts`
- Diretórios privados: `-nome/` (prefixo `-`)

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'feat: Minha nova feature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

## 🐛 Troubleshooting

### Erro de build (memória)

```bash
# Aumentar memória do Node.js
NODE_OPTIONS='--max-old-space-size=8192' npm run build
```

### Problemas com TanStack Router

```bash
# Limpar cache e regenerar rotas
rm -rf .tanstack
npm run dev
```

### Conflitos de dependências

```bash
# Limpar node_modules e reinstalar
rm -rf node_modules package-lock.json
npm install
```

## 📄 Licença

Este projeto é privado e proprietário da Adleron.

## 👥 Time

Desenvolvido por Adleron - Soluções em Tecnologia

---

**Versão**: 0.0.0
**Última atualização**: Outubro 2025
