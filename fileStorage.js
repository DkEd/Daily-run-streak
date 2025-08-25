const fs = require('fs').promises;
const path = require('path');

class FileStorage {
  constructor() {
    this.dataDir = path.join(__dirname, 'data');
    this.streakFile = path.join(this.dataDir, 'streakData.json');
    this.statsFile = path.join(this.dataDir, 'statsData.json');
  }

  // Ensure data directory exists
  async ensureDataDir() {
    try {
      await fs.access(this.dataDir);
    } catch {
      await fs.mkdir(this.dataDir, { recursive: true });
    }
  }

  // Load data from file with defaults
  async loadData(filePath, defaults) {
    try {
      await this.ensureDataDir();
      const data = await fs.readFile(filePath, 'utf8');
      return { ...defaults, ...JSON.parse(data) };
    } catch (error) {
      console.log(`Creating new data file: ${filePath}`);
      await this.saveData(filePath, defaults);
      return defaults;
    }
  }

  // Save data to file
  async saveData(filePath, data) {
    await this.ensureDataDir();
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  }

  // Streak data methods
  async loadStreakData() {
    const defaults = {
      currentStreak: 0,
      longestStreak: 0,
      totalRuns: 0,
      totalDistance: 0,
      totalTime: 0,
      totalElevation: 0,
      streakStartDate: null,
      lastRunDate: null
    };
    return await this.loadData(this.streakFile, defaults);
  }

  async saveStreakData(data) {
    await this.saveData(this.streakFile, data);
  }

  // Stats data methods
  async loadStatsData() {
    const defaults = {
      monthlyDistance: 0,
      yearlyDistance: 0,
      monthlyTime: 0,
      yearlyTime: 0,
      monthlyElevation: 0,
      yearlyElevation: 0,
      monthlyGoal: 200,
      yearlyGoal: 2000,
      lastUpdated: null
    };
    return await this.loadData(this.statsFile, defaults);
  }

  async saveStatsData(data) {
    await this.saveData(this.statsFile, data);
  }
}

module.exports = FileStorage;
