import { Link } from "@tanstack/react-router";
import Icon from "@/components/general-components/Icon";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Telas de cadastro e edição (no lugar da gaveta lateral): cabeçalho com "voltar",
 * formulário em seções (cartões) à esquerda e uma coluna à direita com resumo e ações.
 */
export function FormPageHeader({ backTo, backLabel, title, description, badge }: {
  backTo: string;
  backLabel: string;
  title: string;
  description?: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <Link to={backTo as never} className="inline-flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground">
        <Icon name="arrow-left" className="w-3.5 h-3.5" /> {backLabel}
      </Link>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-bold leading-tight">{title}</h1>
        {badge}
      </div>
      {description && <p className="text-[13px] text-muted-foreground mt-0.5">{description}</p>}
    </div>
  );
}

/** Grade do formulário: conteúdo + coluna lateral fixa (no celular a lateral vem depois). */
export function FormPageGrid({ children, aside, className }: { children: React.ReactNode; aside: React.ReactNode; className?: string }) {
  return (
    <div className={cn("grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] items-start", className)}>
      <div className="flex flex-col gap-4 min-w-0">{children}</div>
      <aside className="flex flex-col gap-4 lg:sticky lg:top-0">{aside}</aside>
    </div>
  );
}

/** Seção do formulário: título, explicação curta e os campos. */
export function FormSection({ title, description, children, className }: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-card border bg-card p-4 sm:p-5", className)}>
      <h2 className="text-[15px] font-semibold">{title}</h2>
      {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      <div className="mt-4 flex flex-col gap-4">{children}</div>
    </section>
  );
}

/** Linha do resumo lateral: rótulo à esquerda, valor à direita. */
export function SummaryRow({ label, children, strong }: { label: string; children: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-[13px]">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("text-right min-w-0 truncate", strong && "text-base font-bold tabular-nums")}>{children}</span>
    </div>
  );
}

/** Esqueleto enquanto a conta carrega. */
export function FormPageSkeleton() {
  return (
    <FormPageGrid aside={<Skeleton className="h-56 w-full rounded-card" />}>
      <Skeleton className="h-64 w-full rounded-card" />
      <Skeleton className="h-40 w-full rounded-card" />
    </FormPageGrid>
  );
}
