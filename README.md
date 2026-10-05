# Mapa do voto · Paraíba

Votos de candidatos a deputado federal e estadual em cada um dos 223 municípios da Paraíba, a partir do arquivo oficial do TSE (votação nominal por município e zona).

## Como usar

1. Baixe `votacao_candidato_munzona_ANO.zip` no Portal de Dados Abertos do TSE.
2. Abra o site e envie o .zip (ou só o CSV da PB). A leitura acontece no navegador.
3. Escolha o cargo e o candidato.

## Desenvolvimento

```bash
npm install
npm run dados   # regenera a malha (IBGE) e a tabela TSE→IBGE
npm run dev     # http://localhost:5173
```

## Stack

Preact + htm, Canvas 2D, TopoJSON (malha IBGE simplificada com mapshaper) e fflate para ler o .zip. Sem etapa de build: a pasta `public/` é o site.

## Fontes

- TSE, Portal de Dados Abertos: votação nominal por município e zona.
- Malha municipal: IBGE, via tbrugz/geodata-br.
- Tabela TSE↔IBGE: betafcc/Municipios-Brasileiros-TSE.
