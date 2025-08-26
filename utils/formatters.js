function formatDate(date, includeTime = false) {
  if (!date) return 'N/A';
  
  const dateObj = date instanceof Date ? date : new Date(date);
  if (isNaN(dateObj.getTime())) return 'Invalid Date';
  
  if (includeTime) {
    return dateObj.toLocaleString();
  }
  
  return dateObj.toISOString().split('T')[0];
}

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0h 0m 0s';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

function formatDistance(km, decimals = 2) {
  if (!km || isNaN(km)) return `0.00 km`;
  return `${parseFloat(km).toFixed(decimals)} km`;
}

function formatElevation(meters, unit = 'm') {
  if (!meters || isNaN(meters)) return `0 ${unit}`;
  
  if (unit === 'm') {
    return `${Math.round(meters)} m`;
  } else if (unit === 'ft') {
    return `${Math.round(meters * 3.28084)} ft`;
  } else {
    return `${meters} ${unit}`;
  }
}

function generateProgressBars(distance, goal, type = 'monthly', segments = 10) {
  if (!goal || goal <= 0) return '⚪️'.repeat(segments);
  
  const completed = Math.min(Math.floor((distance / goal) * segments), segments);
  const remaining = segments - completed;
  
  if (type === 'monthly') {
    return '🔵'.repeat(completed) + '⚪️'.repeat(remaining);
  } else {
    return '🟢'.repeat(completed) + '⚪️'.repeat(remaining);
  }
}

// ... rest of the file remains the same
