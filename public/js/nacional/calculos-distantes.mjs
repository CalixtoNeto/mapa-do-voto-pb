// Municípios distantes do conjunto do estado (sem DOM): compara, em cada UF, quanto cada município mudou entre os dois turnos
// e destaca quem mudou muito mais (ou menos) que o município típico. É uma conta estatística, não uma acusação:
// município pequeno varia mais e uma mudança grande pode ter explicação local.
import { linhasDoTurno } from './calculos-nacional.mjs';

const mediana = valores => { const o = [...valores].sort((a, b) => a - b), m = o.length >> 1; return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2; };
const MINIMO_POR_UF = 5, CORTE_DE_Z = 4;

// z robusto: distância à mediana em desvios absolutos medianos (1,4826 faz o MAD valer como desvio padrão numa curva normal).
function destacarNoGrupo(grupo) {
  if (grupo.length < MINIMO_POR_UF) return [];
  const centro = mediana(grupo.map(g => g.valor)), mad = mediana(grupo.map(g => Math.abs(g.valor - centro))) * 1.4826;
  if (!mad) return [];
  return grupo.map(g => ({ ...g, esperado: centro, z: (g.valor - centro) / mad })).filter(g => Math.abs(g.z) >= CORTE_DE_Z);
}

const validos = l => l.votos.reduce((s, v) => s + v, 0);
const SINAIS = {
  parcela: (l1, l2, i1) => l2.votos[0] / validos(l2) - l1.votos[i1] / validos(l1),
  abstencao: (l1, l2) => (l2.aptos - l2.comp) / l2.aptos - (l1.aptos - l1.comp) / l1.aptos,
  brancoNulo: (l1, l2) => (l2.brancos + l2.nulos) / l2.comp - (l1.brancos + l1.nulos) / l1.comp,
};

// Mudança do 1º para o 2º turno em pontos percentuais; "parcela" é a do candidato que lidera o 2º turno entre os votos válidos.
function mudancas(nac, { primeiro, anterior, minimoDeVotos }) {
  const antes = new Map(linhasDoTurno(nac, anterior).map(l => [l.cd, l]));
  const nr = nac.turnos[primeiro].cands[0].nr, i1 = nac.turnos[anterior].cands.findIndex(c => c.nr === nr);
  return linhasDoTurno(nac, primeiro).filter(l2 => antes.has(l2.cd) && validos(l2) >= minimoDeVotos && validos(antes.get(l2.cd)) >= minimoDeVotos && l2.comp > 0 && l2.aptos > 0 && i1 >= 0)
    .map(l2 => ({ l2, l1: antes.get(l2.cd), i1 }));
}

export function municipiosDistantes(nac, { primeiro = '2', anterior = '1', minimoDeVotos = 500 } = {}) {
  const pares = mudancas(nac, { primeiro, anterior, minimoDeVotos });
  const saida = { parcela: [], abstencao: [], brancoNulo: [], testados: 0 };
  const ufs = [...new Set(pares.map(p => p.l2.uf))];
  for (const uf of ufs) {
    const doUf = pares.filter(p => p.l2.uf === uf);
    if (doUf.length >= MINIMO_POR_UF) saida.testados += doUf.length;
    for (const [sinal, conta] of Object.entries(SINAIS)) {
      const grupo = doUf.map(({ l1, l2, i1 }) => ({ cd: l2.cd, uf, nome: l2.nome, valor: conta(l1, l2, i1), saldo: l2.votos[0] - l2.votos[1] }));
      saida[sinal].push(...destacarNoGrupo(grupo));
    }
  }
  for (const sinal of Object.keys(SINAIS)) saida[sinal].sort((a, b) => Math.abs(b.z) - Math.abs(a.z));
  return saida;
}

// Quanto os destacados somam de saldo (1º − 2º do turno) e como ficaria a vantagem nacional sem eles.
export function semOsDestacados(nac, destacados, turno = '2') {
  const marcados = new Set(destacados.map(d => d.cd)), linhas = linhasDoTurno(nac, turno);
  const saldo = l => l.votos[0] - l.votos[1], margemTotal = linhas.reduce((s, l) => s + saldo(l), 0);
  const saldoDeles = linhas.filter(l => marcados.has(l.cd)).reduce((s, l) => s + saldo(l), 0);
  return { destacados: marcados.size, saldoDeles, margemTotal, margemSemEles: margemTotal - saldoDeles };
}
