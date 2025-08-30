// Admin App Interface
app.get('/xapp', async (req, res) => {
  try {
    const tokenInfo = await stravaAuth.getTokenInfo();
    const statsData = await loadStatsData();
    const streakData = await loadStreakData();
    const redisHealth = await healthCheck();
    
    const authStatus = tokenInfo.hasTokens 
      ? `<div class="auth-status connected">
           <span class="status-dot"></span>
           Connected as: ${tokenInfo.athlete.firstname} ${tokenInfo.athlete.lastname}
           <a href="/auth/status" class="btn btn-sm btn-outline">Account</a>
           <a href="/auth/logout" class="btn btn-sm btn-outline">Logout</a>
         </div>`
      : `<div class="auth-status disconnected">
           <span class="status-dot"></span>
           Not authenticated
           <a href="/auth/strava" class="btn btn-sm btn-primary">Connect Strava</a>
         </div>`;
    
    const redisStatus = redisHealth 
      ? `<div class="status-item success">
           <span class="status-dot"></span>
           Redis: Connected
         </div>`
      : `<div class="status-item error">
           <span class="status-dot"></span>
           Redis: Disconnected
           <a href="/redis-status" class="btn btn-sm btn-outline">Check</a>
         </div>`;

    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Admin - Strava Run Streak</title>
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
        <style>
          :root {
            --primary: #667eea;
            --secondary: #764ba2;
            --success: #10b981;
            --warning: #f59e0b;
            --error: #ef4444;
            --dark: #1f2937;
            --light: #f8fafc;
            --gray: #6b7280;
            --border: #e5e7eb;
          }
          
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; color: #1f2937; line-height: 1.6; }
          
          .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
          .header { background: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); margin-bottom: 2rem; }
          .header h1 { color: var(--dark); margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.75rem; }
          .header h1 i { color: var(--primary); }
          
          .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
          .card { background: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
          .card-header { display: flex; justify-content: between; align-items: center; margin-bottom: 1rem; padding-bottom: 0.75rem; border-bottom: 2px solid var(--border); }
          .card-header h2 { color: var(--dark); font-size: 1.25rem; display: flex; align-items: center; gap: 0.5rem; }
          
          .status-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
          .status-item { display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem; background: var(--light); border-radius: 8px; }
          .status-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
          .status-dot.success { background: var(--success); }
          .status-dot.error { background: var(--error); }
          .status-dot.warning { background: var(--warning); }
          
          .auth-status { display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem; background: var(--light); border-radius: 8px; margin-bottom: 1rem; }
          .auth-status.connected { border-left: 4px solid var(--success); }
          .auth-status.disconnected { border-left: 4px solid var(--error); }
          
          .btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; border-radius: 6px; text-decoration: none; font-weight: 500; transition: all 0.2s; border: none; cursor: pointer; }
          .btn-sm { padding: 0.375rem 0.75rem; font-size: 0.875rem; }
          .btn-primary { background: var(--primary); color: white; }
          .btn-primary:hover { background: #5a67d8; }
          .btn-outline { background: transparent; border: 1px solid var(--border); color: var(--gray); }
          .btn-outline:hover { background: var(--light); border-color: var(--gray); }
          .btn-success { background: var(--success); color: white; }
          .btn-success:hover { background: #059669; }
          .btn-warning { background: var(--warning); color: white; }
          .btn-warning:hover { background: #d97706; }
          
          .mode-toggle { display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: var(--light); border-radius: 8px; margin-bottom: 1rem; }
          .mode-toggle:last-child { margin-bottom: 0; }
          .mode-info { flex: 1; }
          .mode-info h3 { font-size: 1rem; margin-bottom: 0.25rem; }
          .mode-info p { font-size: 0.875rem; color: var(--gray); }
          
          .switch { position: relative; display: inline-block; width: 50px; height: 24px; }
          .switch input { opacity: 0; width: 0; height: 0; }
          .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: var(--gray); transition: .4s; border-radius: 24px; }
          .slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 4px; bottom: 4px; background-color: white; transition: .4s; border-radius: 50%; }
          input:checked + .slider { background-color: var(--success); }
          input:checked + .slider:before { transform: translateX(26px); }
          
          .actions-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; }
          .action-card { background: var(--light); padding: 1.25rem; border-radius: 8px; text-align: center; transition: transform 0.2s; border: none; cursor: pointer; width: 100%; font-family: inherit; }
          .action-card:hover { transform: translateY(-2px); }
          .action-card i { font-size: 1.5rem; margin-bottom: 0.75rem; color: var(--primary); }
          .action-card h3 { font-size: 0.875rem; margin-bottom: 0.5rem; }
          
          .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-top: 1rem; }
          .stat-item { text-align: center; padding: 1rem; background: var(--light); border-radius: 8px; }
          .stat-value { font-size: 1.5rem; font-weight: bold; color: var(--primary); }
          .stat-label { font-size: 0.875rem; color: var(--gray); }
          
          .message { background: #d4edda; color: #155724; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; border: 1px solid #c3e6cb; }
          
          @media (max-width: 768px) {
            .grid { grid-template-columns: 1fr; }
            .status-grid { grid-template-columns: 1fr; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1><i class="fas fa-running"></i> Strava Run Streak Admin</h1>
            ${req.query.message ? `
            <div class="message">
              <i class="fas fa-check-circle"></i> ${decodeURIComponent(req.query.message)}
            </div>
            ` : ''}
            <div class="status-grid">
              ${authStatus}
              ${redisStatus}
            </div>
          </div>
          
          <div class="grid">
            <div class="card">
              <div class="card-header">
                <h2><i class="fas fa-cog"></i> Update Modes</h2>
              </div>
              
              <div class="mode-toggle">
                <div class="mode-info">
                  <h3>Stats Update Mode</h3>
                  <p>${statsData.manuallyUpdated ? 'Manual - Your values are preserved' : 'Auto - Updates with new runs'}</p>
                </div>
                <form action="/toggle-stats-mode" method="POST" style="display: inline;">
                  <label class="switch">
                    <input type="checkbox" ${statsData.manuallyUpdated ? 'checked' : ''} onchange="this.form.submit()">
                    <span class="slider"></span>
                  </label>
                </form>
              </div>
              
              <div class="mode-toggle">
                <div class="mode-info">
                  <h3>Streak Update Mode</h3>
                  <p>${streakData.manuallyUpdated ? 'Manual - Your values are preserved' : 'Auto - Updates with new runs'}</p>
                </div>
                <form action="/toggle-streak-mode" method="POST" style="display: inline;">
                  <label class="switch">
                    <input type="checkbox" ${streakData.manuallyUpdated ? 'checked' : ''} onchange="this.form.submit()">
                    <span class="slider"></span>
                  </label>
                </form>
              </div>
            </div>
            
            <div class="card">
              <div class="card-header">
                <h2><i class="fas fa-fire"></i> Streak Overview</h2>
              </div>
              
              <div class="stats-grid">
                <div class="stat-item">
                  <div class="stat-value">${streakData.currentStreak}</div>
                  <div class="stat-label">Current Streak</div>
                </div>
                <div class="stat-item">
                  <div class="stat-value">${streakData.longestStreak}</div>
                  <div class="stat-label">Longest Streak</div>
                </div>
                <div class="stat-item">
                  <div class="stat-value">${streakData.totalRuns}</div>
                  <div class="stat-label">Total Runs</div>
                </div>
              </div>
              
              <div style="margin-top: 1rem;">
                <a href="/streak-details" class="btn btn-outline btn-sm">
                  <i class="fas fa-chart-bar"></i> View Details
                </a>
                <a href="/manual-streak-update" class="btn btn-outline btn-sm">
                  <i class="fas fa-edit"></i> Manual Update
                </a>
              </div>
            </div>
          </div>
          
          <div class="grid">
            <div class="card">
              <div class="card-header">
                <h2><i class="fas fa-tachometer-alt"></i> Quick Actions</h2>
              </div>
              
              <div class="actions-grid">
                <a href="/update-streak" class="action-card">
                  <i class="fas fa-sync-alt"></i>
                  <h3>Update Streak</h3>
                  <p>Process today's runs</p>
                </a>
                
                <form action="/force-update-last-run" method="POST" style="display: contents;">
                  <button type="submit" class="action-card">
                    <i class="fas fa-redo-alt"></i>
                    <h3>Force Update</h3>
                    <p>Reset last run date</p>
                  </button>
                </form>
                
                <a href="/stats" class="action-card">
                  <i class="fas fa-chart-line"></i>
                  <h3>View Stats</h3>
                  <p>Running statistics</p>
                </a>
                
                <a href="/setup-webhook" class="action-card">
                  <i class="fas fa-plug"></i>
                  <h3>Setup Webhook</h3>
                  <p>Automatic updates</p>
                </a>
                
                <a href="/debug" class="action-card">
                  <i class="fas fa-bug"></i>
                  <h3>Debug</h3>
                  <p>Troubleshooting tools</p>
                </a>
              </div>
            </div>
            
            <div class="card">
              <div class="card-header">
                <h2><i class="fas fa-wrench"></i> Maintenance</h2>
              </div>
              
              <div style="display: grid; gap: 0.75rem;">
                <a href="/manual-streak-update" class="btn btn-outline">
                  <i class="fas fa-edit"></i> Manual Streak Update
                </a>
                <a href="/manual-stats-update" class="btn btn-outline">
                  <i class="fas fa-sliders-h"></i> Manual Stats Update
                </a>
                <a href="/force-update-last-run" class="btn btn-outline">
                  <i class="fas fa-redo"></i> Force Reset Last Run
                </a>
                <a href="/health" class="btn btn-outline">
                  <i class="fas fa-heartbeat"></i> System Health
                </a>
                <a href="/debug" class="btn btn-outline">
                  <i class="fas fa-tools"></i> Debug Dashboard
                </a>
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    res.send(`
      <h1>Error Loading Admin</h1>
      <p>${error.message}</p>
      <a href="/auth/strava">Connect Strava</a>
    `);
  }
});
