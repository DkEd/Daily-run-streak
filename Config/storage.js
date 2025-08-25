const fs = require('fs').promises;
const path = require('path');

const dataDir = path.join(__dirname, '../data');
const streakFile = path.join(dataDir, 'streakData.json');
const statsFile = path.join(dataDir, 'statsData.json');

async function ensureDataDir() {
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

async function loadData(filePath, defaults) {
  try {
    await ensureDataDir();
    const data = await fs.readFile(filePath, 'utf8');
    const fileData = JSON.parse(data);
    
    if (fileData.lastManualUpdate) {
      const fileUpdateDate = new Date(fileData.lastManualUpdate);
      const defaultUpdateDate = new Date(defaults.lastManualUpdate);
      
      if (fileUpdateDate >= defaultUpdateDate) {
        return fileData;
      }
    }
    
    return { ...defaults, ...fileData };
  } catch (error) {
    await saveData(filePath, defaults);
    return defaults;
  }
}

async function saveData(filePath, data) {
  await ensureDataDir();
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

async function loadStreakData() {
  const defaults = {
    currentStreak: 238,
    longestStreak: 238,
    totalRuns: 238,
    totalDistance: 2346600,
    totalTime: 699900,
    totalElevation: 25714,
    streakStartDate: "2024-12-31",
    lastRunDate: new Date(Date.now() - 86400000).toDateString(),
    manuallyUpdated: true,
    lastManualUpdate: new Date().toDateString()
  };

  return await loadData(streakFile, defaults);
}

async function saveStreakData(data) {
  data.lastManualUpdate = new Date().toDateString();
  await saveData(streakFile, data);
}

async function loadStatsData() {
  const defaults = {
    monthlyDistance: 229.5,
    yearlyDistance: 2336.0,
    monthlyTime: 0,
    yearlyTime: 0,
    monthlyElevation: 2793,
    yearlyElevation: 25595,
    monthlyGoal: 250,
    yearlyGoal: 3250,
    lastUpdated: null
  };

  return await loadData(statsFile, defaults);
}

async function saveStatsData(data) {
  data.lastUpdated = new Date().toISOString();
  await saveData(statsFile, data);
}

module.exports = {
  loadStreakData,
  saveStreakData,
  loadStatsData,
  saveStatsData
};
