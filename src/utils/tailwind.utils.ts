const tailwindUtils = {
  // Classe para o animaçao de item clicável
  itemClickable: `
    border-b border-border/40
    cursor-alias
    transition-all duration-200 ease-in-out
    hover:shadow-lg
    hover:-translate-y-0.5
    hover:bg-card
    after:absolute after:left-0 after:top-0 after:h-full after:w-0.5 after:bg-primary after:opacity-0 hover:after:opacity-100 after:transition-opacity
  `,
};

export default tailwindUtils;
