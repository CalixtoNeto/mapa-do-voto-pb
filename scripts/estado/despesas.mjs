// Despesas orçamentárias do Governo da Paraíba (API do estado): cada linha é o movimento de um empenho num mês,
// então somar os 12 meses dá o pago no ano (inclusive o que foi pago de empenhos anteriores).
import { somar, ordenado, somarRecebedor, recebedoresOrdenados, centavos } from '../perfis/somas.mjs';
import { novaArvore, somarNaArvore, arvorePodada } from '../perfis/arvores.mjs';
import { documentoPublico } from '../lib/documento.mjs';

// O que é compra ou contratação (material, serviço, obra, locação); salário, previdência e repasses ficam de fora.
const COMPRA = /material|servi[cç]o|loca[cç]|obras|equipamento|consultoria|passage/i;
export const ehCompra = elemento => COMPRA.test(elemento || '');
const valor = v => Number(v) || 0;

export const novasDespesasDoEstado = () => ({
  empenhado: {}, pago: {}, funcoes: {}, meses: {}, credores: {}, compras: 0, comprasPorElemento: {},
  arvores: { area: novaArvore(), secretaria: novaArvore(), fonte: novaArvore() }, mensal: {}, porElemento: {},
});

export function somarDespesaDoEstado(d, r) {
  const pago = valor(r.valorPago), orgao = r.nomeOrgao, elemento = r.descricaoElemento, credor = r.nomeCredor, funcao = r.nomeFuncao;
  somar(d.empenhado, orgao, valor(r.valorEmpenhado));
  somar(d.pago, orgao, pago);
  somar(d.funcoes, funcao, pago);
  somar(d.meses, String(r.mes).padStart(2, '0'), pago);
  somarRecebedor(d.credores, credor, documentoPublico(r.cpfCnpjCredor), pago);
  somarNaArvore(d.arvores.area, [funcao, elemento, credor], pago);
  somarNaArvore(d.arvores.secretaria, [orgao, elemento, credor], pago);
  somarNaArvore(d.arvores.fonte, [r.nomeFonte, funcao, credor], pago);
  if (pago && ehCompra(elemento)) somarCompra(d, r, elemento, credor, pago);
}

function somarCompra(d, r, elemento, credor, pago) {
  d.compras += pago;
  somar(d.comprasPorElemento, elemento, pago);
  somar((d.mensal[elemento] ||= {}), String(r.mes).padStart(2, '0'), pago);
  const e = (d.porElemento[elemento] ||= { v: 0, credores: {} });
  e.v += pago; somar(e.credores, credor, pago);
}

export const arvoresDasDespesasDoEstado = d => Object.fromEntries(Object.entries(d.arvores).map(([nome, a]) => [nome, arvorePodada(a)]));

export function resumoDasDespesasDoEstado(d) {
  const orgaos = ordenado(d.pago).map(([orgao, pago]) => [orgao, centavos(d.empenhado[orgao]), pago]);
  const meses = Object.entries(d.meses).sort().map(([mes, v]) => [mes, centavos(v)]);
  return { orgaos, funcoes: ordenado(d.funcoes), meses, credores: recebedoresOrdenados(d.credores, 40),
    comprasPorElemento: ordenado(d.comprasPorElemento), compras: centavos(d.compras) };
}

// Todos os credores, para cruzar com quem doou ou prestou serviço às campanhas.
export const todosOsCredoresDoEstado = d => recebedoresOrdenados(d.credores, Infinity);
