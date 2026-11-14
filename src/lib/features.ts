/**
 * Liga/desliga de funcionalidades ainda não lançadas.
 *
 * Curso online (EAD): desligado por enquanto (14/11/2026). As páginas do
 * admin (cursos/aulas online) e do aluno (cursos e aulas) foram arquivadas
 * em `archive/curso-online/` — fora do roteador e do build. Para reativar:
 * mover de volta para `src/pages/` (mesmos caminhos) e trocar para `true`.
 * Os dados (turma com `hasOnlineCourse`, modelos, aulas) continuam no banco.
 */
export const ONLINE_COURSES_ENABLED = false;
