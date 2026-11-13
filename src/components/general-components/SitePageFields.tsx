import Input from "@/components/general-components/Input";
import RichTextEditor from "@/components/general-components/RichTextEditor";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

/** Mesmo slug que a API grava (src/common/crud/hooks.ts → toSlug). */
export const toSlug = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);

export interface SitePageValues {
  slug?: string;
  description?: string;
  content?: string;
  seoTitle?: string;
  seoDescription?: string;
}

interface SitePageFieldsProps {
  values: SitePageValues;
  onChange: (name: keyof SitePageValues, value: string) => void;
  /** Nome do cadastro, usado para sugerir o endereço e o título. */
  name: string;
  /** Caminho da página no site, ex.: "/servicos/". */
  basePath: string;
  /** Resumo próprio da página (serviços). Cursos já têm a descrição. */
  showDescription?: boolean;
  siteUrl?: string;
}

const TITLE_MAX = 70;
const DESCRIPTION_MAX = 170;

const counter = (value: string | undefined, max: number) => {
  const size = value?.length ?? 0;
  return (
    <span className={`text-xs ${size > max ? "text-red-500" : "text-muted-foreground"}`}>
      {size}/{max}
    </span>
  );
};

/**
 * Campos da página do cadastro no site: endereço, texto e o que aparece no
 * Google. Sem endereço, o item não tem página própria.
 */
const SitePageFields = ({
  values,
  onChange,
  name,
  basePath,
  showDescription = false,
  siteUrl = "worksafebrasil.com.br",
}: SitePageFieldsProps) => {
  const slug = values.slug ?? "";
  const previewTitle = values.seoTitle || name || "Título da página";
  const previewDescription =
    values.seoDescription || values.description || "Descrição que aparece abaixo do título na busca do Google.";

  return (
    <div className="mt-6 flex flex-col gap-3 rounded-md border p-3">
      <div>
        <p className="font-semibold">Página no site</p>
        <p className="text-xs text-muted-foreground">
          Com um endereço preenchido, o item ganha página própria no site, encontrada pelo Google.
        </p>
      </div>

      <div className="space-y-1">
        <Label htmlFor="slug">Endereço da página</Label>
        <div className="flex gap-2">
          <Input
            id="slug"
            name="slug"
            placeholder="ex.: alpinismo-industrial-recife"
            value={slug}
            onValueChange={(_, value) => onChange("slug", String(value))}
            onBlur={() => onChange("slug", toSlug(slug))}
            className="mt-1"
          />
          <Button
            type="button"
            variant="outline"
            className="mt-1"
            disabled={!name}
            onClick={() => onChange("slug", toSlug(name))}
          >
            Gerar do nome
          </Button>
        </div>
        <p className="text-xs text-muted-foreground break-all">
          {siteUrl}
          {basePath}
          {slug ? toSlug(slug) : "…"}
        </p>
      </div>

      {showDescription && (
        <div className="space-y-1">
          <Label htmlFor="description">Resumo</Label>
          <p className="text-xs text-muted-foreground">Uma ou duas frases no topo da página.</p>
          <Input
            id="description"
            name="description"
            type="textArea"
            placeholder="O que é o serviço e para quem"
            value={values.description ?? ""}
            onValueChange={(_, value) => onChange("description", String(value))}
            className="mt-1 h-24"
          />
        </div>
      )}

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label htmlFor="seoTitle">Título no Google</Label>
          {counter(values.seoTitle, TITLE_MAX)}
        </div>
        <Input
          id="seoTitle"
          name="seoTitle"
          placeholder={name ? `${name} em Recife e Pernambuco` : "Título da página na busca"}
          value={values.seoTitle ?? ""}
          onValueChange={(_, value) => onChange("seoTitle", String(value))}
          maxLength={TITLE_MAX}
          className="mt-1"
        />
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label htmlFor="seoDescription">Descrição no Google</Label>
          {counter(values.seoDescription, DESCRIPTION_MAX)}
        </div>
        <Input
          id="seoDescription"
          name="seoDescription"
          type="textArea"
          placeholder="Uma frase que convença a clicar"
          value={values.seoDescription ?? ""}
          onValueChange={(_, value) => onChange("seoDescription", String(value))}
          maxLength={DESCRIPTION_MAX}
          className="mt-1 h-20"
        />
      </div>

      <div className="rounded-md bg-muted/40 p-3">
        <p className="text-xs text-muted-foreground">Prévia na busca</p>
        <p className="text-xs text-muted-foreground break-all">
          {siteUrl}
          {basePath}
          {slug ? toSlug(slug) : "…"}
        </p>
        <p className="text-blue-600 dark:text-blue-400 text-base leading-snug">{previewTitle}</p>
        <p className="text-sm text-muted-foreground line-clamp-2">{previewDescription}</p>
      </div>

      {/* A altura fixa do editor não conta a barra de ferramentas, que quebra
          em várias linhas no painel lateral: o editor cresce com ela e só a
          área de texto tem 300px. */}
      <div className="space-y-1 [&_.quill]:!h-auto [&_.ql-container]:!h-[300px]">
        <Label>Texto da página</Label>
        <RichTextEditor
          value={values.content ?? ""}
          onChange={(value) => onChange("content", value)}
          placeholder="Explique o serviço: o que é, como fazemos, para quem, normas e região atendida."
          height={300}
        />
      </div>
    </div>
  );
};

export default SitePageFields;
