import StatusBadge from "@/components/general-components/StatusBadge";
import type { DataColumn } from "@/components/general-components/DataTable";
import { CertificateThumbnail } from "@/components/general-components/visualizadorCertificados";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { muted } from "../../-shared/lista";
import { ICertificate } from "../-interfaces/entity.interface";

export const certificateColumns: DataColumn<ICertificate>[] = [
  {
    id: "name", header: "Certificado", className: "min-w-[280px]",
    cell: (item) => (
      <div className="flex items-center gap-2.5 min-w-0">
        {item.fabricJsonFront ? (
          <div className="w-16 rounded-md overflow-hidden border bg-background shrink-0">
            <CertificateThumbnail certificateData={item} variableToReplace={{}} className="w-full h-fit" zoom={20} showLoader={false} />
          </div>
        ) : (
          <Avatar className="size-8 border rounded-md bg-primary/10 shrink-0">
            <AvatarFallback className="rounded-md bg-primary/10 text-primary font-bold text-xs">{item.name ? item.name.charAt(0).toUpperCase() : "C"}</AvatarFallback>
          </Avatar>
        )}
        <div className="min-w-0">
          <p className="font-medium truncate">{item.name}</p>
          <p className={`${muted} tabular-nums`}>{item.canvasWidth} x {item.canvasHeight}px</p>
        </div>
      </div>
    ),
  },
  {
    id: "course", header: "Curso",
    cell: (item) => <span className={item.course?.name ? "truncate" : "text-muted-foreground"}>{item.course?.name || "Sem curso vinculado"}</span>,
  },
  {
    id: "status", header: "Status",
    cell: (item) => <StatusBadge tone={item.active ? "success" : "neutral"}>{item.active ? "Ativo" : "Inativo"}</StatusBadge>,
  },
];
