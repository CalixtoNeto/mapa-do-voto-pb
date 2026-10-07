// Golden master do gerador: roda o script inteiro num cenário fixo e compara a saída com o que está
// gravado em test/fixtures/esperado/. Para regravar depois de uma mudança intencional:
//   ATUALIZAR_ESPERADO=1 npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { montarCenario2022 } from './fixtures/cenario-2022.mjs';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const ESPERADO = join(RAIZ, 'test/fixtures/esperado');
const ARQUIVOS_GERADOS = ['2022-t1.json', '2022-t1-locais.json', '2022-t2.json', '2022-t2-locais.json', 'index.json', 'pessoas.json'];

// Datas de geração mudam a cada execução; o resto da saída tem de ser idêntico.
function semDatasDeGeracao(json) {
  const dados = JSON.parse(json);
  if ('geradoEm' in dados) dados.geradoEm = '<data>';
  for (const item of [dados, ...(dados.eleicoes || [])]) if (item.fonte === 'csv') item.atualizadoEm = '<data>';
  return JSON.stringify(dados, null, 1) + '\n';
}

function rodarGerador(pasta) {
  execFileSync(process.execPath, [
    '--import', join(RAIZ, 'test/fixtures/fetch-falso.mjs'),
    join(RAIZ, 'scripts/gerar-dados.mjs'), '2022', '--forcar',
  ], { cwd: pasta, env: { ...process.env, API_FALSA: join(pasta, 'api-falsa.json') }, stdio: 'pipe' });
}

test('o gerador produz exatamente a saída gravada para o cenário de 2022', async () => {
  const pasta = await montarCenario2022(RAIZ);
  try {
    rodarGerador(pasta);
    for (const arquivo of ARQUIVOS_GERADOS) {
      const gerado = semDatasDeGeracao(await readFile(join(pasta, 'public/data/eleicoes', arquivo), 'utf8'));
      if (process.env.ATUALIZAR_ESPERADO) {
        await mkdir(ESPERADO, { recursive: true });
        await writeFile(join(ESPERADO, arquivo), gerado);
      }
      assert.equal(gerado, await readFile(join(ESPERADO, arquivo), 'utf8'), arquivo);
    }
  } finally {
    await rm(pasta, { recursive: true, force: true });
  }
});
