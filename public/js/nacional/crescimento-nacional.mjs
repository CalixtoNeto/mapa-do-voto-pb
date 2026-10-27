// "Crescimento de votos do 1º para o 2º turno": para cada UF, quanto os votos válidos de cada candidato cresceram ou caíram.
// Duas cores neutras (não são cores de partido); a barra para a esquerda do zero é perda de votos.
import { nomeDeQuem } from '../formato.mjs';
import { Cartao } from '../cartao.mjs';
import { Abas } from '../estrutura.mjs';
import { siglaDaUf, nomeDaUf } from './ufs.mjs';
const { html, useState } = window.htmPreact;

const variacao = v => v == null ? '—' : v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: 'always' }).replace('-', '−') + '%';

function Linha({ rotulo, itens, posicao, forte }) {
  const zero = posicao(0);
  return html`<li class=${'cresc-linha' + (forte ? ' brasil' : '')}><span class="cresc-uf">${rotulo}</span>
    <div class="cresc-barras" style=${`--zero:${zero}%`}>${itens.map((i, k) => {
      const v = i.crescimento, ponta = v == null ? zero : posicao(v * 100), [de, ate] = [Math.min(zero, ponta), Math.max(zero, ponta)];
      return html`<div class=${'cresc-barra c' + k}><i style=${`left:${de}%;width:${ate - de}%`}></i><b style=${`left:${(v ?? 0) >= 0 ? ate : zero}%`}>${variacao(v == null ? null : v * 100)}</b></div>`;
    })}</div>
    <span class="so-leitor">${itens.map(i => `${nomeDeQuem(i.urna)} ${variacao(i.crescimento == null ? null : i.crescimento * 100)}`).join('; ')}</span></li>`;
}

// dados: de crescimentoDeVotos; primeiro e segundo: os turnos comparados (para o texto).
export function CrescimentoDeVotos({ dados, anterior, turno }) {
  const [ordem, setOrdem] = useState('estado');
  const itens = dados.candidatos.slice(0, 2).map((_, k) => k);
  const todos = [...dados.brasil, ...dados.ufs.flatMap(u => u.itens)].map(i => i.crescimento).filter(v => v != null).map(v => v * 100);
  const [minimo, maximo] = [Math.min(0, ...todos), Math.max(5, ...todos) * 1.25], posicao = v => (v - minimo) / (maximo - minimo) * 100;
  const exteriorPorUltimo = (a, b) => (a.uf === 'ZZ') - (b.uf === 'ZZ');
  const ufs = [...dados.ufs].sort((a, b) => exteriorPorUltimo(a, b) || (ordem === 'estado' ? nomeDaUf(a.uf).localeCompare(nomeDaUf(b.uf), 'pt-BR') : (b.itens[0].crescimento ?? -9) - (a.itens[0].crescimento ?? -9)));
  const nomes = dados.candidatos.slice(0, 2).map(c => nomeDeQuem(c.urna));
  return html`<${Cartao} tipo="Barras · variação" titulo=${`Crescimento de votos do ${anterior}º para o ${turno}º turno`} classe="largo"
      sub="Variação percentual dos votos válidos de cada candidato em relação ao turno anterior. Barra para a esquerda do zero: perda de votos."
      nota="Mesmos municípios nos dois turnos. A variação mede o crescimento sobre os votos que o candidato já tinha: quem partiu de uma base menor cresce mais em percentual.">
    <ul class="legenda-linha"><li><i class="c0"></i>${nomes[0]}</li><li><i class="c1"></i>${nomes[1]}</li></ul>
    <${Abas} itens=${[['estado', 'Por estado'], ['crescimento', `Por crescimento de ${nomes[0]}`]]} valor=${ordem} aoMudar=${setOrdem} rotulo="Ordem dos estados" estilo="pilula" />
    <ul class="crescimento" aria-label="Crescimento de votos por estado">
      <${Linha} rotulo="Brasil" itens=${dados.brasil.slice(0, 2)} posicao=${posicao} forte=${true} />
      ${ufs.map(u => html`<${Linha} rotulo=${siglaDaUf(u.uf)} itens=${u.itens.slice(0, 2)} posicao=${posicao} />`)}</ul><//>`;
}
