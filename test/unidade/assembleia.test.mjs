import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dadosDaAssembleia, SAPL_ALPB } from '../../scripts/fontes/assembleia.mjs';

// Um SAPL falso: cada coleção devolve os itens que passam nos filtros da URL (uma página só).
function saplFalso(colecoes) {
  const pedidos = [];
  const buscarJson = async url => {
    pedidos.push(url);
    const u = new URL(url), caminho = u.pathname.replace('/api/', '').replace(/\/$/, '');
    const filtros = [...u.searchParams].filter(([k]) => k !== 'page' && k !== 'page_size');
    const itens = (colecoes[caminho] || []).filter(item => filtros.every(([k, v]) => String(item[k]) === v));
    return { pagination: { next_page: null }, results: itens };
  };
  return { buscarJson, pedidos };
}

test('Assembleia: só a legislatura atual (mandatos e sessões), autorias de quem tem mandato e matérias dos anos pedidos', async () => {
  const { buscarJson, pedidos } = saplFalso({
    'parlamentares/legislatura': [{ id: 19, numero: 19, data_inicio: '2019-02-01', data_fim: '2023-02-01' }, { id: 20, numero: 20, data_inicio: '2023-02-01', data_fim: '2027-01-31' }],
    'parlamentares/mandato': [{ id: 1, legislatura: 20, parlamentar: 18 }, { id: 2, legislatura: 19, parlamentar: 7 }],
    'parlamentares/parlamentar': [{ id: 18, nome_parlamentar: 'Ademir Morais' }, { id: 7, nome_parlamentar: 'Antigo' }],
    'sessao/sessaoplenaria': [{ id: 1100, legislatura: 20 }, { id: 300, legislatura: 18 }],
    'base/autor': [{ id: 28, object_id: 18, nome: 'Ademir Morais', content_type: 26 }, { id: 9, object_id: 7, nome: 'Antigo', content_type: 26 }],
    'materia/autoria': [{ id: 1, autor: 28, materia: 500 }, { id: 2, autor: 9, materia: 501 }],
    'materia/materialegislativa': [{ id: 500, ano: 2025 }, { id: 499, ano: 2022 }],
  });
  const d = await dadosDaAssembleia(buscarJson, { hoje: '2026-10-09', anos: [2025] });
  assert.deepEqual(d.mandatos.map(m => m.id), [1]);
  assert.deepEqual(d.sessoes.map(s => s.id), [1100]);
  assert.deepEqual(d.autorias.map(a => a.id), [1], 'só os autores com mandato na legislatura atual');
  assert.deepEqual(d.materias.map(m => m.id), [500]);
  assert.ok(pedidos.every(p => p.startsWith(SAPL_ALPB)));
  assert.ok(pedidos.some(p => p.includes('materia/autoria/?autor=28')));
  assert.ok(!pedidos.some(p => p.includes('autor=9')));
});

test('sessões e matérias de teste do próprio SAPL ("Teste Painel", "TESTE REQUIMENTO") ficam de fora', async () => {
  const { buscarJson } = saplFalso({
    'parlamentares/legislatura': [{ id: 20, numero: 20, data_inicio: '2023-02-01', data_fim: '2027-01-31' }],
    'sessao/sessaoplenaria': [{ id: 1, legislatura: 20, __str__: '1ª Teste Painel da 3ª Sessão Legislativa' }, { id: 2, legislatura: 20, __str__: '25ª Sessão Ordinária' }],
    'materia/tipomaterialegislativa': [{ id: 1, descricao: 'TESTE REQUIMENTO' }, { id: 2, descricao: 'REQUERIMENTO' }],
    'materia/materialegislativa': [{ id: 10, ano: 2025, tipo: 1 }, { id: 11, ano: 2025, tipo: 2 }],
  });
  const d = await dadosDaAssembleia(buscarJson, { hoje: '2026-10-09', anos: [2025] });
  assert.deepEqual(d.sessoes.map(s => s.id), [2]);
  assert.deepEqual(d.materias.map(m => m.id), [11]);
});
