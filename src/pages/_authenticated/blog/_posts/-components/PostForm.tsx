import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import Input from "@/components/general-components/Input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { get, post, put } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import Loader from "@/components/general-components/Loader";
import Select from "@/components/general-components/Select";
import DropUpload from "@/components/general-components/DropUpload";
import RichTextEditor from "@/components/general-components/RichTextEditor";
import { IPost } from "../-interfaces/entity.interface";
import { ApiError, Response } from "@/general-interfaces/api.interface";
import { IDefaultEntity } from "@/general-interfaces/defaultEntity.interface";
import { useLoader } from "@/context/GeneralContext";

interface FormProps {
  formData?: IPost;
  openSheet: (open: boolean) => void;
  entity: IDefaultEntity;
}

const PostForm = ({ formData, openSheet, entity }: FormProps) => {
  const queryClient = useQueryClient();
  const { showLoader, hideLoader } = useLoader();

  const postSchema = z.object({
    title: z.string().min(3, { message: "Título deve ter pelo menos 3 caracteres" }),
    slug: z.string().min(3, { message: "Slug deve ter pelo menos 3 caracteres" }),
    categoryId: z.number().nullable().optional(),
    excerpt: z.string().optional().or(z.literal('')),
    content: z.string().min(10, { message: "Conteúdo deve ter pelo menos 10 caracteres" }),
    coverImage: z.string().nullable().optional(),
    image: z.instanceof(File).nullable().or(z.literal(null)).optional(),
    status: z.enum(['draft', 'published', 'archived']),
    featured: z.boolean(),
    tagIds: z.array(z.number()).optional(),
  });

  type PostFormData = z.infer<typeof postSchema>;

  const [dataForm, setDataForm] = useState<PostFormData>({
    title: formData?.title || "",
    slug: formData?.slug || "",
    categoryId: formData?.categoryId || null,
    excerpt: formData?.excerpt || "",
    content: formData?.content || "",
    coverImage: formData?.coverImage || null,
    image: null,
    status: formData?.status || 'draft',
    featured: formData?.featured ?? false,
    tagIds: formData?.tags?.map(t => t.tag.id as number) || [],
  });

  const initialFormRef = useRef(dataForm);
  const [preview, setPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Preview de imagem se existir
  useEffect(() => {
    if (formData?.coverImage) {
      setPreview(formData.coverImage);
    }
  }, [formData]);

  // Auto-generate slug from title
  useEffect(() => {
    if (!formData) {
      const slug = dataForm.title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setDataForm(prev => ({ ...prev, slug }));
    }
  }, [dataForm.title, formData]);

  // Busca de categorias
  const { data: categoryOptions, isFetching: isFetchingCategories } = useQuery<Response | undefined, ApiError>({
    queryKey: [`listBlogCategories`],
    queryFn: async () => {
      const params = [
        { key: 'limit', value: 'all' },
        { key: 'order-name', value: 'asc' },
      ];
      return get('blog/categories', '', params);
    },
  });

  // Busca de tags
  const { data: tagOptions, isFetching: isFetchingTags } = useQuery<Response | undefined, ApiError>({
    queryKey: [`listBlogTags`],
    queryFn: async () => {
      const params = [
        { key: 'limit', value: 'all' },
        { key: 'order-name', value: 'asc' },
      ];
      return get('blog/tags', '', params);
    },
  });

  const { mutate: createPost, isPending } = useMutation({
    mutationFn: (newPost: PostFormData) => {
      showLoader(`Criando ${entity.name}...`);
      const cleanPayload = Object.entries(newPost).reduce((acc, [key, value]) => {
        if (value !== null && value !== '' && value !== undefined) {
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, unknown>);

      return post<IPost>(entity.model, '', cleanPayload);
    },
    onSuccess: () => {
      hideLoader();
      toast({
        title: `${entity.name} criado!`,
        description: `${entity.name} criado com sucesso.`,
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: [`list${entity.pluralName}`] });
      setDataForm(initialFormRef.current);
      openSheet(false);
    },
    onError: (error: ApiError) => {
      hideLoader();
      toast({
        title: `Erro ao criar ${entity.name}`,
        description: error.response?.data?.message || "Erro desconhecido.",
        variant: "destructive",
      });
    },
  });

  const { mutate: updatePost, isPending: isPendingUpdate } = useMutation({
    mutationFn: (updatedPost: PostFormData) => {
      showLoader(`Atualizando ${entity.name}...`);
      const cleanPayload = Object.entries(updatedPost).reduce((acc, [key, value]) => {
        if (value !== null && value !== '' && value !== undefined) {
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, unknown>);

      return put<IPost>(entity.model, `${formData?.id}`, cleanPayload);
    },
    onSuccess: () => {
      hideLoader();
      toast({
        title: `${entity.name} atualizado!`,
        description: `${entity.name} atualizado com sucesso.`,
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: [`list${entity.pluralName}`] });
      setDataForm(initialFormRef.current);
      openSheet(false);
    },
    onError: (error: ApiError) => {
      hideLoader();
      toast({
        title: `Erro ao atualizar ${entity.name}`,
        description: error.response?.data?.message || "Erro desconhecido.",
        variant: "destructive",
      });
    },
  });

  const handleChange = (name: string, value: string | number | null) => {
    setDataForm(prev => ({ ...prev, [name]: value }));
  };

  const handleCategoryChange = (_name: string, value: string | string[]) => {
    if (typeof value === 'string') {
      setDataForm(prev => ({ ...prev, categoryId: value ? Number(value) : null }));
    }
  };

  const handleTagsChange = (_name: string, value: string | string[]) => {
    if (Array.isArray(value)) {
      setDataForm(prev => ({ ...prev, tagIds: value.map(v => Number(v)) }));
    } else if (typeof value === 'string') {
      setDataForm(prev => ({ ...prev, tagIds: value ? [Number(value)] : [] }));
    }
  };

  const handleStatusChange = (_name: string, value: string | string[]) => {
    if (typeof value === 'string') {
      setDataForm(prev => ({ ...prev, status: value as 'draft' | 'published' | 'archived' }));
    }
  };

  const handleContentChange = (content: string) => {
    setDataForm(prev => ({ ...prev, content }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = postSchema.safeParse(dataForm);

    if (!result.success) {
      const formattedErrors: Record<string, { _errors: string[] }> = result.error.format() as Record<string, { _errors: string[] }>;
      const newErrors: { [key: string]: string } = {};
      for (const key in formattedErrors) {
        if (key !== "_errors") {
          newErrors[key] = formattedErrors[key]?._errors[0] || "";
        }
      }
      setErrors(newErrors);
      return;
    }

    setErrors({});

    if (formData) {
      updatePost(dataForm);
    } else {
      createPost(dataForm);
    }
  };

  const statusOptions = [
    { id: "draft", name: "Rascunho" },
    { id: "published", name: "Publicado" },
    { id: "archived", name: "Arquivado" }
  ];

  if (isPending || isPendingUpdate) {
    return <Loader title="Carregando..." />;
  }

  return (
    <form id="post-form" onSubmit={handleSubmit} className="space-y-4">
      {/* Linha superior - Campos de configuração em grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Título */}
        <div>
          <Label htmlFor="title">Título *</Label>
          <Input
            id="title"
            name="title"
            placeholder="Título do post"
            value={dataForm.title}
            onValueChange={handleChange}
            required
          />
          {errors.title && <p className="text-red-500 text-sm">{errors.title}</p>}
        </div>

        {/* Slug */}
        <div>
          <Label htmlFor="slug">Slug *</Label>
          <Input
            id="slug"
            name="slug"
            placeholder="slug-do-post"
            value={dataForm.slug}
            onValueChange={handleChange}
            required
          />
          {errors.slug && <p className="text-red-500 text-sm">{errors.slug}</p>}
        </div>

        {/* Status */}
        <div>
          <Label htmlFor="status">Status *</Label>
          <Select
            name="status"
            options={statusOptions}
            state={dataForm.status}
            onChange={handleStatusChange}
            placeholder="Selecione o status"
          />
          {errors.status && <p className="text-red-500 text-sm">{errors.status}</p>}
        </div>
      </div>

      {/* Segunda linha - Tags, Categoria, Destaque */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        {/* Tags */}
        <div>
          <Label htmlFor="tagIds">Tags</Label>
          <Select
            name="tagIds"
            disabled={isFetchingTags}
            options={tagOptions?.rows || []}
            state={dataForm.tagIds?.map(id => id.toString()) || []}
            onChange={handleTagsChange}
            placeholder="Selecione as tags"
            multiple
          />
          {errors.tagIds && <p className="text-red-500 text-sm">{errors.tagIds}</p>}
        </div>

        {/* Categoria */}
        <div>
          <Label htmlFor="categoryId">Categoria</Label>
          <Select
            name="categoryId"
            disabled={isFetchingCategories}
            options={categoryOptions?.rows || []}
            state={dataForm.categoryId?.toString() || ""}
            onChange={handleCategoryChange}
            placeholder="Selecione a categoria"
          />
          {errors.categoryId && <p className="text-red-500 text-sm">{errors.categoryId}</p>}
        </div>

        {/* Destaque */}
        <div className="flex items-center gap-2 p-2 rounded-lg border">
          <Switch
            id="featured"
            checked={dataForm.featured}
            onCheckedChange={(checked) => setDataForm(prev => ({ ...prev, featured: checked }))}
          />
          <Label htmlFor="featured" className="cursor-pointer text-sm">Destaque</Label>
        </div>
      </div>

      {/* Terceira linha - Resumo e Imagem */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
        {/* Resumo */}
        <div className="md:col-span-3">
          <Label htmlFor="excerpt">Resumo</Label>
          <Textarea
            id="excerpt"
            name="excerpt"
            placeholder="Breve resumo do post (exibido na listagem)"
            value={dataForm.excerpt}
            onChange={(e) => handleChange("excerpt", e.target.value)}
            rows={5}
          />
          {errors.excerpt && <p className="text-red-500 text-sm">{errors.excerpt}</p>}
        </div>

        {/* Imagem de Capa */}
        <div>
          <Label htmlFor="image">Imagem de Capa</Label>
          <DropUpload
            setImage={setDataForm}
            EditPreview={preview}
            acceptedFiles="image/*"
            cover={true}
          />
          {errors.image && <p className="text-red-500 text-sm">{errors.image}</p>}
        </div>
      </div>

      {/* Conteúdo - Full width */}
      <div>
        <Label htmlFor="content">Conteúdo *</Label>
        <div className="mt-2">
          <RichTextEditor
            value={dataForm.content}
            onChange={handleContentChange}
            placeholder="Escreva o conteúdo do post..."
            height={350}
          />
        </div>
        {errors.content && <p className="text-red-500 text-sm">{errors.content}</p>}
      </div>
    </form>
  );
};

export default PostForm;
