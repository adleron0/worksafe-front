import React from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DoubleArrowLeftIcon,
  DoubleArrowRightIcon,
} from "@radix-ui/react-icons";

import {
  Pagination as ShadPagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from "@/components/ui/pagination"; // Ajuste o caminho conforme necessário

type PaginationProps = {
  totalItems: number;
  itemsPerPage: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  maxVisiblePages?: number; // Quantas páginas visíveis ao redor da atual
};

const Pagination: React.FC<PaginationProps> = ({
  totalItems,
  itemsPerPage,
  currentPage,
  onPageChange,
  maxVisiblePages = 5,
}) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // Lógica para calcular quais páginas serão exibidas
  const getPaginationItems = () => {
    const pages = [];
    const half = Math.floor(maxVisiblePages / 2);
    const startPage = Math.max(1, currentPage - half);
    const endPage = Math.min(totalPages - 2, currentPage + half);

    const showLeftEllipsis = startPage > 1;
    const showRightEllipsis = endPage < totalPages - 2;

    pages.push(0); // Primeira página

    if (showLeftEllipsis) {
      pages.push(-1); // Ellipsis
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    if (showRightEllipsis) {
      pages.push(-1); // Ellipsis
    }

    if (totalPages > 1) {
      pages.push(totalPages - 1); // Última página
    }

    return pages;
  };

  const paginationItems = getPaginationItems();

  return (
    <>
      <span
        className="text-muted-foreground text-xs"
      >
        {`Listando do item ${currentPage * itemsPerPage + 1} ao ${Math.min((currentPage + 1) * itemsPerPage, totalItems)} de um total de ${totalItems} itens`}  
      </span>
      <ShadPagination className="mt-2">

        {/* Páginas Numeradas */}
        <PaginationContent className="list-none p-0 flex flex-row gap-1">
          {/* Botão para Primeira Página */}
          <PaginationItem className="list-none">
            <PaginationLink
              onClick={() => onPageChange(0)} // Primeira página é 0
              disabled={currentPage === 0}
              aria-label="Primeira página"
            >
              <DoubleArrowLeftIcon className="h-4 w-4" />
            </PaginationLink>
          </PaginationItem>

          {/* Botão Anterior */}
          <PaginationItem className="list-none">
            <PaginationPrevious
              onClick={() => onPageChange(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </PaginationPrevious>
          </PaginationItem>

          {/* Página atual no mobile */}
          <PaginationItem key="current-mobile" className="block md:hidden">
            <PaginationLink isActive>
              {currentPage + 1} {/* Exibir para o usuário como 1-based */}
            </PaginationLink>
          </PaginationItem>

          {/* Páginas numeradas para desktop */}
          {paginationItems.map((page, index) =>
            page === -1 ? (
              <PaginationItem key={index} className="list-none hidden md:block">
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={index} className="list-none hidden md:block">
                <PaginationLink
                  isActive={page === currentPage}
                  onClick={() => onPageChange(page)} // page é zero-based
                >
                  {page + 1} {/* Exibir como 1-based */}
                </PaginationLink>
              </PaginationItem>
            )
          )}

          {/* Botão Próximo */}
          <PaginationItem className="list-none">
            <PaginationNext
              onClick={() =>
                onPageChange(Math.min(totalPages - 1, currentPage + 1))
              }
              disabled={currentPage >= totalPages - 1}
            >
              <ChevronRightIcon className="h-4 w-4" />
            </PaginationNext>
          </PaginationItem>

          {/* Botão para Última Página */}
          <PaginationItem className="list-none">
            <PaginationLink
              onClick={() => onPageChange(totalPages - 1)} // Última página é totalPages - 1
              disabled={currentPage >= totalPages - 1}
              aria-label="Última página"
            >
              <DoubleArrowRightIcon className="h-4 w-4" />
            </PaginationLink>
          </PaginationItem>
        </PaginationContent>

      </ShadPagination>
    </>
  );
};

export default Pagination;
