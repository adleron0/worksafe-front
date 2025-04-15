import { Button } from "@/components/ui/button"
import {
  Dialog as UiDialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import Icon from "./Icon";

interface DialogProps {
  showBttn?: boolean;
  titleBttn?: string;
  iconBttn?: string;
  children?: React.ReactNode;
  title: string;
  description: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const Dialog: React.FC<DialogProps> = ({
  showBttn = true,
  titleBttn,
  iconBttn,
  children,
  title,
  description,
  open,
  onOpenChange,
}) => {
  return (
    <UiDialog open={open} onOpenChange={onOpenChange}>
      {
        showBttn && (
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              className="flex justify-start gap-2 p-2 items-baseline w-full h-fit"
            >
              <Icon name={iconBttn || "circle-x"} className="w-3 h-3" />
              <p>{titleBttn || "Abrir Modal"}</p>
            </Button>
          </DialogTrigger>
        )
      }
      <DialogContent className="sm:max-w-[425px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{ title }</DialogTitle>
          <DialogDescription>
            { description }
          </DialogDescription>
        </DialogHeader>
          { children }
      </DialogContent>
    </UiDialog>
  )
}

export default Dialog;
