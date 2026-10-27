// Arquivos de urna do TSE (scripts/urnas/): leitor BER, boletim de urna e coletor por seção. O boletim de teste é montado em DER
// com as mesmas tags do arquivo real (conferido em João Pessoa, 2º turno de 2026).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lerBer, inteiro, texto, procurar } from '../../scripts/urnas/ber.mjs';
import { lerBoletim } from '../../scripts/urnas/boletim.mjs';
import { secoesDaUf, coletarSecao } from '../../scripts/urnas/coletar.mjs';

const tamanho = n => n < 128 ? [n] : n < 256 ? [0x81, n] : [0x82, n >> 8, n & 255];
const tlv = (tag, ...partes) => { const c = Buffer.concat(partes.map(p => Buffer.isBuffer(p) ? p : Buffer.from(p))); return Buffer.concat([Buffer.from([tag, ...tamanho(c.length)]), c]); };
const bytesDe = n => { const b = []; do { b.unshift(n & 255); n = Math.floor(n / 256); } while (n); return b; };
const seq = (...c) => tlv(0x30, ...c), int = n => tlv(0x02, bytesDe(n)), texto27 = s => tlv(0x1b, Buffer.from(s, 'latin1')), enumerado = n => tlv(0x0a, [n]);
const contextoC = (n, ...c) => tlv(0xa0 + n, ...c), contextoP = (n, bytes) => tlv(0x80 + n, bytes), octetos = (...c) => tlv(0x04, ...c);

const votavel = (tipo, qtd, partido, posicao) => seq(contextoP(1, [tipo]), contextoP(2, bytesDe(qtd)), ...(partido ? [contextoC(3, int(partido), int(partido))] : []), int(posicao), octetos(Buffer.alloc(8)));

function boletim() {
  const resultado = seq(seq(int(6258), int(270), int(269), int(1), seq(seq(enumerado(1), int(237), seq(seq(contextoP(1, [1]), int(1),
    seq(votavel(1, 132, 13, 1), votavel(1, 101, 22, 2), votavel(2, 1, 0, 3), votavel(3, 3, 0, 4))))))));
  const bu = seq(seq(texto27('20261025T171406'), contextoP(2, [0x0c, 0x95])), enumerado(2), seq(enumerado(1), texto27('10.23.0.0 - Praia')),
    seq(seq(int(1)), int(1767), int(1)), texto27('20261025T171243'), contextoC(0, texto27('20261025T080001'), texto27('20261025T170621')),
    int(237), contextoC(1, int(5), int(205), int(27)), resultado);
  return seq(seq(texto27('20261025T171406'), contextoP(2, [0x0c, 0x95])), enumerado(2), contextoC(0, seq(int(1))), enumerado(1), octetos(bu));
}

test('BER: lê tamanhos curtos e longos, abre os filhos e entrega inteiros e textos', () => {
  const grande = seq(int(70000), texto27('abc'), octetos(Buffer.alloc(300, 7)));
  const [raiz] = lerBer(grande);
  assert.equal(raiz.tag, 16); assert.equal(raiz.filhos.length, 3);
  assert.equal(inteiro(raiz.filhos[0]), 70000); assert.equal(texto(raiz.filhos[1]), 'abc'); assert.equal(raiz.filhos[2].bytes.length, 300);
  assert.equal(procurar(raiz, n => n.tag === 2).length, 1);
});

test('BER: bytes que não são BER bem formado devolvem null em vez de lixo', () => {
  assert.equal(lerBer(Buffer.from([0x30, 0x05, 0x02])), null, 'tamanho maior que o conteúdo');
  assert.equal(lerBer(Buffer.from([0x30, 0x03, 0x02, 0x05, 0x01])), null, 'filho estoura o pai');
});

