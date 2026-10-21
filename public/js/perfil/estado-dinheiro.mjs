// Governo: para onde vai o dinheiro (treemap por função e árvore) e a evolução (anos em linha, meses em colunas).
import { dinheiro } from '../formato.mjs';
import { Bloco } from '../estrutura.mjs';
import { Cartao } from '../cartao.mjs';
import { Treemap } from '../treemap.mjs';
import { Sankey } from '../sankey.mjs';
import { Alternar } from '../alternar.mjs';
import { grafoDoGoverno } from './calculos-fluxo-perfil.mjs';
import { LinhaDoTempo } from '../linha-do-tempo.mjs';
import { ColunasMensais } from '../colunas-mensais.mjs';
import { ArvoreDeGastos } from './arvore.mjs';
import { pagoDoAno, anoParcial, serieAnualDoMunicipio, mesesDoAno, extremosCompletos } from './calculos-municipio.mjs';
import { nomeDaFuncao, pontosDeDestaque, rotulosEspacados } from './calculos-fatias.mjs';
const { html } = window.htmPreact;

const bilhoes = v => (v / 1e9).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
const bilhoesNaColuna = v => v ? (v / 1e9).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '—';

function PagoPorFuncao({ a, funcoes }) {
  const grafo = grafoDoGoverno(a);
  const treemap = html`<${Treemap} itens=${funcoes} formato=${dinheiro} altura=${420} descricao=${`Valor pago por função em ${a.ano}`} />`;
  return html`<${Cartao} tipo="Treemap · fluxo" titulo=${`Pago por função, ${a.ano}`} sub=${`${dinheiro(pagoDoAno(a))}. Em blocos, a área é proporcional ao valor; em fluxo, a faixa mostra de qual órgão saiu.`}
    nota="Cor mais escura = valor maior. Blocos e nós pequenos ficam sem rótulo: passe o cursor sobre eles ou use a árvore ao lado.">
    ${grafo ? html`<${Alternar} rotulo="Forma de ver o pago por função" visoes=${[{ id: 'blocos', rotulo: 'Blocos', corpo: treemap },
      { id: 'fluxo', rotulo: 'Fluxo', corpo: html`<${Sankey} grafo=${grafo} formato=${dinheiro} altura=${420} descricao=${`Pago por órgão e por função em ${a.ano}`} />` }]} />` : treemap}<//>`;
}

export function ParaOndeVai({ a, detalhe }) {
  const funcoes = (a.despesas?.funcoes || []).map(([n, v]) => ({ n: nomeDaFuncao(n), v }));
  return html`<${Bloco} id="pa" titulo="Para onde vai o dinheiro" colunas="sessenta"
    lede="Um total que se abre em partes: o treemap mostra o tamanho relativo de cada função, o fluxo liga o órgão que pagou à função; a árvore ao lado abre o gasto por área, secretaria, origem do recurso e emendas, até quem recebeu.">
    ${funcoes.length > 0 && html`<${PagoPorFuncao} a=${a} funcoes=${funcoes} />`}
    <${Cartao} tipo="Árvore expansível" titulo="Abra uma área" sub="Do total até quem recebeu">
      <${ArvoreDeGastos} key=${a.ano} arvores=${detalhe?.arvores} ano=${a.ano} /><//>
  <//>`;
}

function AnoAAno({ anos }) {
  const dados = serieAnualDoMunicipio(anos), parcial = dados.some(d => d.parcial), extremos = extremosCompletos(dados);
  const pontos = dados.map(d => [Number(d.ano), d.pago / 1e9]), [primeiro, ultimo] = [dados[0], dados[dados.length - 1]];
  const serie = { nome: 'Pago', cor: 'var(--r5)', parcial: ultimo.parcial, rotulos: pontosDeDestaque(pontos), pontos, formato: v => v.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) };
  return html`<${Cartao} tipo="Série temporal · linha e área" titulo=${`Pago por ano, ${primeiro.ano} a ${ultimo.ano}`}
    sub=${`R$ bilhões.${parcial ? ` Tracejado: ${ultimo.ano}, parcial.` : ''}`}
    nota=${extremos && `De ${bilhoes(extremos.de.pago)} bilhões em ${extremos.de.ano} para ${bilhoes(extremos.ate.pago)} bilhões em ${extremos.ate.ano}, em reais correntes (sem descontar a inflação).`}>
    <${LinhaDoTempo} area series=${[serie]} rotulosX=${rotulosEspacados(dados.map(d => [Number(d.ano), d.ano]), 1)} descricao="Valor pago pelo governo em cada ano" /><//>`;
}

function MesAMes({ a }) {
  const meses = mesesDoAno(a), parciais = meses.filter(m => m.parcial).length;
  return html`<${Cartao} tipo="Colunas · série mensal" titulo=${`Pago por mês em ${a.ano}`}
    sub=${`R$ bilhões.${parciais ? ' Colunas tracejadas são meses parciais: ainda faltam lançamentos.' : ''}`}
    nota=${anoParcial(a) ? 'Meses sem pagamento aparecem com um traço.' : null}>
    <${ColunasMensais} itens=${meses.map(m => ({ n: m.mes, v: m.v, rotulo: bilhoesNaColuna(m.v), parcial: m.parcial }))}
      descricao=${`Pago em cada mês de ${a.ano}: ` + meses.filter(m => m.v).map(m => `${m.mes}, ${dinheiro(m.v)}${m.parcial ? ' (parcial)' : ''}`).join('; ')} /><//>`;
}

export function AoLongoDoTempo({ anos, a }) {
  return html`<${Bloco} id="pt" titulo="Ao longo do tempo" colunas="dois-tercos"
    lede="O pago ano a ano e o que foi pago em cada mês do ano escolhido. O que está tracejado ainda está em andamento.">
    ${anos.length > 1 && html`<${AnoAAno} anos=${anos} />`}<${MesAMes} a=${a} /><//>`;
}
