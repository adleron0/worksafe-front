import InfoHint from "@/components/general-components/InfoHint";

/** Características ("a#b#c") numa linha: as primeiras como etiquetas, todas no balão. */
export default function FeaturesCell({ features }: { features?: string | null }) {
  const list = (features ?? "").split("#").map((part) => part.trim()).filter(Boolean);
  if (!list.length) return <span className="text-muted-foreground">-</span>;
  const shown = list.slice(0, 2);
  const tag = "inline-block max-w-[9rem] truncate rounded-chip border bg-muted/50 px-1.5 py-px text-[11px] text-muted-foreground";
  return (
    <div className="flex items-center gap-1 whitespace-nowrap">
      {shown.map((feature, index) => <span key={`${feature}-${index}`} className={tag}>{feature}</span>)}
      {list.length > shown.length && (
        <>
          <span className="text-xs text-muted-foreground">+{list.length - shown.length}</span>
          <InfoHint label="Ver todas as características" lines={list} />
        </>
      )}
    </div>
  );
}
