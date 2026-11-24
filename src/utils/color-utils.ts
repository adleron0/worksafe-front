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

/** Texto que lê bem sobre a cor (branco ou quase preto), pela luminância relativa (WCAG). */
function readableForeground(hex: string) {
  const clean = hex.replace('#', '');
  const channel = (i: number) => {
    const c = parseInt(clean.substr(i, 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const luminance = 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
  // a marca prefere texto branco (verde #149E5E dá 3,4:1); só cores claras de verdade
  // (amarelo, ciano, rosa-claro), em que o branco fica abaixo de 3:1, passam a texto escuro
  return 1.05 / (luminance + 0.05) >= 3 ? '0 0% 100%' : '24 10% 10%';
}

export function generateTheme(primaryColorHex: string, secondaryColorHex?: string) {
  // Converte a cor primária para HSL
  const primaryColorHSL = hexToHsl(primaryColorHex);
  const { h, s, l } = primaryColorHSL;
  const primaryForeground = readableForeground(primaryColorHex);
  
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
      /* superfícies neutras (chumbo quente): a cor da empresa fica para os detalhes */
      --background: 45 17% 95%;
      --background-muted: 40 14% 93%;
      --foreground: 24 10% 10%;
      --inverse-foreground: 45 17% 97%;
      --card: 40 33% 98%;
      --card-foreground: 24 10% 10%;
      --primary: ${h} ${s}% ${l}%;
      --primary-foreground: ${primaryForeground};
      /* versão suave (luminosidade fixa, vale para qualquer cor de empresa) */
      --primary-soft: ${h} ${Math.min(s, 70)}% 94%;
      --primary-soft-foreground: ${h} ${Math.min(s, 80)}% 24%;
      --primary-dark: ${h} ${s}% ${Math.max(l - 30, 10)}%;
      --secondary: ${secondaryHSL.h} ${secondaryHSL.s}% ${secondaryHSL.l}%;
      --secondary-foreground: ${secondaryHSL.h} ${Math.min(secondaryHSL.s + 20, 80)}% ${Math.max(secondaryHSL.l - 40, 10)}%;
      --muted: 40 12% 92%;
      --muted-foreground: 25 5% 45%;
      --popover: 40 33% 98%;
      --popover-foreground: 24 10% 10%;
      --border: 40 10% 88%;
      --input: 40 10% 88%;
      --sidebar: hsl(40 20% 97%);
      --sidebar-accent: hsl(40 12% 92%);
      --sidebar-border: hsl(40 10% 88%);
    }
    
    .dark {
      /* superfícies neutras (chumbo quente): sem tingir de verde */
      --background: 30 5% 8.6% !important;
      --background-muted: 40 6% 10.4% !important;
      --foreground: 45 17% 95% !important;
      --inverse-foreground: 24 10% 10% !important;
      --card: 30 6% 12.2% !important;
      --card-foreground: 45 17% 95% !important;
      /* a mesma cor da empresa (só um pouco mais clara para contrastar no escuro),
         com texto branco — antes virava um verde neon com texto escuro */
      --primary: ${h} ${s}% ${Math.min(l + 4, 48)}% !important;
      --primary-foreground: ${primaryForeground} !important;
      --primary-soft: ${h} ${Math.round(Math.min(s, 70) * 0.55)}% 16% !important;
      --primary-soft-foreground: ${h} 55% 76% !important;
      --primary-dark: ${h} ${s}% ${Math.max(l - 40, 5)}% !important;
      --secondary: ${secondaryHSL.h} ${Math.min(secondaryHSL.s + 10, 60)}% ${Math.max(secondaryHSL.l - 20, 15)}% !important;
      --secondary-foreground: ${secondaryHSL.h} 40% 95% !important;
      --muted: 36 6% 15.5% !important;
      --muted-foreground: 24 6% 64% !important;
      --popover: 36 7% 13.1% !important;
      --popover-foreground: 45 17% 95% !important;
      --border: 30 7% 17.6% !important;
      --input: 30 7% 17.6% !important;
      --sidebar: hsl(30 6% 10.5%) !important;
      --sidebar-accent: hsl(36 6% 15.5%) !important;
      --sidebar-border: hsl(30 7% 17.6%) !important;
      --sidebar-foreground: hsl(45 17% 92%) !important;
    }
  `;
  
  // Adiciona CSS ao documento
  const style = document.createElement('style');
  style.id = 'dynamic-theme';
  style.textContent = themeCSS;
  document.head.appendChild(style);
}