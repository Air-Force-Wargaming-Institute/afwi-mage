import React, { useEffect, useRef } from 'react';
import { makeStyles } from '@material-ui/core/styles';

// Keep grid state outside component to prevent reset on re-renders
let gridState = null;
let isStableState = false;
let stabilityDetectedTimeState = null;
let gridHistoryState = [];

const useStyles = makeStyles(() => ({
  gameOfLifeLoader: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    borderRadius: '8px',
    overflow: 'hidden',
    transform: 'scale(1.15)', // Scale up the entire component by 15%
    transformOrigin: 'center center',
    backgroundColor: 'black' // Add black background to entire component
  },
  canvasContainer: {
    display: 'flex',
    width: '100%',
  },
  loadingText: {
    fontSize: '0.75rem',
    color: 'white',
    padding: '5px 10px',
    backgroundColor: '#2a2a2a', // Dark gray background 
    width: '100%',
    textAlign: 'center',
    marginTop: 0,
    marginBottom: 0,
    borderBottomLeftRadius: '8px',
    borderBottomRightRadius: '8px'
  }
}));

const LoadingScreen = () => {
  const classes = useStyles();
  const canvasRef = useRef(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const size = 50; // Slightly larger grid
    const cellSize = 3; // Keep cell size the same
    
    // Set canvas size precisely
    canvas.width = size * cellSize;
    canvas.height = size * cellSize;
    
    // Function to create a new random grid
    const createNewGrid = () => {
      return Array(size).fill().map(() => 
        Array(size).fill().map(() => Math.random() < 0.15 ? 1 : 0)
      );
    };
    
    // Initialize grid only once across remounts
    if (!gridState) {
      gridState = createNewGrid();
      gridHistoryState = [];
      isStableState = false;
      stabilityDetectedTimeState = null;
    }
    
    // Create a hash representation of the grid for comparison
    const hashGrid = (g) => {
      return g.map(row => row.join('')).join('');
    };
    
    // Game update logic
    const updateGrid = () => {
      // Create a copy of the grid to store the next state
      const newGrid = Array(size).fill().map(() => Array(size).fill(0));
      
      // Loop through each cell in the grid
      for (let x = 0; x < size; x++) {
        for (let y = 0; y < size; y++) {
          // Count live neighbors (with wrapping at edges)
          let neighbors = 0;
          
          // Check all 8 surrounding cells
          for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
              // Skip the cell itself
              if (i === 0 && j === 0) continue;
              
              // Handle wrapping at edges (torus topology)
              const nx = (x + i + size) % size;
              const ny = (y + j + size) % size;
              
              // Count live neighbors
              neighbors += gridState[nx][ny];
            }
          }
          
          // Apply Conway's Game of Life rules:
          // 1. Any live cell with < 2 live neighbors dies (underpopulation)
          // 2. Any live cell with 2-3 live neighbors lives
          // 3. Any live cell with > 3 live neighbors dies (overpopulation)
          // 4. Any dead cell with exactly 3 live neighbors becomes alive (reproduction)
          
          if (gridState[x][y] === 1) {
            // Cell is currently alive
            if (neighbors === 2 || neighbors === 3) {
              newGrid[x][y] = 1; // Cell stays alive
            }
            // Otherwise cell dies (newGrid already initialized to 0)
          } else {
            // Cell is currently dead
            if (neighbors === 3) {
              newGrid[x][y] = 1; // Cell becomes alive
            }
            // Otherwise cell stays dead (newGrid already initialized to 0)
          }
        }
      }
      
      // Check for static stability (no change)
      let isStatic = true;
      for (let x = 0; x < size && isStatic; x++) {
        for (let y = 0; y < size && isStatic; y++) {
          if (newGrid[x][y] !== gridState[x][y]) {
            isStatic = false;
            break;
          }
        }
      }
      
      // Update the grid with the new state
      gridState = newGrid;
      
      // If static, we have stability
      if (isStatic) {
        if (!isStableState) {
          isStableState = true;
          stabilityDetectedTimeState = Date.now();
          console.log("Static stability detected");
        }
        return;
      }
      
      // Check for oscillating patterns
      const currentHash = hashGrid(gridState);
      const repeatIndex = gridHistoryState.indexOf(currentHash);
      
      if (repeatIndex !== -1) {
        // We found a repeating pattern
        if (!isStableState) {
          isStableState = true;
          stabilityDetectedTimeState = Date.now();
          console.log(`Oscillating stability detected with period ${gridHistoryState.length - repeatIndex}`);
        }
      } else {
        // No repeat found, add to history and continue
        isStableState = false;
        stabilityDetectedTimeState = null;
        gridHistoryState.push(currentHash);
        if (gridHistoryState.length > 20) { // MAX_HISTORY = 20
          gridHistoryState.shift(); // Remove oldest entry if we exceed max history
        }
      }
    };
    
    // Animation variables
    let animationId;
    let lastUpdateTime = 0;
    const updateInterval = 120; // Update grid every 120ms
    const STABILITY_RESET_DELAY = 6000; // 6 seconds after stability
    
    const animate = (timestamp) => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw grid
      for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
          if (gridState[i][j] === 1) {
            // Set fill color to white to make cells visible against black background
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(j * cellSize, i * cellSize, cellSize, cellSize);
          }
        }
      }
      
      // Check if we need to reset the grid (6 seconds after stability)
      if (isStableState && stabilityDetectedTimeState) {
        const currentTime = Date.now();
        if (currentTime - stabilityDetectedTimeState > STABILITY_RESET_DELAY) {
          // Reset the grid
          gridState = createNewGrid();
          isStableState = false;
          stabilityDetectedTimeState = null;
          gridHistoryState = [];
          console.log("Grid reset after stability period");
        }
      }
      
      // Update grid only every updateInterval milliseconds
      if (!lastUpdateTime || timestamp - lastUpdateTime > updateInterval) {
        updateGrid();
        lastUpdateTime = timestamp;
      }
      
      // Next frame
      animationId = requestAnimationFrame(animate);
    };
    
    // Start animation
    animationId = requestAnimationFrame(animate);
    
    // Cleanup
    return () => {
      cancelAnimationFrame(animationId);
      // Don't reset grid state here to persist across remounts
    };
  }, []);
  
  return (
    <div className={classes.gameOfLifeLoader}>
      <div className={classes.canvasContainer}>
        <canvas 
          ref={canvasRef}
          style={{ background: 'black', display: 'block' }}
        />
      </div>
      <div className={classes.loadingText}>Processing...</div>
    </div>
  );
};

export default LoadingScreen;