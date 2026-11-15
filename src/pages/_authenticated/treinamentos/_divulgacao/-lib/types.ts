/** Configurações da divulgação (espelho de worksafe-api `features/marketing/defaults.ts`). */
export interface MarketingSettings {
  whatsapp?: string;
  email?: string;
  site?: string;
  instagram?: string;
  horarioPadrao?: string;
  localPadrao?: string;
  inclusoPadrao?: string[];
  hashtagsPadrao?: string;
  hashtagsPorCurso?: Record<string, string>;
  linkInscricao?: "turma" | "pagina_curso" | "site" | "personalizado";
  linkPersonalizado?: string;
  selos?: string[];
  temaPadrao?: string;
  ultimasVagasLimite?: number;
  // ---- identidade visual (white label) ----
  marca?: MarketingBrand;
  rotulos?: Partial<ArtLabels>;
  fonteTitulo?: string;
  fonteTexto?: string;
  temas?: CustomTheme[];
  temasOcultos?: string[];
  selosPersonalizados?: MarketingImage[];
  fotos?: MarketingImage[];
  usarFotosPadrao?: boolean;
  iaContexto?: string;
}

/** Marca na arte: símbolo vetorial padrão, logo enviado ou só o nome. */
export interface MarketingBrand {
  tipo: "padrao" | "logo" | "texto";
  texto?: string;
  /** logo para fundo escuro (normalmente branco) */
  logoClaroUrl?: string;
  /** logo para fundo claro (colorido ou escuro) */
  logoEscuroUrl?: string;
}

export interface MarketingImage {
  nome: string;
  url: string;
}

/** Tema criado pela empresa; as cores derivadas saem de `makeTheme`. */
export interface CustomTheme {
  id: string;
  name: string;
  bg: string;
  accent: string;
  badge: string;
  light: boolean;
  listras: boolean;
}

export interface ArtLabels {
  topo: string;
  novaTurma: string;
  vagasAbertas: string;
  ultimasVagas: string;
  lotada: string;
  promocao: string;
  investimento: string;
  valores: string;
  incluso: string;
  inscricoes: string;
}

export interface MarketingCompany {
  name: string;
  logoUrl: string | null;
  siteDomain: string | null;
  primaryColor: string | null;
  secondaryColor?: string | null;
}

export interface MarketingSettingsResponse {
  settings: MarketingSettings;
  company: MarketingCompany;
}

export interface CaptionTemplate {
  id: number;
  name: string;
  kind: string;
  body: string;
  sortOrder: number;
  active?: boolean;
}

/** Turma como vem de `classes/:id?show=course&show=_count`. */
export interface MarketingClass {
  id: number;
  name: string;
  courseId?: number;
  course?: { id: number; name: string; slug?: string | null; imageUrl?: string | null; hoursDuration?: number | null } | null;
  initialDate?: string | null;
  finalDate?: string | null;
  price?: number | string | null;
  discountPrice?: number | string | null;
  dividedIn?: number | null;
  hoursDuration?: number | null;
  maxSubscriptions?: number | null;
  unlimitedSubscriptions?: boolean | null;
  gifts?: string | null;
  imageUrl?: string | null;
  address?: string | null;
  addressNumber?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  periodClass?: string | null;
  _count?: { subscriptions?: number };
}

/** Situação que decide o selo da arte e o modelo de legenda sugerido. */
export type ClassSituation = "vagas_abertas" | "ultimas_vagas" | "lotada" | "promocao";

/** Ajustes feitos na hora de divulgar (não ficam salvos na turma). */
export interface MarketingOverrides {
  titulo: string;
  niveis: string;
  horario: string;
  local: string;
  incluso: string;
  precosNiveis: string;
  ocultarPreco: boolean;
}

export type ArtFormat = "feed34" | "feed45" | "quadrado" | "story";
export type ArtLayout = "destaque" | "faixa" | "cartao";

export interface ArtOptions {
  format: ArtFormat;
  layout: ArtLayout;
  theme: string;
  badge: ClassSituation | "nenhum";
  photoUrl: string | null;
  photoX: number; // 0–100 (posição horizontal do recorte)
  photoY: number; // 0–100
  photoZoom: number; // 100–200 (%)
  showSeals: boolean;
  showIncluso: boolean;
  showPrice: boolean;
}
