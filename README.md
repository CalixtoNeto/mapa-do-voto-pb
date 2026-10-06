Site: https://calixtoneto.github.io/mapa-do-voto-pb/

# Mapa do voto · Paraíba

Votos de candidatos a presidente, governador, senador, deputado federal e deputado estadual em cada um dos 223 municípios da Paraíba, a partir dos resultados oficiais do TSE.

## Como usar

![Escolhendo a eleição, buscando um candidato e vendo os votos por escola em Bayeux](docs/uso.gif)

Abra o site: ele lista todas as eleições disponíveis sozinho, sem precisar baixar nem enviar arquivos. Escolha a eleição (ano e turno), o cargo e o candidato. Clique num município para ver os números e, quando existir, os votos em cada local de votação (escola).

## Comparar a evolução de um candidato

![Comparando a votação de um candidato entre eleições](docs/comparar.gif)

Quando o candidato disputou mais de uma eleição, a seção **Evolução do candidato** mostra os votos dele em cada uma, com a parcela dos votos nominais e a posição. A ligação entre eleições é feita pelo nome completo no TSE, inclusive entre cargos diferentes (por exemplo, vereador em 2016 e deputado em 2018).

Clique em **Comparar** numa delas para ver no mapa onde o candidato ganhou e perdeu votos, com o ranking de variação e, no card, o "antes → depois". A cor mostra a variação dos votos (%) ou a da parcela (pontos percentuais).

O uso pensado é comparar **o mesmo cargo** (e o mesmo turno). É possível comparar cargos ou turnos diferentes, mas o botão traz "(outro cargo)" ou "(outro turno)" e o site mostra um aviso: mudam o tipo de disputa, o número de candidatos e os votos por eleitor (em anos de dois senadores, cada eleitor tem dois votos), então a variação não mede, por si só, crescimento ou queda de apoio.

## De onde vêm os dados

Os resultados ficam no repositório, em `public/data/eleicoes/`: um `ANO-tTURNO.json` por eleição e turno, o `ANO-tTURNO-locais.json` com os votos por escola (carregado só ao clicar num município) um `index.json` que o site lê para listar as eleições e um `pessoas.json` que liga o mesmo candidato entre eleições (pelo nome completo). O site é totalmente estático: o navegador do visitante nunca chama o TSE.

O gerador (`scripts/gerar-dados.mjs`) segue esta ordem para cada ano:

1. **Dados Abertos do TSE** (CSV de votação nominal por município e zona). O presidente vem do arquivo nacional (`_BRASIL.csv`) do mesmo .zip.
2. **API de resultados do TSE**, só para o que o CSV ainda não tem: um 2º turno recém-apurado ou um cargo que o arquivo ainda não traz (hoje, o presidente de 2026). A API só guarda o ciclo atual e o anterior.
3. **CSV por seção**, para o detalhe por local de votação (de 2018 em diante; em 2014 o TSE não publicou o nome do local).

Eleições já geradas: 2014, 2018, 2022 e 2026.

## Nas próximas eleições

No GitHub, abra **Actions → Atualizar dados de uma eleição → Run workflow** e informe o ano. O workflow gera os arquivos, commita em `public/data/eleicoes/` e dispara a publicação do site. Marque "refazer" enquanto a apuração estiver em andamento ou para pegar o 2º turno.

O mesmo pode ser feito localmente, e o workflow só repete esses passos:

```bash
npm install
npm run eleicoes -- 2030 --forcar   # gera public/data/eleicoes/2030-t*.json
git add public/data && git commit -m "dados: eleição 2030" && git push
```

## Desenvolvimento

```bash
npm install
npm run dados       # malha (IBGE) e tabela TSE→IBGE
npm run eleicoes    # gera os anos que ainda não existem (use -- ANO para escolher; --forcar para refazer)
npm run dev         # http://localhost:5173
```

## Stack

Preact + htm, Canvas 2D, TopoJSON (malha IBGE simplificada com mapshaper) e fflate (só nos scripts). Sem etapa de build: a pasta `public/` é o site.

## Fontes

- TSE: Portal de Dados Abertos (votação nominal por município e zona; votação por seção) e API de resultados.
- Malha municipal: IBGE, via tbrugz/geodata-br.
- Tabela TSE↔IBGE: betafcc/Municipios-Brasileiros-TSE.
