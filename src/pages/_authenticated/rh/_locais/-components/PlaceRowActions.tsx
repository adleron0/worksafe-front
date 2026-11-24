import { useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import { RowActionsTrigger } from "@/components/general-components/DataTable";
import { CustomerPoint, Place } from "../../-shared/places";

/** Menu ⋯ de um local da empresa: editar e inativar. */
export function PlaceRowActions({ place, onEdit, onInactivate }: { place: Place; onEdit: () => void; onInactivate: () => void }) {
  const [confirm, setConfirm] = useState(false);
  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild><RowActionsTrigger label={`Ações de ${place.name}`} /></DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem className="gap-2" onSelect={onEdit}><Icon name="pencil" className="w-3.5 h-3.5" /> Editar</DropdownMenuItem>
          <DropdownMenuItem className="gap-2" onSelect={() => setConfirm(true)}><Icon name="archive" className="w-3.5 h-3.5" /> Inativar</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {confirm && (
        <ConfirmDialog open onOpenChange={(open) => { if (!open) setConfirm(false); }} title={`Inativar "${place.name}"?`}
          description="O local some do mapa e das escolhas. O que já foi lançado nele continua guardado." onConfirm={() => { onInactivate(); setConfirm(false); }} />
      )}
    </>
  );
}

/** Menu ⋯ do ponto de um cliente: localizar pelo endereço do cadastro e ajustar no mapa. */
export function CustomerPointRowActions({ customer, locating, onLocate, onPick }: { customer: CustomerPoint; locating: boolean; onLocate: () => void; onPick: () => void }) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild><RowActionsTrigger label={`Ações de ${customer.name}`} /></DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {customer.city && <DropdownMenuItem className="gap-2" disabled={locating} onSelect={onLocate}><Icon name="locate-fixed" className="w-3.5 h-3.5" /> Localizar pelo endereço do cadastro</DropdownMenuItem>}
        <DropdownMenuItem className="gap-2" onSelect={onPick}><Icon name="map-pin" className="w-3.5 h-3.5" /> Ajustar no mapa</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
