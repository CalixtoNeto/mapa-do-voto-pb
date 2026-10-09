// Emendas parlamentares estaduais (API do estado, listagem de emendas): quanto cada deputado indicou e para quê.
import { centavos } from '../perfis/somas.mjs';
import { novaArvore, somarNaArvore, arvorePodada } from '../perfis/arvores.mjs';

const valor = v => Number(v) || 0;

export function resumoDasEmendasEstaduais(lista) {
  const porDeputado = {}, raiz = novaArvore();
  for (const e of lista) {
    const d = (porDeputado[e.nomeDeputado || 'Não informado'] ||= { v: 0, n: 0 });
    d.v += valor(e.valor); d.n++;
    somarNaArvore(raiz, [e.nomeDeputado, e.secretaria, e.objeto], valor(e.valor));
  }
  const total = centavos(Object.values(porDeputado).reduce((s, d) => s + d.v, 0));
  return { total, porDeputado: Object.entries(porDeputado).map(([nome, d]) => [nome, centavos(d.v), d.n]).sort((a, b) => b[1] - a[1]),
    arvore: arvorePodada(raiz, Infinity) };
}
