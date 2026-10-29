// PRODUCCIÓN - API Laravel bajo el dominio principal
export const environment = {
  production: true,
  apiUrl: 'https://plaxtilineas.com/api',
  // Catálogo externo de productos (público, solo lectura)
  apiCatalogoUrl: 'https://catalogoplaxtilineas.sembradoresdevida.org/api',
  catalogoMarca: 'Plaxtilineas',
  // apiUrl: 'https://d2so52llbeo6ij.cloudfront.net/api',
  googleClientId: 'AQUI_TU_CLIENT_ID_DE_GOOGLE'
};