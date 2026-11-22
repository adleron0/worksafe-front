const lift = `
    relative
    cursor-alias
    transition-all duration-200 ease-in-out
    hover:shadow-lg
    hover:-translate-y-0.5
    after:absolute after:left-0 after:top-0 after:h-full after:w-0.5 after:bg-primary after:opacity-0 hover:after:opacity-100 after:transition-opacity
  `;

const tailwindUtils = {
  // Linha de lista que abre o item: sobe de leve, ganha sombra, barra verde à esquerda e cursor de "acessar"
  itemClickable: `
    border-b border-border/40
    hover:bg-card
    ${lift}
  `,
  // Mesmo efeito para cartões (kanban, cartões com borda própria)
  cardClickable: `
    overflow-hidden
    ${lift}
  `,
};

export default tailwindUtils;
