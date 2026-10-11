// Emendas parlamentares estaduais (listagem do Governo da Paraíba): quanto cada deputado indicou, para quais secretarias e para quê.
// Indicar uma emenda não é pagá-la: o site mostra o valor indicado.
import { nf, dinheiro, sentence, pct } from '../formato.mjs';
import { Bloco } from '../estrutura.mjs';
import { Cartao, Aviso } from '../cartao.mjs';
import { Treemap } from '../treemap.mjs';
import { Colunas } from '../graficos.mjs';
import { Ranking } from '../ranking.mjs';
import { ArvoreDeBarras } from '../arvore.mjs';
import { agruparPequenos } from './calculos-fatias.mjs';
import { slug } from './calculos-perfil.mjs';
import { resumoDasEmendas, emendasPorSecretaria, serieDeEmendas, deputadoDoAutor } from './calculos-estado.mjs';
import { milhoes } from './formato-perfil.mjs';
import { CabecalhoDoPerfil, SeletorDeAno } from './cabecalho-perfil.mjs';
import { Desdobrar } from './desdobrar.mjs';
import { nomeProprio } from './pecas.mjs';
import { usarDetalhe } from './dados-perfil.mjs';
const { html, useState } = window.htmPreact;

const indicadores = (a, r) => [{ rotulo: `Indicado em ${a.ano}`, valor: dinheiro(r.total), nota: 'valor das emendas, não o pago' },
  { rotulo: 'Emendas', valor: nf.format(r.emendas), nota: 'listadas no ano' }, { rotulo: 'Deputados autores', valor: nf.format(r.autores) },
  { rotulo: 'Maior autor', valor: dinheiro(r.maior.valor), nota: `${nomeProprio(r.maior.nome)} · ${pct(r.maior.fracao, 0)} do total` }];

function PorAno({ anos }) {
  const serie = serieDeEmendas(anos);
  return html`<${Cartao} tipo="Colunas · série anual" titulo="Emendas indicadas por ano" sub="R$ milhões. O último ano é o mais recente."
    nota="Em ano de dados parciais a coluna pode ficar abaixo do total final.">
    <${Colunas} itens=${serie.map(s => ({ n: s.ano, v: s.total, rotulo: milhoes(s.total) }))} descricao=${'Emendas indicadas por ano: ' + serie.map(s => `${s.ano}, ${dinheiro(s.total)}`).join('; ')} /><//>`;
}

function PorSecretaria({ a, detalhe }) {
  const itens = agruparPequenos(emendasPorSecretaria(detalhe?.arvores?.emendasEstaduais).map(s => ({ n: sentence(s.n), v: s.v })), 0.02);
  return html`<${Cartao} tipo="Treemap · secretarias" titulo=${`Para quais secretarias, ${a.ano}`} sub=${`${dinheiro(a.emendas.total)}. A área é proporcional ao valor indicado.`}
    nota="Cor mais escura = valor maior. A emenda indica o valor e a secretaria que vai executar.">
    ${itens.length > 0 ? html`<${Treemap} itens=${itens} formato=${dinheiro} altura=${340} descricao=${`Emendas indicadas por secretaria em ${a.ano}`} />` : html`<p class="hint">Carregando…</p>`}<//>`;
}

function Autores({ a, deputados }) {
  const itens = [...a.emendas.porDeputado].sort((x, y) => y[1] - x[1]).map(([nome, v, n]) => {
    const d = deputadoDoAutor(nome, deputados), rotulo = nomeProprio(nome);
    return { n: d ? html`<a href=${'#perfil/' + slug(d.nome)}>${rotulo}</a>` : rotulo, nota: `${nf.format(n)} ${n === 1 ? 'emenda' : 'emendas'}`, v, rotulo: dinheiro(v), lado: pct(v / a.emendas.total, 1) };
  });
  return html`<${Cartao} tipo="Barra horizontal · ranking" titulo="Quem indicou" sub=${`Valor indicado por cada deputado em ${a.ano}. A barra compara o valor.`}
    nota="Quando o nome do autor bate com o de um deputado da Assembleia, ele leva ao perfil.">
    <${Ranking} descricao="Valor indicado por deputado" itens=${itens} /><//>`;
}

function Arvore({ detalhe }) {
  const arvore = detalhe?.arvores?.emendasEstaduais;
  return html`<${Cartao} classe="largo" tipo="Árvore expansível" titulo="Abra um deputado" sub="Deputado → secretaria → objeto da emenda. Toque num item para abrir.">
    ${arvore?.v > 0 ? html`<${Desdobrar} titulo=${`Abrir os ${arvore.filhos.length} deputados`}><div class="arvore"><${ArvoreDeBarras} arvore=${arvore} rotulo=${(nome, nivel) => nivel === 0 ? nomeProprio(nome) : sentence(nome)} /></div><//>` : html`<p class="hint">Carregando…</p>`}<//>`;
}

export function PerfilEmendasEstaduais({ anos, assembleia }) {
  const comEmendas = anos.filter(a => resumoDasEmendas(a)), [ano, setAno] = useState(comEmendas[0]?.ano);
  const a = comEmendas.find(x => x.ano === ano) || comEmendas[0], detalhe = usarDetalhe(a?.ano), r = resumoDasEmendas(a);
  if (!a) return html`<article class="perfil"><${CabecalhoDoPerfil} pagina="emendas" rotulo="Perfil do estado · Emendas estaduais" titulo="Emendas parlamentares estaduais" /><${Aviso}>O Governo ainda não publicou emendas estaduais nos anos do site.<//></article>`;
  return html`<article class="perfil">
    <${CabecalhoDoPerfil} pagina="emendas" rotulo=${`Perfil do estado · Emendas estaduais · ${a.ano}`} titulo="Emendas parlamentares estaduais"
      lede="Quanto cada deputado estadual indicou para as secretarias do Governo, pela listagem de emendas do Governo da Paraíba. Indicar não é o mesmo que pagar." indicadores=${indicadores(a, r)}>
      <${SeletorDeAno} anos=${comEmendas} ano=${a.ano} setAno=${setAno} /><//>
    <${Bloco} id="eq" titulo="Quanto e para onde" colunas="dois-tercos" lede="O total indicado em cada ano e, no ano escolhido, as secretarias que mais receberam indicações.">
      <${PorSecretaria} a=${a} detalhe=${detalhe} />${comEmendas.length > 1 && html`<${PorAno} anos=${comEmendas} />`}<//>
    <${Bloco} id="ea" titulo="Quem indicou e para quê" colunas="metade" lede="Cada deputado com o valor e o número de emendas, e a árvore que abre até o objeto de cada emenda.">
      <${Autores} a=${a} deputados=${assembleia?.vereadores} /><${Arvore} detalhe=${detalhe} /><//>
    <p class="fonte">Fonte: listagem de emendas parlamentares do Governo da Paraíba. O valor é o indicado em cada emenda; a execução (empenho e pagamento) não é medida aqui. Os dados do ano corrente são parciais.</p>
  </article>`;
}
