// Carrega o cenário nacional (data/nacional/): o índice de anos e, quando um ano é aberto, o arquivo dele (uma vez por visita).
const { useState, useEffect } = window.htmPreact;
const BASE = 'data/nacional';

const lerJson = url => fetch(url, { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).catch(() => null);
const anos = {};
let indice = null;

export function usarIndiceNacional() {
  const [dados, setDados] = useState(null);
  useEffect(() => { (indice ||= lerJson(`${BASE}/index.json`)).then(i => setDados(i || { anos: [] })); }, []);
  return dados;
}

export function usarNacional(ano) {
  const [dados, setDados] = useState(null);
  useEffect(() => {
    setDados(null);
    if (ano) (anos[ano] ||= lerJson(`${BASE}/${ano}.json`)).then(d => setDados(d || { vazio: true }));
  }, [ano]);
  return dados;
}
