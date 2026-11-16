/**
 * Catálogo das variáveis do certificado: nome em português, grupo e um valor
 * de exemplo (usado na lista de variáveis do editor e na prévia).
 * As chaves são as que a API preenche ao emitir.
 */
export interface CertificateVariableInfo {
  key: string;
  label: string;
  group: string;
  example: string;
  type?: 'string' | 'url';
}

const instructor = (n: number): CertificateVariableInfo[] => {
  const ex = [
    { nome: 'Odenis Mesquita', reg: 'SRTE: 2140/PE', form: 'Técnico em Segurança do Trabalho' },
    { nome: 'Orlando Cândido', reg: 'ANEAC: 02937', form: 'Técnico em Segurança do Trabalho' },
    { nome: 'Marina Albuquerque', reg: 'CREA: 18.204/PE', form: 'Engenheira de Segurança' },
    { nome: 'Carlos Henrique Lima', reg: 'IRATA: 3/41877', form: 'Supervisor de Acesso por Cordas' },
  ][n - 1];
  return [
    { key: `instrutor_nome_${n}`, label: `Nome do instrutor ${n}`, group: 'Instrutores', example: ex.nome },
    { key: `instrutor_registro_${n}`, label: `Registro do instrutor ${n}`, group: 'Instrutores', example: ex.reg },
    { key: `instrutor_formacao_${n}`, label: `Formação do instrutor ${n}`, group: 'Instrutores', example: ex.form },
    {
      key: `instrutor_curriculum_${n}`,
      label: `Currículo do instrutor ${n}`,
      group: 'Instrutores',
      example: `${ex.form}, Profissional qualificado em Acesso por Cordas, Socorrista APH.`,
    },
    { key: `instrutor_cpf_${n}`, label: `CPF do instrutor ${n}`, group: 'Instrutores', example: '987.654.321-00' },
  ];
};

export const CERTIFICATE_VARIABLES: CertificateVariableInfo[] = [
  { key: 'aluno_nome', label: 'Nome do aluno', group: 'Aluno', example: 'Maria Aparecida dos Santos' },
  { key: 'aluno_cpf', label: 'CPF do aluno', group: 'Aluno', example: '123.456.789-00' },
  { key: 'aluno_data_nascimento', label: 'Nascimento', group: 'Aluno', example: '14/03/1990' },
  { key: 'aluno_cidade', label: 'Cidade', group: 'Aluno', example: 'Recife' },
  { key: 'aluno_estado', label: 'Estado', group: 'Aluno', example: 'Pernambuco' },
  { key: 'aluno_estado_uf', label: 'UF', group: 'Aluno', example: 'PE' },

  { key: 'curso_nome', label: 'Nome do curso', group: 'Curso', example: 'NR-35 Trabalho em Altura' },
  { key: 'curso_descricao', label: 'Descrição do curso', group: 'Curso', example: 'Capacitação para trabalho em altura conforme NR-35.' },
  { key: 'curso_validade_anos', label: 'Validade (anos)', group: 'Curso', example: '2' },

  { key: 'turma_nome', label: 'Nome da turma', group: 'Turma', example: 'NR-35 — Turma 12' },
  { key: 'turma_carga_horaria', label: 'Carga horária', group: 'Turma', example: '40 horas' },
  { key: 'turma_periodo', label: 'Período', group: 'Turma', example: '07/08/2026 a 09/08/2026' },
  { key: 'turma_data_inicio', label: 'Data de início', group: 'Turma', example: '07/08/2026' },
  { key: 'turma_data_inicio_extenso', label: 'Início por extenso', group: 'Turma', example: '7 de agosto de 2026' },
  { key: 'turma_data_fim', label: 'Data de término', group: 'Turma', example: '09/08/2026' },
  { key: 'turma_data_fim_extenso', label: 'Término por extenso', group: 'Turma', example: '9 de agosto de 2026' },

  ...instructor(1),
  ...instructor(2),
  ...instructor(3),
  ...instructor(4),
  { key: 'instrutores_nomes', label: 'Todos os instrutores', group: 'Instrutores', example: 'Odenis Mesquita, Orlando Cândido' },

  { key: 'certificado_codigo', label: 'Código do certificado', group: 'Certificado', example: '202600100046' },
  { key: 'certificado_ano', label: 'Ano de emissão', group: 'Certificado', example: '2026' },
  { key: 'certificado_emissao', label: 'Data de emissão', group: 'Certificado', example: '10/08/2026' },
  { key: 'certificado_emissao_extenso', label: 'Emissão por extenso', group: 'Certificado', example: '10 de agosto de 2026' },
  { key: 'certificado_validade', label: 'Validade', group: 'Certificado', example: '10/08/2028' },
  { key: 'certificado_validade_extenso', label: 'Validade por extenso', group: 'Certificado', example: '10 de agosto de 2028' },

  { key: 'inscricao_nome', label: 'Nome na inscrição', group: 'Inscrição', example: 'Maria Aparecida dos Santos' },
  { key: 'inscricao_ocupacao', label: 'Ocupação', group: 'Inscrição', example: 'Técnica de manutenção' },
  { key: 'inscricao_empresa', label: 'Empresa em que trabalha', group: 'Inscrição', example: 'Worksafe Serviços Ltda' },
  { key: 'inscricao_data_confirmacao', label: 'Data da confirmação', group: 'Inscrição', example: '01/08/2026' },

  { key: 'instituicao_nome', label: 'Nome da instituição', group: 'Instituição', example: 'WorkSafe Brasil' },
  { key: 'instituicao_razao_social', label: 'Razão social', group: 'Instituição', example: 'WorkSafe Treinamentos Ltda' },
  { key: 'instituicao_cnpj', label: 'CNPJ', group: 'Instituição', example: '12.345.678/0001-90' },
];

export const VARIABLE_GROUPS = ['Aluno', 'Curso', 'Turma', 'Instrutores', 'Certificado', 'Inscrição', 'Instituição'];

/** Variáveis de exemplo no formato do visualizador ({ chave: { type, value } }). */
export function sampleVariables(opts: { instructors?: number; withCompany?: boolean } = {}) {
  const n = opts.instructors ?? 2;
  const out: Record<string, { type: 'string' | 'url'; value: string }> = {};
  for (const v of CERTIFICATE_VARIABLES) {
    const m = v.key.match(/_(\d)$/);
    // dado que falta vai vazio (como a API faz), não some da lista
    const missing =
      (m && v.group === 'Instrutores' && Number(m[1]) > n) ||
      (v.key === 'inscricao_empresa' && opts.withCompany === false);
    out[v.key] = { type: v.type ?? 'string', value: missing ? '' : v.example };
  }
  return out;
}

/** Normaliza para busca: minúsculo e sem acento. */
export const fold = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
