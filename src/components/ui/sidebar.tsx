import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Menu } from "lucide-react"

const SidebarContext = React.createContext<{
  isOpen: boolean
  toggleSidebar: () => void
}>({
  isOpen: false,
  toggleSidebar: () => {},
})

export function useSidebar() {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider")
  }
  return context
}

export function SidebarProvider({
  children,
  defaultOpen = false, // Padrão fechado para mobile
}: {
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen)
  const toggleSidebar = () => setIsOpen(!isOpen)

  React.useEffect(() => {
    // Define o estado inicial baseado no tamanho da tela
    const checkInitialState = () => {
      if (window.innerWidth >= 1024) {
        setIsOpen(true) // Desktop sempre aberto
      } else {
        setIsOpen(false) // Mobile sempre fechado inicialmente
      }
    }
    checkInitialState()
  }, [])

  return (
    <SidebarContext.Provider value={{ isOpen, toggleSidebar }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function Sidebar({ children, className }: { children: React.ReactNode; className?: string }) {
  const { isOpen, toggleSidebar } = useSidebar()
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024) // lg breakpoint
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Desktop Sidebar - sempre visível
  if (!isMobile) {
    return (
      <aside
        className={cn(
          "flex flex-col w-64 bg-card border-r transition-all duration-300",
          className
        )}
      >
        {children}
      </aside>
    )
  }

  // Mobile Sidebar - usando Sheet
  return (
    <Sheet open={isOpen} onOpenChange={toggleSidebar}>
      <SheetContent side="left" className="p-0 w-64">
        <SheetHeader className="sr-only">
          <SheetTitle>Menu de Navegação</SheetTitle>
          <SheetDescription>
            Navegue pelas opções do menu lateral
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col h-full bg-card">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  )
}

export function SidebarHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("px-4 py-3", className)}>
      {children}
    </div>
  )
}

export function SidebarContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex-1 overflow-y-auto", className)}>
      {children}
    </div>
  )
}

export function SidebarFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("px-4 py-3", className)}>
      {children}
    </div>
  )
}

export function SidebarGroup({ children }: { children: React.ReactNode }) {
  return <div className="px-3 py-2">{children}</div>
}

export function SidebarGroupLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h3 className={cn("mb-2 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider", className)}>
      {children}
    </h3>
  )
}

export function SidebarGroupContent({ children }: { children: React.ReactNode }) {
  return <div className="space-y-1">{children}</div>
}

export function SidebarMenu({ children }: { children: React.ReactNode }) {
  return <nav className="space-y-1">{children}</nav>
}

export function SidebarMenuItem({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>
}

export function SidebarMenuButton({
  children,
  className,
  asChild = false,
  ...props
}: {
  children: React.ReactNode
  className?: string
  asChild?: boolean
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  if (asChild) {
    return (
      <div
        className={cn(
          "flex items-center justify-start rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors w-full text-left",
          className
        )}
      >
        {children}
      </div>
    )
  }

  return (
    <button
      className={cn(
        "flex items-center justify-start rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors w-full text-left",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function SidebarInset({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex-1", className)}>
      {children}
    </div>
  )
}

export function SidebarTrigger({ className }: { className?: string }) {
  const { toggleSidebar } = useSidebar()
  
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleSidebar}
      className={cn("lg:hidden", className)}
    >
      <Menu className="h-5 w-5" />
    </Button>
  )
}