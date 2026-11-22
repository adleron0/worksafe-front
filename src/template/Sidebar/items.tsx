// Cursos Online e Aulas Online saíram do menu: curso online está desligado
// (ver src/lib/features.ts e archive/curso-online/).

/** Regras de visibilidade comuns a itens e subitens. */
export interface SidebarAccess {
  /** Produto contratado pela empresa (has). */
  isProduct?: string;
  /** Vê quem tem `view_<ability>`. */
  ability?: string;
  /** Alternativa ao ability: vê quem tem QUALQUER uma destas permissões exatas (ex.: "usar_bots"). */
  permissions?: string[];
}

export interface SidebarLink extends SidebarAccess {
  title: string;
  icon: string;
  path: string;
}

/** Rótulo pequeno que separa partes de um submenu (ex.: "cadastros"). */
export interface SidebarDivider {
  divider: string;
}

export type SidebarSubitem = SidebarLink | SidebarDivider;

export interface SidebarEntry extends SidebarLink {
  subitems?: SidebarSubitem[];
}

export interface SidebarGroup {
  /** Sem rótulo, os itens aparecem soltos no topo (ex.: Home). */
  label?: string;
  items: SidebarEntry[];
}

export const isDivider = (item: SidebarSubitem): item is SidebarDivider => "divider" in item;