test('boletim: abertura, encerramento, aptos, comparecimento, grupos de identificação, votos, brancos e nulos', () => {
  const b = lerBoletim(boletim());
  assert.equal(b.abertura, '2026-10-25T08:00:01'); assert.equal(b.encerramento, '2026-10-25T17:06:21'); assert.equal(b.emissao, '2026-10-25T17:12:43');
  assert.equal(b.eleicao, 6258); assert.equal(b.aptos, 270); assert.deepEqual(b.aptosPorCadastro, [269, 1]);
  assert.equal(b.comparecimento, 237); assert.deepEqual(b.porIdentificacao, [5, 205, 27]);
  assert.deepEqual(b.candidatos, [{ numero: 13, qtd: 132 }, { numero: 22, qtd: 101 }]);
  assert.equal(b.brancos, 1); assert.equal(b.nulos, 3);
  assert.equal(b.candidatos.reduce((s, c) => s + c.qtd, 0) + b.brancos + b.nulos, b.comparecimento, 'votos fecham com o comparecimento');
});

test('boletim: arquivo que não é um boletim dá erro claro', () => {
  assert.throws(() => lerBoletim(Buffer.from('não é BER')), /ilegível/);
  assert.throws(() => lerBoletim(seq(int(1))), /ilegível/);
});

const cs = { abr: [{ cd: 'pb', mu: [{ cd: '20516', nm: 'JOÃO PESSOA', zon: [{ cd: '0001', sec: [{ ns: '0001', da: '25/10/2026', ha: '20:04:00' }, { ns: '0002' }] }] }] }] };

test('lista de seções: município, zona, seção e quando o boletim foi recebido (nulo se o config não diz)', async () => {
  const r = await secoesDaUf({ ano: '2026', pleito: '3221', uf: 'pb' }, async url => { assert.match(url, /arquivo-urna\/3221\/config\/pb\/pb-p003221-cs\.json$/); return cs; });
  assert.deepEqual(r, [{ municipio: '20516', nome: 'JOÃO PESSOA', zona: '0001', secao: '0001', recebidoEm: '25/10/2026 20:04:00' },
    { municipio: '20516', nome: 'JOÃO PESSOA', zona: '0001', secao: '0002', recebidoEm: null }]);
});

test('coleta de uma seção: acha o hash no aux.json, baixa o -bu.dat e junta com os dados da seção', async () => {
  const pedidos = [], secao = { municipio: '20516', zona: '0001', secao: '0001' };
  const aux = { hashes: [{ hash: 'abc', arq: [{ nm: 'o03221pb2051600010001-log.jez', tp: 'log' }, { nm: 'o03221pb2051600010001-bu.dat', tp: 'bu' }] }] };
  const r = await coletarSecao({ ano: '2026', pleito: '3221', uf: 'pb' }, secao, { buscarJson: async url => { pedidos.push(url); return aux; }, baixar: async url => { pedidos.push(url); return boletim(); } });
  assert.match(pedidos[0], /dados\/pb\/20516\/0001\/0001\/p003221-pb-m20516-z0001-s0001-aux\.json$/);
  assert.match(pedidos[1], /dados\/pb\/20516\/0001\/0001\/abc\/o03221pb2051600010001-bu\.dat$/);
  assert.equal(r.zona, '0001'); assert.equal(r.comparecimento, 237); assert.equal(r.abertura, '2026-10-25T08:00:01');
});

test('coleta de uma seção: sem boletim no aux.json ou arquivo ausente vira erro na própria seção, sem derrubar a coleta', async () => {
  const contexto = { ano: '2026', pleito: '3221', uf: 'pb' }, secao = { municipio: '1', zona: '0001', secao: '0001' };
  assert.equal((await coletarSecao(contexto, secao, { buscarJson: async () => ({ hashes: [{ hash: 'x', arq: [] }] }), baixar: async () => null })).erro, 'sem boletim');
  assert.equal((await coletarSecao(contexto, secao, { buscarJson: async () => null, baixar: async () => null })).erro, 'sem boletim');
  assert.equal((await coletarSecao(contexto, secao, { buscarJson: async () => ({ hashes: [{ hash: 'x', arq: [{ nm: 'a-bu.dat', tp: 'bu' }] }] }), baixar: async () => null })).erro, 'boletim não encontrado');
});
