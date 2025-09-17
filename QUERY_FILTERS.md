# Filtros de Busca - Serviço Genérico

Este serviço permite buscas flexíveis utilizando filtros dinâmicos via query params ou objetos. Veja abaixo como utilizar cada tipo de filtro.

## Filtros Simples

- Para buscar por igualdade:
  - `?name=João`
  - `?idade=30`

## Operadores Especiais

- **in**: busca valores dentro de um array
  - `?in-id=1,2,3` (equivalente a `id IN [1,2,3]`)
- **notin**: busca valores fora de um array
  - `?notin-id=1,2,3` (equivalente a `id NOT IN [1,2,3]`)
- **not**: busca valores diferentes
  - `?not-status=ativo` (equivalente a `status != 'ativo'`)
- **gt**: maior que
  - `?gt-idade=18` (idade > 18)
- **lt**: menor que
  - `?lt-idade=60` (idade < 60)
- **gte**: maior ou igual
  - `?gte-idade=18` (idade >= 18)
- **lte**: menor ou igual
  - `?lte-idade=60` (idade <= 60)
- **like**: busca por "contém" (case insensitive)
  - `?like-nome=joao` (busca todos os registros cujo campo `nome` contém "joao", ignorando maiúsculas/minúsculas)
- **notlike**: busca por "NÃO contém" (case insensitive)
  - `?notlike-nome=joao` (busca todos os registros cujo campo `nome` NÃO contém "joao", ignorando maiúsculas/minúsculas)

## Filtro OR

Permite passar um array de condições, onde pelo menos uma deve ser satisfeita.

### Exemplo (JSON no body ou query string):
```json
{
  "or": [
    { "name": "João" },
    { "not-status": "inativo" },
    { "in-id": "1,2,3" },
    { "like-nome": "joao" },
    { "notlike-nome": "maria" }
  ]
}
```

### Exemplo via query string (usando array):
```
?or[0][name]=João&or[1][not-status]=inativo&or[2][in-id]=1,2,3&or[3][like-nome]=joao&or[4][notlike-nome]=maria
```

## Filtros Especiais

- **searchName**: busca por nome (case insensitive, contém)
  - `?searchName=joao`
- **name**: busca por nome (case insensitive, contém)
  - `?name=joao`
- **active**: busca ativos/inativos
  - `?active=true` (apenas ativos - inactiveAt IS NULL)
  - `?active=false` (apenas inativos - inactiveAt IS NOT NULL)
- **createdAt**: busca por data de criação
  - `?createdAt[0]=2024-01-01&createdAt[1]=2024-12-31` (intervalo)
- **show**: define quais associações incluir na resposta
  - `?show=trainee,subscription,company` (equivale ao include do Prisma)
- **omitAttributes**: campos a serem omitidos da resposta
  - `?omitAttributes=password,key` (remove campos sensíveis)
- **companyId**: filtro automático por empresa (quando aplicável)
- **self**: parâmetro especial para filtros personalizados

## Paginação e Ordenação

- **page**: página (começa em 0)
- **limit**: quantidade por página (ou 'all' para buscar todos)
- **all**: buscar todos os registros sem paginação (`?all=true`)
- **orderBy**: ordenação (array de objetos)
  - Exemplo: `orderBy[0][id]=desc`
  - Ordem padrão: `id desc`

## Agregações com -aggregate

O parâmetro `-aggregate` permite realizar operações de agregação (count, sum, avg, min, max) agrupadas por um campo específico. Muito útil para dashboards e relatórios.

### Sintaxe

```
-aggregate=CAMPO_AGRUPAR:operacao1:campo1,campo2:operacao2:campo3
```

### Operações disponíveis

- **count**: Conta a quantidade de registros
- **sum**: Soma valores de campos numéricos
- **avg**: Calcula a média de campos numéricos
- **min**: Retorna o valor mínimo
- **max**: Retorna o valor máximo

