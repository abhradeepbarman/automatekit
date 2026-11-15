const _config = {
  APP_BASE_URL: import.meta.env.VITE_APP_BASE_URL || '',
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || '',
};

const config = Object.freeze(_config);
export default config;
