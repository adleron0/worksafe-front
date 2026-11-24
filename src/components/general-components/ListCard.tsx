import { cn } from "@/lib/utils";

/**
 * Cartão único da listagem (padrão Unyo): chips, barra de ferramentas, contagem,
 * tabela e rodapé moram dentro dele. Só borda, sem sombra; raio de cartão (16).
 */
export default function ListCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return <section className={cn("rounded-card border bg-card p-3 sm:p-4 flex flex-col gap-3 sm:gap-4 min-w-0", className)}>{children}</section>;
}
