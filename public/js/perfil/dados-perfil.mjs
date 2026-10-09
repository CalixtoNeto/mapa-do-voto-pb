// Carrega o perfil do estado (data/perfis/) uma vez por visita: índice e todos os anos do Governo da Paraíba.
// O endereço da página fica no hash (#perfis, #perfil/estado) para ser compartilhado.
const { useState, useEffect } = window.htmPreact;
const BASE = 'data/perfis';

const lerJson = url => fetch(url, { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).catch(() => null);
let carregamento = null;

async function carregar() {
  const indice = await lerJson(`${BASE}/index.json`);
  if (!indice?.anos?.length) return { vazio: true };
  const anos = await Promise.all(indice.anos.map(ano => lerJson(`${BASE}/estado-${ano}.json`)));
  return { indice, anos: anos.filter(Boolean) };
}

export function usarPerfis() {
  const [dados, setDados] = useState(null);
  useEffect(() => { (carregamento ||= carregar()).then(setDados); }, []);
  return dados;
}

// As árvores de decomposição de um ano são maiores: só são lidas quando o ano é aberto.
const detalhes = {};
export function usarDetalhe(ano) {
  const [detalhe, setDetalhe] = useState(null);
  useEffect(() => {
    setDetalhe(null);
    if (!ano) return;
    (detalhes[ano] ||= lerJson(`${BASE}/estado-${ano}-detalhe.json`)).then(setDetalhe);
  }, [ano]);
  return detalhe;
}

const rotaAtual = () => decodeURIComponent(location.hash.replace(/^#\/?/, ''));
export const ehRotaDePerfil = () => /^perf(is|il\/)/.test(rotaAtual());

export function usarRota() {
  const [rota, setRota] = useState(rotaAtual());
  useEffect(() => {
    const aoMudar = () => { setRota(rotaAtual()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', aoMudar);
    return () => window.removeEventListener('hashchange', aoMudar);
  }, []);
  return rota;
}
