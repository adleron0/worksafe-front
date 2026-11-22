import type { KeyboardEvent, MouseEvent } from "react";

/** Elementos que já têm ação própria dentro de uma linha clicável. */
const INTERACTIVE = "a,button,input,select,textarea,label,[role=button],[role=checkbox],[role=menuitem],[role=switch],[data-row-ignore]";

/**
 * Props para uma linha de lista que abre o item ao ser clicada (use junto com
 * `tailwindUtils.itemClickable`). Cliques em botões, links, checkboxes e menus
 * de dentro da linha continuam com a ação deles, e cliques em diálogos abertos
 * a partir da linha (que vêm por portal) são ignorados.
 */
export function clickableRow(open?: () => void) {
  // sem `open`, a linha segue o primeiro link dela (o nome/número do item)
  const go = (row: HTMLElement) => (open ? open() : row.querySelector<HTMLAnchorElement>("a[href]")?.click());
  const skip = (event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    if (!event.currentTarget.contains(target)) return true; // veio de um portal (diálogo, menu)
    const hit = target.closest(INTERACTIVE);
    return !!hit && hit !== event.currentTarget;
  };
  return {
    role: "link" as const,
    tabIndex: 0,
    onClick: (event: MouseEvent<HTMLElement>) => { if (!skip(event) && !window.getSelection()?.toString()) go(event.currentTarget); },
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => { if (event.key === "Enter" && !skip(event)) go(event.currentTarget); },
  };
}
