/**
 * Converte um código de cor hexadecimal para HSL.
 * @param {string} hex - O código de cor hexadecimal (por exemplo, "#00A24D").
 * @returns {string} - A cor no formato HSL (por exemplo, "123 50% 40%").
 */
function hexToHsl(hex: string) {
  // Remove o # se presente
  hex = hex.replace('#', '');
  
  // Converte para RGB
  const r = parseInt(hex.substr(0, 2), 16) / 255;
  const g = parseInt(hex.substr(2, 2), 16) / 255;
  const b = parseInt(hex.substr(4, 2), 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h: number | undefined, s: number;
  let l = (max + min) / 2;
  
  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h = h! / 6;
  }
  
  return {
    h: Math.round((h || 0) * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

export function generateTheme(primaryColorHex: string, secondaryColorHex?: string) {
  // Converte a cor primária para HSL
  const primaryColorHSL = hexToHsl(primaryColorHex);
  const { h, s, l } = primaryColorHSL;
  
  // Se uma cor secundária foi fornecida, converte para HSL
  // Senão, cria uma secundária complementar baseada na primária
  let secondaryHSL = null;
  if (secondaryColorHex) {
    secondaryHSL = hexToHsl(secondaryColorHex);
  } else {
    // Cria cor secundária próxima da primária (variação sutil)
    secondaryHSL = {
      h: (h + 10) % 360, // Apenas 30° de diferença
      s: Math.max(s - 15, 30), // Reduz saturação para diferenciar
      l: l > 50 ? l - 10 : l + 10 // Ajusta luminosidade levemente
    };
  }
  
  // Remove estilos dinâmicos anteriores
  const existingStyle = document.getElementById('dynamic-theme');
  if (existingStyle) {
    existingStyle.remove();
  }
  
  // Cria CSS completo com tema claro e escuro
  const themeCSS = `
    :root {
      --background: 0 0% 100%;
      --background-muted: 0 0% 99%;
      --foreground: ${h} 84% 4.9%;
      --inverse-foreground: ${h} 40% 98%;
      --card: 0 0% 100%;
      --card-foreground: ${h} 84% 4.9%;
      --primary: ${h} ${s}% ${l}%;
      --primary-foreground: ${h} 40% 98%;
      --primary-dark: ${h} ${s}% ${Math.max(l - 30, 10)}%;
      --secondary: ${secondaryHSL.h} ${secondaryHSL.s}% ${secondaryHSL.l}%;
      --secondary-foreground: ${secondaryHSL.h} ${Math.min(secondaryHSL.s + 20, 80)}% ${Math.max(secondaryHSL.l - 40, 10)}%;
      --muted: ${h} 40% 96.1%;
      --muted-foreground: ${h} 16.3% 46.9%;
      --popover: 0 0% 100%;
      --popover-foreground: 222.2 84% 4.9%;
    }
    
    .dark {
      --background: ${h} 84% 4.9% !important;
      --background-muted: ${h} 84% 7.9% !important;
      --foreground: ${h} 40% 98% !important;
      --inverse-foreground: ${h} 84% 4.9% !important;
      --card: ${h} 84% 4.9% !important;
      --card-foreground: ${h} 40% 98% !important;
      --primary: ${h} 91.2% 59.8% !important;
      --primary-foreground: ${h} 47.4% 11.2% !important;
      --primary-dark: ${h} ${s}% ${Math.max(l - 40, 5)}% !important;
      --secondary: ${secondaryHSL.h} ${Math.min(secondaryHSL.s + 10, 60)}% ${Math.max(secondaryHSL.l - 20, 15)}% !important;
      --secondary-foreground: ${secondaryHSL.h} 40% 95% !important;
      --muted: ${h} 32.6% 17.5% !important;
      --muted-foreground: ${h} 20.2% 65.1% !important;
      --popover: ${h} 84% 4.9% !important;
      --popover-foreground: ${h} 40% 98% !important;
    }
  `;
  
  // Adiciona CSS ao documento
  const style = document.createElement('style');
  style.id = 'dynamic-theme';
  style.textContent = themeCSS;
  document.head.appendChild(style);
}