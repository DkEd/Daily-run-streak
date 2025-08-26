// In the DEFAULT_DATA object, update the initial values:
const DEFAULT_DATA = {
  STATS: {
    monthlyDistance: 0.00,    // Now in km with 2 decimals
    yearlyDistance: 0.00,     // Now in km with 2 decimals
    monthlyTime: 0,
    yearlyTime: 0,
    monthlyElevation: 0,
    yearlyElevation: 0,
    monthlyGoal: 250.00,      // Now in km with 2 decimals
    yearlyGoal: 3250.00,      // Now in km with 2 decimals
    lastUpdated: new Date().toISOString()
  },
  STREAK: {
    currentStreak: 0,
    longestStreak: 0,
    totalRuns: 0,
    totalDistance: 0.00,      // Now in km with 2 decimals
    totalTime: 0,
    totalElevation: 0,
    streakStartDate: new Date().toISOString().split('T')[0],
    lastRunDate: null,
    manuallyUpdated: false,
    lastManualUpdate: null
  },
  // ... rest remains the same
};
