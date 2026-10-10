// SAPL da Assembleia Legislativa da Paraíba (o mesmo sistema da Câmara de Bayeux, bem maior): deputados, mandatos,
// partidos, sessões, presença, votos nominais e matérias. Para não ler o histórico inteiro (são mais de 150 mil
// matérias), mandatos e sessões vêm filtrados pela legislatura atual, as autorias por deputado com mandato nela e
// as matérias pelos anos da legislatura.
import { lerColecao } from './sapl.mjs';
import { tipoDeAutorParlamentar } from '../perfis/autorias.mjs';

export const SAPL_ALPB = 'https://sapl.al.pb.leg.br/api';

const INTEIRAS = {
  parlamentares: 'parlamentares/parlamentar', partidos: 'parlamentares/partido', filiacoes: 'parlamentares/filiacao',
  autores: 'base/autor', tipos: 'materia/tipomaterialegislativa', presencas: 'sessao/sessaoplenariapresenca', votos: 'sessao/votoparlamentar',
};

// O SAPL da Assembleia guarda sessões e matérias de teste do próprio sistema ("Teste Painel", "TESTE REQUIMENTO").
const DE_TESTE = /\bteste\b/i;

const legislaturaDe = (legislaturas, hoje) =>
  legislaturas.find(l => l.data_inicio <= hoje && hoje <= l.data_fim) || [...legislaturas].sort((a, b) => b.numero - a.numero)[0];

// Uma coleção por vez, para não sobrecarregar o servidor da Assembleia.
export async function dadosDaAssembleia(buscarJson, { hoje, anos }) {
  const ler = (caminho, filtros) => lerColecao(buscarJson, caminho, { base: SAPL_ALPB, filtros });
  const legislaturas = await ler('parlamentares/legislatura');
  const leg = legislaturaDe(legislaturas, hoje);
  const d = { legislaturas, mandatos: await ler('parlamentares/mandato', { legislatura: leg.id }), sessoes: await ler('sessao/sessaoplenaria', { legislatura: leg.id }) };
  for (const [nome, caminho] of Object.entries(INTEIRAS)) d[nome] = await ler(caminho);
  d.sessoes = d.sessoes.filter(sessao => !DE_TESTE.test(sessao.__str__ || ''));
  const comMandato = new Set(d.mandatos.map(m => m.parlamentar));
  d.autorias = [];
  // object_id só aponta para o deputado nos autores do tipo "parlamentar" (comissões e órgãos também são autores).
  const tipoParlamentar = tipoDeAutorParlamentar(d.autores, d.parlamentares);
  const deputados = d.autores.filter(a => a.content_type === tipoParlamentar && comMandato.has(a.object_id));
  for (const autor of deputados) d.autorias.push(...await ler('materia/autoria', { autor: autor.id }));
  d.materias = [];
  for (const ano of anos) d.materias.push(...await ler('materia/materialegislativa', { ano }));
  const tiposDeTeste = new Set(d.tipos.filter(t => DE_TESTE.test(t.descricao || '')).map(t => t.id));
  d.materias = d.materias.filter(m => !tiposDeTeste.has(m.tipo));
  return d;
}
