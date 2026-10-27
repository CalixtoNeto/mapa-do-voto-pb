// Presidente por município em todo o país pela API de resultados do TSE, para o que o CSV ainda não publicou
// (por exemplo, um 2º turno recém-apurado). São milhares de arquivos pequenos: um por município.
import { API, getJson, pad } from '../lib/tse.mjs';
import { paralelo } from '../lib/paralelo.mjs';
import { inteiro } from '../lib/csv.mjs';
import { eleicoesDoAno } from './api-resultados.mjs';
import { somarVotoNacional, somarComparecimentoNacional } from '../nacional/acumulador.mjs';
import { CARGOS } from '../eleicao/config.mjs';

const PEDIDOS_SIMULTANEOS = 8;

// Os totais de comparecimento (aptos, comparecimento, brancos, nulos) ficam ao lado dos candidatos; sem eles, só os votos.
export function lerResultadoDoMunicipio(arquivo) {
  const cargo = arquivo?.carg?.[0];
  if (!cargo) return null;
  const candidatos = (cargo.agr || []).flatMap(a => (a.par || []).flatMap(p => (p.cand || []).map(c =>
    ({ nr: c.n, urna: c.nmu, partido: p.sg || '', sit: c.st || '', votos: inteiro(c.vap) }))));
  const temTotais = ['ea', 'c', 'vb', 'vn'].every(chave => cargo[chave] != null);
  return { candidatos, comparecimento: temTotais ? [cargo.ea, cargo.c, cargo.vb, cargo.vn].map(inteiro) : null };
}

const urlDoMunicipio = (ano, codigo, uf, municipio) =>
  `${API}/ele${ano}/${codigo}/dados/${uf}/${uf}${pad(municipio, 5)}-c${pad(CARGOS.PRESIDENTE, 4)}-e${pad(codigo, 6)}-u.json`;

async function municipiosDoPais(ano, eleicao, buscarJson) {
  const config = await buscarJson(`${API}/ele${ano}/${eleicao.cd}/config/mun-e${pad(eleicao.cd, 6)}-cm.json`);
  return (config?.abr || []).flatMap(uf => (uf.mu || []).map(m => ({ uf: uf.cd, cd: m.cd, nome: m.nm })));
}

function somarMunicipio(acc, lugar, lido) {
  for (const { votos, ...candidato } of lido.candidatos) if (votos) somarVotoNacional(acc, lugar, candidato, votos);
  if (lido.comparecimento) somarComparecimentoNacional(acc, lugar, lido.comparecimento);
}

async function somarTurno(acc, { ano, turno, codigo, municipios, buscarJson }) {
  const existe = await buscarJson(urlDoMunicipio(ano, codigo, municipios[0].uf, municipios[0].cd));
  if (!existe) return false;
  await paralelo(municipios, PEDIDOS_SIMULTANEOS, async m => {
    const lido = lerResultadoDoMunicipio(await buscarJson(urlDoMunicipio(ano, codigo, m.uf, m.cd)));
    if (lido) somarMunicipio(acc, { turno, uf: m.uf.toUpperCase(), cd: m.cd, nome: m.nome }, lido);
  });
  console.log(`  API nacional ${ano} t${turno}: ${municipios.length} municípios`);
  return true;
}

// Soma em `acc` os turnos que `faltando(turno)` pedir. Devolve quantos turnos foram adicionados.
export async function completarNacionalViaApi(ano, acc, faltando, buscarJson = getJson) {
  const eleicao = (await eleicoesDoAno(ano, buscarJson)).find(e => e.tp === '1');
  if (!eleicao) return 0;
  const municipios = await municipiosDoPais(ano, eleicao, buscarJson);
  if (!municipios.length) return 0;
  let adicionados = 0;
  for (const [turno, codigo] of [['1', eleicao.cd], ['2', eleicao.cdt2]]) {
    if (codigo && faltando(turno) && await somarTurno(acc, { ano, turno, codigo, municipios, buscarJson })) adicionados++;
  }
  return adicionados;
}
