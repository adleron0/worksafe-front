export const items = [
  {
    title: "Home",
    icon:  "rocket",
    path: "/home",
  },
  // {
  //   title: "Clientes",
  //   icon: "heart-handshake",
  //   path: "/clientes",
  //   isProduct: "clientes",
  //   ability: "clientes",
  // },
  // {
  //   title: "Comercial",
  //   icon: "briefcase-business",
  //   path: "/comercial",
  //   isProduct: "comercial",
  //   ability: "comercial",
  //   subitems: [
  //     {
  //       title: "Orçamentos",
  //       icon: "file-text",
  //       path: "/comercial/orcamentos",
  //     },
  //     {
  //       title: "Comissões",
  //       icon: "hand-coins",
  //       path: "/comercial/comissaoes",
  //     },
  //     {
  //       title: "Relatórios",
  //       icon: "chart-line",
  //       path: "/comercial/relatorios",
  //     },
  //   ],
  // },
  // {
  //   title: "Serviços",
  //   icon: "drill",
  //   path: "/servicos",
  //   isProduct: "servicos",
  //   ability: "servicos",
  //   subitems: [
  //     {
  //       title: "Ordens de Serviço",
  //       icon: "scroll-text",
  //       path: "/servicos/ordens-de-servico",
  //     },
  //     {
  //       title: "RDO",
  //       icon: "calendar-days",
  //       path: "/servicos/diario-de-obra",
  //     },
  //   ],
  // },
  {
    title: "Treinamentos",
    icon: "hard-hat",
    path: "/treinamentos",
    isProduct: "treinamentos",
    ability: "treinamentos",
    subitems: [
      {
        title: "Cursos",
        ability: "treinamentos",
        icon: "square-library",
        path: "/treinamentos/cursos",
      },
      {
        title: "Turmas",
        icon: "clipboard-list",
        path: "/treinamentos/turmas",
      },
      {
        title: "Inscrições",
        icon: "ticket-check",
        path: "/treinamentos/inscricoes",
      },
      {
        title: "Instrutores",
        ability: "instrutores",
        icon: "contact",
        path: "/treinamentos/instrutores",
      },
      {
        title: "Alunos",
        icon: "graduation-cap",
        path: "/treinamentos/alunos",
      },
      {
        title: "Certificados",
        icon: "file-badge",
        path: "/treinamentos/certificados",
      },
      {
        title: "Criar Certificado",
        icon: "file-pen",
        path: "/treinamentos/certificados-modelos",
      },
      {
        title: "Dashboard",
        icon: "chart-column-big",
        path: "/treinamentos",
      },
    ],
  },
  // {
  //   title: "Inventarios",
  //   icon: "vault",
  //   path: "/inventarios",
  //   isProduct: "inventarios",
  //   ability: "inventarios",
  //   subitems: [
  //     {
  //       title: "Áreas",
  //       icon: "map",
  //       path: "/inventarios/areas",
  //     },
  //     {
  //       title: "Dashboard",
  //       icon: "chart-column-big",
  //       path: "/inventarios/dashboard",
  //     },
  //     {
  //       title: "Acontrole de Acesso",
  //       icon: "vault",
  //       path: "/inventarios/access-control",
  //     },
  //     {
  //       title: "Autorizados",
  //       icon: "Id-card",
  //       path: "/inventarios/autorizados",
  //     },
  //   ],
  // },
  // {
  //   title: "Almoxarifado",
  //   icon: "warehouse",
  //   path: "/almox",
  //   isProduct: "almox",
  //   ability: "almox",
  // },
  {
    title: "Financeiro",
    icon: "circle-dollar-sign",
    path: "/financeiro",
    isProduct: "financeiro",
    ability: "financeiro",
    subitems: [
      // {
      //   title: "Contas a Pagar",
      //   icon: "trending-down",
      //   path: "/financeiro/pagar",
      // },
      // {
      //   title: "Contas a Receber",
      //   icon: "trending-up",
      //   path: "/financeiro/receber",
      // },
      // {
      //   title: "Notas Fiscais",
      //   icon: "receipt",
      //   path: "/financeiro/notas-fiscais",
      // },
      // {
      //   title: "Relatórios",
      //   icon: "chart-pie",
      //   path: "/financeiro/relatorios",
      // },
      {
        title: "GateWays",
        icon: "wallet",
        path: "/financeiro/gateways",
      },
    ],
  },
  {
    title: "Site",
    icon: "globe-lock",
    path: "/site",
    ability: "site",
    subitems: [
      {
        title: "Serviços",
        icon: "wrench",
        ability: "servicos_site",
        path: "/site/servicos",
      },
      {
        title: "Produtos",
        icon: "package",
        ability: "loja_site",
        path: "/site/produtos",
      },
    ],
  },
  {
    title: "Equipe",
    icon: "users",
    path: "/usuarios",
    ability: "user",
    subitems: [
      {
        title: "Usuários",
        icon: "square-user",
        ability: "user",
        path: "/usuarios",
      },
      {
        title: "Perfis",
        icon: "user-pen",
        ability: "profile",
        path: "/usuarios/perfis",
      },
    ],
  },
];
