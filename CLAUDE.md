# Mapa da política · Paraíba

Site estático (`public/`) com dados gerados por `scripts/gerar-dados.mjs` a partir do TSE.

## Antes de dar uma mudança por pronta

- Rode `npm test`. Roda offline e em menos de um segundo; não há outro passo de verificação.
- O teste `test/caracterizacao.test.mjs` compara a saída do gerador com `test/fixtures/esperado/`.
  Se ele falhar, a saída mudou: corrija o código. Só regrave (`ATUALIZAR_ESPERADO=1 npm test`) quando
  a mudança na saída for o objetivo da tarefa, e diga no resumo o que mudou nos arquivos esperados.
- Regra nova ou caso novo dos dados do TSE: escreva primeiro o teste em `test/unidade/`, veja falhar, depois o código.
- Não rode o gerador contra o TSE para testar; os arquivos em `public/data/` são o que o site publica.

## Análises

- `scripts/gerar-analises.mjs` gera `ANO-candidatos.json`, `ANO-financas.json`, `ANO-tTURNO-comparecimento.json`,
  `ANO-eleitorado.json`, `analises.json`, `patrimonio.json` e `dinheiro.json`; o golden master dele é
  `test/caracterizacao-analises.test.mjs`.
- `scripts/analises/escopo.mjs` é o que muda entre os dois repositórios (quem entra e qual é a chave do candidato).
  O resto de `scripts/analises/`, `scripts/fontes/{candidatos,bens,prestacao-contas,eleitorado}.mjs`, `scripts/saida/analises.mjs`
  e os módulos `public/js/*.mjs` são iguais nos dois; uma correção num vale para o outro.
- Os cálculos do site ficam em `public/js/calculos*.mjs`, sem DOM, testados em `test/unidade/calculos*.test.mjs`.
  O que cada site faz diferente (lugares, chave do candidato) entra pelo `CFG` de `app.js` (`agrupar`, `nomeDoLugar`…).
- Nomes curtos das análises que o site lê: `c`, `r`, `d`, `rep`, `pg`, `dc`, `rs`, `doa`, `nd`, `fo`, `nf`, `doadores` e
  `fornecedores` (`n`, `t`, `v`, `c`) em finanças; `g`, `r`, `i`, `e`, `o`, `re`, `s`, `p`, `b`, `bt` no perfil;
  `[aptos, comparecimento, brancos, nulos, legenda?]` no comparecimento; `[eleitores, mulheres, jovens, idosos,
  superior, pouco estudo]` no eleitorado. Em `doa` e `fo`, o último número é o índice na lista do arquivo.

## Perfil do estado

- `scripts/gerar-perfis.mjs` gera `public/data/perfis/estado-ANO.json` e `estado-ANO-detalhe.json` (árvores, lidas só quando o
  ano é aberto) pela API do Governo da Paraíba (`scripts/fontes/api-pb.mjs`, paginada de 1.000 em 1.000); as regras ficam em
  `scripts/estado/`, testadas em `test/unidade/estado.test.mjs`.
- `scripts/perfis/{arvores,somas,cruzamentos,campanhas}.mjs` e `scripts/lib/documento.mjs` são iguais aos do repositório de
  Bayeux; os módulos de `public/js/perfil/` vieram de lá e mudam só no que é do estado (`perfil-estado.mjs`, `pagina-perfis.mjs`,
  `dados-perfil.mjs` e os textos de `alertas.mjs`).
- Nunca publique CPF inteiro: use `documentoPublico` (CNPJ inteiro, CPF mascarado) e, para cruzar, `documentoParaCruzar`.
  A folha só vai agregada (tipo de cargo e órgão), sem nomes.
- Alerta é conta do site: títulos descritivos ("valores atípicos"), nunca "irregular" ou citação de lei junto do dado.

## Como o código está organizado

- Uma responsabilidade por arquivo, arquivos com menos de 100 linhas e funções com menos de 20.
- Cada fonte em `scripts/fontes/` exporta um `leitorDe…` (trata uma linha, sem I/O) e uma função que lê o .zip.
- Dependências que tocam a rede entram por parâmetro (`buscarJson`, `ibgeDe`) para os testes trocarem por falsas.
- Os nomes curtos dentro dos JSON (`cands`, `tot`, `mun`, `nr`, `n`) são o formato que `public/js/app.js` lê; não renomeie.
- Nomes de funções e variáveis em português, dizendo o que são. Comentário só para o porquê (uma regra do TSE,
  um formato estranho), nunca para repetir o código.
