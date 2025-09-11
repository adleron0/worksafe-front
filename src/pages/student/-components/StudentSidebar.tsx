import { Home, BookOpen, Award, CreditCard, User } from "lucide-react";
import { Link, useLocation } from "@tanstack/react-router";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import DynamicLogo from "@/components/general-components/DynamicLogo";
import { cn } from "@/lib/utils";

const menuItems = [
  {
    title: "Menu Principal",
    items: [
      {
        title: "Início",
        icon: Home,
        href: "/student",
      },
      {
        title: "Meus Cursos",
        icon: BookOpen,
        href: "/student/courses",
      },
      {
        title: "Certificados",
        icon: Award,
        href: "/student/certificates",
      },
      // {
      //   title: "Instituições",
      //   icon: Building2,
      //   href: "/student/institutions",
      // },
      {
        title: "Pagamentos",
        icon: CreditCard,
        href: "/student/payments",
      },
    ],
  },
  {
    title: "Configurações",
    items: [
      {
        title: "Meu Perfil",
        icon: User,
        href: "/student/profile",
      },
      // {
      //   title: "Configurações",
      //   icon: Settings,
      //   href: "/student/settings",
      // },
      // {
      //   title: "Ajuda",
      //   icon: HelpCircle,
      //   href: "/student/help",
      // },
    ],
  },
];

export function StudentSidebar() {
  const location = useLocation();

  return (
    <Sidebar>
      <SidebarHeader className="border-b">
        <div className="flex h-16 items-center justify-center px-4">
          <DynamicLogo 
            width={160} 
            height={40}
            fallbackToDefault={true}
          />
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        {menuItems.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive = location.pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        className={cn(
                          "w-full transition-colors",
                          isActive && "bg-primary/10 text-primary font-medium"
                        )}
                      >
                        <Link to={item.href} className="flex items-center w-full">
                          <Icon className={cn(
                            "h-4 w-4 flex-shrink-0",
                            isActive && "text-primary"
                          )} />
                          <span className="ml-3">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t">
        <div className="px-4 py-3">
          <p className="text-xs text-muted-foreground text-center">
            © 2024 WorkSafe
          </p>
          <p className="text-xs text-muted-foreground text-center mt-1">
            Versão 1.0.0
          </p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}