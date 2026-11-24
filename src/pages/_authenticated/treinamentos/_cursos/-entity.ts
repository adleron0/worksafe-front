import { IDefaultEntity } from "@/general-interfaces/defaultEntity.interface";

/** Entidade de cursos: usada pela lista e pelas telas de cadastro/edição. */
export const COURSE_ENTITY: IDefaultEntity = {
  name: "Curso",
  pluralName: "Cursos",
  model: "courses",
  ability: "treinamentos",
};
