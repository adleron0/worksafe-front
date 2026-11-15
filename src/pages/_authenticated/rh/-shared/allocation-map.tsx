import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import CalendarPicker from "@/components/general-components/Calendar";
import Icon from "@/components/general-components/Icon";
import MapView, { MAP_PRESETS, MapBounds, MapMarker } from "@/components/general-components/MapView";
import Select from "@/components/general-components/Select";
import { cn } from "@/lib/utils";
import { dateBr, errorMessage, todayIso } from "../../comercial/-shared/commercial";
import { ALLOCATION_KEY, addDays } from "./allocation";
import { employeesApi } from "./employees";
import { PLACE_COLOR } from "./places";

/** A visão em mapa da alocação: num dia, quem está em cada lugar. */
interface MapPerson { employeeId: number; name: string; role: string | null; shift: string; shiftName: string }
interface MapGroup { key: string; label: string; detail: string | null; link: string | null; people: MapPerson[] }
interface MapSite { key: string; kind: "local" | "obra" | "cliente"; placeKind: string | null; name: string; latitude: number; longitude: number; groups: MapGroup[]; people: number }
interface MapBrief { id: number; name: string; primaryRole: string | null; roles: Array<{ id: number; name: string }> }
interface AllocationMap {
  today: string; date: string; sites: MapSite[]; customers: Array<{ id: number; name: string; latitude: number; longitude: number }>;
  free: MapBrief[]; unavailable: Array<MapBrief & { label: string }>; noPoint: MapGroup[]; roles: Array<{ id: number; name: string }>;
}

const SITE_COLOR = { obra: "#2563eb", cliente: "#0891b2" } as const;
const PRESETS = [{ id: "pernambuco", name: "Pernambuco" }, { id: "nordeste", name: "Nordeste" }, { id: "brasil", name: "Brasil" }] as const;

