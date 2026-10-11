// Perfil do Governo da Paraíba: o dinheiro do estado em cada ano publicado pela API de dados abertos do governo,
// valores atípicos e as campanhas ligadas aos credores. As emendas estaduais têm página própria (#perfil/emendas).
import { Aviso } from '../cartao.mjs';
import { anoParcial } from './calculos-municipio.mjs';
import { CabecalhoDoPerfil, SeletorDeAno } from './cabecalho-perfil.mjs';
import { indicadoresDoAno } from './estado-indicadores.mjs';
import { ParaOndeVai, AoLongoDoTempo } from './estado-dinheiro.mjs';
import { FolhaLicitacoesCredores } from './estado-pessoas.mjs';
import { Atipicos, Campanhas } from './estado-governo.mjs';
import { usarDetalhe } from './dados-perfil.mjs';
const { html, useState } = window.htmPreact;

export function PerfilEstado({ anos }) {
  const [ano, setAno] = useState(anos[0]?.ano);
  const a = anos.find(x => x.ano === ano) || anos[0], detalhe = usarDetalhe(a?.ano);
  if (!a) return html`<article class="perfil"><${CabecalhoDoPerfil} pagina="estado" rotulo="Perfil do estado · Governo" titulo="Governo da Paraíba" /><${Aviso}>O perfil do estado ainda não foi gerado.<//></article>`;
  return html`<article class="perfil">
    <${CabecalhoDoPerfil} pagina="estado" rotulo=${`Perfil do estado · Governo · ${a.ano}${anoParcial(a) ? ', parcial' : ''}`} titulo="Governo da Paraíba"
      lede="Gastos, folha, licitações e campanhas do Executivo estadual, com os dados abertos do Governo da Paraíba." indicadores=${indicadoresDoAno(a)}>
      <${SeletorDeAno} anos=${anos} ano=${a.ano} setAno=${setAno} /><//>
    <${ParaOndeVai} a=${a} detalhe=${detalhe} /><${AoLongoDoTempo} anos=${anos} a=${a} />
    <${FolhaLicitacoesCredores} a=${a} detalhe=${detalhe} /><${Atipicos} a=${a} anos=${anos} /><${Campanhas} a=${a} />
    <p class="fonte">Fonte: API de dados abertos do Governo da Paraíba (despesas orçamentárias, remuneração de servidores, contratações, contratos e emendas) e TSE (prestação de contas de governador e deputados estaduais). Valores em reais correntes. Os dados do ano corrente são parciais.</p>
  </article>`;
}