### Exemplos práticos

1. **Contar registros por status**:
   ```
   ?-aggregate=status:count
   ```
   Retorno:
   ```json
   {
     "aggregations": {
       "paid": { "_count": 45 },
       "processing": { "_count": 10 }
     }
   }
   ```

2. **Somar valores por status**:
   ```
   ?-aggregate=status:sum:value
   ```
   Retorno:
   ```json
   {
     "aggregations": {
       "paid": { "_sum": { "value": 22500 } },
       "processing": { "_sum": { "value": 5000 } }
     }
   }
   ```

3. **Múltiplas operações combinadas**:
   ```
   ?-aggregate=status:count:sum:value,discount:avg:commissionPercentage
   ```
   Retorno:
   ```json
   {
     "aggregations": {
       "paid": {
         "_count": 45,
         "_sum": { "value": 22500, "discount": 2000 },
         "_avg": { "commissionPercentage": 12.5 }
       }
     }
   }
   ```

4. **Agregação por gateway com todas operações**:
   ```
   ?-aggregate=gateway:count:sum:value:avg:commissionPercentage:min:value:max:value
   ```

5. **Agregação por seller (comissões)**:
   ```
   ?-aggregate=sellerId:count:sum:commissionValue:avg:commissionPercentage
   ```

### Observações sobre -aggregate

- O campo de agrupamento é sempre o primeiro elemento
- Use `:` para separar campo/operações
- Use `,` para separar múltiplos campos dentro da mesma operação
- As agregações respeitam todos os filtros aplicados na busca
- O resultado retorna no campo `aggregations` junto com os dados paginados
- Funciona com qualquer modelo que tenha o método `groupBy` do Prisma

## Filtros em Associações (Includes)

O serviço genérico agora suporta filtros em associações aninhadas de forma exponencial. Você pode filtrar dados dentro de includes e até mesmo em includes de includes.

### Como funciona

Para aplicar filtros em associações, use a notação de ponto (`.`) para indicar o caminho até o campo desejado:

- **Filtro em associação direta**: `operador-associacao.campo`
  - Exemplo: `?like-trainee.name=João` (busca certificados onde o trainee tem "João" no nome)

- **Filtro em associação aninhada**: `operador-associacao.subassociacao.campo`
  - Exemplo: `?like-trainee.company.name=Acme` (busca certificados onde o trainee pertence à empresa "Acme")

### Tipos de Relações e Comportamento

O sistema detecta automaticamente o tipo de relação e aplica o filtro de forma apropriada:

1. **Relações Many-to-One (belongsTo)**:
   - Ex: Um certificado pertence a um trainee
   - O filtro é aplicado no `where` principal da query
   - Funciona mesmo quando há `select` definido
   - Exemplo: `?like-trainee.name=João` gera:
     ```javascript
     where: {
       trainee: {
         name: { contains: "João", mode: "insensitive" }
       }
     }
     ```

2. **Relações One-to-Many ou Many-to-Many (hasMany)**:
   - Ex: Um trainee tem muitos certificados
   - O filtro é aplicado no `where` do include
   - Não funciona com `select` (limitação do Prisma)
   - Exemplo: `?like-certificates.title=Segurança` gera:
     ```javascript
     include: {
       certificates: {
         where: {
           title: { contains: "Segurança", mode: "insensitive" }
         }
       }
     }
     ```

### Operadores suportados em associações

Todos os operadores do serviço genérico funcionam com associações:
- `like-trainee.name=valor` - Contém (case insensitive)
- `notlike-trainee.name=valor` - Não contém (case insensitive)
- `in-trainee.id=1,2,3` - Está na lista
- `notin-trainee.id=1,2,3` - Não está na lista
- `not-trainee.status=ativo` - Diferente de
- `gt-trainee.idade=18` - Maior que
- `lt-trainee.idade=60` - Menor que
- `gte-trainee.idade=18` - Maior ou igual
- `lte-trainee.idade=60` - Menor ou igual
- `trainee.active=true` - Igualdade simples

