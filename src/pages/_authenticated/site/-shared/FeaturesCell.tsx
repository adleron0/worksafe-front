import InfoHint from "@/components/general-components/InfoHint";
import TagBadge from "@/components/general-components/TagBadge";

/** Características ("a#b#c") numa linha: as primeiras como etiquetas, todas no balão. */
export default function FeaturesCell({ features }: { features?: string | null }) {
  const list = (features ?? "").split("#").map((part) => part.trim()).filter(Boolean);
  if (!list.length) return <span className="text-muted-foreground">-</span>;
  const shown = list.slice(0, 2);
  return (
    <div className="flex items-center gap-1 whitespace-nowrap">
      {shown.map((feature, index) => <TagBadge key={`${feature}-${index}`} className="max-w-[9rem]">{feature}</TagBadge>)}
      {list.length > shown.length && (
        <>
          <span className="text-xs text-muted-foreground">+{list.length - shown.length}</span>
          <InfoHint label="Ver todas as características" lines={list} />
        </>
      )}
    </div>
  );
}
