/**
 * Bots nas páginas: catálogo das páginas onde um bot pode aparecer (rostinhos
 * no topo + janela rápida). As chaves espelham a API (src/features/ai/bots/bot.pages.ts).
 * Um bot aparece numa tela quando qualquer página dele casa com o caminho
 * (por prefixo): "comercial" vale para tudo em /comercial; "propostas" só ali.
 */
export interface PageDef { key: string; label: string; group: string; paths: string[] }

export const PAGE_CATALOG: PageDef[] = [
  { key: "home", label: "Início", group: "Geral", paths: ["/home"] },
  { key: "arquivos", label: "Arquivos", group: "Geral", paths: ["/arquivos"] },
  { key: "comercial", label: "Comercial (todas as telas)", group: "Comercial", paths: ["/comercial"] },
  { key: "propostas", label: "Propostas", group: "Comercial", paths: ["/comercial/propostas"] },
  { key: "negociacoes", label: "Negociações", group: "Comercial", paths: ["/comercial/negociacoes"] },
  { key: "contratos", label: "Contratos", group: "Comercial", paths: ["/comercial/contratos"] },
  { key: "clientes", label: "Clientes", group: "Comercial", paths: ["/clientes"] },
  { key: "servicos", label: "Ordens de serviço e RDO", group: "Operação", paths: ["/servicos"] },
  { key: "alocacao", label: "Mapa de alocação", group: "Operação", paths: ["/rh/mapa-de-alocacao"] },
  { key: "treinamentos", label: "Treinamentos (todas as telas)", group: "Treinamentos", paths: ["/treinamentos"] },
  { key: "turmas", label: "Turmas", group: "Treinamentos", paths: ["/treinamentos/turmas"] },
  { key: "divulgacao", label: "Divulgação de turmas", group: "Treinamentos", paths: ["/treinamentos/divulgacao"] },
  { key: "financeiro", label: "Financeiro (todas as telas)", group: "Financeiro", paths: ["/financeiro"] },
  { key: "faturar", label: "A faturar", group: "Financeiro", paths: ["/financeiro/faturar"] },
  { key: "rh", label: "RH (todas as telas)", group: "RH", paths: ["/rh"] },
  { key: "estoque", label: "Estoque", group: "Suprimentos", paths: ["/suprimentos/estoque"] },
  { key: "compras", label: "Compras e fornecedores", group: "Suprimentos", paths: ["/suprimentos/pedidos-de-compra", "/suprimentos/compras", "/suprimentos/fornecedores"] },
  { key: "equipamentos", label: "Equipamentos", group: "Suprimentos", paths: ["/suprimentos/equipamentos"] },
  { key: "locacoes", label: "Locações", group: "Suprimentos", paths: ["/suprimentos/locacoes"] },
  { key: "blog", label: "Blog", group: "Marketing", paths: ["/blog"] },
  { key: "site", label: "Site", group: "Marketing", paths: ["/site"] },
];

const matches = (path: string, prefix: string) => path === prefix || path.startsWith(`${prefix}/`);

/** Páginas do catálogo que valem para este caminho (da mais geral para a mais específica). */
export const pagesForPath = (path: string) =>
  PAGE_CATALOG.filter((page) => page.paths.some((prefix) => matches(path, prefix)))
    .sort((a, b) => Math.max(...a.paths.filter((p) => matches(path, p)).map((p) => p.length)) - Math.max(...b.paths.filter((p) => matches(path, p)).map((p) => p.length)));

/** Nome da tela para o bot: a página mais específica (sem o "(todas as telas)"). */
export function pageLabelFor(path: string): string | null {
  const page = pagesForPath(path).pop();
  return page ? page.label.replace(/\s*\(todas as telas\)$/, "") : null;
}

/** O bot aparece nesta tela? */
export const botOnPath = (pages: string[] | undefined, path: string) => {
  const here = new Set(pagesForPath(path).map((page) => page.key));
  return (pages ?? []).some((key) => here.has(key));
};

export interface Shortcut { label: string; prompt: string }

/**
 * Atalhos da janela rápida por página (fixos no código) e por registro aberto.
 * `bots` limita a quais bots (área) o atalho aparece; sem ele, a todos daquela página.
 */
