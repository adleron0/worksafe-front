import React from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { HelpCircle, AlertCircle } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import Input from "@/components/general-components/Input";
import NumberInput from "@/components/general-components/Number";
import Select from "@/components/general-components/Select";
import { FormData } from "../TurmasFormSteps";
import { useGatewayCheck } from "@/hooks/use-gateway-check";
import { Button } from "@/components/ui/button";

interface StepProps {
  dataForm: FormData;
  setDataForm: React.Dispatch<React.SetStateAction<FormData>>;
  errors: { [key: string]: string };
  setErrors?: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>;
}

const Step4Payment = ({ dataForm, setDataForm, errors }: StepProps) => {
  const navigate = useNavigate();
  const { hasGateway, isLoading } = useGatewayCheck();

  const handleChange = (
    name: string,
    value: string | number | null | string[],
  ) => {
    setDataForm((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Valor */}
      <div>
        <Label htmlFor="price">Valor</Label>
        <Input
          id="price"
          name="price"
          value={dataForm.price}
          onValueChange={handleChange}
          format="currency"
          className="mt-1"
          placeholder="R$ 0,00"
        />
        {errors.price && <p className="text-red-500 text-sm mt-1">{errors.price}</p>}
      </div>

      {/* Valor Promocional */}
      <div>
        <Label htmlFor="discountPrice">Valor promocional</Label>
        <p className="text-xs text-muted-foreground font-medium mb-2">
          Para evidenciar quando houver promoções
        </p>
        <Input
          id="discountPrice"
          name="discountPrice"
          value={dataForm.discountPrice}
          onValueChange={handleChange}
          format="currency"
          className="mt-1"
          placeholder="R$ 0,00"
        />
        {errors.discountPrice && (
          <p className="text-red-500 text-sm mt-1">{errors.discountPrice}</p>
        )}
      </div>

      {/* Habilitar Checkout */}
      <div className={`p-4 bg-muted/30 border border-border/50 rounded-lg ${dataForm.allowCheckout ? "pb-4" : ""}`}>
        <div className="flex justify-between items-center">
          <div className="flex flex-col flex-1">
            <Label
              htmlFor="allowCheckout"
              className="cursor-pointer flex items-center gap-2"
            >
              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
              Habilitar Checkout
            </Label>
            <p className="text-xs text-muted-foreground font-medium">
              Habilita pagamento online na inscrição
            </p>
          </div>
          <Switch
            id="allowCheckout"
            name="allowCheckout"
            checked={dataForm.allowCheckout ? true : false}
            disabled={!hasGateway || isLoading}
            onCheckedChange={() =>
              setDataForm((prev) => ({
                ...prev,
                allowCheckout: !prev.allowCheckout,
              }))
            }
          />
        </div>

        {/* Mensagem de aviso se não tiver gateway */}
        {!hasGateway && !isLoading && (
          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-md">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <p className="text-xs text-amber-900 dark:text-amber-100 font-medium">
                  Configure um gateway de pagamento primeiro
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Para habilitar pagamentos online, você precisa configurar uma integração com um gateway de pagamento.
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/40"
                  onClick={() => navigate({ to: '/integracoes' })}
                >
                  Ir para Integrações
                </Button>
              </div>
            </div>
          </div>
        )}

        {dataForm.allowCheckout && (
          <div className="mt-4 pt-4 border-t border-border/50">
            <Label htmlFor="paymentMethods">Métodos de Pagamento</Label>
            <p className="text-xs text-muted-foreground font-medium mb-2">
              Selecione os métodos de pagamento ativos para esta turma
            </p>
            <Select
              name="paymentMethods"
              multiple={true}
              options={[
                { id: "cartaoCredito", name: "Cartão de Crédito" },
                { id: "boleto", name: "Boleto" },
                { id: "pix", name: "PIX" },
              ]}
              state={dataForm.paymentMethods || []}
              onChange={(name, value) => handleChange(name, value)}
              placeholder="Selecione os métodos de pagamento"
            />
            {errors.paymentMethods && (
              <p className="text-red-500 text-sm mt-1">{errors.paymentMethods}</p>
            )}
          </div>
        )}
      </div>

      {/* Parcelamento */}
      <div>
        <Label htmlFor="dividedIn">Parcelamento</Label>
        <p className="text-xs text-muted-foreground font-medium mb-2">
          Número de parcelas permitidas no pagamento
        </p>
        <NumberInput
          id="dividedIn"
          name="dividedIn"
          min={1}
          max={12}
          value={dataForm.dividedIn || 1}
          onValueChange={handleChange}
          placeholder="Ex: 3"
        />
        {errors.dividedIn && (
          <p className="text-red-500 text-sm mt-1">{errors.dividedIn}</p>
        )}
      </div>
    </div>
  );
};

export default Step4Payment;