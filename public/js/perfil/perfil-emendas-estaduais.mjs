// Emendas parlamentares estaduais (listagem do Governo da Paraíba): quanto cada deputado indicou, para quais secretarias e para quê.
// Indicar uma emenda não é pagá-la: o site mostra o valor indicado.
import { nf, dinheiro, sentence, pct } from '../formato.mjs';
import { Bloco } from '../estrutura.mjs';
import { Cartao, Aviso } from '../cartao.mjs';
import { Treemap } from '../treemap.mjs';
import { Sankey } from '../sankey.mjs';
import { Alternar } from '../alternar.mjs';
import { grafoDasEmendasEstaduais } from './calculos-fluxo-perfil.mjs';
import { Colunas } from '../graficos.mjs';
import { ArvoreComLegenda } from './arvore-legenda.mjs';
import { arvoreDosAutores, arvoreDasSecretarias, encurtar } from './arvores-estado.mjs';
import { agruparPequenos } from './calculos-fatias.mjs';
import { slug } from './calculos-perfil.mjs';
import { resumoDasEmendas, emendasPorSecretaria, serieDeEmendas, deputadoDoAutor } from './calculos-estado.mjs';
import { milhoes } from './formato-perfil.mjs';
import { CabecalhoDoPerfil, SeletorDeAno } from './cabecalho-perfil.mjs';
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
  const arvore = detalhe?.arvores?.emendasEstaduais, grafo = grafoDasEmendasEstaduais(arvore);
  const itens = agruparPequenos(emendasPorSecretaria(arvore).map(s => ({ n: sentence(s.n), v: s.v })), 0.02);
  const treemap = html`<${Treemap} itens=${itens} formato=${dinheiro} altura=${340} descricao=${`Emendas indicadas por secretaria em ${a.ano}`} />`;
  return html`<${Cartao} tipo="Treemap · fluxo" titulo=${`Para quais secretarias, ${a.ano}`} sub=${`${dinheiro(a.emendas.total)}. Em blocos, a área é proporcional ao valor indicado; em fluxo, a faixa liga o deputado à secretaria.`}
    nota="Cor mais escura = valor maior. A emenda indica o valor e a secretaria que vai executar. No fluxo aparecem os oito maiores de cada lado.">
    ${itens.length === 0 ? html`<p class="hint">Carregando…</p>` : grafo ? html`<${Alternar} rotulo="Forma de ver as emendas por secretaria" visoes=${[{ id: 'blocos', rotulo: 'Blocos', corpo: treemap },
      { id: 'fluxo', rotulo: 'Fluxo', corpo: html`<${Sankey} grafo=${grafo} formato=${dinheiro} altura=${380} descricao=${`Emendas por deputado e secretaria em ${a.ano}`} />` }]} />` : treemap}<//>`;
}

const objeto = nome => html`<span title=${sentence(nome)}>${encurtar(sentence(nome), 130)}</span>`;
const arvoreDe = detalhe => detalhe?.arvores?.emendasEstaduais?.v > 0 ? detalhe.arvores.emendasEstaduais : null;

function Autores({ a, detalhe, deputados }) {
  const arvore = arvoreDosAutores(a.emendas.porDeputado, arvoreDe(detalhe)), nomeDoAutor = nome => {
    const d = deputadoDoAutor(nome, deputados);
    return d ? html`<a href=${'#perfil/' + slug(d.nome)}>${nomeProprio(nome)}</a>` : nomeProprio(nome);
  };
  return html`<${Cartao} tipo="Árvore expansível" titulo="Quem indicou" sub=${`${dinheiro(arvore.v)} indicados em ${a.ano}, por deputado.`}
    nota="Quando o nome do autor bate com o de um deputado da Assembleia, ele leva ao perfil. Abaixo de cada deputado, as secretarias e o objeto de cada emenda.">
    <${ArvoreComLegenda} legenda="Deputado → secretaria → objeto da emenda · R$" arvore=${arvore} escala="maior" ordenarRaiz=${false} mostrarTotal=${false}
      rotulo=${(nome, nivel) => nivel === 0 ? nomeDoAutor(nome) : nivel === 1 ? sentence(nome) : objeto(nome)} />
    ${!arvoreDe(detalhe) && html`<p class="hint">Carregando as secretarias e os objetos…</p>`}<//>`;
}

function PelaSecretaria({ a, detalhe }) {
  const arvore = arvoreDasSecretarias(arvoreDe(detalhe));
  return html`<${Cartao} tipo="Árvore expansível" titulo="Quem indicou, por secretaria" sub=${`A mesma conta de ${a.ano} vista de quem vai executar.`}
    nota="A emenda indica o valor e a secretaria que vai executar. Abaixo de cada secretaria, os deputados e o objeto de cada emenda.">
    ${arvore.v > 0 ? html`<${ArvoreComLegenda} legenda="Secretaria → deputado → objeto da emenda · R$" arvore=${arvore} escala="maior" mostrarTotal=${false}
      rotulo=${(nome, nivel) => nivel === 1 ? nomeProprio(nome) : nivel === 0 ? sentence(nome) : objeto(nome)} />` : html`<p class="hint">Carregando…</p>`}<//>`;
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
    <${Bloco} id="ea" titulo="Quem indicou e para quê" colunas="metade" lede="Cada deputado com o valor e o número de emendas e, de outro lado, cada secretaria com os deputados que a indicaram; as duas árvores abrem até o objeto de cada emenda.">
      <${Autores} a=${a} detalhe=${detalhe} deputados=${assembleia?.vereadores} /><${PelaSecretaria} a=${a} detalhe=${detalhe} /><//>
    <p class="fonte">Fonte: listagem de emendas parlamentares do Governo da Paraíba. O valor é o indicado em cada emenda; a execução (empenho e pagamento) não é medida aqui. Os dados do ano corrente são parciais.</p>
  </article>`;
}
