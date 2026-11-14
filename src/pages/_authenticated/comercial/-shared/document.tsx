import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * "Folha" do documento da proposta: fundo branco e tipografia própria, igual
 * na pré-visualização, na página pública e na impressão. O HTML vem pronto e
 * já limpo da API (o corpo é sanitizado no servidor ao gravar e ao montar).
 *
 * A folha tem sempre a largura de uma A4. Quando o espaço é menor (celular),
 * ela não se rearranja: é reduzida por inteiro, com tudo no mesmo lugar, como
 * um PDF visto de longe. O cliente amplia com os dedos se quiser ler de perto.
 */
const PAGE_WIDTH = 794; // A4 a 96 dpi

export function DocumentPaper({ html, className }: { html: string; className?: string }) {
  const frame = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const element = frame.current;
    if (!element) return;
    const fit = () => setScale(Math.min(1, element.clientWidth / PAGE_WIDTH));
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return (
    <>
      <style>{`
        .proposal-doc { background:#fff; color:#111; font-size:15px; line-height:1.55; }
        .proposal-doc h1 { font-size:1.6em; font-weight:700; margin:0 0 .6em; line-height:1.25; }
        .proposal-doc h2 { font-size:1.2em; font-weight:700; margin:1.4em 0 .4em; }
        .proposal-doc h3 { font-size:1.02em; font-weight:700; margin:1em 0 .3em; }
        .proposal-doc p { margin:0 0 .6em; }
        .proposal-doc ul, .proposal-doc ol { margin:0 0 .6em 1.4em; }
        .proposal-doc ul { list-style:disc; } .proposal-doc ol { list-style:decimal; }
        .proposal-doc a { color:#1d4ed8; text-decoration:underline; }
        .proposal-doc img { max-width:100%; height:auto; }
        .proposal-doc table { max-width:100%; }
        .proposal-doc blockquote { border-left:3px solid #ccc; padding-left:.8em; color:#444; margin:0 0 .6em; }
        /* documentos com identidade: títulos na cor da marca, com um traço ao lado */
        .proposal-doc .pd-root { --brand:#16A34A; }
        .proposal-doc .pd-root > h2 { font-size:1.25em; margin:1.8em 0 .6em; padding-left:.6em; border-left:5px solid var(--brand); line-height:1.25; }
        .proposal-doc .pd-root > h1 { color:var(--brand); }
        .proposal-doc .pd-root > h3 { margin:1.1em 0 .25em; }
        .proposal-doc .pd-root th { border-bottom-color:var(--brand) !important; }
        /* modelo de orçamento: títulos sóbrios, sem cor nem traço, e texto um pouco menor */
        .proposal-doc .pd-classic { font-size:.95em; line-height:1.45; }
        .proposal-doc .pd-classic > h2 { font-size:1.25em; font-weight:400; letter-spacing:.02em; margin:1.5em 0 .5em; padding-left:0; border-left:0; }
        .proposal-doc .pd-classic > p { font-size:.95em; }
        .proposal-doc .pd-classic th { border-bottom:0 !important; }
        /* proposta com texto próprio: os termos viram títulos e parágrafos comuns, com a mesma cara */
        .proposal-doc .pd-classic > h3 { border-top:1px solid #999; margin:14px 0 6px; padding-top:8px; font-size:.82em; letter-spacing:.04em; text-transform:uppercase; }
        .proposal-doc .pd-classic > h3 ~ p, .proposal-doc .pd-classic > h3 ~ ul, .proposal-doc .pd-classic > h3 ~ ol { font-size:.9em; line-height:1.5; margin-bottom:.45em; }
        .proposal-doc .pd-classic [data-block="termo"] p { margin:0 0 .45em; }
        .proposal-doc .pd-classic [data-block="termo"] ul { margin:0 0 .45em 1.2em; }
        .proposal-doc .pd-classic [data-block="termo"] li { margin:0 0 .25em; }
        .proposal-doc figure { margin:0; }
        .proposal-doc svg { overflow:visible; }
        .proposal-doc .ql-align-center { text-align:center; } .proposal-doc .ql-align-right { text-align:right; } .proposal-doc .ql-align-justify { text-align:justify; }
        .proposal-doc .ql-size-small { font-size:.8em; } .proposal-doc .ql-size-large { font-size:1.4em; } .proposal-doc .ql-size-huge { font-size:2em; }
        .proposal-doc .ql-indent-1 { padding-left:2em; } .proposal-doc .ql-indent-2 { padding-left:4em; }
        @media print {
          .proposal-doc { font-size:12pt; padding:0 !important; border:0 !important; box-shadow:none !important; zoom:1 !important; width:auto !important; }
          .proposal-doc table { page-break-inside:auto; } .proposal-doc tr { page-break-inside:avoid; }
          .proposal-doc h2, .proposal-doc h3 { page-break-after:avoid; }
        }
      `}</style>
      {/* a moldura não herda a largura da folha (senão nunca "faltaria" espaço para reduzir) */}
      <div ref={frame} className="w-full min-w-0 overflow-hidden" style={{ containerType: "inline-size" }}>
        <div className={cn("proposal-doc mx-auto rounded-md border p-10", className)} style={{ width: PAGE_WIDTH, zoom: scale }} dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </>
  );
}
