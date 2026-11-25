import axios from "axios";

/**
 * Chamadas do login com Google. Instância própria, sem os interceptores do
 * `api` (que renovam sessão no 401 e põem o token normal no cabeçalho).
 */
const raw = axios.create({
  baseURL: import.meta.env.VITE_BASE_URL,
  withCredentials: true, // cookie do navegador que começou o login
});

const PENDING_KEY = "ws_pending_token";

export type GoogleExchange =
  | { status: "ok"; accessToken: string }
  | { status: "pending"; pendingToken: string; user: { name: string; email: string; imageUrl?: string | null } };

export interface AccessRequestMe {
  user: { name: string; email: string; imageUrl?: string | null };
  request: { status: "pending" | "approved" | "rejected"; message?: string | null; reason?: string | null; createdAt: string; decidedAt?: string | null } | null;
  approved: boolean;
}

export const googleStartUrl = () => `${import.meta.env.VITE_BASE_URL}/auth/google/start`;

export const googleEnabled = async () =>
  (await raw.get<{ enabled: boolean }>("/auth/google/enabled")).data.enabled;

export const exchangeGoogleTicket = async (ticket: string) =>
  (await raw.post<GoogleExchange>("/auth/google/exchange", { ticket })).data;

// token de pendente: só nesta aba (sessionStorage), some ao fechar
export const pendingToken = {
  get: () => sessionStorage.getItem(PENDING_KEY),
  set: (t: string) => sessionStorage.setItem(PENDING_KEY, t),
  clear: () => sessionStorage.removeItem(PENDING_KEY),
};

const pendingHeaders = () => ({ Authorization: `Bearer ${pendingToken.get() ?? ""}` });

export const getMyAccessRequest = async () =>
  (await raw.get<AccessRequestMe>("/auth/access-request/me", { headers: pendingHeaders() })).data;

export const sendAccessRequest = async (message: string) =>
  (await raw.post("/auth/access-request", { message }, { headers: pendingHeaders() })).data;

export const enterAfterApproval = async () =>
  (await raw.post<GoogleExchange>("/auth/access-request/enter", {}, { headers: pendingHeaders() })).data;

/** Mensagens dos códigos de recusa que a API devolve no #ge= */
export const GOOGLE_ERRORS: Record<string, string> = {
  cancelado: "Login com o Google cancelado.",
  desligado: "O login com Google não está disponível.",
  sem_convite: "Esta conta Google não tem acesso. Use o e-mail da empresa ou peça um convite.",
  convite_vencido: "Seu convite venceu. Peça a renovação a quem convidou.",
  convites_multiplos: "Há convites em mais de uma empresa para este e-mail. Fale com o suporte.",
  conta_vinculada: "Este e-mail já está ligado a outra conta Google.",
  email_nao_verificado: "O Google não confirmou este e-mail.",
  dominio_invalido: "Conta Google fora do domínio da empresa.",
  usuario_inativo: "Seu acesso está desativado. Fale com o gestor.",
  estado_invalido: "O login expirou. Tente de novo.",
  navegador_diferente: "Termine o login no mesmo navegador em que começou.",
  google_falhou: "Não deu para confirmar com o Google. Tente de novo.",
  muitas_tentativas: "Muitas tentativas. Aguarde alguns minutos.",
};
