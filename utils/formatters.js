function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

function generateProgressBars(distance, goal, type = 'monthly', segments = 10) {
  const completed = Math.min(Math.floor((distance / goal) * segments), segments);
  
  if (type === 'monthly') {
    return '🔵'.repeat(completed) + '⚪️'.repeat(segments - completed);
  } else {
    return '🟢'.repeat(completed) + '⚪️'.repeat(segments - completed);
  }
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

module.exports = {
  formatDate,
  formatTime,
  generateProgressBars,
  cleanExistingDescription
};
