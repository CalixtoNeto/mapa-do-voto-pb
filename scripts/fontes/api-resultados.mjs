// API de resultados do TSE: guarda só o ciclo atual e o anterior, com um arquivo por município e cargo.
// Serve para completar o que o CSV ainda não tem, como um 2º turno recém-apurado.
import { API, getJson, paralelo, pad } from '../lib/tse.mjs';
import { inteiro } from '../lib/csv.mjs';
import { apuracaoDoTurno, somarVoto, chaveDoCargo } from '../eleicao/apuracao.mjs';
import { UF, CARGOS_DO_SITE, CARGOS_COM_2_TURNO } from '../eleicao/config.mjs';

const TIPOS_DE_ELEICAO_DO_SITE = ['1', '8'];
const PEDIDOS_SIMULTANEOS = 6;
const uf = UF.toLowerCase();

// Soma em `porTurno` só o que `faltando(turno, cargo)` pedir. Devolve quantos cargos foram adicionados.
export async function completarViaApi(ano, porTurno, faltando, buscarJson = getJson) {
  const eleicoes = await eleicoesDoAno(ano, buscarJson);
  if (!eleicoes.length) return 0;
  const municipios = await municipiosDaUf(ano, eleicoes, buscarJson);
  if (!municipios.length) return 0;
  let adicionados = 0;
  for (const pedido of pedidosPendentes(eleicoes, faltando)) {
    if (await somarCargo({ ano, ...pedido, porTurno, municipios, buscarJson })) adicionados++;
  }
  return adicionados;
}

async function eleicoesDoAno(ano, buscarJson) {
  const config = await buscarJson(`${API}/comum/config/ele-c.json`);
  return (config?.pl || []).filter(p => p.c === `ele${ano}`).flatMap(p => p.e)
    .filter(e => TIPOS_DE_ELEICAO_DO_SITE.includes(e.tp));
}

async function municipiosDaUf(ano, eleicoes, buscarJson) {
  const referencia = eleicoes.find(e => e.tp === '1') || eleicoes[0];
  const config = await buscarJson(`${API}/ele${ano}/${referencia.cd}/config/mun-e${pad(referencia.cd, 6)}-cm.json`);
  return config?.abr?.find(a => a.cd === uf)?.mu || [];
}

function* pedidosPendentes(eleicoes, faltando) {
  for (const eleicao of eleicoes) {
    const cargos = (eleicao.abr?.[0]?.cp || []).map(c => c.cd).filter(c => CARGOS_DO_SITE.includes(c));
    for (const [turno, codigoEleicao] of [['1', eleicao.cd], ['2', eleicao.cdt2]]) {
      if (!codigoEleicao) continue;
      const temTurno = cargo => turno === '1' || CARGOS_COM_2_TURNO.includes(cargo);
      for (const cargo of cargos.filter(c => temTurno(c) && faltando(turno, c))) yield { turno, cargo, codigoEleicao };
    }
  }
}

const urlDoResultado = (ano, codigoEleicao, cargo, municipio = '') =>
  `${API}/ele${ano}/${codigoEleicao}/dados/${uf}/${uf}${municipio}-c${pad(cargo, 4)}-e${pad(codigoEleicao, 6)}-u.json`;

async function somarCargo({ ano, turno, cargo, codigoEleicao, porTurno, municipios, buscarJson }) {
  const resumoDaUf = await buscarJson(urlDoResultado(ano, codigoEleicao, cargo));
  if (!resumoDaUf) return false;                   // ainda não existe (por exemplo, 2º turno que não aconteceu)
  const apuracao = apuracaoDoTurno(porTurno, turno, 'api');
  if (apuracao.fonte === 'csv') apuracao.fonte = 'csv+api';
  apuracao.final &&= resumoDaUf.and === 'f';
  apuracao.atualizadoEm = `${resumoDaUf.dg?.split('/').reverse().join('-')}T${resumoDaUf.hg}`;
  await paralelo(municipios, PEDIDOS_SIMULTANEOS, async municipio => {
    const resultado = (await buscarJson(urlDoResultado(ano, codigoEleicao, cargo, municipio.cd)))?.carg?.[0];
    if (resultado) somarResultadoDoMunicipio(apuracao, { ano, turno, cargo }, resultado, municipio.cdi);
  });
  console.log(`  API ${ano} t${turno} cargo ${cargo}: ok`);
  return true;
}

function somarResultadoDoMunicipio(apuracao, { ano, turno, cargo }, resultado, ibge) {
  for (const agremiacao of resultado.agr || []) for (const partido of agremiacao.par || []) {
    for (const c of partido.cand || []) {
      const votos = inteiro(c.vap);
      if (!votos) continue;
      const candidato = {
        key: `${chaveDoCargo(ano, turno, cargo)}|${c.sqcand}`, ano, turno, cargo, cargoNome: resultado.nmn,
        nr: c.n, urna: c.nmu, nome: c.nm, partido: partido.sg || '', sit: c.st || '',
      };
      somarVoto(apuracao, candidato, ibge, votos);
    }
  }
}
