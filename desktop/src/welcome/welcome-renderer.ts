declare global {
  interface Window {
    welcomeAPI: {
      close(): Promise<void>;
    };
  }
}

document.getElementById('btn-get-started')?.addEventListener('click', () => {
  window.welcomeAPI.close();
});
