# Como Testar o Sistema de Checkout

## Para ativar o checkout em uma turma:

1. No backend, adicione o campo `allowCheckout: true` na resposta da turma
2. Ou temporariamente, você pode modificar o arquivo `turma.$id.tsx` após receber os dados:

```typescript
const turma = { ...data?.rows?.[0], allowCheckout: true };
```

## Funcionalidades Implementadas:

### 1. Formulário em Steps
- **Step 1**: Dados Pessoais (nome, CPF, email, telefone, empresa, profissão)
- **Step 2**: Pagamento (PIX, Boleto ou Cartão de Crédito)

### 2. Métodos de Pagamento

#### PIX
- Botão para gerar QR Code
- Exibição do QR Code (mockado)
- Campo copiável com código PIX
- Verificação automática de pagamento a cada 10 segundos
- Barra de progresso mostrando status

#### Boleto
- Botão para gerar boleto
- Campo copiável com linha digitável
- Aviso sobre prazo de pagamento

#### Cartão de Crédito
- Visualização 3D do cartão com flip animation
- Campos para número, nome, validade e CVV
- Seleção de parcelamento (até o máximo definido em `dividedIn`)
- Cálculo automático do valor das parcelas
- Processamento de pagamento mockado

### 3. Fluxo Condicional
- Se `allowCheckout` = false: Formulário normal com redirecionamento para WhatsApp
- Se `allowCheckout` = true: Formulário com checkout integrado

### 4. Validações
- Captcha matemático nos dados pessoais
- Validação de campos obrigatórios
- Formatação automática de CPF, telefone, cartão

## Dados Mockados (para desenvolvimento do backend):

### PIX
```json
{
  "qrCode": "base64_image_string",
  "copyPasteCode": "00020126360014BR.GOV.BCB.PIX..."
}
```

### Boleto
```json
{
  "barCode": "23793.38128 60083.774131 52000.063301 1 96150000015045"
}
```

### Pagamento com Cartão
```json
{
  "number": "1234 5678 9012 3456",
  "name": "JOHN DOE",
  "expiry": "12/25",
  "cvv": "123",
  "installments": "3"
}
```

## Integração com Backend

Para integrar com o backend real, você precisará:

1. **Endpoint para gerar PIX**: `POST /payment/pix`
2. **Endpoint para gerar Boleto**: `POST /payment/boleto`
3. **Endpoint para processar cartão**: `POST /payment/credit-card`
4. **Endpoint para verificar status**: `GET /payment/status/:id`
5. **Webhook para atualizar status de pagamento**

## Próximos Passos

1. Implementar endpoints no backend
2. Integrar com gateway de pagamento (Stripe, PagSeguro, Mercado Pago, etc.)
3. Adicionar validação de cartão de crédito (Luhn algorithm)
4. Implementar webhook para atualização de status em tempo real
5. Adicionar SSL/TLS para segurança dos dados de pagamento
6. Implementar PCI DSS compliance para dados de cartão