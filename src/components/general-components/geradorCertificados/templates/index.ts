import { conclusaoCursoTemplate } from './models/conclusao-curso';
import { participacaoEventoTemplate } from './models/participacao-evento';
import { honraMeritoTemplate } from './models/honra-merito';
import { capacitacaoTemplate } from './models/capacitacao';
import { verticalModernoTemplate } from './models/vertical-moderno';
import { verticalEleganteTemplate } from './models/vertical-elegante';
import type { CertificateTemplate } from './types';

export const certificateTemplates: CertificateTemplate[] = [
  conclusaoCursoTemplate,
  participacaoEventoTemplate,
  honraMeritoTemplate,
  capacitacaoTemplate,
  verticalModernoTemplate,
  verticalEleganteTemplate
];

export type { CertificateTemplate } from './types';
export { TEMPLATE_CATEGORIES } from './types';
export { default as TemplateGrid } from './TemplateGrid';