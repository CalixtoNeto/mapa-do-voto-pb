// Presidente por município em todo o país pela API de resultados do TSE, para o que o CSV ainda não publicou
// (por exemplo, um 2º turno recém-apurado). São milhares de arquivos pequenos: um por município.
import { API, getJson, pad } from '../lib/tse.mjs';
import { paralelo } from '../lib/paralelo.mjs';
import { inteiro } from '../lib/csv.mjs';
import { eleicoesDoAno } from './api-resultados.mjs';
import { somarVotoNacional, somarComparecimentoNacional } from '../nacional/acumulador.mjs';
import { CARGOS } from '../eleicao/config.mjs';

const PEDIDOS_SIMULTANEOS = 8;

const primeiro = (objetos, chaves) => objetos.flatMap(o => chaves.map(chave => o?.[chave])).find(v => v != null);

// Os totais de comparecimento (aptos, comparecimento, brancos, nulos) podem vir em carg[0] ou nos blocos e (eleitorado) e v (votos) da raiz.
export function lerResultadoDoMunicipio(arquivo) {
  const cargo = arquivo?.carg?.[0];
  if (!cargo) return null;
  const candidatos = (cargo.agr || []).flatMap(a => (a.par || []).flatMap(p => (p.cand || []).map(c =>
    ({ nr: c.n, urna: c.nmu, partido: p.sg || '', sit: c.st || '', votos: inteiro(c.vap) }))));
  const lugares = [cargo, arquivo.e, arquivo.v, arquivo];
  const totais = [['te', 'ea'], ['c'], ['vb'], ['vn']].map(chaves => primeiro(lugares, chaves));
  return { candidatos, comparecimento: totais.every(v => v != null) ? totais.map(inteiro) : null };
}

// Em 2022 e 2026 o presidente está numa eleição à parte da estadual: é a que lista o cargo 1.
export const eleicaoDoPresidente = eleicoes => eleicoes.find(e => e.abr?.some(a => a.cp?.some(c => c.cd === CARGOS.PRESIDENTE)));

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
  const primeiro = urlDoMunicipio(ano, codigo, municipios[0].uf, municipios[0].cd), existe = await buscarJson(primeiro);
  if (!existe) { console.log(`  API nacional ${ano} t${turno}: ainda sem resultado em ${primeiro}`); return false; }
  if (!lerResultadoDoMunicipio(existe)?.comparecimento) console.log(`  API nacional ${ano} t${turno}: sem totais de comparecimento; raiz: ${Object.keys(existe).join(',')} | e: ${Object.keys(existe.e || {}).join(',')} | v: ${Object.keys(existe.v || {}).join(',')} | carg[0]: ${Object.keys(existe.carg?.[0] || {}).join(',')}`);
  await paralelo(municipios, PEDIDOS_SIMULTANEOS, async m => {
    const lido = lerResultadoDoMunicipio(await buscarJson(urlDoMunicipio(ano, codigo, m.uf, m.cd)));
    if (lido) somarMunicipio(acc, { turno, uf: m.uf.toUpperCase(), cd: m.cd, nome: m.nome }, lido);
  });
  console.log(`  API nacional ${ano} t${turno}: ${municipios.length} municípios`);
  return true;
}

// Soma em `acc` os turnos que `faltando(turno)` pedir. Devolve quantos turnos foram adicionados.
export async function completarNacionalViaApi(ano, acc, faltando, buscarJson = getJson) {
  const eleicao = eleicaoDoPresidente(await eleicoesDoAno(ano, buscarJson));
  if (!eleicao) { console.log(`  API nacional ${ano}: eleição não encontrada na configuração`); return 0; }
  const municipios = await municipiosDoPais(ano, eleicao, buscarJson);
  console.log(`  API nacional ${ano}: eleição ${eleicao.cd} (2º turno ${eleicao.cdt2 || 'sem código'}), ${municipios.length} municípios na configuração`);
  if (!municipios.length) return 0;
  let adicionados = 0;
  for (const [turno, codigo] of [['1', eleicao.cd], ['2', eleicao.cdt2]]) {
    if (codigo && faltando(turno) && await somarTurno(acc, { ano, turno, codigo, municipios, buscarJson })) adicionados++;
  }
  return adicionados;
}
