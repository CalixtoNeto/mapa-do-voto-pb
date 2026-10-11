// Seções da página de um deputado estadual: matérias de autoria, votos nominais, afinidade e partidos.
import { pct, nf } from '../formato.mjs';
import { Pilha } from '../graficos.mjs';
import { ArvoreComLegenda } from './arvore-legenda.mjs';
import { arvoreDeConcordancia, arvoreDasMaterias, rotuloDaMateria } from './arvores-camara.mjs';
import { extremosDaAfinidade } from './calculos-perfil.mjs';
import { Estatisticas, ano } from './pecas.mjs';
const { html } = window.htmPreact;
const SAPL = 'https://sapl.al.pb.leg.br';

// Nas matérias recentes o rótulo é o link para o SAPL e a ementa; o "1" e a barra de cada matéria não dizem nada e ficam escondidos.
const rotuloDasMaterias = recentes => {
  const porRotulo = new Map(recentes.map(r => [rotuloDaMateria(r), r]));
  return (nome, nivel) => {
    const r = porRotulo.get(nome);
    return nivel === 1 && r ? html`<a href=${`${SAPL}/materia/${r[0]}`} target="_blank" rel="noopener">${nome}</a><small>${r[4]}</small>` : nome;
  };
};

export function Materias({ m }) {
  if (!m.total) return html`<p class="hint">Nenhuma matéria de autoria registrada no SAPL nesta legislatura.</p>`;
  return html`<div class="arvore-materias"><${ArvoreComLegenda} legenda=${`Tipo → matérias mais recentes (as ${m.recentes.length} últimas de ${nf.format(m.total)})`}
    arvore=${arvoreDasMaterias(m.porTipo, m.recentes, m.total)} formato=${nf.format} mostrarTotal=${false} rotulo=${rotuloDasMaterias(m.recentes)} /></div>`;
}

function Afinidade({ titulo, itens, nomes }) {
  const arvore = arvoreDeConcordancia(itens.map(([id, iguais, comuns]) => ({ nome: nomes.get(id) || '?', parte: iguais, total: comuns })), ['Votaram igual', 'Votaram diferente']);
  return itens.length ? html`<h4>${titulo}</h4><${ArvoreComLegenda} legenda="Deputado → votos iguais e diferentes · % das votações em comum"
    arvore=${arvore} formato=${v => pct(v, 0)} escala="maior" ordenarRaiz=${false} mostrarTotal=${false} rotulo=${nome => nome} />` : null;
}

// A afinidade também lista deputados de legislaturas anteriores, que não estão na lista da Assembleia e ficariam sem nome.
export function Votacoes({ v, nomes }) {
  const t = v.votacoes, total = t.sim + t.nao + t.abstencao + t.outros;
  if (!total) return html`<p class="hint">Nenhum voto nominal registrado no SAPL para este deputado. Votações simbólicas só registram o resultado.</p>`;
  const { mais, menos } = extremosDaAfinidade(v.afinidade.filter(a => nomes.has(a[0])));
  const partes = [['Sim', t.sim, 'var(--s1)'], ['Não', t.nao, 'var(--s2)'], ['Abstenção', t.abstencao, 'var(--s3)'], ['Outros', t.outros, 'var(--s4)']]
    .filter(p => p[1] > 0).map(([nome, n, cor]) => ({ nome, v: n, cor, rotulo: `${nf.format(n)} · ${pct(n / total, 0)}` }));
  return html`<${Pilha} partes=${partes} descricao=${'Votos nominais: ' + partes.map(p => `${p.nome} ${p.rotulo}`).join('; ')} />
    <${Estatisticas} itens=${[{ rotulo: 'Votou com a maioria', valor: t.comMaioriaDe ? pct(t.comMaioria / t.comMaioriaDe, 0) : null, nota: `de ${t.comMaioriaDe} votações` }]} />
    <${Afinidade} titulo="Vota mais junto com" itens=${mais} nomes=${nomes} /><${Afinidade} titulo="Vota menos junto com" itens=${menos} nomes=${nomes} />`;
}

export function Partidos({ v }) {
  return html`<p class="hint">${v.partido ? `Filiado ao ${v.partido}.` : 'Sem filiação registrada no SAPL.'}</p>
    ${v.partidos.length > 1 && html`<ul class="locais">${v.partidos.map(([sigla, desde, ate]) =>
      html`<li><span class="ln">${sigla}</span><span class="lv">${ano(desde)}–${ate ? ano(ate) : 'hoje'}</span></li>`)}</ul>`}`;
}
