import { createFileRoute } from "@tanstack/react-router";
import Loja from "../pages/Home/Loja";

export const Route = createFileRoute("/loja")({
  component: () => <Loja />,
});
