import { conclusaoCursoTemplate } from './models/conclusao-curso';
import { participacaoEventoTemplate } from './models/participacao-evento';
import { honraMeritoTemplate } from './models/honra-merito';
import { capacitacaoTemplate } from './models/capacitacao';
import type { CertificateTemplate } from './types';

export const certificateTemplates: CertificateTemplate[] = [
  conclusaoCursoTemplate,
  participacaoEventoTemplate,
  honraMeritoTemplate,
  capacitacaoTemplate
];

export type { CertificateTemplate } from './types';
export { TEMPLATE_CATEGORIES } from './types';
export { default as TemplateGrid } from './TemplateGrid';