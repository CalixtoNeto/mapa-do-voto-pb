// Gera o cenário nacional do presidente (public/data/nacional/ANO.json): votos e comparecimento de cada município do país.
//   node scripts/gerar-nacional.mjs [ano ...] [--forcar]
// Sem anos, gera os de eleição geral que ainda não existem. O CSV dos Dados Abertos vem primeiro; a API de resultados
// só entra para o turno que o CSV ainda não tem (por exemplo, um 2º turno recém-apurado).
import { existsSync } from 'node:fs';
import { ANOS_PADRAO } from './eleicao/config.mjs';
import { nacionalViaCsv } from './fontes/nacional-csv.mjs';
import { completarNacionalViaApi } from './fontes/nacional-api.mjs';
import { totaisNacionaisDoTse } from './fontes/nacional-totais.mjs';
import { turnoCompleto, descartarTurno } from './nacional/acumulador.mjs';
import { montarNacional } from './nacional/montar.mjs';
import { escreverNacional } from './saida/nacional.mjs';

const PASTA = 'public/data/nacional';
const TURNOS = ['1', '2'];

async function apurar(ano) {
  let acc = null, fonte = 'csv';
  try { ({ acc } = await nacionalViaCsv(ano)); } catch (e) { console.warn(`  CSV falhou (${e.message})`); }
  const faltando = turno => !turnoCompleto(acc, turno);
  const pendentes = TURNOS.filter(faltando);
  if (acc && pendentes.length) {
    pendentes.forEach(turno => descartarTurno(acc, turno));
    try {
      const adicionados = await completarNacionalViaApi(ano, acc, turno => pendentes.includes(turno));
      if (adicionados) fonte = pendentes.length === TURNOS.length ? 'api' : 'csv+api';
    } catch (e) { console.warn(`  API falhou (${e.message})`); }
  }
  return { acc, fonte };
}

async function gerarAno(ano) {
  console.log(`Cenário nacional ${ano}:`);
  const { acc, fonte } = await apurar(ano);
  if (!acc?.municipios.size) { console.warn(`  sem dados para ${ano}`); process.exitCode = 1; return; }
  const tse = await totaisNacionaisDoTse(ano).catch(() => ({}));
  await escreverNacional(PASTA, montarNacional(acc, { ano, fonte, atualizadoEm: new Date().toISOString(), tse: Object.keys(tse).length ? tse : undefined }));
}

const args = process.argv.slice(2), forcar = args.includes('--forcar');
if (args.includes('sondar')) { await (await import('./nacional/sondar.mjs')).sondar(args.find(a => /^\d{4}$/.test(a))); process.exit(0); }
const anos = args.filter(a => /^\d{4}$/.test(a));
for (const ano of anos.length ? anos : ANOS_PADRAO) {
  if (forcar || !existsSync(`${PASTA}/${ano}.json`)) await gerarAno(ano);
  else console.log(`Cenário nacional ${ano}: já existe (use --forcar para refazer)`);
}
