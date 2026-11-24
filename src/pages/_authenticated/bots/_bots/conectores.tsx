import { useEffect, useRef, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import Select from "@/components/general-components/Select";
import CalendarPicker from "@/components/general-components/Calendar";
import { errorMessage } from "../../comercial/-shared/commercial";
import { aiApi, dateTimeBr } from "../-shared/bots";
import { InstagramLogo, InstagramRules } from "../-shared/instagram";

interface InstagramAccount {
  username: string | null; name: string | null; pictureUrl: string | null; accountType: string | null;
  connectedAt: string; refreshedAt: string; expiresAt: string | null; status: "connected" | "expired"; lastError: string | null;
}
interface Connectors { instagram: { configured: boolean; redirectUri: string; account: InstagramAccount | null } }
type PostKind = "feed" | "story" | "carousel";
interface SocialPost { id: number; kind: PostKind; caption: string; media: string[]; scheduledAt: string; status: string; permalink: string | null; error: string | null; botId: number | null; publishedAt: string | null }

const KIND: Record<PostKind, string> = { feed: "Post no feed", story: "Story", carousel: "Carrossel" };
const STATUS: Record<string, { label: string; className: string }> = {
  scheduled: { label: "Agendado", className: "bg-sky-500/15 text-sky-700 dark:text-sky-300" },
  processing: { label: "Publicando", className: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  published: { label: "Publicado", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  failed: { label: "Falhou", className: "bg-red-500/15 text-red-700 dark:text-red-300" },
  canceled: { label: "Cancelado", className: "bg-muted text-muted-foreground" },
};
const TABS = [
  { key: "upcoming", label: "Agendados" },
  { key: "published", label: "Publicados" },
  { key: "failed", label: "Falharam" },
] as const;

export const Route = createFileRoute("/_authenticated/bots/_bots/conectores")({
  component: ConnectorsPage,
  validateSearch: (search: Record<string, unknown>) => ({
    instagram: typeof search.instagram === "string" ? search.instagram : undefined,
    motivo: typeof search.motivo === "string" ? search.motivo : undefined,
  }),
});

/** Bots → Conectores: contas externas que os bots usam (hoje, o Instagram da Nina). */
function ConnectorsPage() {
  const { can } = useVerify();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const data = useQuery({ queryKey: ["aiConnectors"], queryFn: () => aiApi.get<Connectors>("connectors") });

  // volta da tela da Meta: avisa e limpa o endereço
  useEffect(() => {
    if (!search.instagram) return;
    if (search.instagram === "ok") toast({ title: "Instagram conectado", description: "A Nina já pode criar e agendar posts.", variant: "success" });
    else toast({ title: "O Instagram não foi conectado", description: search.motivo || "Tente de novo.", variant: "destructive" });
    navigate({ to: "/bots/conectores", search: { instagram: undefined, motivo: undefined }, replace: true });
  }, [search.instagram, search.motivo, navigate]);

  if (!can("conectores_bots") && !can("instagram_bots")) return null;
  const instagram = data.data?.instagram;

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-xl font-bold">Conectores</h1>
        <p className="text-sm text-muted-foreground">Contas da empresa que os bots usam para trabalhar. Cada uma se conecta uma vez, pela tela oficial do serviço, e pode ser desconectada quando quiser.</p>
      </div>
      {data.error && <p className="text-destructive">Erro: {errorMessage(data.error)}</p>}
      {data.isLoading && <Skeleton className="h-40 w-full" />}
      {instagram && <InstagramCard info={instagram} />}
      {instagram?.account && can("instagram_bots") && <InstagramPosts connected={instagram.account.status === "connected"} />}
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{n}</span>
      <div className="text-sm"><p className="font-medium">{title}</p><div className="mt-0.5 text-muted-foreground">{children}</div></div>
    </li>
  );
}

function InstagramCard({ info }: { info: Connectors["instagram"] }) {
  const { can } = useVerify();
  const queryClient = useQueryClient();
  const [guide, setGuide] = useState(false);
  const [adminGuide, setAdminGuide] = useState(false);
  const account = info.account;
  const start = useMutation({
    mutationFn: () => aiApi.post<{ url: string }>("connectors/instagram/start"),
    onSuccess: (out) => { window.location.href = out.url; },
    onError: (error) => toast({ title: "Não foi possível abrir a conexão", description: errorMessage(error), variant: "destructive" }),
  });
  const disconnect = useMutation({
    mutationFn: async () => (await api.delete("ai/connectors/instagram")).data,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["aiConnectors"] }); queryClient.invalidateQueries({ queryKey: ["instagramPosts"] }); toast({ title: "Instagram desconectado", variant: "success" }); },
    onError: (error) => toast({ title: "Não foi possível desconectar", description: errorMessage(error), variant: "destructive" }),
  });
  const manage = can("conectores_bots");
  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); toast({ title: "Copiado", variant: "success" }); } catch { toast({ title: "Copie manualmente", variant: "destructive" }); }
  };

  return (
    <div className="rounded-2xl border p-5">
      <div className="flex flex-wrap items-start gap-4">
        <InstagramLogo />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Instagram</p>
          <p className="text-sm text-muted-foreground">A Nina cria e agenda posts, carrosséis e stories na conta da empresa, lê e responde o Direct e os comentários. Você escolhe abaixo o que pede confirmação e o que sai sozinho.</p>
        </div>
        {!account && manage && (
          <Button type="button" onClick={() => setGuide(true)}><Icon name="plug" className="mr-1 h-4 w-4" /> Conectar</Button>
        )}
      </div>

      {account && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-muted/50 p-3">
          {account.pictureUrl ? <img src={account.pictureUrl} alt="" className="h-10 w-10 rounded-full object-cover" /> : <InstagramLogo className="h-10 w-10" />}
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-medium">@{account.username}{account.name ? <span className="font-normal text-muted-foreground"> · {account.name}</span> : null}</p>
            {account.status === "connected"
              ? <p className="text-xs text-muted-foreground">Conectado em {dateTimeBr(account.connectedAt)} · a conexão se renova sozinha</p>
              : <p className="text-xs font-medium text-destructive">A conexão expirou ou foi revogada. Conecte de novo para voltar a publicar.</p>}
          </div>
          {manage && account.status === "expired" && <Button type="button" size="sm" onClick={() => setGuide(true)}>Conectar de novo</Button>}
          {manage && (
            <ConfirmDialog title="Desconectar o Instagram?" description="Os posts agendados que ainda não saíram serão cancelados. Os já publicados continuam no Instagram." onConfirm={() => disconnect.mutate()}>
              <Button type="button" variant="outline" size="sm">Desconectar</Button>
            </ConfirmDialog>
          )}
        </div>
      )}

      {account && account.status === "connected" && can("instagram_mensagens_bots") && (
        <Link to="/bots/instagram" className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-2 hover:underline">
          <Icon name="inbox" className="h-4 w-4" /> Abrir a caixa de mensagens e comentários
        </Link>
      )}

      {account && manage && <InstagramRules />}

      {!account && !manage && <p className="mt-3 text-sm text-muted-foreground">O Instagram ainda não foi conectado. Peça para quem administra os bots conectar.</p>}

      <Dialog open={guide} onOpenChange={setGuide}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><InstagramLogo className="h-7 w-7" /> Conectar o Instagram</DialogTitle>
            <DialogDescription>Leva um minuto. Confira os passos e clique em conectar: abre a tela oficial do Instagram para você entrar e permitir.</DialogDescription>
          </DialogHeader>
          {!info.configured ? (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
              <p className="font-medium">Falta um passo de quem administra o sistema</p>
              <p className="mt-1 text-muted-foreground">O WorkSafe ainda não foi cadastrado como app na Meta neste servidor. É feito uma vez só, para todas as empresas. Depois disso, este botão funciona na hora.</p>
              <Button type="button" variant="link" className="h-auto p-0 text-sm" onClick={() => setAdminGuide((open) => !open)}>{adminGuide ? "Esconder" : "Ver"} como cadastrar</Button>
              {adminGuide && (
                <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs text-muted-foreground">
                  <li>Em developers.facebook.com, crie um app do tipo "Empresa" e adicione o produto <b>Instagram</b> (API com login do Instagram).</li>
                  <li>Em "Configurar login comercial", cole este endereço de retorno:
                    <span className="mt-1 flex items-center gap-1"><code className="flex-1 truncate rounded bg-muted px-1.5 py-1">{info.redirectUri}</code><Button type="button" variant="outline" size="sm" className="h-6 px-2 text-xs" onClick={() => copy(info.redirectUri)}>Copiar</Button></span>
                  </li>
                  <li>Copie o "ID do app do Instagram" e a "Chave secreta do app do Instagram" para as variáveis INSTAGRAM_APP_ID e INSTAGRAM_APP_SECRET do servidor da API.</li>
                  <li>Enquanto o app não passa pela revisão da Meta, adicione a conta do Instagram da empresa como testadora (Funções do app → Testadores do Instagram).</li>
                </ol>
              )}
            </div>
          ) : (
            <ol className="grid gap-4">
              <Step n={1} title="A conta precisa ser profissional">No app do Instagram: Configurações → Tipo de conta e ferramentas → <b>Mudar para conta profissional</b> (Empresa ou Criador de conteúdo). Se já for, pule.</Step>
              <Step n={2} title="Esteja com a conta da empresa à mão">Na próxima tela, entre com o usuário e a senha do Instagram da empresa (não o pessoal).</Step>
              <Step n={3} title="Permita publicar">Deixe marcada a permissão de <b>publicar conteúdo</b> e confirme. Você volta para cá já conectado.</Step>
            </ol>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setGuide(false)}>Agora não</Button>
            <Button type="button" onClick={() => start.mutate()} disabled={start.isPending || !info.configured}>
              <Icon name={start.isPending ? "loader-circle" : "external-link"} className={`mr-1 h-4 w-4 ${start.isPending ? "animate-spin" : ""}`} /> Pronto, conectar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InstagramPosts({ connected }: { connected: boolean }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("upcoming");
  const [creating, setCreating] = useState(false);
  const queryClient = useQueryClient();
  const posts = useQuery({ queryKey: ["instagramPosts", tab], queryFn: () => aiApi.get<SocialPost[]>("instagram/posts", { status: tab }) });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["instagramPosts"] });
  const publish = useMutation({
    mutationFn: (id: number) => aiApi.post<SocialPost>(`instagram/posts/${id}/publish`),
    onSuccess: (post) => { refresh(); toast({ title: post.status === "published" ? "Publicado no Instagram" : post.status === "failed" ? "Não foi publicado" : "Publicando…", description: post.error ?? undefined, variant: post.status === "failed" ? "destructive" : "success" }); },
    onError: (error) => toast({ title: "Não foi possível publicar", description: errorMessage(error), variant: "destructive" }),
  });
  const cancel = useMutation({
    mutationFn: (id: number) => aiApi.patch(`instagram/posts/${id}/cancel`),
    onSuccess: () => { refresh(); toast({ title: "Post cancelado", variant: "success" }); },
    onError: (error) => toast({ title: "Não foi possível cancelar", description: errorMessage(error), variant: "destructive" }),
  });

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="mr-auto font-semibold">Posts do Instagram</h2>
        <div className="flex rounded-lg border p-0.5">
          {TABS.map((item) => (
            <button key={item.key} type="button" onClick={() => setTab(item.key)} className={`cursor-pointer rounded-md px-3 py-1 text-xs font-medium ${tab === item.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>{item.label}</button>
          ))}
        </div>
        <Button type="button" size="sm" onClick={() => setCreating(true)} disabled={!connected}><Icon name="plus" className="mr-1 h-4 w-4" /> Novo post</Button>
      </div>
      <p className="text-xs text-muted-foreground">Você também pode pedir para a Nina: "agenda um post sobre a turma de NR-35 para sexta às 18h".</p>
      {posts.isLoading && <Skeleton className="h-24 w-full" />}
      {posts.data && !posts.data.length && <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">{tab === "upcoming" ? "Nenhum post agendado." : tab === "published" ? "Nada publicado ainda." : "Nenhuma falha."}</p>}
      {posts.data && posts.data.length > 0 && (
        <div className="rounded-lg border">
          {posts.data.map((post) => (
            <div key={post.id} className="flex flex-wrap items-center gap-3 border-b px-4 py-3 last:border-b-0">
              <div className="flex -space-x-3">
                {post.media.slice(0, 3).map((url) => <img key={url} src={url} alt="" className={`rounded-md border-2 border-background object-cover ${post.kind === "story" ? "h-14 w-8" : "h-12 w-12"}`} />)}
              </div>
              <div className="min-w-0 flex-1 text-sm">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{KIND[post.kind]}{post.kind === "carousel" ? ` · ${post.media.length} imagens` : ""}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS[post.status]?.className ?? ""}`}>{STATUS[post.status]?.label ?? post.status}</span>
                  {post.botId && <span className="text-[11px] text-muted-foreground">pela Nina</span>}
                </p>
                <p className="text-xs text-muted-foreground">{post.status === "published" ? `Publicado em ${dateTimeBr(post.publishedAt)}` : dateTimeBr(post.scheduledAt)}{post.caption ? ` · ${post.caption.slice(0, 90)}${post.caption.length > 90 ? "…" : ""}` : ""}</p>
                {post.error && <p className="text-xs text-destructive">{post.error}</p>}
              </div>
              {post.permalink && <a href={post.permalink} target="_blank" rel="noreferrer" className="text-xs font-medium text-primary underline-offset-2 hover:underline">Ver no Instagram</a>}
              {(post.status === "scheduled" || post.status === "failed") && connected && (
                <ConfirmDialog title="Publicar agora?" description="O post sai no Instagram em instantes, sem esperar o horário." onConfirm={() => publish.mutate(post.id)}>
                  <Button type="button" variant="outline" size="sm" disabled={publish.isPending}>Publicar agora</Button>
                </ConfirmDialog>
              )}
              {post.status === "scheduled" && (
                <ConfirmDialog title="Cancelar este post?" description="Ele não será publicado." onConfirm={() => cancel.mutate(post.id)}>
                  <Button type="button" variant="ghost" size="sm" className="text-destructive">Cancelar</Button>
                </ConfirmDialog>
              )}
            </div>
          ))}
        </div>
      )}
      {creating && <NewPostDialog onClose={() => setCreating(false)} onDone={() => { setCreating(false); setTab("upcoming"); refresh(); }} />}
    </div>
  );
}

