export const formatCountdown = (expiresAt: number) => {
  const diff = Math.max(0, expiresAt - Date.now());
  const minutes = Math.floor(diff / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
};

export const createId = () => Math.random().toString(36).slice(2, 10);
