import { createFileRoute } from "@tanstack/react-router";
import useVerify from "@/hooks/use-verify";
import { FormPageHeader } from "@/components/general-components/FormPage";
import { useBackToList } from "@/hooks/use-back-to-list";
import PostForm from "./-components/PostForm";
import { postEntity } from "./-interfaces/entity.interface";

export const Route = createFileRoute("/_authenticated/blog/_posts/posts_/novo")({
  component: NewPost,
});

/** Novo post do blog, em tela cheia. */
function NewPost() {
  const { can } = useVerify();
  const back = useBackToList("/blog/posts");
  if (!can(`create_${postEntity.ability}`)) return null;
  return (
    <>
      <FormPageHeader backTo="/blog/posts" backLabel="Posts" title="Novo post"
        description="Preencha com atenção todas as informações necessárias para cadastrar o post." />
      <PostForm close={back} />
    </>
  );
}
