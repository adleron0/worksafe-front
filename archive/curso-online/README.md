# Curso online (EAD) — arquivado

Desligado em 14/11/2026: a funcionalidade não será lançada por enquanto.

Aqui estão, nos **mesmos caminhos** de `src/`, as páginas que saíram do
roteador e do build:

- admin: `treinamentos/_cursos-online` (Cursos Online) e
  `treinamentos/aulas-online` (Aulas Online e passos)
- aluno: `student/courses.tsx`, `student/course/*` e `student/lesson/*`

O que continua no código, escondido pela chave `ONLINE_COURSES_ENABLED`
(`src/lib/features.ts`): opção "Habilitar Curso Online" no cadastro de turma,
selo "Curso online" na lista de turmas, "Meus Cursos" no menu do aluno e os
blocos de cursos/progresso no painel do aluno.

## Reativar

1. Mover as pastas de volta: `git mv archive/curso-online/src/pages/... src/pages/...`
2. `ONLINE_COURSES_ENABLED = true` em `src/lib/features.ts`
3. Recolocar "Cursos Online" e "Aulas Online" em `src/template/Sidebar/items.tsx`
4. `npm run build` (regera `routeTree.gen.ts`)

Os dados (modelos de curso online, aulas, progresso, `hasOnlineCourse` nas
turmas) e as rotas da API continuam intactos.
