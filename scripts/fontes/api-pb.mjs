// API de dados abertos do Governo da Paraíba (https://api.dados.pb.gov.br/swagger/): JSON paginado, no máximo
// 1.000 itens por página. Há duas formas de paginação: { total_paginas } e { pages }; os itens vêm em data ou items.
export const API_PB = 'https://api.dados.pb.gov.br/api/v1';
const POR_PAGINA = 1000;

const itensDa = resposta => resposta?.data || resposta?.items || Object.values(resposta || {}).find(Array.isArray) || [];
const paginasDa = resposta => resposta?.paginacao?.total_paginas ?? resposta?.paginacao?.pages ?? 1;

// buscarJson entra por parâmetro para os testes trocarem a rede por respostas falsas.
export async function lerTodasAsPaginas(caminho, parametros, buscarJson) {
  const url = pagina => `${API_PB}/${caminho}?${new URLSearchParams({ ...parametros, page: pagina, per_page: POR_PAGINA })}`;
  const primeira = await buscarJson(url(1));
  const itens = [...itensDa(primeira)];
  for (let pagina = 2; pagina <= paginasDa(primeira); pagina++) itens.push(...itensDa(await buscarJson(url(pagina))));
  return itens;
}
