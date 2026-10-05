// Carrega os dados estáticos e inicia a aplicação.
(async () => {
  const root = document.getElementById('root');
  try {
    const [topo, tse2ibge] = await Promise.all([
      fetch('data/pb.topo.json').then(r => { if (!r.ok) throw new Error('malha'); return r.json(); }),
      fetch('data/tse-ibge-pb.json').then(r => { if (!r.ok) throw new Error('tabela'); return r.json(); }),
    ]);
    root.textContent = '';
    startApp(topo, tse2ibge);
  } catch (e) {
    root.innerHTML = '<p style="padding:24px;font-family:system-ui">Não foi possível carregar os dados do mapa. Recarregue a página.</p>';
    console.error(e);
  }
})();
