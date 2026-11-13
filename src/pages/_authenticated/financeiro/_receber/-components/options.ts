export const paymentMethodOptions = [
  { id: "transferencia", name: "Transferência" },
  { id: "pix", name: "PIX" },
  { id: "boleto", name: "Boleto" },
  { id: "cartaoCredito", name: "Cartão de crédito" },
  { id: "dinheiro", name: "Dinheiro" },
  { id: "outro", name: "Outro" },
];

export const paymentMethodLabel = (method?: string) =>
  paymentMethodOptions.find((option) => option.id === method)?.name ?? method ?? "-";

export const statusOptions = [
  { id: "processing", name: "Processando" },
  { id: "waiting", name: "Aguardando" },
  { id: "received", name: "Recebido" },
  { id: "declined", name: "Recusado" },
  { id: "chargeback", name: "Estorno" },
  { id: "cancelled", name: "Cancelado" },
  { id: "overdue", name: "Vencido" },
];

/** Em aberto = ainda pode receber baixa manual. */
export const OPEN_STATUSES = ["waiting", "overdue", "processing"];

export const formatCurrency = (value?: number | string | null) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value ?? 0));

/** Mostra só o dia, sem deixar o fuso mudar a data gravada. */
export const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const [year, month, day] = value.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
};

export const toDateInput = (value?: string | null) => (value ? value.slice(0, 10) : "");

export const todayInput = () => {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};
