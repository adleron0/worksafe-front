import { createFileRoute } from '@tanstack/react-router'
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";

export const Route = createFileRoute('/_authenticated/inventarios/')({
  component: Home,
})

function Home() {
  const { toast } = useToast();
  
  const emitToasTeste = () => {
    toast({
      title: "Testando o Toast",
      description: "Este é um toast de teste, apenas para simulação!",
      variant: "success",
      duration: 5000
    })
  }
  
  const { can, has } = useVerify();
  if (!can('view_inventarios') || !has('Confinus')) return null;

  return (
    <div className="flex flex-col">
      <div>Inventário</div>
      <span>Administrar Inventário</span>
      <Button className="max-w-xs" onClick={emitToasTeste}>Teste</Button>
    </div>
  );
};