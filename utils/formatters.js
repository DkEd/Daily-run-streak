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

function formatDistance(meters, unit = 'km', decimals = 1) {
  if (!meters || isNaN(meters)) return `0.0 ${unit}`;
  
  if (unit === 'km') {
    return `${(meters / 1000).toFixed(decimals)} km`;
  } else if (unit === 'miles') {
    return `${(meters / 1609.34).toFixed(decimals)} mi`;
  } else {
    return `${meters} m`;
  }
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

// In utils/formatters.js - update generateProgressBars function
function generateProgressBars(distance, goal, type = 'monthly', segments = 10) {
  if (!goal || goal <= 0) return '⚪️'.repeat(segments);
  
  const completed = Math.min(Math.floor((distance / goal) * segments), segments);
  const remaining = segments - completed;
  
  let bars = '';
  if (type === 'monthly') {
    bars = '🔵'.repeat(completed) + '⚪️'.repeat(remaining);
  } else {
    bars = '🟢'.repeat(completed) + '⚪️'.repeat(remaining);
  }
  
  return bars;
}

function cleanExistingDescription(description) {
  if (!description) return '';
  
  return description
    .split('\n')
    .filter(line => line.trim() !== '')
    .filter(line => !line.includes('🏃🏻‍♂️Daily Run Streak:') && 
                   !line.includes('📊') && 
                   !line.includes('Monthly:') &&
                   !line.includes('Yearly:') &&
                   !line.includes('📷 @DailyRunGuy') &&
                   !line.includes('🔵') &&
                   !line.includes('🟢') &&
                   !line.includes('⚪️'))
    .join('\n')
    .trim();
}

function capitalizeFirst(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Convert km input to meters for storage
function kmToMeters(km) {
  return parseFloat(km) * 1000;
}

// Convert meters to km for display
function metersToKm(meters, decimals = 1) {
  return (meters / 1000).toFixed(decimals);
}

module.exports = {
  formatDate,
  formatTime,
  formatDistance,
  formatElevation,
  generateProgressBars,
  cleanExistingDescription,
  capitalizeFirst,
  kmToMeters,
  metersToKm
};
