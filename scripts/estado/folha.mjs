// Folha do Governo da Paraíba num mês (API do estado, remuneração de servidores): só totais por tipo de cargo e
// órgão. Nome e CPF do servidor são lidos da API, mas nunca vão para o site.
import { centavos } from '../perfis/somas.mjs';
import { novaArvore, somarNaArvore, arvorePodada } from '../perfis/arvores.mjs';

export const novaFolhaDoEstado = () => ({ mes: '', tipos: {}, orgaos: {}, total: 0, pessoas: 0, arvore: novaArvore() });

function somarGrupo(grupos, nome, valor) {
  const g = (grupos[nome || 'Não informado'] ||= { pessoas: 0, v: 0 });
  g.pessoas++; g.v += valor;
}

export function somarServidorDoEstado(f, s) {
  const valor = Number(s.valorBruto) || 0;
  f.mes = String(s.periodo || f.mes);
  somarGrupo(f.tipos, s.tipoCargo, valor);
  somarGrupo(f.orgaos, s.orgaoLotacao, valor);
  f.total += valor; f.pessoas++;
  somarNaArvore(f.arvore, [s.tipoCargo, s.orgaoLotacao], valor);
}

const grupos = mapa => Object.entries(mapa).map(([nome, g]) => [nome, g.pessoas, centavos(g.v)]).sort((a, b) => b[2] - a[2] || b[1] - a[1]);

export const resumoDaFolhaDoEstado = f => ({ mes: f.mes, tipos: grupos(f.tipos), orgaos: grupos(f.orgaos), total: centavos(f.total), pessoas: f.pessoas });

// Tipo de cargo → órgão, com todos os ramos.
export const arvoreDaFolhaDoEstado = f => arvorePodada(f.arvore, Infinity);
