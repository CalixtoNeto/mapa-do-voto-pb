// Carrega os boletins de urna agregados (data/nacional/ANO-tTURNO-urnas.json); null enquanto carrega e false se o arquivo não existir.
const { useState, useEffect } = window.htmPreact;
const arquivos = {};

export function usarUrnas(ano, turno) {
  const [dados, setDados] = useState(null);
  useEffect(() => {
    setDados(null);
    if (!ano || !turno) return;
    const chave = `${ano}-t${turno}`;
    (arquivos[chave] ||= fetch(`data/nacional/${chave}-urnas.json`, { cache: 'no-cache' }).then(r => r.ok ? r.json() : false).catch(() => false)).then(setDados);
  }, [ano, turno]);
  return dados;
}
