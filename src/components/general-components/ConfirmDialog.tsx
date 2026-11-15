import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from '../ui/button';
import Icon from '../general-components/Icon';
import SlideConfirm from './SlideConfirm';

interface ConfirmDialogProps {
  titleBttn?: string;
  iconBttn?: string;
  children?: React.ReactNode;
  title: string;
  description: string;
  onConfirm: () => void;
  /** Uso controlado (sem botão que abre): quem chama decide quando o diálogo aparece. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /**
   * Para ações importantes e difíceis de desfazer: no lugar do botão "Continuar",
   * a pessoa desliza para confirmar (ex.: "Deslize para fechar o RDO").
   */
  slideLabel?: string;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  title,
  description,
  onConfirm,
  titleBttn,
  iconBttn,
  children,
  open,
  onOpenChange,
  slideLabel,
}) => {
  const [inner, setInner] = useState(false);
  const controlled = open !== undefined;
  const isOpen = controlled ? open : inner;
  const setIsOpen = (value: boolean) => { if (controlled) onOpenChange?.(value); else setInner(value); };
  const hasTrigger = Boolean((titleBttn && iconBttn) || children);

  const handleConfirm = () => {
    onConfirm();
    setIsOpen(false); // Fechar o alerta após confirmação
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      {hasTrigger && <AlertDialogTrigger asChild>
        {
          titleBttn && iconBttn ? (
            <Button
              variant="ghost"
              className="flex justify-start gap-2 px-2 py-1.5 items-baseline w-full h-fit"
            >
              <Icon name={iconBttn || "circle-x"} className="w-3 h-3" />
              <p>{titleBttn}</p>
            </Button>
          ) : children
        }
      </AlertDialogTrigger>}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {slideLabel ? (
          <div className="grid gap-3">
            <SlideConfirm label={slideLabel} onConfirm={handleConfirm} />
            <AlertDialogCancel className="w-full sm:w-fit sm:justify-self-end">Cancelar</AlertDialogCancel>
          </div>
        ) : (
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>Continuar</AlertDialogAction>
          </AlertDialogFooter>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ConfirmDialog;
