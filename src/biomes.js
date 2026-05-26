// ============================================
// biomes.js — Biome palettes & active-biome lookup
// ============================================

(function() {
  // Each biome unlocks at a distance threshold (in meters) within a single run.
  // Distance in meters == Math.floor(TD.state.distance * 100) (see ui.js).
  // Palettes are consumed by environment.js and obstacles.js.

  TD.biomes = [
    {
      name: 'Jungle Temple',
      unlockAt: 0,
      palette: {
        skyTop:    '#1a3a2a',
        skyMid:    '#2a5a3a',
        skyBottom: '#3a6a3a',
        canopyFar: '#1a3a1a',
        canopyNear:'#0d2d12',
        fog:       'rgba(60,100,60,0.3)',
        groundTop:    '#3a5a2a',
        groundMid:    '#2a4a1a',
        groundBottom: '#1a3a0a',
        pathStone:    '#5a6a5a',
        pathOverlay:  ['rgba(90,110,80,0.6)', 'rgba(70,90,65,0.4)', 'rgba(60,80,55,0.3)'],
        pathBorder:   '#4a5a3a',
        wallInner:    ['#6a7a5a', '#5a6a4a', '#4a5a3a'],
        wallOuter:    '#3a4a2a',
        wallTop:      '#7a8a6a',
        wallMoss:     'rgba(40,90,25,0.3)',
        treeTrunk:    '#3a2a1a',
        treeCanopy:   ['#2a5a1a', '#1a4a15', '#3a6a25'],
        obstacleFront:['#5a6a4a', '#6a7a5a', '#5a6a4a', '#4a5a3a'],
        obstacleTop:  '#7a8a6a',
        obstacleMoss: 'rgba(40,95,25,0.3)',
        obstacleEdge: 'rgba(40,50,30,0.4)',
        vignette:     'rgba(0,10,0,0.45)',
        tint:         'rgba(0,30,0,0.08)',
      },
    },
    {
      name: 'Desert Ruins',
      unlockAt: 300,
      palette: {
        skyTop:    '#d98a3a',
        skyMid:    '#e6a86a',
        skyBottom: '#f2c890',
        canopyFar: '#a86a3a',
        canopyNear:'#7a4a25',
        fog:       'rgba(220,160,90,0.35)',
        groundTop:    '#caa56a',
        groundMid:    '#a8854a',
        groundBottom: '#6a4a25',
        pathStone:    '#c8b078',
        pathOverlay:  ['rgba(220,190,130,0.55)', 'rgba(180,150,100,0.4)', 'rgba(140,110,75,0.3)'],
        pathBorder:   '#8a6a3a',
        wallInner:    ['#d4a86a', '#b48a4a', '#8a6a3a'],
        wallOuter:    '#6a4a25',
        wallTop:      '#e6c48a',
        wallMoss:     'rgba(160,100,40,0.3)',
        treeTrunk:    '#5a3a1a',
        treeCanopy:   ['#a8843a', '#8a6a2a', '#c4a04a'],
        obstacleFront:['#b89060', '#d4a878', '#b89060', '#8a6a3a'],
        obstacleTop:  '#e6c48a',
        obstacleMoss: 'rgba(120,80,30,0.3)',
        obstacleEdge: 'rgba(60,40,20,0.4)',
        vignette:     'rgba(40,20,0,0.45)',
        tint:         'rgba(100,60,20,0.08)',
      },
    },
    {
      name: 'Frozen Sanctum',
      unlockAt: 700,
      palette: {
        skyTop:    '#2a4a6a',
        skyMid:    '#5a8aaa',
        skyBottom: '#a8c8dc',
        canopyFar: '#5a7a9a',
        canopyNear:'#3a5a7a',
        fog:       'rgba(200,220,240,0.4)',
        groundTop:    '#b8d4e6',
        groundMid:    '#8aaac8',
        groundBottom: '#5a7a9a',
        pathStone:    '#c8dce8',
        pathOverlay:  ['rgba(220,235,245,0.6)', 'rgba(180,205,225,0.4)', 'rgba(140,170,195,0.3)'],
        pathBorder:   '#6a8aaa',
        wallInner:    ['#d4e4f0', '#a8c4d8', '#7a9ab8'],
        wallOuter:    '#5a7a9a',
        wallTop:      '#e8f0f8',
        wallMoss:     'rgba(120,180,220,0.35)',
        treeTrunk:    '#3a3a4a',
        treeCanopy:   ['#c8dce8', '#a8c4d8', '#e0eef6'],
        obstacleFront:['#a8c0d4', '#c8dce8', '#a8c0d4', '#7a9ab8'],
        obstacleTop:  '#e8f0f8',
        obstacleMoss: 'rgba(100,160,200,0.3)',
        obstacleEdge: 'rgba(40,60,80,0.4)',
        vignette:     'rgba(20,40,60,0.4)',
        tint:         'rgba(60,90,120,0.08)',
      },
    },
    {
      name: 'Lava Citadel',
      unlockAt: 1200,
      palette: {
        skyTop:    '#3a0a0a',
        skyMid:    '#7a1a0a',
        skyBottom: '#c43a1a',
        canopyFar: '#4a0a0a',
        canopyNear:'#2a0505',
        fog:       'rgba(220,80,40,0.35)',
        groundTop:    '#3a1a1a',
        groundMid:    '#2a0a0a',
        groundBottom: '#1a0505',
        pathStone:    '#5a3a3a',
        pathOverlay:  ['rgba(140,60,40,0.55)', 'rgba(100,40,30,0.4)', 'rgba(70,25,20,0.3)'],
        pathBorder:   '#3a1a1a',
        wallInner:    ['#7a3a2a', '#5a2a1a', '#3a1a0a'],
        wallOuter:    '#2a0a05',
        wallTop:      '#8a4a3a',
        wallMoss:     'rgba(220,90,40,0.35)',
        treeTrunk:    '#1a0a05',
        treeCanopy:   ['#5a1a0a', '#3a0a05', '#7a2a15'],
        obstacleFront:['#6a2a1a', '#8a3a25', '#6a2a1a', '#4a1a0a'],
        obstacleTop:  '#9a4a3a',
        obstacleMoss: 'rgba(230,100,40,0.4)',
        obstacleEdge: 'rgba(30,10,5,0.5)',
        vignette:     'rgba(60,0,0,0.5)',
        tint:         'rgba(120,20,0,0.1)',
      },
    },
  ];

  // Returns the active biome for a given distance (in meters).
  TD.getActiveBiome = function(distanceMeters) {
    let active = TD.biomes[0];
    for (let i = 0; i < TD.biomes.length; i++) {
      if (distanceMeters >= TD.biomes[i].unlockAt) active = TD.biomes[i];
      else break;
    }
    return active;
  };

  TD.getActiveBiomeIndex = function(distanceMeters) {
    let idx = 0;
    for (let i = 0; i < TD.biomes.length; i++) {
      if (distanceMeters >= TD.biomes[i].unlockAt) idx = i;
      else break;
    }
    return idx;
  };

  // Convenience: pull the active palette using TD.state.distance (game units).
  TD.activePalette = function() {
    const meters = TD.state ? TD.state.distance * 100 : 0;
    return TD.getActiveBiome(meters).palette;
  };
})();
