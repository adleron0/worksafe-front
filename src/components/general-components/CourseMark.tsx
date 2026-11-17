import Icon from "@/components/general-components/Icon";

/** Ícone do curso num quadrinho com a cor do curso (fundo suave + ícone na cor). */
export function CourseMark({
  icon,
  color,
  size = "sm",
}: {
  icon?: string | null;
  color?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const c = /^#[0-9a-f]{6}$/i.test(String(color || "")) ? String(color) : null;
  const box = size === "lg" ? "h-12 w-12 rounded-xl" : size === "md" ? "h-9 w-9 rounded-lg" : "h-7 w-7 rounded-md";
  const ico = size === "lg" ? "h-6 w-6" : size === "md" ? "h-[18px] w-[18px]" : "h-4 w-4";
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center ${box} ${c ? "" : "bg-muted text-muted-foreground"}`}
      style={c ? { backgroundColor: `${c}1f`, color: c, boxShadow: `inset 0 0 0 1px ${c}33` } : undefined}
    >
      <Icon name={icon || "graduation-cap"} className={ico} />
    </span>
  );
}

export default CourseMark;
