import api from "@/services/api";
import { HelpEvent, LessonState } from "./types";

/** Rotas /help da API (JSON; o `post` genérico do sistema manda multipart). */
export const helpApi = {
  state: async () => (await api.get<{ tours: Record<string, LessonState> }>("help/state")).data.tours,
  setState: async (lessonId: string, action: "complete" | "dismiss" | "reset") =>
    (await api.put<LessonState & { tourId: string }>(`help/state/${encodeURIComponent(lessonId)}`, { action })).data,
  events: async (events: HelpEvent[]) => (await api.post<{ recorded: number }>("help/events", { events })).data,
};