export function AllocationMapView() {
  const navigate = useNavigate();
  const router = useRouter();
  const [date, setDate] = useState(todayIso());
  const [roleId, setRoleId] = useState("");
  const [allCustomers, setAllCustomers] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  // o enquadramento pedido: um preset, ou "os pontos" (com um número que muda a cada pedido, para repetir o mesmo)
  const [frame, setFrame] = useState<{ bounds: MapBounds; tick: number } | null>(null);
  const { data, isLoading, error } = useQuery({ queryKey: [ALLOCATION_KEY, "map", date], queryFn: () => employeesApi.get<AllocationMap>("allocation/map", { date }), placeholderData: (previous) => previous });

  /** Com o filtro de função, só as pessoas daquela função contam em cada ponto. */
  const roleName = data?.roles.find((role) => String(role.id) === roleId)?.name;
  const matches = (person: MapPerson) => !roleName || person.role === roleName;
  const sites = useMemo(() => (data?.sites ?? []).map((site) => {
    const groups = site.groups.map((group) => ({ ...group, people: group.people.filter(matches) })).filter((group) => group.people.length);
    return { ...site, groups, people: new Set(groups.flatMap((group) => group.people.map((person) => person.employeeId))).size };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }).filter((site) => site.kind === "local" || site.people > 0), [data, roleName]);
  const inRole = <T extends MapBrief>(list: T[]) => list.filter((item) => !roleId || item.roles.some((role) => String(role.id) === roleId));
  const free = inRole(data?.free ?? []);
  const away = inRole(data?.unavailable ?? []);
  const current = sites.find((site) => site.key === selected) ?? null;

  const markers: MapMarker[] = useMemo(() => [
    ...(allCustomers ? (data?.customers ?? []).map((customer): MapMarker => ({ id: `c${customer.id}`, latitude: customer.latitude, longitude: customer.longitude, label: `${customer.name} · sem equipe neste dia`, color: "#94a3b8", quiet: true })) : []),
    ...sites.map((site): MapMarker => ({
      id: site.key, latitude: site.latitude, longitude: site.longitude,
      label: `${site.name || "Obra"} · ${site.people ? `${site.people} ${site.people === 1 ? "pessoa" : "pessoas"}` : "ninguém neste dia"}`,
      color: site.kind === "local" ? PLACE_COLOR[site.placeKind ?? "outro"] ?? "#475569" : SITE_COLOR[site.kind], badge: site.people ? String(site.people) : "", onClick: () => setSelected(site.key),
    })),
  ], [sites, allCustomers, data]);
  const fitPoints = () => {
    const points = sites.filter((site) => site.people > 0 || site.kind === "local");
    if (!points.length) return;
    const lat = points.map((site) => site.latitude);
    const lng = points.map((site) => site.longitude);
    const pad = 0.05;
    setFrame({ bounds: [[Math.min(...lat) - pad, Math.min(...lng) - pad], [Math.max(...lat) + pad, Math.max(...lng) + pad]], tick: Date.now() });
  };
  const openEmployee = (id: number) => navigate({ to: "/rh/funcionarios/$employeeId", params: { employeeId: String(id) } });

  return (
    <>
      <div className="mb-4 grid gap-3 rounded-lg border p-4 lg:grid-cols-[auto_1fr_auto] lg:items-end">
        <div>
          <Label className="text-xs">Dia</Label>
          <div className="mt-1 flex items-center gap-1">
            <Button type="button" variant="outline" size="sm" className="h-9 w-9 p-0" aria-label="Dia anterior" onClick={() => setDate(addDays(date, -1))}><Icon name="chevron-left" className="w-4 h-4" /></Button>
            <CalendarPicker mode="single" name="mapDate" className="w-40" value={date} fromYear={2024} toYear={2040} onValueChange={(_, value) => { if (value) setDate(String(value)); }} />
            <Button type="button" variant="outline" size="sm" className="h-9 w-9 p-0" aria-label="Dia seguinte" onClick={() => setDate(addDays(date, 1))}><Icon name="chevron-right" className="w-4 h-4" /></Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setDate(todayIso())}>Hoje</Button>
          </div>
        </div>
        <div className="w-full lg:max-w-xs">
          <Label className="text-xs">Função</Label>
          <Select name="mapRole" options={(data?.roles ?? []).map((role) => ({ id: String(role.id), name: role.name }))} state={roleId} clearable modal={false} placeholder="Todas as funções" onChange={(_, value) => setRoleId(String(value ?? ""))} />
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {PRESETS.map((preset) => <Button key={preset.id} type="button" variant="outline" size="sm" onClick={() => setFrame({ bounds: MAP_PRESETS[preset.id], tick: Date.now() })}>{preset.name}</Button>)}
          <Button type="button" variant="outline" size="sm" onClick={fitPoints}><Icon name="scan" className="w-4 h-4 mr-1" /> Enquadrar</Button>
        </div>
      </div>

      {error && <p className="p-4 text-destructive font-medium">Erro: {errorMessage(error)}</p>}
      {isLoading && <Skeleton className="h-[32rem] w-full" />}
      {data && (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="grid gap-2">
            <MapView className="h-[34rem]" markers={markers} bounds={frame?.bounds ?? null} boundsKey={frame?.tick} />
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SITE_COLOR.obra }} /> Obra (o número é quantas pessoas)</span>
              <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PLACE_COLOR.ct }} /> Centro de treinamento</span>
              <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PLACE_COLOR.base }} /> Base</span>
              <span className="inline-flex items-center gap-2">
                <Checkbox id="mapAllCustomers" checked={allCustomers} onCheckedChange={(checked) => setAllCustomers(checked === true)} />
                <Label htmlFor="mapAllCustomers" className="text-xs font-normal">Mostrar também os clientes sem equipe neste dia ({data.customers.length})</Label>
              </span>
            </div>
          </div>

          <aside className="grid content-start gap-4">
            <section className="rounded-lg border">
              <h2 className="border-b px-4 py-3 text-sm font-semibold">{current ? current.name || "Obra" : "Clique num ponto do mapa"}</h2>
              {!current && <p className="p-4 text-sm text-muted-foreground">Cada ponto mostra quem está lá em {dateBr(data.date)}.</p>}
              {current && !current.groups.length && <p className="p-4 text-sm text-muted-foreground">Ninguém aqui neste dia.</p>}
              {current?.groups.map((group) => (
                <div key={group.key} className="border-b px-4 py-3 text-sm last:border-b-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{group.label}</p>
                    {group.link && <button type="button" className="text-xs underline text-primary" onClick={() => router.history.push(group.link as string)}>abrir</button>}
                  </div>
                  {group.detail && <p className="text-xs text-muted-foreground">{group.detail}</p>}
                  <ul className="mt-2 grid gap-1">
                    {group.people.map((person) => (
                      <li key={person.employeeId}>
                        <button type="button" className="text-left hover:underline" onClick={() => openEmployee(person.employeeId)}>{person.name}</button>
                        <span className="text-xs text-muted-foreground">{[person.role, person.shift !== "integral" ? person.shiftName.toLowerCase() : null].filter(Boolean).map((item) => ` · ${item}`).join("")}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>

            <PeopleList title={`Livres (${free.length})`} empty="Ninguém livre neste dia." tone="text-green-700 dark:text-green-400" people={free.map((item) => ({ id: item.id, name: item.name, detail: item.primaryRole }))} onOpen={openEmployee} />
            {away.length > 0 && <PeopleList title={`Indisponíveis (${away.length})`} empty="" people={away.map((item) => ({ id: item.id, name: item.name, detail: item.label }))} onOpen={openEmployee} />}
            {data.noPoint.length > 0 && (
              <section className="rounded-lg border">
                <h2 className="border-b px-4 py-3 text-sm font-semibold">Sem ponto no mapa</h2>
                {data.noPoint.map((group) => (
                  <div key={group.key} className="border-b px-4 py-2 text-sm last:border-b-0">
                    <p className="font-medium">{group.label}{group.link && <button type="button" className="ml-2 text-xs font-normal underline text-primary" onClick={() => router.history.push(group.link as string)}>abrir</button>}</p>
                    <p className="text-xs text-muted-foreground">{[group.detail, group.people.filter(matches).map((person) => person.name).join(", ")].filter(Boolean).join(" · ")}</p>
                  </div>
                ))}
                <p className="border-t px-4 py-2 text-xs text-muted-foreground">Marque o ponto do cliente em RH → Locais, ou o ponto da obra na ordem de serviço.</p>
              </section>
            )}
          </aside>
        </div>
      )}
    </>
  );
}

function PeopleList({ title, empty, people, tone, onOpen }: { title: string; empty: string; people: Array<{ id: number; name: string; detail: string | null }>; tone?: string; onOpen: (id: number) => void }) {
  return (
    <section className="rounded-lg border">
      <h2 className={cn("border-b px-4 py-3 text-sm font-semibold", tone)}>{title}</h2>
      {!people.length && <p className="p-4 text-sm text-muted-foreground">{empty}</p>}
      <ul className="max-h-64 overflow-y-auto">
        {people.map((person) => (
          <li key={person.id} className="border-b px-4 py-2 text-sm last:border-b-0">
            <button type="button" className="text-left hover:underline" onClick={() => onOpen(person.id)}>{person.name}</button>
            {person.detail && <span className="text-xs text-muted-foreground"> · {person.detail}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}
