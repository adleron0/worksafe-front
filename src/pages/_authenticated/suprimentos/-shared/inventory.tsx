import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";
import useVerify from "@/hooks/use-verify";
import { Tip } from "../../comercial/-shared/commercial";

/** Inventário e relatórios do estoque: cliente da API e tipos (espelham a API). */

export const COUNTS_KEY = "stockCounts";
export const COUNT_KEY = "stockCount";
export const REPORT_KEY = "stockReport";
export const SITE_PRODUCTS_KEY = "stockSiteProducts";

export const countsApi = {
  get: async <T,>(path: string) => (await api.get<T>(`stock/counts${path ? `/${path}` : ""}`)).data,
  post: async <T,>(path: string, body?: unknown) => (await api.post<T>(`stock/counts${path ? `/${path}` : ""}`, body ?? {})).data,
  put: async <T,>(path: string, body?: unknown) => (await api.put<T>(`stock/counts/${path}`, body ?? {})).data,
};

export type CountStatus = "aberta" | "fechada" | "cancelada";
export interface CountRow { id: number; location: string; locationId: number; status: CountStatus; blindCount: boolean; openedAt: string; closedAt: string | null; lines: number; counted: number; differences: number }
export interface CountLine {
  id: number; itemId: number; code: string; item: string; unit: string; lot: string | null; tag: string | null; unitId: number | null;
  expected: number | null; counted: number | null; difference: number | null; value: number | null; note: string | null;
}
export interface Count {
  id: number; status: CountStatus; blindCount: boolean; location: { id: number; name: string } | null; note: string | null;
  openedAt: string; closedAt: string | null; movementId: number | null; lines: CountLine[]; totalValue: number | null;
}
export const countStatusTone = (status: CountStatus) => (status === "aberta" ? "amber" : status === "fechada" ? "green" : "muted") as "amber" | "green" | "muted";

export interface StockReport {
  from: string; to: string; stockValue: number | null;
  byCategory: Array<{ name: string; value: number | null }>;
  byOrder: Array<{ id: number; number: string; title: string; value: number | null }>;
  byCostCenter: Array<{ name: string; value: number | null }>;
  topItems: Array<{ id: number; name: string; unit: string; out: number; value: number | null }>;
  adjustments: { count: number; value: number | null };
}
export interface SiteProductStock { productId: number; itemId: number; item: string; availability: "pronta_entrega" | "sob_encomenda" }

/** Situação de estoque dos produtos da loja ligados a itens (só para quem vê o estoque). */
export function useSiteProductStock() {
  const { can } = useVerify();
  const { data } = useQuery({
    queryKey: [SITE_PRODUCTS_KEY],
    queryFn: async () => (await api.get<SiteProductStock[]>("stock/site-products")).data,
    enabled: can("view_itens_estoque") && can("list_itens_estoque"),
    retry: false,
    staleTime: 60_000,
  });
  return new Map((data ?? []).map((row) => [row.productId, row]));
}

/** Selo "Estoque" na lista de produtos do site. */
export function SiteStockBadge({ productId }: { productId: number }) {
  const stock = useSiteProductStock().get(productId);
  if (!stock) return null;
  return (
    <Tip text={`Ligado ao item ${stock.item}`}>
      <Link to="/suprimentos/estoque/itens/$itemId" params={{ itemId: String(stock.itemId) }}
        className={`inline-flex mt-1 rounded px-1.5 py-0.5 text-xs font-medium ${stock.availability === "pronta_entrega" ? "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300" : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"}`}>
        Estoque: {stock.availability === "pronta_entrega" ? "pronta entrega" : "sob encomenda"}
      </Link>
    </Tip>
  );
}
