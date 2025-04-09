import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { cn } from "@/lib/utils"
import Icon from "../general-components/Icon"
import { useEffect } from "react"

export function Toaster() {
  const { toasts } = useToast()

  useEffect(() => {
    const handleWindowFocus = () => {
      const progressBars = document.querySelectorAll('[id^="progress-"]')
      progressBars.forEach((bar: any) => {
        bar.style.animationPlayState = 'running'
      })
    }
  
    const handleWindowBlur = () => {
      const progressBars = document.querySelectorAll('[id^="progress-"]')
      progressBars.forEach((bar: any) => {
        bar.style.animationPlayState = 'paused'
      })
    }
  
    window.addEventListener('focus', handleWindowFocus)
    window.addEventListener('blur', handleWindowBlur)
  
    return () => {
      window.removeEventListener('focus', handleWindowFocus)
      window.removeEventListener('blur', handleWindowBlur)
    }
  }, [])

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        // Função para definir as variantes de progresso de notificação
        const lineVariants = {
          default: "bg-primary",
          info: "bg-muted-foreground",
          alert: "bg-yellow-500",
          destructive: "bg-destructive",
          success: "bg-green-500",
        }

        // Função para retornar o ícone correto com base na variante
        const getIconForVariant = (variant: string) => {
          switch (variant) {
            case "default":
              return <Icon name="info" className="w-5 h-5 text-primary animate-fade-in"/>
            case "info":
              return <Icon name="info" className="w-5 h-5 text-muted-foreground animate-fade-in"/>
            case "alert":
              return <Icon name="circle-alert" className="w-5 h-5 text-yellow-500 animate-fade-in"/>
            case "destructive":
              return <Icon name="circle-x" className="w-5 h-5 text-destructive animate-fade-in"/>
            case "success":
              return <Icon name="circle-check-big" className="w-5 h-5 text-green-500 animate-fade-in"/>
            default:
              return null
          }
        }

        const handleProgressPause = (id: string) => {
          const progressBar = document.getElementById(`progress-${id}`)
          progressBar?.style.setProperty('animation-play-state', 'paused')
        }
        
        const handleProgressResume = (id: string) => {
          const progressBar = document.getElementById(`progress-${id}`)
          progressBar?.style.setProperty('animation-play-state', 'running')
        }

        return (
          <Toast 
            className="relative"
            key={id} 
            {...props} 
            duration={props.duration}
            onMouseEnter={() => handleProgressPause(id)}
            onMouseLeave={() => handleProgressResume(id)}
            onFocus={() => handleProgressResume(id)}
            onBlur={() => handleProgressPause(id)}
          >
            <div className="flex gap-2 items-center mb-2">
              {getIconForVariant(variant || "default")}
              <div className="flex flex-col w-full gap-2">
                <div className="grid">
                  {title && <ToastTitle>{title}</ToastTitle>}
                  {description && (
                    <ToastDescription>{description}</ToastDescription>
                  )}
                </div>
                <div className="absolute bottom-0 left-0 h-1 w-full">
                  <div
                    id={`progress-${id}`}
                    className={cn(lineVariants[variant || "default"],
                      "absolute top-0 left-0 h-full animate-toast-progress"
                    )}
                    style={{ 
                      animationDuration: `${props.duration || 5000}ms`
                    }} 
                  />
                </div>
              </div>
              {action}
            </div>
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
