// Compras do Governo da Paraíba (API do estado): contratações (licitações e procedimentos) por modalidade, com o
// valor adjudicado, e contratos por contratado.
import { centavos, somarRecebedor, recebedoresOrdenados } from '../perfis/somas.mjs';
import { novaArvore, somarNaArvore, arvorePodada } from '../perfis/arvores.mjs';
import { documentoPublico } from '../lib/documento.mjs';

const valor = v => Number(v) || 0;

// [modalidade, quantas, valor adjudicado], do maior valor para o menor.
export function resumoDasContratacoes(contratacoes) {
  const porModalidade = {};
  for (const c of contratacoes) {
    const m = (porModalidade[c.modalidade || 'Não informada'] ||= { n: 0, v: 0 });
    m.n++; m.v += valor(c.valorAdjudicado);
  }
  return Object.entries(porModalidade).map(([nome, m]) => [nome, m.n, centavos(m.v)]).sort((a, b) => b[2] - a[2] || b[1] - a[1]);
}

// Modalidade → órgão, pelo valor adjudicado.
export function arvoreDasContratacoes(contratacoes) {
  const raiz = novaArvore();
  for (const c of contratacoes) somarNaArvore(raiz, [c.modalidade || 'Não informada', c.nomeOrgao], valor(c.valorAdjudicado));
  return arvorePodada(raiz, Infinity);
}

// [contratado, CPF/CNPJ, valor dos contratos, quantos], juntando pelo documento sem pontuação.
export function resumoDosContratos(contratos, limite = 40) {
  const porContratado = {};
  for (const c of contratos) somarRecebedor(porContratado, c.contratado, documentoPublico(c.cnpjCpf), valor(c.valorTotal));
  return recebedoresOrdenados(porContratado, limite);
}