const TIMES = Array.from({ length: 48 }, (_, index) => {
  const value = `${String(Math.floor(index / 2)).padStart(2, "0")}:${index % 2 ? "30" : "00"}`;
  return { label: value, value };
});
const todayIso = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

function NewPostDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [kind, setKind] = useState<PostKind>("feed");
  const [media, setMedia] = useState<string[]>([]);
  const [caption, setCaption] = useState("");
  const [when, setWhen] = useState<"now" | "later">("later");
  const [date, setDate] = useState(todayIso());
  const [time, setTime] = useState("18:00");
  const [uploading, setUploading] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const max = kind === "carousel" ? 10 : 1;
  const hashtags = (caption.match(/#[\p{L}\p{N}_]+/gu) ?? []).length;

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files).slice(0, max - (kind === "carousel" ? media.length : 0))) {
        const form = new FormData();
        form.append("file", file);
        urls.push((await api.post<{ url: string }>("ai/instagram/upload", form)).data.url);
      }
      setMedia((current) => (kind === "carousel" ? [...current, ...urls].slice(0, 10) : urls.slice(0, 1)));
    } catch (error) {
      toast({ title: "Não foi possível subir a imagem", description: errorMessage(error), variant: "destructive" });
    } finally {
      setUploading(false);
      if (input.current) input.current.value = "";
    }
  };
  const save = useMutation({
    mutationFn: () => aiApi.post<SocialPost>("instagram/posts", { kind, media, caption, scheduledAt: when === "now" ? undefined : `${date}T${time}` }),
    onSuccess: async (post) => {
      if (when === "now") {
        const out = await aiApi.post<SocialPost>(`instagram/posts/${post.id}/publish`).catch(() => post);
        toast({ title: out.status === "published" ? "Publicado no Instagram" : out.status === "failed" ? "Não foi publicado" : "Na fila: sai em instantes", description: out.error ?? undefined, variant: out.status === "failed" ? "destructive" : "success" });
      } else toast({ title: "Post agendado", variant: "success" });
      onDone();
    },
    onError: (error) => toast({ title: "Não foi possível agendar", description: errorMessage(error), variant: "destructive" }),
  });
  const ready = media.length >= (kind === "carousel" ? 2 : 1) && !uploading;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo post no Instagram</DialogTitle>
          <DialogDescription>Suba a arte (JPG ou PNG), escreva a legenda e escolha quando sai. A imagem é ajustada para o formato do Instagram.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(KIND) as PostKind[]).map((key) => (
              <button key={key} type="button" onClick={() => { setKind(key); setMedia((current) => (key === "carousel" ? current : current.slice(0, 1))); }} className={`cursor-pointer rounded-lg border p-2 text-xs font-medium ${kind === key ? "border-primary bg-primary/5" : "hover:bg-muted"}`}>
                <Icon name={key === "story" ? "smartphone" : key === "carousel" ? "gallery-horizontal" : "square"} className="mx-auto mb-1 h-4 w-4" />{KIND[key]}
              </button>
            ))}
          </div>
          <div>
            <div className="flex flex-wrap gap-2">
              {media.map((url) => (
                <span key={url} className="relative">
                  <img src={url} alt="" className={`rounded-md object-cover ${kind === "story" ? "h-24 w-14" : "h-20 w-20"}`} />
                  <button type="button" aria-label="Tirar imagem" onClick={() => setMedia((current) => current.filter((item) => item !== url))} className="absolute -right-1.5 -top-1.5 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-foreground text-background"><Icon name="x" className="h-3 w-3" /></button>
                </span>
              ))}
              {media.length < max && (
                <button type="button" onClick={() => input.current?.click()} className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed text-[11px] text-muted-foreground hover:bg-muted ${kind === "story" ? "h-24 w-14" : "h-20 w-20"}`}>
                  <Icon name={uploading ? "loader-circle" : "image-plus"} className={`h-5 w-5 ${uploading ? "animate-spin" : ""}`} />{uploading ? "Subindo" : "Imagem"}
                </button>
              )}
            </div>
            <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple={kind === "carousel"} className="hidden" onChange={(event) => upload(event.target.files)} />
            <p className="mt-1 text-xs text-muted-foreground">{kind === "story" ? "Story vai como imagem pronta (9:16), sem legenda nem adesivos." : kind === "carousel" ? "De 2 a 10 imagens, na ordem em que aparecem." : "Feed aceita de 4:5 (em pé) a 1,91:1 (deitada)."}</p>
          </div>
          {kind !== "story" && (
            <div>
              <Textarea value={caption} onChange={(event) => setCaption(event.target.value)} maxLength={2200} placeholder="Legenda com hashtags" className="min-h-28" />
              <p className={`mt-1 text-right text-[11px] ${hashtags > 30 ? "text-destructive" : "text-muted-foreground"}`}>{caption.length}/2200 · {hashtags}/30 hashtags</p>
            </div>
          )}
          <div className="grid gap-2">
            <div className="flex rounded-lg border p-0.5 text-xs font-medium">
              {(["later", "now"] as const).map((key) => (
                <button key={key} type="button" onClick={() => setWhen(key)} className={`flex-1 cursor-pointer rounded-md px-3 py-1.5 ${when === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>{key === "later" ? "Agendar" : "Publicar agora"}</button>
              ))}
            </div>
            {when === "later" && (
              <div className="grid grid-cols-[1fr_120px] gap-2">
                <CalendarPicker mode="single" name="postDate" className="w-full" value={date} fromYear={new Date().getFullYear()} toYear={new Date().getFullYear() + 1} onValueChange={(_, value) => setDate(String(value ?? todayIso()).slice(0, 10))} />
                <Select name="postTime" modal options={TIMES} label="label" value="value" state={time} onChange={(_, value) => setTime(String(value))} />
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Voltar</Button>
          <Button type="button" onClick={() => save.mutate()} disabled={!ready || save.isPending || hashtags > 30}>
            {save.isPending ? "Salvando…" : when === "now" ? "Publicar" : "Agendar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
