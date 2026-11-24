import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/services/api";
import useVerify from "@/hooks/use-verify";
import { FormPageHeader, FormPageSkeleton } from "@/components/general-components/FormPage";
import { EmptyState } from "@/components/general-components/DataTable";
import { useBackToList } from "@/hooks/use-back-to-list";
import PostForm from "./-components/PostForm";
import { postEntity } from "./-interfaces/entity.interface";
import { PostStatusBadge } from "./-components/postColumns";
import { IPost } from "./-interfaces/entity.interface";

export const Route = createFileRoute("/_authenticated/blog/_posts/posts_/$postId")({
  component: EditPost,
});

/**
 * O GET por id não traz as tags; elas vêm da listagem filtrada pelo slug
 * (mesma consulta da lista), para o formulário abrir com as tags marcadas.
 */
async function loadPost(id: string): Promise<IPost | undefined> {
  const post = await get<IPost>(postEntity.model, id);
  if (!post) return post;
  const list = await get<{ rows: IPost[] }>(postEntity.model, "", [
    { key: "slug", value: post.slug },
    { key: "show", value: "[tags]" },
    { key: "limit", value: 10 },
  ]);
  const withTags = list?.rows?.find((row) => row.id === post.id);
  return { ...post, tags: withTags?.tags ?? [] };
}

/** Edição de um post do blog, em tela cheia. */
function EditPost() {
  const { can } = useVerify();
  const { postId } = Route.useParams();
  const back = useBackToList("/blog/posts");
  const { data, isLoading, isError } = useQuery<IPost | undefined>({
    queryKey: ["blogPost", postId],
    queryFn: () => loadPost(postId),
    gcTime: 0, // sem cache: abrir de novo sempre traz a versão salva
  });
  if (!can(`update_${postEntity.ability}`)) return null;
  return (
    <>
      <FormPageHeader backTo="/blog/posts" backLabel="Posts" title={data ? `Editar post "${data.title}"` : "Editar post"}
        description="Atenção: as alterações mudam o post no blog." badge={data && <PostStatusBadge status={data.status} />} />
      {isLoading ? <FormPageSkeleton />
        : isError || !data ? <EmptyState icon="search-x" title="Post não encontrado." />
          : <PostForm key={data.id} formData={data} close={back} />}
    </>
  );
}
