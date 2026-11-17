/**
 * Tutoriais: um vídeo curto por tela, gravado do sistema real (ver
 * tutoriais-planejamento/video-tools). O botão "?" só aparece nas telas que
 * têm tutorial e abre o tutorial daquela tela.
 */

export interface Chapter {
  title: string;
  /** segundos desde o começo do vídeo */
  start: number;
}

export interface Lesson {
  /** "setor.assunto", minúsculas (é o id gravado na API) */
  id: string;
  title: string;
  /** nome curto da tela, mostrado no botão e no topo do tutorial */
  screen: string;
  minutes: number;
  /** basta ter UMA destas permissões; vazio = qualquer pessoa logada */
  requires: string[];
  /** telas em que o tutorial aparece; ":param" casa um trecho */
  routes: string[];
  /** `portrait`: versão em pé (gravação de celular), usada quando a tela é estreita */
  video: { src: string; captions?: string; poster?: string; portrait?: string };
  /** partes do vídeo, para pular direto */
  chapters?: Chapter[];
}

export type HelpEventName = "help_open" | "lesson_start" | "lesson_complete" | "lesson_exit" | "video_play" | "chapter_jump";
export interface HelpEvent { event: HelpEventName; tourId?: string; step?: number; target?: string; route?: string }

export interface LessonState { completedAt: string | null; dismissedAt: string | null }
