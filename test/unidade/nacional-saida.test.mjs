// Arquivo e índice do cenário nacional (scripts/saida/nacional.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { escreverNacional } from '../../scripts/saida/nacional.mjs';

const nacional = (ano, turnos) => ({ ano, fonte: 'csv', atualizadoEm: '2026-10-27T00:00:00Z', turnos: Object.fromEntries(turnos.map(t => [t, { cands: [] }])), municipios: [] });

test('escreve o ano e lista no índice os anos do mais novo ao mais antigo, com seus turnos', async () => {
  const pasta = await mkdtemp(join(tmpdir(), 'nacional-'));
  await escreverNacional(pasta, nacional('2022', ['1', '2']));
  await escreverNacional(pasta, nacional('2026', ['1']));
  const indice = JSON.parse(await readFile(`${pasta}/index.json`, 'utf8'));
  assert.deepEqual(indice.anos.map(a => [a.ano, a.turnos]), [['2026', ['1']], ['2022', ['1', '2']]]);
  assert.equal(JSON.parse(await readFile(`${pasta}/2026.json`, 'utf8')).ano, '2026');
});
