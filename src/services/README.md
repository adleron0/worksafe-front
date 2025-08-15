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
  - `?active=true` (apenas ativos)
  - `?active=false` (apenas inativos)
- **createdAt**: busca por data de criação
  - `?createdAt[0]=2024-01-01&createdAt[1]=2024-12-31` (intervalo)

## Paginação e Ordenação

- **page**: página (começa em 0)
- **limit**: quantidade por página
- **orderBy**: ordenação (array de objetos)
  - Exemplo: `orderBy[0][id]=desc`

## Observações
- Todos os filtros podem ser combinados.
- O filtro `or` aceita todos os operadores acima.
- Os filtros são processados automaticamente pelo serviço genérico.

---

Dúvidas ou sugestões? Fale com o time de desenvolvimento. 