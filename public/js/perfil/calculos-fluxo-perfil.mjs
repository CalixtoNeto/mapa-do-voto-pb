// Grafos de fluxo dos perfis do estado: governo (órgão → pago → função) e emendas (deputado → secretaria, os 11 maiores deputados e o resto junto).
import { grafoComMeio, grafoEmPares } from '../calculos-fluxo.mjs';
import { nomeDeQuem, sentence } from '../formato.mjs';
import { nomeDaFuncao } from './calculos-fatias.mjs';

const nomeDoOrgao = nome => nomeDeQuem(nome.replace(/^SEC(?:RETARIA)? DE ESTADO D[AEO]S? /i, 'Sec. ').replace(/ DO ESTADO( DA PARAIBA)?$/i, ''));

// a: um ano do perfil; o pago por órgão e por função somam o mesmo total.
export function grafoDoGoverno(a) {
  const d = a?.despesas;
  if (!d?.orgaos?.length || !d?.funcoes?.length) return null;
  return grafoComMeio({ origens: d.orgaos.map(o => ({ n: nomeDoOrgao(o[0]), v: o[2] })), meio: 'Pago',
    destinos: d.funcoes.map(f => ({ n: sentence(nomeDaFuncao(f[0])), v: f[1] })), limite: 8, rotulo: 'Outras funções', rotuloOrigens: 'Outros órgãos' });
}

// arvore: deputado → secretaria → objetos, como em detalhe.arvores.emendasEstaduais.
export function grafoDasEmendasEstaduais(arvore) {
  const pares = (arvore?.filhos || []).flatMap(([autor, , secretarias]) => (secretarias || []).map(([secretaria, v]) => [nomeDeQuem(autor), nomeDoOrgao(secretaria), v]));
  const grafo = grafoEmPares({ pares, limiteDe: 12, limitePara: 8 });
  return grafo.fluxos.length ? grafo : null;
}
