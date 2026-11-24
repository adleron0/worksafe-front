import React from "react";
import ListFooter from "./ListFooter";

type PaginationProps = {
  totalItems: number;
  itemsPerPage: number;
  /** página atual, começando em 0 */
  currentPage: number;
  onPageChange: (page: number) => void;
  /** mantido por compatibilidade; o rodapé novo mostra a vizinha de cada lado */
  maxVisiblePages?: number;
  /** quando a tela deixa trocar a quantidade por página no rodapé */
  onLimitChange?: (limit: number) => void;
};

/**
 * Paginação antiga das listas, agora no padrão Unyo: "Mostrando 1–10 de N"
 * à esquerda e as páginas numeradas à direita (delegando ao ListFooter).
 */
const Pagination: React.FC<PaginationProps> = ({ totalItems, itemsPerPage, currentPage, onPageChange, onLimitChange }) => (
  <ListFooter total={totalItems} limit={itemsPerPage} page={currentPage} onPageChange={onPageChange} onLimitChange={onLimitChange} />
);

export default Pagination;
