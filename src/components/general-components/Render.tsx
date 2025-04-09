import React from 'react';

interface RenderProps<T> {
  'r-if'?: boolean;
  'r-for'?: T[];
  keyField?: keyof T;
  children: (props: { item?: T }) => React.ReactNode;
}

function Render<T>({ 'r-if': condition, 'r-for': items, keyField, children }: RenderProps<T>) {
  if (items) {
    // Renderiza uma lista
    return (
      <>
        {items.map((item, index) => (
          <div key={keyField ? (item[keyField] as React.Key) : index}>
            {children({ item })}
          </div>
        ))}
      </>
    );
  }

  if (condition !== undefined) {
    // Renderiza condicionalmente
    return condition ? <>{children({})}</> : null;
  }

  // Renderiza o conteúdo padrão
  return <>{children({})}</>;
}

export default Render;
