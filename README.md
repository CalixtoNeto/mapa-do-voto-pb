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

## Análises

Além do mapa de votos, cada candidato e cada cargo têm análises tiradas dos Dados Abertos do TSE.

**Na ficha do candidato** (botão *Candidato*):

- **Dinheiro da campanha**: quanto recebeu, quanto declarou ter gasto, **custo por voto** (e a posição entre os candidatos do cargo), quanto veio do **fundo eleitoral**, a origem do dinheiro (fundo eleitoral, fundo partidário e partido, doações, recursos próprios e de outros candidatos) e as maiores despesas.
- **Quem é**: gênero, cor ou raça, idade, escolaridade, ocupação, se tentou a reeleição, a situação final e os **bens declarados**, com a evolução entre eleições.
- **Concentração do voto**: de quantos municípios veio metade dos votos e o número efetivo de municípios (voto de reduto ou espalhado).
- **Dobradinhas prováveis**: candidatos do cargo parceiro (deputado federal ↔ estadual, governador ↔ senador) com votação parecida nos mesmos municípios.

**No panorama do cargo** (botão *Panorama do cargo*):

- Mapa de **quem venceu** em cada município e de **abstenção, brancos e nulos**, com os totais do estado.
- **Gasto × votos** de todos os candidatos, com diagonais de custo por voto, e rankings de menor e maior custo por voto, mais fundo eleitoral, mais dinheiro recebido e maior gasto.
- **Fundo eleitoral por partido**, com a parcela para mulheres e para pessoas negras (pretas e pardas) e um aviso quando a parcela das mulheres fica abaixo de 30%.
- **Quem disputou e quem se elegeu**: gênero e cor ou raça de candidatos e eleitos.
- **Voto de reduto ou espalhado**: candidatos ordenados pela concentração do voto.
- **Maiores doadores** dos candidatos do cargo, somados pelo CPF/CNPJ (que o site não mostra).

Cuidados que o site mostra junto dos números:

- **Gasto** é o total de despesas contratadas declaradas ao TSE, sem as doações a outras campanhas (que são gasto de quem recebe). **Custo por voto** é esse gasto dividido pelos votos do candidato na Paraíba.
- Para **presidente**, a campanha é nacional e os votos aqui são só os da Paraíba: o site não mostra o dinheiro dela, só o perfil. Em governador e senador, o dinheiro é da chapa e cobre os dois turnos.
- O dinheiro que veio **de outros candidatos** fica separado, para não ser contado duas vezes (pode incluir fundo eleitoral repassado).
- A **prestação de contas é parcial** até o prazo da prestação final (cerca de 30 dias depois da eleição); o site avisa, e os números mudam quando o workflow roda de novo.
- O **fundo eleitoral** existe desde 2018, e a prestação de contas neste formato também. Em 2014 o site diz que o dado não existe.
- A **regra dos 30% do fundo para mulheres** vale para o total nacional de cada partido; a parcela na Paraíba indica como o dinheiro foi distribuído aqui, não uma irregularidade.
- **Dobradinhas** são candidatos cujas parcelas de voto sobem e descem nos mesmos municípios (correlação): votos no mesmo eleitorado, não prova de acordo político.
- **Bens** são valores nominais, sem correção pela inflação; a ligação entre eleições é pelo nome completo, como na evolução do candidato.
- No mapa de quem venceu, só os três candidatos que mais venceram têm cor própria; com mais cores elas deixam de ser distinguíveis, inclusive para daltônicos.

### De onde vêm as análises

O gerador `scripts/gerar-analises.mjs` grava, ao lado dos arquivos de votação:

| Arquivo | Fonte do TSE | Conteúdo |
|---|---|---|
| `ANO-candidatos.json` | Candidatos (`consulta_cand`) e bens (`bem_candidato`) | Perfil e total de bens de cada candidato |
| `ANO-financas.json` | Prestação de contas dos candidatos (receitas e despesas contratadas) | Dinheiro por origem, gasto, repasses, maiores despesas e os maiores doadores |
| `ANO-tTURNO-comparecimento.json` | Detalhe da votação por município e zona | Aptos, comparecimento, brancos e nulos por município, cargo e turno |
| `analises.json` | — | O que existe de cada ano (o site só pede os arquivos que existem) |
| `patrimonio.json` | — | Bens da mesma pessoa em cada eleição |

Para gerar ou atualizar: **Actions → Gerar análises → Run workflow** (em branco, refaz todos os anos; ou informe, por exemplo, `2022 2026`). O workflow **Atualizar dados de uma eleição** também gera as análises do ano. Localmente: `npm run analises -- 2022`.

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

## Testes

```bash
npm test
```

Rodam offline, em menos de um segundo, sem baixar nada do TSE:

- `test/caracterizacao.test.mjs` é um *golden master*: monta um cenário pequeno de 2022 com os mesmos formatos do TSE (zips em `tmp/` e um `fetch` falso), roda o gerador inteiro e compara a saída com `test/fixtures/esperado/`. Se uma mudança na saída for intencional, regrave com `ATUALIZAR_ESPERADO=1 npm test` e revise o diff dos arquivos esperados.
- `test/unidade/` testa cada regra isolada: divisão do CSV, filtro de voto branco, nulo e de legenda, nomes `#NULO#`, poda de candidaturas anuladas, ligação de pessoas entre eleições e o que é pedido à API.

## Organização do gerador

| Pasta | O que tem |
|---|---|
| `scripts/gerar-dados.mjs` | Linha de comando: escolhe os anos e encadeia as etapas |
| `scripts/gerar-analises.mjs` | Linha de comando das análises: cadastro, bens, prestação de contas e comparecimento |
| `scripts/eleicao/` | Configuração (UF, cargos), conversão TSE→IBGE e a apuração (soma de votos) |
| `scripts/fontes/` | Uma fonte por arquivo: CSV por município, API de resultados, CSV por seção e tabela de locais |
| `scripts/analises/` | Regras das análises: classificação do dinheiro, perfil, comparecimento, patrimônio e o escopo do site |
| `scripts/saida/` | Poda dos locais, `pessoas.json`, `index.json`, arquivos das análises e escrita |
| `scripts/lib/` | CSV do TSE e acesso à rede (retentativa, paralelismo limitado, cache em disco, leitura de .zip) |

Cada fonte separa o tratamento de uma linha (função pura, testada sem .zip) da leitura do arquivo.

## Stack

Preact + htm, Canvas 2D, SVG (gráfico gasto × votos), módulos ES nativos para as análises (`public/js/*.mjs`), TopoJSON (malha IBGE simplificada com mapshaper) e fflate (só nos scripts). Sem etapa de build: a pasta `public/` é o site.

## Fontes

- TSE: Portal de Dados Abertos (votação nominal por município e zona; votação por seção; detalhe da votação; candidatos; bens de candidatos; prestação de contas eleitorais) e API de resultados.
- Malha municipal: IBGE, via tbrugz/geodata-br.
- Tabela TSE↔IBGE: betafcc/Municipios-Brasileiros-TSE.
