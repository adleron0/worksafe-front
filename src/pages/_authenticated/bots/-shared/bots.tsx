import { Fragment, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";

/** Área de Bots: tipos (espelham a API), chamadas e o leitor de markdown das respostas. */

export interface BotCapability { name: string; title: string; risk: "read" | "draft" | "sensitive" }
export interface Bot {
  id: number; key: string; name: string; persona: string; role: string; avatar: string; description: string; icon: string; active: boolean;
  shortcuts: Array<{ label: string; prompt: string }>;
  provider: string; providerLabel: string; model: string; providerReady: boolean;
  capabilities: BotCapability[]; hiddenCount: number;
}
export interface BotFull extends Bot {
  instructions: string; tools: string[]; permissionKey: string; version: number;
  fallbackProvider: string | null; fallbackModel: string | null; updatedAt: string;
}
export interface ProviderStatus { id: string; label: string; available: boolean }
export interface CatalogTool { name: string; title: string; description: string; risk: BotCapability["risk"]; permissions: string[] }
export interface CatalogModel {
  id: string; provider: string; providerLabel: string; label: string; note: string; recommended: boolean; available: boolean;
  price: { input: number; output: number; cached: number }; perThousand: number; upcoming: { from: string; perThousand: number } | null;
}
export interface BotsConfig { bots: BotFull[]; providers: ProviderStatus[]; models: CatalogModel[]; tools: CatalogTool[]; enabled: boolean }

export interface TeamMember extends Bot {
  status: "trabalhando" | "aguardando" | "disponivel" | "sem_chave";
  working: { people: number; mine: { conversationId: number; title: string } | null };
  pendingForMe: number;
  today: { conversations: number; actions: number };
  lastActivityAt: string | null;
  lastConversation: { id: number; title: string; at: string } | null;
  agenda: { count: number; watching: number; next: { id: number; name: string; at: string | null } | null };
}
export interface TeamActivity { id: number; botId: number | null; persona: string | null; avatar: string | null; title: string; status: string; at: string; origin: string; user: string | null }
export interface Team { members: TeamMember[]; activity: TeamActivity[] }

export interface Conversation { id: number; title: string; lastMessageAt: string; createdAt: string }
export interface RunStep { at: string; kind: "tool" | "notice"; label: string; tool?: string; status: "running" | "ok" | "refused" | "denied" | "error" | "pending"; pendingActionId?: number }
export interface Run { id: number; status: "running" | "done" | "error" | "stopped"; steps: RunStep[]; error: string | null; startedAt: string; endedAt: string | null }
export type Message =
  | { id: number; role: "user" | "assistant" | "notice"; text: string; attachments: Array<{ name: string; mediaType: string; size: number }>; toolCalls: Array<{ name: string; title: string }>; createdAt: string }
  | { id: number; role: "tool"; results: Array<{ name: string; status: string; pendingActionId: number | null; handoff?: { conversationId: number; botId: number; persona: string } | null }>; createdAt: string };
export interface PendingAction {
  id: number; tool: string; title: string; summary: string; details: Array<{ label: string; value: string }>;
  status: "pendente" | "confirmada" | "cancelada" | "expirada" | "falhou"; expiresAt: string; result: { message?: string; link?: string | null } | null; error: string | null;
  conversationId: number | null; createdAt: string;
}
export interface ConversationView { id: number; title: string; botId: number; archived: boolean; messages: Message[]; run: Run | null; pendingActions: PendingAction[] }
export interface UsageSummary { month: string; budget: number; spent: number; percent: number | null; rows: Array<{ provider: string; model: string; calls: number; inputTokens: number; outputTokens: number; costUsd: number }> }
export interface AiStatus { enabled: boolean; mcpEnabled: boolean; providers: ProviderStatus[]; usage: UsageSummary | null; pendingActions: number }

export const BOTS_KEY = "aiBots";
export const TEAM_KEY = "aiTeam";
export const STATUS_KEY = "aiStatus";
export const ACTIONS_KEY = "aiActions";

export const aiApi = {
  get: async <T,>(path: string, params?: Record<string, unknown>) => (await api.get<T>(`ai/${path}`, { params })).data,
  post: async <T,>(path: string, body?: unknown) => (await api.post<T>(`ai/${path}`, body ?? {})).data,
  put: async <T,>(path: string, body?: unknown) => (await api.put<T>(`ai/${path}`, body ?? {})).data,
  patch: async <T,>(path: string, body?: unknown) => (await api.patch<T>(`ai/${path}`, body ?? {})).data,
  delete: async <T,>(path: string) => (await api.delete<T>(`ai/${path}`)).data,
};

export const useAiStatus = () => useQuery({ queryKey: [STATUS_KEY], staleTime: 30 * 1000, queryFn: () => aiApi.get<AiStatus>("status") });
export const useBots = (enabled = true) => useQuery({ queryKey: [BOTS_KEY], enabled, staleTime: 60 * 1000, queryFn: () => aiApi.get<Bot[]>("bots") });
export const useTeam = (enabled = true) => useQuery({ queryKey: [TEAM_KEY], enabled, refetchInterval: 5000, queryFn: () => aiApi.get<Team>("team") });
export const usePendingActions = () => useQuery({ queryKey: [ACTIONS_KEY], refetchInterval: 20 * 1000, queryFn: () => aiApi.get<PendingAction[]>("actions") });

export const RISK_LABEL: Record<BotCapability["risk"], string> = { read: "Consulta", draft: "Rascunho", sensitive: "Com confirmação" };
export const RISK_CLASS: Record<BotCapability["risk"], string> = {
  read: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  draft: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  sensitive: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
};
/** Nome curto de cada ferramenta, para as etiquetas "o que este bot pode fazer". */
export const TOOL_LABEL: Record<string, string> = {
  minha_esteira: "Sua esteira", buscar_clientes: "Buscar clientes", listar_propostas: "Propostas", ver_proposta: "Detalhe da proposta",
  opcoes_proposta: "Base de cálculo", simular_proposta: "Simular proposta", listar_acompanhamentos: "Acompanhamento", listar_os: "Ordens de serviço",
  ver_os: "Detalhe da OS", resultado_obras: "Resultado das obras", quem_esta_livre: "Quem está livre", listar_funcionarios: "Funcionários",
  documentos_vencendo: "Documentos vencendo", listar_turmas: "Turmas", contas_a_receber: "Contas a receber", contas_a_pagar: "Contas a pagar",
  listar_pedidos_de_compra: "Pedidos de compra", listar_posts_blog: "Posts do blog", criar_rascunho_proposta: "Rascunho de proposta",
  registrar_acompanhamento: "Registrar contato", escalar_equipe_os: "Escalar equipe", criar_rascunho_post_blog: "Rascunho de post",
  nova_turma_rascunho: "Nova turma", enviar_proposta: "Enviar proposta", mudar_situacao_proposta: "Aceite ou recusa", mover_os: "Mudar etapa da OS",
  publicar_turma: "Publicar turma", publicar_post_blog: "Publicar post",
  link_para_enviar_imagens: "Receber imagens", imagens_do_envio: "Pegar imagens enviadas", enviar_imagem_por_url: "Imagem por link", enviar_imagem_base64: "Imagem em arquivo",
  definir_imagem: "Trocar imagem", fin_resumo: "Resumo financeiro", fin_contas_a_pagar: "Contas a pagar", fin_contas_a_receber: "Contas a receber",
  fin_fluxo_de_caixa: "Fluxo de caixa", fin_dre: "DRE", fin_plano_de_contas: "Plano de contas", fin_cadastros: "Cadastros financeiros",
  fin_recorrencias: "Recorrências", fin_transferencias: "Transferências", fin_classificacao_padrao: "Classificação padrão",
  fin_cadastrar_despesa: "Lançar despesa", fin_editar_conta_a_pagar: "Editar conta a pagar", fin_cadastrar_conta_a_receber: "Lançar a receber",
  fin_editar_conta_a_receber: "Editar a receber", fin_categorizar: "Categorizar", fin_salvar_conta_do_plano: "Conta do plano",
  fin_mover_conta_do_plano: "Mover conta do plano", fin_ativar_inativar: "Ativar ou inativar", fin_salvar_centro_de_custo: "Centro de custo",
  fin_salvar_fornecedor: "Fornecedor", fin_salvar_conta_bancaria: "Conta bancária", fin_salvar_recorrencia: "Recorrência",
  fin_encerrar_recorrencia: "Encerrar recorrência", fin_definir_classificacao_padrao: "Classificação padrão", fin_dar_baixa: "Dar baixa",
  fin_estornar_baixa: "Estornar baixa", fin_transferir_entre_contas: "Transferir entre contas", fin_excluir_lancamentos: "Excluir lançamentos",
  agendar_tarefa: "Agendar tarefa", minhas_tarefas: "Agenda", pausar_tarefa: "Pausar tarefa",
};
export const STATUS_LABEL: Record<string, string> = { ok: "feito", refused: "recusado", denied: "sem permissão", error: "falhou", pending: "aguardando confirmação", running: "em andamento" };

export const usd = (value: number) => value.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: value < 1 ? 4 : 2 });
/** "há 5 min", "há 2 h", "ontem"… */
export function ago(value?: string | null) {
  if (!value) return "";
  const minutes = Math.round((Date.now() - new Date(value).getTime()) / 60000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.round(hours / 24);
  return days === 1 ? "ontem" : `há ${days} dias`;
}
export const dateTimeBr = (value?: string | null) => (value ? new Date(value).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—");
export const timeBr = (value?: string | null) => (value ? new Date(value).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "");

// ---------------------------------------------------------------- markdown

/**
 * Leitor de markdown das respostas, sem HTML: o texto do modelo nunca vira
 * HTML cru (proteção contra XSS). Cobre o que os bots usam: títulos, negrito,
 * itálico, código, listas, tabelas e links. Link interno (/comercial/...) abre
 * no sistema; externo abre em outra aba.
 */
function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\)|\*[^*\s][^*]*\*)/g;
  let last = 0;
  let index = 0;
  for (const match of text.matchAll(pattern)) {
    const start = match.index ?? 0;
    if (start > last) out.push(text.slice(last, start));
    const token = match[0];
    const key = `${keyBase}-${index++}`;
    if (token.startsWith("**")) out.push(<strong key={key}>{inline(token.slice(2, -2), key)}</strong>);
    else if (token.startsWith("`")) out.push(<code key={key} className="rounded bg-muted px-1 py-0.5 text-[0.85em]">{token.slice(1, -1)}</code>);
    else if (token.startsWith("[")) {
      const label = token.slice(1, token.indexOf("]"));
      const href = token.slice(token.indexOf("(") + 1, -1);
      if (href.startsWith("/") && !href.startsWith("//")) out.push(<Link key={key} to={href} className="font-medium text-primary underline underline-offset-2">{label}</Link>);
      else if (/^https?:\/\//.test(href)) out.push(<a key={key} href={href} target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline underline-offset-2">{label}</a>);
      else out.push(label);
    } else out.push(<em key={key}>{token.slice(1, -1)}</em>);
    last = start + token.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ text, className = "" }: { text: string; className?: string }) {
  const lines = text.replace(/\r/g, "").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    if (line.startsWith("```")) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) body.push(lines[i++]);
      i++;
      blocks.push(<pre key={key++} className="overflow-x-auto rounded-md bg-muted p-3 text-xs">{body.join("\n")}</pre>);
      continue;
    }
    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      const size = heading[1].length <= 2 ? "text-base" : "text-sm";
      blocks.push(<p key={key++} className={`${size} mt-2 font-semibold`}>{inline(heading[2], `h${key}`)}</p>);
      i++;
      continue;
    }
    if (line.trim().startsWith("|") && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1])) {
      const cells = (row: string) => row.trim().replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim());
      const head = cells(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) rows.push(cells(lines[i++]));
      blocks.push(
        <div key={key++} className="overflow-x-auto">
          <table className="my-1 w-full border-collapse text-xs">
            <thead><tr>{head.map((cell, n) => <th key={n} className="border-b px-2 py-1 text-left font-semibold">{inline(cell, `th${key}${n}`)}</th>)}</tr></thead>
            <tbody>{rows.map((row, r) => <tr key={r} className="border-b last:border-b-0">{row.map((cell, n) => <td key={n} className="px-2 py-1 align-top">{inline(cell, `td${key}${r}${n}`)}</td>)}</tr>)}</tbody>
          </table>
        </div>,
      );
      continue;
    }
    if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const items: string[] = [];
      while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*([-*]|\d+\.)\s+/, ""));
      const List = ordered ? "ol" : "ul";
      blocks.push(<List key={key++} className={`${ordered ? "list-decimal" : "list-disc"} space-y-0.5 pl-5`}>{items.map((item, n) => <li key={n}>{inline(item, `li${key}${n}`)}</li>)}</List>);
      continue;
    }
    const paragraph: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|```|\s*([-*]|\d+\.)\s+|\s*\|)/.test(lines[i])) paragraph.push(lines[i++]);
    if (!paragraph.length) { paragraph.push(lines[i++]); }
    blocks.push(<p key={key++}>{paragraph.map((part, n) => <Fragment key={n}>{n > 0 && <br />}{inline(part, `p${key}${n}`)}</Fragment>)}</p>);
  }
  return <div className={`space-y-2 text-sm leading-relaxed ${className}`}>{blocks}</div>;
}
