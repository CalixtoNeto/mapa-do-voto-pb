// Classificação e agregação das seções de urna (scripts/urnas/agregar.mjs): sem biometria, horários e prorrogação, por município.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { minutosApos, classificar, agregarSecoes, pleitoDoTurno } from '../../scripts/urnas/agregar.mjs';

const secao = (extra = {}) => ({ municipio: '1', nome: 'AAA', zona: '0001', secao: '0001', abertura: '2026-10-25T08:00:01', encerramento: '2026-10-25T17:00:30', aptos: 300, comparecimento: 250,
  porIdentificacao: [10, 220, 20], brancos: 2, nulos: 8, candidatos: [{ numero: 13, qtd: 130 }, { numero: 22, qtd: 110 }], ...extra });

test('minutos depois de um horário de referência, na hora local da urna', () => {
  assert.equal(minutosApos('2026-10-25T08:00:00', '08:00'), 0);
  assert.equal(minutosApos('2026-10-25T08:15:30', '08:00'), 15.5);
  assert.equal(minutosApos('2026-10-25T19:00:00', '17:00'), 120);
  assert.ok(minutosApos('2026-10-25T07:59:00', '08:00') < 0);
  assert.equal(minutosApos(null, '08:00'), null);
});

test('classificar: seção normal não tem marca', () => {
  assert.deepEqual(classificar(secao()), { semDigital: false, abriuTarde: false, fechouTarde: false, prorrogada: false });
});

test('classificar: sem digital é a seção em que a biometria não chega à metade do comparecimento (com ao menos 30 eleitores)', () => {
  assert.equal(classificar(secao({ porIdentificacao: [100, 125, 25] })).semDigital, true, 'exatamente metade conta');
  assert.equal(classificar(secao({ porIdentificacao: [100, 126, 24] })).semDigital, false);
  assert.equal(classificar(secao({ comparecimento: 20, porIdentificacao: [20, 0, 0] })).semDigital, false, 'seção pequena demais para a conta');
});

test('classificar: abriu tarde (mais de 15 min depois das 08:00), fechou tarde (mais de 30 min depois das 17:00) e prorrogada (depois das 18:00)', () => {
  assert.equal(classificar(secao({ abertura: '2026-10-25T08:15:00' })).abriuTarde, false);
  assert.equal(classificar(secao({ abertura: '2026-10-25T08:16:00' })).abriuTarde, true);
  assert.deepEqual(classificar(secao({ encerramento: '2026-10-25T17:31:00' })), { semDigital: false, abriuTarde: false, fechouTarde: true, prorrogada: false });
  assert.deepEqual(classificar(secao({ encerramento: '2026-10-25T19:00:05' })), { semDigital: false, abriuTarde: false, fechouTarde: true, prorrogada: true });
});

const NUMEROS = [13, 22];

test('agregar: soma por município, separa as seções prorrogadas e conta os votos dos dois candidatos', () => {
  const lidas = [secao(), secao({ secao: '0002' }), secao({ secao: '0003', encerramento: '2026-10-25T19:00:00', candidatos: [{ numero: 13, qtd: 200 }, { numero: 22, qtd: 30 }, { numero: 99, qtd: 5 }] }), { municipio: '1', nome: 'AAA', zona: '0001', secao: '0004', erro: 'sem boletim' }];
  const { municipios } = agregarSecoes(lidas, { uf: 'PB', numeros: NUMEROS });
  assert.equal(municipios.length, 1);
  const [cd, uf, nome, lidasN, semBoletim, aptos, comp, g0, g1, g2, brancos, nulos, semDigital, abriuTarde, fechouTarde, prorrogadas, normal, prorrog] = municipios[0];
  assert.deepEqual([cd, uf, nome, lidasN, semBoletim], ['1', 'PB', 'AAA', 3, 1]);
  assert.deepEqual([aptos, comp, g0, g1, g2, brancos, nulos], [900, 750, 30, 660, 60, 6, 24]);
  assert.deepEqual([semDigital, abriuTarde, fechouTarde, prorrogadas], [0, 0, 1, 1]);
  assert.deepEqual(normal, [2, 500, 260, 220]);
  assert.deepEqual(prorrog, [1, 250, 200, 30]);
});

