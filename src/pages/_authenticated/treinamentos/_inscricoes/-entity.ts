import { IDefaultEntity } from "@/general-interfaces/defaultEntity.interface";

/** Entidade de inscrições: usada pela lista e pelas telas de cadastro/edição. */
export const SUBSCRIPTION_ENTITY: IDefaultEntity = {
  name: "Inscrição",
  pluralName: "Inscrições",
  model: "subscription",
  ability: "treinamentos",
};
