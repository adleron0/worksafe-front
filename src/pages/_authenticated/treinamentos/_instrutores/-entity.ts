import { IDefaultEntity } from "@/general-interfaces/defaultEntity.interface";

/** Entidade de instrutores: usada pela lista e pelas telas de cadastro/edição. */
export const INSTRUCTOR_ENTITY: IDefaultEntity = {
  name: "Instrutor",
  pluralName: "Instrutores",
  model: "instructors",
  ability: "instrutores",
};