test('agregar: a lista de atípicas traz só sem digital e abertura com mais de 1 hora de atraso, com os dados para mostrar a seção', () => {
  const lidas = [secao(), secao({ secao: '0002', porIdentificacao: [100, 50, 100] }), secao({ secao: '0003', abertura: '2026-10-25T09:30:00' }), secao({ secao: '0004', encerramento: '2026-10-25T19:00:00' })];
  const { atipicas } = agregarSecoes(lidas, { uf: 'PB', numeros: NUMEROS });
  assert.deepEqual(atipicas.map(a => a[3]), ['0002', '0003']);
  assert.deepEqual(atipicas[0], ['PB', '1', '0001', '0002', 1, 250, 20, '08:00', '17:00', 130, 110]);
  assert.equal(atipicas[1][4], 2, 'marca 2 = abriu muito tarde');
});

test('agregar: município em que nenhuma seção foi lida só conta os erros', () => {
  const { municipios } = agregarSecoes([{ municipio: '2', nome: 'BBB', zona: '0001', secao: '0001', erro: 'sem boletim' }], { uf: 'PB', numeros: NUMEROS });
  assert.deepEqual([municipios[0][3], municipios[0][4], municipios[0][5]], [0, 1, 0]);
});

test('agregar: seção sem o grupo de identificação (urnas do exterior) conta o comparecimento e fica fora da biometria', () => {
  const sem = secao({ secao: '0009', porIdentificacao: undefined, abertura: '2026-10-25T09:30:00' });
  const { municipios, atipicas } = agregarSecoes([sem], { uf: 'ZZ', numeros: NUMEROS });
  assert.deepEqual(municipios[0].slice(5, 12), [300, 250, 0, 0, 0, 2, 8]);
  assert.equal(atipicas[0][6], 0);
  assert.equal(classificar(sem).semDigital, false);
});

test('pleito do turno: pelos pleitos do ano ordenados por data', () => {
  const config = { pl: [{ cd: '3221', c: 'ele2026', dt: '25/10/2026' }, { cd: '3220', c: 'ele2026', dt: '04/10/2026' }, { cd: '3000', c: 'ele2024', dt: '06/10/2024' }] };
  assert.equal(pleitoDoTurno(config, '2026', '1'), '3220');
  assert.equal(pleitoDoTurno(config, '2026', '2'), '3221');
  assert.throws(() => pleitoDoTurno(config, '2026', '3'), /pleito/i);
});

test('juntar: acrescenta as UFs novas, troca as que já existiam, ordena os municípios e soma o resumo por UF', async () => {
  const { juntarUrnas } = await import('../../scripts/urnas/juntar.mjs');
  const parte = (uf, municipios, atipicas = [], lidas = 5, erros = 1) => ({ ano: '2026', turno: '2', pleito: '3221', uf, geradoEm: 'hoje', candidatos: [{ numero: 13, urna: 'LULA' }], secoes: lidas + erros, lidas, erros, municipios, atipicas });
  const m = (cd, uf, nome) => [cd, uf, nome, 1, 0, 10, 8, 0, 8, 0, 0, 0, 0, 0, 0, 0, [1, 8, 4, 4], [0, 0, 0, 0]];
  const antes = juntarUrnas(null, [parte('PE', [m('2', 'PE', 'RECIFE')], [['PE', '2', '0001', '0001', 1, 8, 30, '08:00', '17:00', 1, 1]]), parte('AC', [m('1', 'AC', 'RIO BRANCO')])]);
  assert.deepEqual(antes.ufs.map(u => u.uf), ['AC', 'PE']);
  assert.deepEqual(antes.municipios.map(x => x[2]), ['RIO BRANCO', 'RECIFE']);
  const depois = juntarUrnas(antes, [parte('PE', [m('2', 'PE', 'RECIFE'), m('3', 'PE', 'OLINDA')], [], 9, 0)]);
  assert.deepEqual(depois.municipios.map(x => x[2]), ['RIO BRANCO', 'OLINDA', 'RECIFE']);
  assert.equal(depois.atipicas.length, 0, 'as atípicas de PE foram trocadas junto');
  assert.deepEqual(depois.ufs.find(u => u.uf === 'PE'), { uf: 'PE', secoes: 9, lidas: 9, erros: 0 });
  assert.deepEqual(depois.candidatos, [{ numero: 13, urna: 'LULA' }]);
});
