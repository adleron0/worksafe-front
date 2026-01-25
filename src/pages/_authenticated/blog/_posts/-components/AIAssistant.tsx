import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { post } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Select from "@/components/general-components/Select";
import { Sparkles, RefreshCw, Wand2, Check, X, Loader2 } from "lucide-react";

interface AIGenerateResponse {
  content: string;
  supplier: string;
}

interface AIReviewResponse {
  improvedContent: string;
  corrections: string[];
  suggestions: string[];
  references: string[];
  supplier: string;
}

interface AIAssistantProps {
  currentTitle: string;
  currentExcerpt: string;
  currentContent: string;
  currentCategory?: string;
  onApplyContent: (content: string) => void;
}

export default function AIAssistant({
  currentTitle,
  currentExcerpt,
  currentContent,
  currentCategory,
  onApplyContent,
}: AIAssistantProps) {
  const [toneDialogOpen, setToneDialogOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedTone, setSelectedTone] = useState("technical");
  const [reviewResult, setReviewResult] = useState<AIReviewResponse | null>(null);
  const [includeReferences, setIncludeReferences] = useState(true);

  const canGenerate = currentTitle.length >= 3 && currentExcerpt.length >= 10 && currentCategory;
  const canReview = currentContent.length >= 50;

  // Mutation para gerar artigo
  const { mutate: generateArticle, isPending: isGenerating } = useMutation({
    mutationFn: () =>
      post<AIGenerateResponse>("blog/posts/ai", "generate", {
        title: currentTitle,
        summary: currentExcerpt,
        category: currentCategory,
        tone: selectedTone,
      }),
    onSuccess: (response) => {
      if (response?.content) {
        onApplyContent(response.content);
        setToneDialogOpen(false);
        toast({
          title: "Artigo gerado!",
          description: `Conteúdo gerado com sucesso via ${response.supplier}`,
          variant: "success",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao gerar artigo",
        description: error.response?.data?.message || "Erro desconhecido",
        variant: "destructive",
      });
    },
  });

  // Mutation para revisar artigo
  const { mutate: reviewArticle, isPending: isReviewing } = useMutation({
    mutationFn: () =>
      post<AIReviewResponse>("blog/posts/ai", "review", {
        content: currentContent,
        title: currentTitle,
        category: currentCategory,
        includeReferences,
      }),
    onSuccess: (response) => {
      if (response) {
        setReviewResult(response);
        toast({
          title: "Revisão concluída!",
          description: `Artigo revisado com sucesso via ${response.supplier}`,
          variant: "success",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao revisar artigo",
        description: error.response?.data?.message || "Erro desconhecido",
        variant: "destructive",
      });
    },
  });

  const handleApplyReview = () => {
    if (reviewResult?.improvedContent) {
      let finalContent = reviewResult.improvedContent;

      // Adiciona referências ao final do conteúdo se existirem
      if (reviewResult.references && reviewResult.references.length > 0) {
        const referencesHtml = `
          <h2>Referências</h2>
          <ul>
            ${reviewResult.references
              .map((ref) => {
                // Se for uma URL, cria um link
                if (ref.startsWith("http")) {
                  return `<li><a href="${ref}" target="_blank" rel="noopener noreferrer">${ref}</a></li>`;
                }
                return `<li>${ref}</li>`;
              })
              .join("")}
          </ul>
        `;
        finalContent += referencesHtml;
      }

      onApplyContent(finalContent);
      setReviewModalOpen(false);
      setReviewResult(null);
    }
  };

  const toneOptions = [
    { id: "technical", name: "Técnico" },
    { id: "formal", name: "Formal" },
    { id: "informal", name: "Informal" },
  ];

  return (
    <>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setToneDialogOpen(true)}
          disabled={!canGenerate || isGenerating}
          className="gap-1 sm:gap-2"
          title={!canGenerate ? "Preencha título, resumo e categoria primeiro" : "Gerar com IA"}
        >
          {isGenerating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">Gerar com IA</span>
          <span className="sm:hidden">Gerar</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setReviewModalOpen(true)}
          disabled={!canReview || isReviewing}
          className="gap-1 sm:gap-2"
          title={!canReview ? "O conteúdo deve ter pelo menos 50 caracteres" : "Revisar com IA"}
        >
          {isReviewing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">Revisar com IA</span>
          <span className="sm:hidden">Revisar</span>
        </Button>
      </div>

      {/* Dialog simples para escolher o tom */}
      <Dialog open={toneDialogOpen} onOpenChange={setToneDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Gerar Artigo
            </DialogTitle>
            <DialogDescription>
              Escolha o tom do artigo a ser gerado.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Label htmlFor="tone">Tom do Artigo</Label>
            <Select
              name="tone"
              options={toneOptions}
              state={selectedTone}
              onChange={(_, value) => setSelectedTone(value as string)}
              placeholder="Selecione o tom"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setToneDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => generateArticle()} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Gerar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Revisão */}
      <Dialog open={reviewModalOpen} onOpenChange={(open) => {
        setReviewModalOpen(open);
        if (!open) setReviewResult(null);
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-primary" />
              Revisar Artigo com IA
            </DialogTitle>
            <DialogDescription>
              A IA irá revisar o conteúdo, corrigir erros e sugerir melhorias.
            </DialogDescription>
          </DialogHeader>

          {!reviewResult ? (
            <div className="space-y-4 py-4">
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Conteúdo atual: {currentContent?.length || 0} caracteres
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="include-references"
                  checked={includeReferences}
                  onChange={(e) => setIncludeReferences(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="include-references" className="cursor-pointer">
                  Incluir sugestões de referências
                </Label>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {/* Correções */}
              {reviewResult.corrections.length > 0 && (
                <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-lg">
                  <Label className="mb-2 block text-red-700 dark:text-red-400">
                    Correções ({reviewResult.corrections.length}):
                  </Label>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {reviewResult.corrections.map((correction, i) => (
                      <li key={i} className="text-red-600 dark:text-red-400">
                        {correction}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Sugestões */}
              {reviewResult.suggestions.length > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-950/20 p-4 rounded-lg">
                  <Label className="mb-2 block text-yellow-700 dark:text-yellow-400">
                    Sugestões ({reviewResult.suggestions.length}):
                  </Label>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {reviewResult.suggestions.map((suggestion, i) => (
                      <li key={i} className="text-yellow-600 dark:text-yellow-400">
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Referências */}
              {reviewResult.references.length > 0 && (
                <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
                  <Label className="mb-2 block text-blue-700 dark:text-blue-400">
                    Referências Sugeridas:
                  </Label>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {reviewResult.references.map((reference, i) => (
                      <li key={i} className="text-blue-600 dark:text-blue-400">
                        {reference}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Conteúdo Melhorado */}
              <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg max-h-[300px] overflow-y-auto">
                <Label className="mb-2 block text-green-700 dark:text-green-400">
                  Conteúdo Revisado:
                </Label>
                <div
                  className="prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: reviewResult.improvedContent }}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            {!reviewResult ? (
              <>
                <Button variant="outline" onClick={() => setReviewModalOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={() => reviewArticle()} disabled={isReviewing}>
                  {isReviewing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Revisando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Revisar Artigo
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setReviewResult(null)}>
                  <X className="w-4 h-4 mr-2" />
                  Descartar
                </Button>
                <Button onClick={handleApplyReview}>
                  <Check className="w-4 h-4 mr-2" />
                  Aplicar Revisão
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
