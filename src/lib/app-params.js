export const appParams = {
  appId: 'saqr-self-hosted',
  token: localStorage.getItem('saqr_token') || '',
  functionsVersion: 'self-hosted',
  appBaseUrl: window.location.origin,
};
