Site: https://calixtoneto.github.io/mapa-do-voto-pb/

# Mapa do voto · Paraíba

Votos de candidatos a presidente, governador, senador, deputado federal e deputado estadual em cada um dos 223 municípios da Paraíba, a partir dos resultados oficiais do TSE.

## Como usar

![Escolhendo a eleição, buscando um candidato e vendo os votos por escola em Bayeux](docs/uso.gif)

Abra o site: ele lista todas as eleições disponíveis sozinho, sem precisar baixar nem enviar arquivos. Escolha a eleição (ano e turno), o cargo e o candidato. Clique num município para ver os números e, quando existir, os votos em cada local de votação (escola).

## De onde vêm os dados

| | Onde fica | Como é gerado |
|---|---|---|
| **Histórico** (2014, 2018, 2022) | `public/data/historico/ANO-tTURNO.json`, commitado | Uma vez, com `npm run historico`. Nunca mais muda. |
| **Ciclo atual** (2026) | `public/data/atual/`, **não** commitado | Pelo workflow, a cada publicação (push, de hora em hora e manualmente). Vai direto para o Pages. |

Para cada ciclo, o gerador tenta a [API de resultados do TSE](https://resultados.tse.jus.br/). Se ela não tiver o ano (a API só guarda o ciclo atual e o anterior), baixa o CSV do Portal de Dados Abertos e agrega no próprio script. Quem busca é o workflow, uma vez por execução, com poucas requisições em paralelo, retentativa e cache. O navegador do visitante nunca chama a API do TSE, o que evita bloqueios.

- O detalhe por local de votação (`ANO-tTURNO-locais.json`, carregado só ao clicar num município) sai do CSV por seção, de 2018 em diante. Em 2014 o TSE não publicou o nome do local.
- Presidente só aparece quando os dados vêm da API (2026). O CSV da Paraíba não traz esse cargo.
- Com a apuração final em cache, o workflow termina em segundos. Quando o ciclo atual terminar, mova-o para o histórico com `npm run historico -- ANO`.

## Desenvolvimento

```bash
npm install
npm run dados       # malha (IBGE) e tabela TSE→IBGE
npm run historico   # gera o histórico que ainda não existe (use -- ANO para escolher; --forcar para refazer)
npm run atual       # gera o ciclo atual em public/data/atual
npm run dev         # http://localhost:5173
```

## Stack

Preact + htm, Canvas 2D, TopoJSON (malha IBGE simplificada com mapshaper) e fflate (só nos scripts). Sem etapa de build: a pasta `public/` é o site.

## Fontes

- TSE: API de resultados e Portal de Dados Abertos (votação nominal por município e zona; votação por seção).
- Malha municipal: IBGE, via tbrugz/geodata-br.
- Tabela TSE↔IBGE: betafcc/Municipios-Brasileiros-TSE.
