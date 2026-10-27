// Contas do cenário nacional (public/js/nacional/calculos-*.mjs): totais, conferências e municípios distantes do estado.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { linhasDoTurno, totaisDasLinhas, totaisPorUf } from '../../public/js/nacional/calculos-nacional.mjs';
import { conferirSomas, conferirComTse } from '../../public/js/nacional/calculos-conferencias.mjs';
import { municipiosDistantes, semOsDestacados } from '../../public/js/nacional/calculos-distantes.mjs';

// [cd, uf, nome, { turno: [aptos, comparecimento, brancos, nulos, ...votos na ordem de cands] }]
const nac = {
  turnos: { 1: { cands: [{ nr: '13', urna: 'A' }, { nr: '22', urna: 'B' }, { nr: '12', urna: 'C' }] }, 2: { cands: [{ nr: '13', urna: 'A' }, { nr: '22', urna: 'B' }] } },
  municipios: [
    ['1', 'AA', 'M1', { 1: [1000, 800, 20, 30, 400, 300, 50], 2: [1000, 850, 10, 20, 500, 320] }],
    ['2', 'AA', 'M2', { 1: [2000, 1600, 40, 60, 800, 600, 100], 2: [2000, 1700, 20, 30, 950, 700] }],
    ['3', 'BB', 'M3', { 1: [500, 400, 10, 10, 200, 150, 30], 2: [500, 310, 5, 5, 100, 190] }],
    ['4', 'BB', 'M4', { 1: [500, 400, 10, 10] }],
  ],
};

test('linhas do turno: só os municípios que têm o turno, com os campos nomeados', () => {
  const l = linhasDoTurno(nac, '2');
  assert.equal(l.length, 3);
  assert.deepEqual(l[0], { cd: '1', uf: 'AA', nome: 'M1', aptos: 1000, comp: 850, brancos: 10, nulos: 20, votos: [500, 320], anulados: 0 });
});

test('totais: soma, abstenção, válidos e a margem entre o primeiro e o segundo', () => {
  const t = totaisDasLinhas(linhasDoTurno(nac, '2'));
  assert.deepEqual([t.aptos, t.comp, t.abstencao, t.brancos, t.nulos, t.validos], [3500, 2860, 640, 35, 55, 2760]);
  assert.deepEqual(t.votos, [1550, 1210]);
  assert.equal(t.margem, 340);
});

test('totais por UF: um bloco por UF, do que tem mais eleitores ao que tem menos', () => {
  const ufs = totaisPorUf(linhasDoTurno(nac, '2'));
  assert.deepEqual(ufs.map(u => u.uf), ['AA', 'BB']);
  assert.equal(ufs[1].votos[1], 190);
});

test('conferir somas: aponta o município em que válidos + brancos + nulos não fecham o comparecimento e o que tem mais comparecimento que aptos', () => {
  const ok = conferirSomas(linhasDoTurno(nac, '2'));
  assert.deepEqual(ok.naoFecham.map(m => m.cd), ['3']);
  assert.equal(ok.diferenca, 10);
  assert.deepEqual(ok.maisQueAptos, []);
  const l = linhasDoTurno(nac, '2'); l[0].comp = 1100;
  assert.deepEqual(conferirSomas(l).maisQueAptos.map(m => m.cd), ['1']);
});

test('conferir somas: os anulados entram na conta e a linha traz o campo', () => {
  const comAnulados = { ...nac, municipios: nac.municipios.map(m => m[0] === '3' ? [...m.slice(0, 4), { 2: 10 }] : m) };
  const l = linhasDoTurno(comAnulados, '2');
  assert.equal(l.find(x => x.cd === '3').anulados, 10);
  assert.equal(l.find(x => x.cd === '1').anulados, 0);
  assert.deepEqual(conferirSomas(l).naoFecham, []);
  assert.equal(conferirSomas(l).anulados, 10);
});

test('conferir com o TSE: diferença de cada total; sem total do TSE devolve null', () => {
  const t = totaisDasLinhas(linhasDoTurno(nac, '2'));
  const tse = { aptos: 3500, comparecimento: 2860, brancos: 35, nulos: 55, validos: t.validos };
  const c = conferirComTse(t, tse);
  assert.equal(c.every(x => x.diferenca === 0), true);
  assert.deepEqual(c.map(x => x.nome), ['Aptos', 'Comparecimento', 'Brancos', 'Nulos', 'Votos válidos']);
  assert.equal(conferirComTse(t, { ...tse, nulos: 50 }).find(x => x.nome === 'Nulos').diferenca, 5);
  assert.equal(conferirComTse(t, undefined), null);
});

// Um estado com 9 municípios parecidos e um que muda muito mais que os outros entre o 1º e o 2º turno.
function nacionalComDestaque() {
  const cd = i => String(100 + i), municipios = [];
  for (let i = 0; i < 9; i++) municipios.push([cd(i), 'CC', 'P' + i, { 1: [2000, 1600, 20, 30, 700 + i * 5, 600, 250], 2: [2000, 1650, 20, 30, 800 + i * 5, 800 - i * 5] }]);
  municipios.push([cd(9), 'CC', 'Destaque', { 1: [2000, 1600, 20, 30, 700, 600, 250], 2: [2000, 1650, 20, 30, 1400, 180] }]);
  return { turnos: { 1: { cands: [{ nr: '13' }, { nr: '22' }, { nr: '12' }] }, 2: { cands: [{ nr: '13' }, { nr: '22' }] } }, municipios };
}

test('distantes: destaca o município cuja mudança de parcela foge do conjunto do estado, com o valor esperado', () => {
  const r = municipiosDistantes(nacionalComDestaque(), { primeiro: '2', anterior: '1' }).parcela;
  assert.equal(r[0].nome, 'Destaque');
  assert.ok(r[0].z > 4);
  assert.ok(r[0].valor > r[0].esperado);
  assert.equal(r.filter(x => x.nome !== 'Destaque').length, 0);
});

test('distantes: além de 4 desvios, a diferença para o típico precisa ser grande o bastante para importar (5 p.p. na parcela)', () => {
  const n = nacionalComDestaque();
  n.municipios[8][3][2] = [2000, 1650, 20, 30, 880, 720];
  const r = municipiosDistantes(n, { primeiro: '2', anterior: '1' }).parcela;
  assert.deepEqual(r.map(x => x.nome), ['Destaque'], 'P8 tem z alto mas só ~3 p.p. de diferença');
  assert.ok(Math.abs(r[0].valor - r[0].esperado) >= 0.05);
});

test('distantes: estado com poucos municípios ou município pequeno não entra na conta', () => {
  assert.deepEqual(municipiosDistantes(nac, { primeiro: '2', anterior: '1' }), { parcela: [], abstencao: [], brancoNulo: [], testados: 0 });
  const pequeno = nacionalComDestaque(); pequeno.municipios[9][3][2] = [100, 90, 1, 1, 80, 8];
  assert.equal(municipiosDistantes(pequeno, { primeiro: '2', anterior: '1', minimoDeVotos: 500 }).parcela.length, 0);
});

test('sem os destacados: a vantagem nacional sem o saldo deles', () => {
  const n = nacionalComDestaque(), d = municipiosDistantes(n, { primeiro: '2', anterior: '1' });
  const r = semOsDestacados(n, d.parcela, '2');
  assert.equal(r.destacados, 1);
  assert.equal(r.saldoDeles, 1400 - 180);
  assert.equal(r.margemSemEles, r.margemTotal - r.saldoDeles);
});
