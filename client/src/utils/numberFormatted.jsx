export const formatNumber = (num) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  export const formatTime = (seconds) => {
    const cleanedSeconds = parseInt(seconds.toString().replace(/\s+/g, ''), 10);

    const hours = Math.floor(cleanedSeconds / 3600);
    const minutes = Math.floor((cleanedSeconds % 3600) / 60);
    const remainingSeconds = cleanedSeconds % 60;
  
    return `${hours > 0 ? `${hours}h ` : ''}${minutes > 0 ? `${minutes}m ` : ''}${remainingSeconds}s`;
  };