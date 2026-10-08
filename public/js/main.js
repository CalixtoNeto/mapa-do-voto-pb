// Carrega a malha municipal e inicia a aplicação (os resultados são carregados pelo próprio app).
// É um módulo para importar as análises; app.js continua um script comum, carregado antes.
import * as analises from './analises.mjs';

const root = document.getElementById('root');
try {
  const topo = await fetch('data/pb.topo.json').then(r => { if (!r.ok) throw new Error('malha'); return r.json(); });
  root.textContent = '';
  startApp(topo, analises);
} catch (e) {
  root.innerHTML = '<p style="padding:24px;font-family:system-ui">Não foi possível carregar o mapa. Recarregue a página.</p>';
  console.error(e);
}
