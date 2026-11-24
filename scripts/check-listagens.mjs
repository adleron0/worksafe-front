// Acusa o visual antigo das listagens: faixa verde de cabeçalho (bg-primary + text-inverse-foreground
// numa caixa flex/grid com font-semibold) e cabeçalho de tabela verde. Uso: npm run check:listagens
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const walk = (dir) => readdirSync(dir).flatMap((name) => {
  const path = join(dir, name);
  return statSync(path).isDirectory() ? walk(path) : path.endsWith(".tsx") ? [path] : [];
});
const bad = [];
for (const file of walk("src")) {
  readFileSync(file, "utf8").split("\n").forEach((line, i) => {
    for (const cls of line.match(/className=["`{][^"`}]*["`}]/g) ?? []) {
      const strip = /\bbg-primary\b/.test(cls) && /text-inverse-foreground/.test(cls) && /font-semibold/.test(cls) && /\b(flex|grid)\b/.test(cls);
      const head = /<thead[^>]*bg-primary/.test(line);
      if (strip || head) bad.push(`${file}:${i + 1}`);
    }
  });
}
if (bad.length) {
  console.error("Visual antigo de listagem (use DataTable / cabeçalho cinza):\n" + bad.join("\n"));
  process.exit(1);
}
console.log("check:listagens ok");
