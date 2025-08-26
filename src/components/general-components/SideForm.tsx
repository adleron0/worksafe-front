import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import useWindowSize from "@/hooks/use-windowSize";

interface SideFormProps {
  key?: number;
  title?: string;
  description?: React.ReactNode; // Changed type from string to React.ReactNode
  side?: "top" | "right" | "bottom" | "left";
  trigger?: React.ReactNode;
  form: React.ReactNode;
  openSheet?: boolean;
  setOpenSheet?: (open: boolean) => void;
}

const SideForm = ({ key, title, description, side, trigger, form, openSheet, setOpenSheet }: SideFormProps) => {
  const { width } = useWindowSize();
  const isDesktop = width ? width > 768 : true;
  
  if (isDesktop) {
    return (
      <Sheet open={openSheet} onOpenChange={setOpenSheet} key={`${title}-${key}`}>
        {
          trigger && (
            <SheetTrigger asChild>
              <div>{trigger}</div>
            </SheetTrigger>
          )
        }
        <SheetContent side={side} className="w-11/12 overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>
              {description}
            </SheetDescription>
          </SheetHeader>
          {form}
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Drawer 
      direction={side} 
      open={openSheet} 
      onOpenChange={setOpenSheet} 
      key={`${title}-${key}`}
      shouldScaleBackground={false}
    >
      {
          trigger && (
            <DrawerTrigger asChild>
              <div>{trigger}</div>
            </DrawerTrigger>
          )
        }
      <DrawerContent className="p-4 pr-0">
        <DrawerHeader className="p-0 pr-4 text-left">
          <DrawerTitle>{title}</DrawerTitle>
          <DrawerDescription>
            {description}
          </DrawerDescription>
        </DrawerHeader>
        <div className="overflow-y-auto pr-4">
          {form}
        </div>

        {/* elemento para sinalizar que pode arrastar para fechar */}
        {
          (side === "right" || side === "left") && (
            <div 
              className={`fixed top-1/2 ${side.toString() === "right" ? "-left-1" : "-right-1"} z-10 w-1.5 h-20 bg-muted rounded-full`}
            />
          )
        }
        {/* <DrawerFooter className="pt-2">
          <DrawerClose asChild>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
        </DrawerFooter> */}
      </DrawerContent>
    </Drawer>
  )
}

export default SideForm;
