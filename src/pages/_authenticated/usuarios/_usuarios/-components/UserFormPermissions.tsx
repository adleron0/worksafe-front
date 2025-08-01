import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listPermissions, grantsPermission, revokesPermission } from "@/services/permissionsService";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
// import { toast as sonner } from "sonner";
import { toast } from "@/hooks/use-toast";
import { LockKeyholeOpen } from "lucide-react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { useState } from "react";
import Loader from "@/components/general-components/Loader";
import SideForm from "@/components/general-components/SideForm"; // Import SideForm
import { IEntity } from "../-interfaces/entity.interface";
import { Permission, UserPermission } from "../-interfaces/permission.interface";
import { ApiError } from "@/general-interfaces/api.interface";
import Icon from "@/components/general-components/Icon";

const PermissionsForm = ({ user }: { user: IEntity }) => {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [description, setDescription] = useState("");

  const queryClient = useQueryClient();

  // Query de busca de permissões
  const { data: permissionsData, isLoading: isLoadingPermissions, isError, error } = useQuery({ queryKey: ['listPermissions'], queryFn: listPermissions });

  const errorMessage = (error as ApiError)?.response?.data?.message || "Erro ao carregar permissões.";

  const { mutate: grantPermission, isPending: isLoadingGrant } = useMutation({
    mutationFn: (permissionId: number | undefined) => grantsPermission(permissionId, user.id),
    onSuccess: () => {
      toast({
        title: "Permissão Concedida",
        description: `${user.name} agora pode ${description}.`,
        variant: "success",
        duration: 5000,
      });
      setDescription("");
      // queryClient.invalidateQueries({ queryKey: ["listPermissions"] });
      queryClient.invalidateQueries({ queryKey: ["listUsuários"] });
    },
    onError: (error: unknown) => {
      const err = error as ApiError;
      toast({
        title: "Erro ao conceder permissão!",
        description: `${err.response?.data?.message}`,
        variant: "destructive",
        duration: 5000,
      });
    },
  });

  const { mutate: revokePermission, isPending: isLoadingRevoke } = useMutation({
    mutationFn: (permissionId: number | undefined) => revokesPermission(permissionId, user.id),
    onSuccess: () => {
      toast({
        title: "Permissão Revogada",
        description: `${user.name} não pode mais ${description}.`,
        variant: "success",
        duration: 5000,
      });
      setDescription("");
      // queryClient.invalidateQueries({ queryKey: ["listPermissions"] });
      queryClient.invalidateQueries({ queryKey: ["listUsuários"] });
    },
    onError: (error: unknown) => {
      const err = error as ApiError;
      toast({
        title: "Erro ao revogar permissão!",
        description: `${err.response?.data?.message}`,
        variant: "destructive",
        duration: 5000,
      });
    },
  });

  // First group permissions by their group property
  const groupedPermissions = permissionsData?.reduce((acc: Record<string, Permission[]>, permission: Permission) => {
    const group = permission.group || "Outros";
    if (!acc[group]) acc[group] = [];
    acc[group].push(permission);
    return acc;
  }, {});

  // Group permissions by target (what comes after the action prefix)
  const getSubgroupedPermissions = (permissions: Permission[]) => {
    const result: Record<string, Permission[]> = {};
    
    permissions.forEach(permission => {
      const nameParts = permission.name.split('_');
      if (nameParts.length >= 2) {
        // Get the parts after the action prefix
        const targetParts = nameParts.slice(1);
        
        // If there's only one part after the action, it's the main target
        if (targetParts.length === 1) {
          const target = targetParts[0];
          if (!result[target]) result[target] = [];
          result[target].push(permission);
        } 
        // If there are multiple parts, use the first part as the subgroup
        else if (targetParts.length > 1) {
          const subgroup = targetParts[0];
          if (!result[subgroup]) result[subgroup] = [];
          result[subgroup].push(permission);
        }
      } else {
        // Handle permissions that don't follow the expected pattern
        if (!result['other']) result['other'] = [];
        result['other'].push(permission);
      }
    });
    
    return result;
  };

  const triggerButton = (
    <Button variant="ghost" className={`flex justify-start p-2 items-baseline w-full h-fit`}>
      <LockKeyholeOpen className="w-3 h-3 mr-2" />
      <p>Permissões</p>
    </Button>
  );

  const formContent = (
    <>
      {isLoadingPermissions ? (
        <Loader title="Carregando permissões..." />
      ) : permissionsData?.length > 0 ? (
        <Accordion type="single" className="mt-4">
          {Object.entries(groupedPermissions || {}).map(([groupName, permissions]) => {
            const subgroupedPermissions = getSubgroupedPermissions(permissions as Permission[]);
            
            return (
              <AccordionItem key={groupName} value={groupName}>
                <AccordionTrigger className="cursor-pointer text-xs uppercase">
                  <div className="flex items-center gap-2">
                    <Icon name="lock" className="w-3 h-3" /> 
                    {groupName}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  {Object.entries(subgroupedPermissions).length === 1 ? (
                    // If there's only one subgroup, don't show the subgroup heading
                    <ul className="grid grid-cols-2 gap-2">
                      {Object.values(subgroupedPermissions)[0].map((permission: Permission) => (
                        <PermissionItem
                          key={permission.id}
                          permission={permission}
                          user={user}
                          isGranted={user.permissions?.some((p: UserPermission) => p.permissionId === permission.id)}
                          onGrant={() => grantPermission(permission.id)}
                          onRevoke={() => revokePermission(permission.id)}
                          setDescription={setDescription}
                        />
                      ))}
                    </ul>
                  ) : (
                    // If there are multiple subgroups, show each with its heading
                    Object.entries(subgroupedPermissions).map(([target, targetPermissions]) => (
                      <div key={`${groupName}-${target}`} className="mb-6">
                        <h4 className="text-sm font-semibold mb-2 text-muted-foreground border-b pb-1">
                          {target.charAt(0).toUpperCase() + target.slice(1)}
                        </h4>
                        <ul className="grid grid-cols-2 gap-2">
                          {targetPermissions.map((permission: Permission) => (
                            <PermissionItem
                              key={permission.id}
                              permission={permission}
                              user={user}
                              isGranted={user.permissions?.some((p: UserPermission) => p.permissionId === permission.id)}
                              onGrant={() => grantPermission(permission.id)}
                              onRevoke={() => revokePermission(permission.id)}
                              setDescription={setDescription}
                            />
                          ))}
                        </ul>
                      </div>
                    ))
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      ) : isError && (
        <p className="text-red-500 my-4">Erro ao carregar permissões: {errorMessage}</p>
      )}
      {isLoadingGrant && <Loader title="Concedendo permissão..." />}
      {isLoadingRevoke && <Loader title="Revogando permissão..." />}
    </>
  );

  const formDescription = (
    <>
      Selecione as permissões necessárias para
      <strong className="pl-1">{user.name}</strong>.
    </>
  );

  return (
    <SideForm
      trigger={triggerButton}
      title="Controle de Permissões"
      description={formDescription}
      form={formContent}
      side="right"
      openSheet={isSheetOpen}
      setOpenSheet={setIsSheetOpen}
    />
  );
};

const PermissionItem = ({
  permission,
  isGranted,
  onGrant,
  onRevoke,
  setDescription,
}: {
  permission: Permission;
  user: IEntity;
  isGranted: boolean;
  onGrant: () => void;
  onRevoke: () => void;
  setDescription: (description: string) => void;
}) => {
  return (
    <li className="flex items-center gap-2 cursor-pointer">
      <Switch
        id={permission.name}
        checked={isGranted}
        onCheckedChange={() => {
          if (isGranted) {
            onRevoke();
          } else {
            onGrant();
          }
          setDescription(permission.description);
        }}
      />
      <Label className="cursor-pointer text-xs" htmlFor={permission.name}>{permission.description}</Label>
    </li>
  );
};

export default PermissionsForm;