const PAGE_SHORTCUTS: Record<string, Array<Shortcut & { bots?: string[] }>> = {
  home: [
    { label: "Resumo do dia", prompt: "Me dá um resumo do dia: pendências, vencimentos e o que precisa da minha atenção." },
    { label: "O que está atrasado?", prompt: "O que está atrasado ou parado nas áreas?" },
  ],
  comercial: [
    { label: "Rascunho de proposta", prompt: "Cria um rascunho de proposta para o cliente " },
    { label: "Propostas paradas", prompt: "Quais propostas estão paradas sem retorno há mais de 7 dias?" },
  ],
  clientes: [{ label: "Buscar cliente", prompt: "Procura o cliente " }],
  servicos: [
    { label: "RDOs pendentes", prompt: "Quais RDOs estão pendentes ou devolvidos?" },
    { label: "OS em andamento", prompt: "Lista as OS em andamento e quem está em cada uma." },
  ],
  treinamentos: [
    { label: "Próximas turmas", prompt: "Quais são as próximas turmas e quantas vagas sobram em cada uma?" },
    { label: "Certificados vencendo", prompt: "Quais certificados vencem nos próximos 60 dias?" },
  ],
  divulgacao: [{ label: "Legenda para turma", prompt: "Escreve uma legenda de Instagram para divulgar a próxima turma." }],
  financeiro: [
    { label: "Resumo do mês", prompt: "Me dá o resumo do financeiro deste mês: entradas, saídas e saldo." },
    { label: "Mandar extrato", prompt: "Vou anexar o extrato em PDF: lê e prepara o lançamento." },
    { label: "Contas da semana", prompt: "Quais contas vencem nesta semana (pagar e receber)?" },
  ],
  rh: [
    { label: "Documentos vencendo", prompt: "Quais documentos de funcionários vencem nos próximos 30 dias?" },
    { label: "Quem está livre?", prompt: "Quem está livre nesta semana?" },
  ],
  estoque: [{ label: "O que repor?", prompt: "Quais itens estão abaixo do mínimo e precisam ser repostos?" }],
  compras: [{ label: "Pedidos abertos", prompt: "Lista os pedidos de compra em aberto." }],
  equipamentos: [{ label: "Vencendo", prompt: "Quais equipamentos têm inspeção ou calibração vencendo?" }],
  locacoes: [{ label: "Locações ativas", prompt: "Lista as locações ativas e as que terminam nesta semana." }],
  blog: [{ label: "Ideia de post", prompt: "Sugere 3 ideias de post para o blog desta semana." }],
};

const RECORD_SHORTCUTS: Record<string, Shortcut[]> = {
  proposta: [{ label: "Resumir esta proposta", prompt: "Resume esta proposta: cliente, itens, valor e situação." }, { label: "Próximo passo", prompt: "Qual o próximo passo com esta proposta?" }],
  negociacao: [{ label: "Resumir negociação", prompt: "Resume esta negociação e as propostas dela." }],
  cliente: [{ label: "Histórico do cliente", prompt: "Me dá o histórico deste cliente: propostas, OS e pendências." }, { label: "Nova proposta", prompt: "Cria um rascunho de proposta para este cliente." }],
  os: [{ label: "Resumo da OS", prompt: "Resume esta OS: equipe, avanço e pendências." }, { label: "RDOs desta OS", prompt: "Como estão os RDOs desta OS?" }],
  rdo: [{ label: "Pontos de atenção", prompt: "Quais os pontos de atenção deste RDO?" }],
  turma: [{ label: "Inscritos", prompt: "Lista os inscritos desta turma e quem falta pagar." }, { label: "Divulgar", prompt: "Escreve uma legenda para divulgar esta turma." }],
  funcionario: [{ label: "Resumo do funcionário", prompt: "Resume este funcionário: documentos, EPIs e alocação." }],
  pedido_compra: [{ label: "Situação do pedido", prompt: "Qual a situação deste pedido de compra?" }],
  locacao: [{ label: "Resumo da locação", prompt: "Resume esta locação: itens, medições e vencimentos." }],
  conta_pagar: [{ label: "Explicar esta conta", prompt: "Explica esta conta a pagar." }],
  conta_receber: [{ label: "Explicar esta conta", prompt: "Explica esta conta a receber." }],
};

/** Atalhos para este bot nesta tela: do registro aberto primeiro, depois da página. No máximo 3. */
export function shortcutsFor(path: string, botKey: string, entity?: string): Shortcut[] {
  const fromRecord = entity ? RECORD_SHORTCUTS[entity] ?? [] : [];
  const fromPages = pagesForPath(path).reverse().flatMap((page) => (PAGE_SHORTCUTS[page.key] ?? []).filter((item) => !item.bots || item.bots.includes(botKey)));
  const seen = new Set<string>();
  return [...fromRecord, ...fromPages].filter((item) => !seen.has(item.label) && seen.add(item.label)).slice(0, 3).map(({ label, prompt }) => ({ label, prompt }));
}
