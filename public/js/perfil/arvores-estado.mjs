// Árvores das emendas estaduais (sem DOM): deputado → secretaria → objeto, e a mesma conta vista pela secretaria.
import { parteDoPai, parteTexto, soma, plural } from './arvores-ramos.mjs';

// porDeputado: [[autor, valor, emendas]] do arquivo do ano (vale o valor dele); arvore: o detalhe autor → secretaria → objeto, que pode faltar.
export function arvoreDosAutores(porDeputado, arvore) {
  const total = soma(porDeputado.map(([, v]) => [0, v])), secretarias = new Map((arvore?.filhos || []).map(f => [f[0], f[2]]));
  const filhos = porDeputado.filter(d => d[1] > 0).map(([autor, v, n]) => {
    const abaixo = (secretarias.get(autor) || []).map(([secretaria, sv, objetos]) => [secretaria, sv, parteDoPai(objetos, sv, 'da secretaria'), `${parteTexto(sv, v)} do deputado`]);
    return [autor, v, abaixo, `${plural(n, 'emenda', 'emendas')} · ${parteTexto(v, total)}`];
  });
  return { v: soma(filhos), filhos };
}

// A árvore chega como deputado → secretaria → objeto; aqui vira secretaria → deputado → objeto.
function porSecretaria(arvore) {
  const secretarias = new Map();
  for (const [autor, , lista] of arvore?.filhos || []) for (const [secretaria, v, objetos] of lista || []) {
    secretarias.set(secretaria, [...(secretarias.get(secretaria) || []), [autor, v, objetos]]);
  }
  return secretarias;
}

export function arvoreDasSecretarias(arvore) {
  const secretarias = [...porSecretaria(arvore)], total = soma(secretarias.map(([, autores]) => [0, soma(autores)]));
  const filhos = secretarias.map(([nome, autores]) => {
    const v = soma(autores), deputados = autores.map(([autor, av, objetos]) => [autor, av, parteDoPai(objetos, av, 'do deputado'), `${parteTexto(av, v)} da secretaria`]);
    return [nome, v, deputados, `${plural(autores.length, 'deputado', 'deputados')} · ${parteTexto(v, total)}`];
  });
  return { v: soma(filhos), filhos };
}

// O objeto de uma emenda é um parágrafo; no ramo cabe o começo, e o texto inteiro fica na dica do rótulo.
export function encurtar(texto, limite) {
  if (texto.length <= limite) return texto;
  const corte = texto.slice(0, limite).replace(/\s+\S*$/, '');
  return `${corte}…`;
}
