import { ReactNode } from 'react';

interface ShowProps {
  when: boolean;
  children: ReactNode;
}

/**
 * Componente de renderização condicional
 * Renderiza o children apenas quando "when" for true
 *
 * @example
 * <Show when={isVisible}>
 *   <div>Este conteúdo só aparece quando isVisible for true</div>
 * </Show>
 *
 * @example
 * <Show when={user !== null}>
 *   <UserProfile user={user} />
 * </Show>
 *
 * @example
 * <Show when={items.length > 0}>
 *   <ItemList items={items} />
 * </Show>
 */
const Show = ({ when, children }: ShowProps) => {
  return when ? <>{children}</> : null;
};

export default Show;