export const groups: SidebarGroup[] = [
  {
    items: [{ title: "Home", icon: "rocket", path: "/home" }],
  },
  {
    label: "Vendas",
    items: [
      {
        title: "Clientes",
        icon: "heart-handshake",
        path: "/clientes",
        isProduct: "clientes",
        ability: "clientes",
      },
      {
        title: "Comercial",
        icon: "briefcase-business",
        path: "/comercial",
        isProduct: "comercial",
        ability: "comercial",
        subitems: [
          { title: "Propostas", ability: "comercial", icon: "file-text", path: "/comercial/propostas" },
          { title: "Negociações", ability: "comercial", icon: "handshake", path: "/comercial/negociacoes" },
          { title: "Acompanhamento", ability: "comercial", icon: "calendar-check", path: "/comercial/acompanhamento" },
          { title: "Vendedores", ability: "comercial", icon: "user-round-check", path: "/comercial/vendedores" },
          { title: "Cupons", ability: "cupoms", icon: "ticket-percent", path: "/comercial/cupons" },
          { divider: "configuração" },
          { title: "Identidade e modelos", ability: "comercial", icon: "file-pen-line", path: "/comercial/modelos" },
          { title: "Base de cálculo", ability: "comercial", icon: "calculator", path: "/comercial/base-calculo" },
        ],
      },
    ],
  },
  {
    label: "Operação",
    items: [
      {
        title: "Obras e serviços",
        icon: "drill",
        path: "/servicos",
        isProduct: "servicos",
        ability: "ordens_de_servico",
        subitems: [
          { title: "Ordens de Serviço", ability: "ordens_de_servico", icon: "scroll-text", path: "/servicos/ordens-de-servico" },
          { title: "Diário de Obra (RDO)", ability: "ordens_de_servico", icon: "calendar-days", path: "/servicos/diario-de-obra" },
          { title: "Estatísticas do Diário", ability: "ordens_de_servico", icon: "chart-column", path: "/servicos/estatisticas-do-diario" },
          { title: "Resultado das Obras", ability: "custos_comercial", icon: "chart-column-big", path: "/servicos/resultado-das-obras" },
        ],
      },
    ],
  },
  {
    label: "Treinamentos",
    items: [
      {
        title: "Treinamentos",
        icon: "hard-hat",
        path: "/treinamentos",
        isProduct: "treinamentos",
        ability: "treinamentos",
        subitems: [
          { title: "Dashboard", icon: "chart-column-big", path: "/treinamentos" },
          { title: "Turmas", icon: "clipboard-list", path: "/treinamentos/turmas" },
          { title: "Inscrições", icon: "ticket-check", path: "/treinamentos/inscricoes" },
          { title: "Alunos", icon: "graduation-cap", path: "/treinamentos/alunos" },
          { title: "Certificados", icon: "file-badge", path: "/treinamentos/certificados" },
          { title: "Divulgação", ability: "divulgacao", icon: "megaphone", path: "/treinamentos/divulgacao" },
          { divider: "cadastros" },
          { title: "Cursos", ability: "treinamentos", icon: "square-library", path: "/treinamentos/cursos" },
          { title: "Instrutores", ability: "instrutores", icon: "contact", path: "/treinamentos/instrutores" },
          { title: "Modelos de certificado", icon: "file-pen", path: "/treinamentos/certificados-modelos" },
        ],
      },
    ],
  },
  {
    label: "Suprimentos",
    items: [
      {
        title: "Compras",
        icon: "shopping-cart",
        path: "/suprimentos/compras",
        isProduct: "servicos",
        ability: "pedidos_de_compra",
        subitems: [
          { title: "Pedidos de Compra", ability: "pedidos_de_compra", icon: "clipboard-list", path: "/suprimentos/pedidos-de-compra" },
          { title: "Reposição", ability: "itens_estoque", icon: "list-restart", path: "/suprimentos/compras/reposicao" },
          { divider: "cadastros" },
          { title: "Fornecedores", ability: "fornecedores_suprimentos", icon: "truck", path: "/suprimentos/fornecedores" },
        ],
      },
      {
        title: "Estoque",
        icon: "warehouse",
        path: "/suprimentos/estoque",
        isProduct: "servicos",
        ability: "itens_estoque",
        // Saldos ("Ver por local") fica dentro de Itens; Relatórios, na Visão geral
        subitems: [
          { title: "Visão geral", ability: "itens_estoque", icon: "layout-dashboard", path: "/suprimentos/estoque" },
          { title: "Itens", ability: "itens_estoque", icon: "package", path: "/suprimentos/estoque/itens" },
          { title: "Movimentações", ability: "itens_estoque", icon: "arrow-left-right", path: "/suprimentos/estoque/movimentacoes" },
          { title: "Entregas de EPI", ability: "entregas_epi", icon: "hard-hat", path: "/suprimentos/estoque/epi" },
          { title: "Inventário", ability: "ajuste_estoque", icon: "clipboard-check", path: "/suprimentos/estoque/inventario" },
          { divider: "cadastros" },
          { title: "Categorias", ability: "itens_estoque", icon: "tags", path: "/suprimentos/estoque/categorias" },
          { title: "Locais", ability: "itens_estoque", icon: "map-pin-house", path: "/suprimentos/estoque/locais" },
        ],
      },
      {
        title: "Equipamentos",
        icon: "shield-check",
        path: "/suprimentos/equipamentos",
        isProduct: "servicos",
        ability: "equipamentos",
        // Vencimentos e Calibração ficam dentro de "Inspeções e calibrações"
        subitems: [
          { title: "Peças", ability: "equipamentos", icon: "scan-barcode", path: "/suprimentos/equipamentos" },
          { title: "Inspeções e calibrações", ability: "equipamentos", icon: "list-checks", path: "/suprimentos/equipamentos/inspecoes" },
          { divider: "cadastros" },
          { title: "Roteiros de inspeção", ability: "inspecoes_equipamentos", icon: "file-check", path: "/suprimentos/equipamentos/roteiros" },
        ],
      },
      // Disponibilidade é um botão dentro de Ordens de locação
      { title: "Ordens de locação", icon: "handshake", path: "/suprimentos/locacoes", isProduct: "servicos", ability: "locacoes" },
    ],
  },
  {
    label: "RH",
    items: [
      {
        title: "Pessoas",
        icon: "id-card",
        path: "/rh",
        isProduct: "servicos",
        ability: "funcionarios",
        subitems: [
          { title: "Funcionários", ability: "funcionarios", icon: "users-round", path: "/rh/funcionarios" },
          { title: "Mapa de Alocação", ability: "alocacao", icon: "chart-gantt", path: "/rh/mapa-de-alocacao" },
          { title: "Vencimentos", ability: "documentos_funcionarios", icon: "calendar-clock", path: "/rh/vencimentos" },
          { divider: "cadastros" },
          { title: "Locais", ability: "locais", icon: "map-pinned", path: "/rh/locais" },
          { title: "Tipos de Documento", ability: "documentos_funcionarios", icon: "folder-cog", path: "/rh/tipos-de-documento" },
        ],
      },
    ],
  },
  {
    label: "Financeiro",
    items: [
      {
        title: "Financeiro",
        icon: "circle-dollar-sign",
        path: "/financeiro",
        isProduct: "financeiro",
        ability: "financeiro",
        subitems: [
          { title: "A Faturar", icon: "receipt", path: "/financeiro/faturar" },
          { title: "Contas a Receber", icon: "trending-up", path: "/financeiro/receber" },
          { title: "Contas a Pagar", icon: "trending-down", path: "/financeiro/pagar" },
          { title: "Recorrentes", icon: "repeat", path: "/financeiro/recorrentes" },
          { title: "Conciliação", icon: "file-check-2", path: "/financeiro/conciliacao" },
          { title: "Relatórios", icon: "chart-pie", path: "/financeiro/relatorios" },
          { title: "Impostos Retidos", icon: "landmark", path: "/financeiro/retencoes" },
          { divider: "cadastros" },
          { title: "Fornecedores", icon: "truck", path: "/financeiro/fornecedores" },
          { title: "Plano de Contas", icon: "list-tree", path: "/financeiro/plano-contas" },
          { title: "Centros de Custo", icon: "target", path: "/financeiro/centros-custo" },
          { title: "Contas Bancárias", icon: "landmark", path: "/financeiro/contas-bancarias" },
          { title: "Implantação", icon: "rocket", path: "/financeiro/implantacao" },
          // { title: "Notas Fiscais", icon: "receipt", path: "/financeiro/notas-fiscais" },
        ],
      },
    ],
  },
  {
    label: "Marketing",
    items: [
      {
        title: "Site",
        icon: "globe-lock",
        path: "/site",
        ability: "site",
        subitems: [
          { title: "Serviços", icon: "wrench", ability: "servicos_site", path: "/site/servicos" },
          { title: "Produtos", icon: "package", ability: "loja_site", path: "/site/produtos" },
          { divider: "cadastros" },
          { title: "Categorias da Loja", icon: "tags", ability: "loja_site", path: "/site/categorias-loja" },
          { title: "Marcas", icon: "badge-check", ability: "loja_site", path: "/site/marcas" },
        ],
      },
      {
        title: "Blog",
        icon: "newspaper",
        path: "/blog",
        ability: "blog",
        subitems: [
          { title: "Posts", ability: "blog", icon: "file-text", path: "/blog/posts" },
          { title: "Comentários", ability: "blog", icon: "message-circle", path: "/blog/comentarios" },
          { title: "Visitantes", ability: "blog", icon: "users", path: "/blog/visitantes" },
          { divider: "cadastros" },
          { title: "Categorias", ability: "blog", icon: "folder", path: "/blog/categorias" },
          { title: "Tags", ability: "blog", icon: "tags", path: "/blog/tags" },
        ],
      },
    ],
  },
  {
    label: "Ferramentas",
    items: [
      {
        title: "Bots",
        icon: "bot",
        path: "/bots",
        permissions: ["usar_bots", "usar_mcp", "update_bots", "view_auditoria_bots"],
        subitems: [
          { title: "Equipe", permissions: ["usar_bots"], icon: "users-round", path: "/bots/equipe" },
          { title: "Conversar", permissions: ["usar_bots"], icon: "messages-square", path: "/bots/conversas" },
          { title: "Agenda", permissions: ["usar_bots"], icon: "calendar-clock", path: "/bots/agenda" },
          { title: "Ações pendentes", permissions: ["usar_bots", "usar_mcp"], icon: "shield-alert", path: "/bots/acoes" },
          { title: "Relatórios", permissions: ["usar_bots"], icon: "file-chart-column", path: "/bots/relatorios" },
          { divider: "configuração" },
          { title: "Conectar apps de IA", permissions: ["usar_mcp", "update_bots"], icon: "plug", path: "/bots/conexoes" },
          { title: "Configurar bots", permissions: ["update_bots"], icon: "sliders-horizontal", path: "/bots/configuracao" },
          { title: "Auditoria e gasto", permissions: ["view_auditoria_bots"], icon: "scroll-text", path: "/bots/auditoria" },
        ],
      },
      {
        title: "Arquivos",
        icon: "folder-open",
        path: "/arquivos",
        ability: "arquivos",
        subitems: [
          { title: "Pastas", ability: "arquivos", icon: "folders", path: "/arquivos/pastas" },
          { title: "Vencimentos", ability: "arquivos", icon: "calendar-clock", path: "/arquivos/vencimentos" },
          { title: "Lixeira", ability: "arquivos", icon: "trash-2", path: "/arquivos/lixeira" },
        ],
      },
    ],
  },
];

/** Fica no rodapé da barra, separado do resto. */
export const footerGroup: SidebarGroup = {
  label: "Administração",
  items: [
    {
      title: "Usuários",
      icon: "users",
      path: "/usuarios",
      ability: "user",
      subitems: [
        { title: "Usuários", icon: "square-user", ability: "user", path: "/usuarios" },
        { title: "Perfis", icon: "user-pen", ability: "profile", path: "/usuarios/perfis" },
      ],
    },
    { title: "Integrações", icon: "unplug", path: "/integracoes", ability: "financeiro" },
    { title: "Empresa", icon: "settings", path: "/empresa" },
  ],
};
