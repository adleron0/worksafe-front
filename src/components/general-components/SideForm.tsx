import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
// import { Button } from "../ui/button";

interface SideFormProps {
  key?: number;
  title?: string;
  description?: string;
  side?: "top" | "right" | "bottom" | "left";
  trigger?: React.ReactNode;
  form: React.ReactNode;
  openSheet?: boolean;
  setOpenSheet?: (open: boolean) => void;
}

const SideForm = ({ key, title, description, side, trigger, form, openSheet, setOpenSheet }: SideFormProps) => {
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
        {/* <SheetFooter>
          <SheetClose asChild>
            <Button type="submit">Save changes</Button>
          </SheetClose>
        </SheetFooter> */}
      </SheetContent>
    </Sheet>
  )
}

export default SideForm;
