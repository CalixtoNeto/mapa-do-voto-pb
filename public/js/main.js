// Carrega a malha municipal e inicia a aplicação (os resultados são carregados pelo próprio app).
(async () => {
  const root = document.getElementById('root');
  try {
    const topo = await fetch('data/pb.topo.json').then(r => { if (!r.ok) throw new Error('malha'); return r.json(); });
    root.textContent = '';
    startApp(topo);
  } catch (e) {
    root.innerHTML = '<p style="padding:24px;font-family:system-ui">Não foi possível carregar o mapa. Recarregue a página.</p>';
    console.error(e);
  }
})();