### Exemplos práticos

1. **Buscar certificados de trainees com nome específico**:
   ```
   ?show=trainee&like-trainee.name=João
   ```

2. **Buscar certificados de trainees de um estado específico**:
   ```
   ?show=trainee&like-trainee.estado.name=São Paulo
   ```

3. **Combinar múltiplos filtros em associações**:
   ```
   ?show=trainee,course&like-trainee.name=João&like-course.title=Segurança
   ```

4. **Filtros com múltiplos níveis de aninhamento**:
   ```
   ?show=trainee&like-trainee.company.city.name=Campinas
   ```

### Condições importantes

1. **A associação deve estar incluída no `show`**: Para aplicar um filtro em uma associação, ela precisa estar listada no parâmetro `show` (includesToShow).
   - ✅ Correto: `?show=trainee&like-trainee.name=João`
   - ❌ Incorreto: `?like-trainee.name=João` (sem incluir trainee no show)

2. **O campo deve estar definido em `paramsIncludes`**: As associações e seus campos devem estar configurados corretamente no `paramsIncludes` do controller.

3. **Sem erros para condições não cumpridas**: Se as condições acima não forem cumpridas, o filtro é simplesmente ignorado (não gera erro).

4. **Separação automática de filtros**: Os filtros de associações são automaticamente separados dos filtros da entidade principal, evitando conflitos.

5. **Diferenças entre tipos de relações**:
   - **Relações Many-to-One (belongsTo)**: 
     - ✅ Filtros funcionam perfeitamente
     - ✅ Mantém o `select` se configurado
     - ✅ O filtro é aplicado no `where` principal
   - **Relações One-to-Many/Many-to-Many (hasMany)**:
     - ✅ Filtros funcionam
     - ⚠️ Não pode ter `select` junto com `where` (limitação do Prisma)
     - ✅ O filtro é aplicado no `where` do include

## Criptografia/Encriptação

O serviço genérico suporta encriptação automática de campos sensíveis na resposta:

```typescript
// No controller
await this.genericService.get(
  filters,
  entity,
  paramsIncludes,
  false, // noCompany
  ['cpf', 'rg', 'telefone'] // campos para encriptar
);

// Ou usando configuração padrão
await this.genericService.get(
  filters,
  entity,
  paramsIncludes,
  false,
  true // usa encryptionConfig[entityName]
);
```

## Upload de Arquivos

O serviço genérico processa uploads automaticamente:

- **Arquivo único**: Campo `imageUrl` é preenchido automaticamente
- **Múltiplos arquivos**: Campos `{fieldName}Url` são preenchidos
- **Update**: Remove arquivos antigos do S3 automaticamente
- **Delete**: Suporte a exclusão de imagens existentes

## Hooks Personalizados

```typescript
await this.genericService.create(dto, logParams, entity, file, searchVerify, {
  hookPreCreate: async ({ dto, entity, prisma, logParams }) => {
    // Lógica antes de criar
  },
  hookPosCreate: async (params, created) => {
    // Lógica após criar
  }
});
```

Hooks disponíveis:
- `hookPreCreate` / `hookPosCreate`
- `hookPreUpdate` / `hookPosUpdate`
- `hookPreUpsert` / `hookPosUpsert`

## Observações Gerais

- Todos os filtros podem ser combinados
- O filtro `or` aceita todos os operadores acima
- Os filtros são processados automaticamente pelo serviço genérico
- Filtros de associações aninhadas são aplicados recursivamente
- Filtros não válidos (associação não incluída) são silenciosamente ignorados
- Suporte a soft delete através de `inactiveAt` e `deletedAt`
- Logs automáticos de todas as operações
- Tratamento de erros padronizado

---

Dúvidas ou sugestões? Fale com o time de desenvolvimento. 