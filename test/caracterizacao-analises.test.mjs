// Golden master do gerador de análises, no mesmo cenário de 2022 do gerador de votação.
// Para regravar depois de uma mudança intencional: ATUALIZAR_ESPERADO=1 npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { montarCenario2022 } from './fixtures/cenario-2022.mjs';
import { acrescentarAnalises2022 } from './fixtures/cenario-analises-2022.mjs';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const ESPERADO = join(RAIZ, 'test/fixtures/esperado/analises');
const ARQUIVOS_GERADOS = ['2022-candidatos.json', '2022-financas.json', '2022-t1-comparecimento.json',
  '2022-t2-comparecimento.json', '2022-eleitorado.json', 'analises.json', 'patrimonio.json', 'dinheiro.json'];

function semDataDeGeracao(json) {
  const dados = JSON.parse(json);
  if ('geradoEm' in dados) dados.geradoEm = '<data>';
  return JSON.stringify(dados, null, 1) + '\n';
}

function rodar(pasta, script) {
  execFileSync(process.execPath, ['--import', join(RAIZ, 'test/fixtures/fetch-falso.mjs'), join(RAIZ, script), '2022', '--forcar'],
    { cwd: pasta, env: { ...process.env, API_FALSA: join(pasta, 'api-falsa.json') }, stdio: 'pipe' });
}

test('o gerador de análises produz exatamente a saída gravada para o cenário de 2022', async () => {
  const pasta = await montarCenario2022(RAIZ);
  try {
    await acrescentarAnalises2022(pasta);
    rodar(pasta, 'scripts/gerar-dados.mjs');
    rodar(pasta, 'scripts/gerar-analises.mjs');
    for (const arquivo of ARQUIVOS_GERADOS) {
      const gerado = semDataDeGeracao(await readFile(join(pasta, 'public/data/eleicoes', arquivo), 'utf8'));
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
