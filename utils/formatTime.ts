export const formatTime = (seconds: number, showHours: boolean = false): string => {
  if (isNaN(seconds) || seconds < 0) {
      return showHours ? "00:00:00" : "00:00";
  }
  
  const totalSeconds = Math.floor(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;

  const paddedMinutes = minutes.toString().padStart(2, '0');
  const paddedSeconds = remainingSeconds.toString().padStart(2, '0');

  if (hours > 0 || showHours) {
    const paddedHours = hours.toString().padStart(2, '0');
    return `${paddedHours}:${paddedMinutes}:${paddedSeconds}`;
  }
  
  return `${paddedMinutes}:${paddedSeconds}`;
};