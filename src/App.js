import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';

const GRID_SIZE = 4;
const DIRECTIONS = {
  UP: 'up',
  DOWN: 'down',
  LEFT: 'left',
  RIGHT: 'right'
};
const TARGET_VALUE = 2048;

const difficultySettings = {
  easy: { depth: 2, speed: 300, delay: 1500  },
  medium: { depth: 3, speed: 200 , delay: 1000},
  hard: { depth: 4, speed: 150, delay: 800 },
  expert: { depth: 5, speed: 100, delay: 500 }
};

const badgeInfo = {
  256: { title: "256 Expert", color: "#f2b179", icon: "🥉" },
  512: { title: "512 Master", color: "#f59563", icon: "🥈" },
  1024: { title: "1024 Champion", color: "#f67c5f", icon: "🏆" },
  2048: { title: "2048 Legend", color: "#e74c3c", icon: "🌟" }
};



function App() {
  const [grid, setGrid] = useState(initializeGrid());
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [playerTurn, setPlayerTurn] = useState(true);
  const [gameMode, setGameMode] = useState('player');
  const [lastMoveHadMerge, setLastMoveHadMerge] = useState(false);
  const [consecutiveMerges, setConsecutiveMerges] = useState(0);
  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [currentMoveScore, setCurrentMoveScore] = useState(0);
  const [lastMoveDirection, setLastMoveDirection] = useState(null);
  const [highlightDirection, setHighlightDirection] = useState(null);
  const [tileAnimations, setTileAnimations] = useState({});
  const [bestScore, setBestScore] = useState(() => {
  // Initialize from localStorage if available
     return parseInt(localStorage.getItem('bestScore')) || 0;
  });
  const [scoreUpdated, setScoreUpdated] = useState(false);
  const [newBest, setNewBest] = useState(false); 
  const [streaks, setStreaks] = useState(() => {
    const saved = localStorage.getItem('2048-streaks');
    return saved ? JSON.parse(saved) : {
      128: 0,
      256: 0,
      512: 0,
      1024: 0,
      2048: 0,
      highest: 0
    };
  });
  const [sessionStreaks, setSessionStreaks] = useState({
    128: 0,
    256: 0,
    512: 0,
    1024: 0,
    2048: 0,
    highest: 0
  });
  const [achievements, setAchievements] = useState(() => {
    const saved = localStorage.getItem('2048-achievements');
    return saved ? JSON.parse(saved) : {
      256: { unlocked: false, showBadge: false, count: 0 },
      512: { unlocked: false, showBadge: false, count: 0 },
      1024: { unlocked: false, showBadge: false, count: 0 },
      2048: { unlocked: false, showBadge: false, count: 0 }
    };
  });
  
  const [sessionAchievements, setSessionAchievements] = useState({
    256: { unlocked: false, showBadge: false, count: 0 },
    512: { unlocked: false, showBadge: false, count: 0 },
    1024: { unlocked: false, showBadge: false, count: 0 },
    2048: { unlocked: false, showBadge: false, count: 0 }
  });
   const [aiThinking, setAIThinking] = useState(false);
  const [keepPlaying, setKeepPlaying] = useState(false);

    const moveSound = useRef(null);
    const aiMoveSound = useRef(null);
    const mergeSound = useRef(null);
    const aiMergeSound = useRef(null);
    const appearSound = useRef(null);
    const winSound = useRef(null);
    const loseSound = useRef(null);
    const bestScoreSound = useRef(null);
    const achievementSound = useRef(null);

    useEffect(() => {
        moveSound.current = new Audio('/sounds/move.mp3');
        aiMoveSound.current = new Audio('/sounds/ai-move.mp3');
        mergeSound.current = new Audio('/sounds/merge.mp3');
        aiMergeSound.current = new Audio('/sounds/ai-merge.mp3');
        appearSound.current = new Audio('/sounds/appear.mp3');
        winSound.current = new Audio('/sounds/win.mp3');
        loseSound.current = new Audio('/sounds/lose.mp3');
        bestScoreSound.current = new Audio('/sounds/best.mp3');
        achievementSound.current = new Audio('/sounds/achievement.mp3');
        
        // Preload sounds
        [moveSound, aiMoveSound, mergeSound, aiMergeSound, appearSound, winSound, loseSound, bestScoreSound, achievementSound].forEach(sound => {
          sound.current.load();
          sound.current.volume = 0.3; // Set appropriate volume
        });
      }, []);
    
      const playSound = (soundRef) => {
        if (soundRef.current) {
          soundRef.current.currentTime = 0; // Rewind if already playing
          soundRef.current.play().catch(e => console.log("Audio play failed:", e));
        }
      };

  useEffect(() => {
      // Load best score
      const savedBest = localStorage.getItem('bestScore');
      if (savedBest) {
        setBestScore(parseInt(savedBest));
      }
    }, []);

    useEffect(() => {
        const savedStreaks = localStorage.getItem('2048-streaks');
        if (savedStreaks) {
          setStreaks(JSON.parse(savedStreaks));
        }
      }, []);
      
      useEffect(() => {
        localStorage.setItem('2048-streaks', JSON.stringify(streaks));
      }, [streaks]);
    
      useEffect(() => {
    const savedAchievements = localStorage.getItem('2048-achievements');
    if (savedAchievements) {
      setAchievements(JSON.parse(savedAchievements));
    }
      }, []);
      
      useEffect(() => {
        localStorage.setItem('2048-achievements', JSON.stringify(achievements));
      }, [achievements]);

      useEffect(() => {
        resetGame();
      }, []);

  // Initialize grid with two random tiles
  function initializeGrid() {
    const newGrid = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(0));
    addRandomTile(newGrid, true);
    addRandomTile(newGrid, true);
    return newGrid;
  }

  // Add random tile to empty cell
  function addRandomTile(grid, initial = false) {
    const emptyCells = [];
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        if (grid[i][j] === 0) {
          emptyCells.push({ row: i, col: j });
        }
      }
    }
    
    if (emptyCells.length > 0) {
      const { row, col } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      grid[row][col] = Math.random() < 0.9 ? 2 : 4;

      if (!initial) {
        playSound(appearSound);
        // Add appear animation for new tile
        setTileAnimations(prev => ({
          ...prev,
          [`${row}-${col}`]: { type: 'appear', key: Date.now() }
        }));
      }

      //playSound(appearSound);
    }
  }

  // Check if game is over
  function checkGameOver(grid) {
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        if (grid[i][j] === 0) return false;
        if (i < GRID_SIZE - 1 && grid[i][j] === grid[i + 1][j]) return false;
        if (j < GRID_SIZE - 1 && grid[i][j] === grid[i][j + 1]) return false;
      }
    }
    return true;
  }

  // Check if player has won
  function checkGameWon(grid) {
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        if (grid[i][j] === TARGET_VALUE) return true;
      }
    }
    return false;
  }

  // Move tiles in specified direction
  const moveTiles = useCallback((direction, isAIMove = false) => {
    
    if (gameOver && !keepPlaying) return false;
    if(!isAIMove) setAIThinking(false);

  // In turn-based mode, validate whose turn it is
  if (gameMode === 'turn-based') {
    if ((!isAIMove && !playerTurn) || (isAIMove && playerTurn)) return false;
  }
  setHighlightDirection(direction);
  setTimeout(() => setHighlightDirection(null), 500);
  const newAnimations = {};

  // Track merged tiles to prevent multiple merges
  const mergedTiles = new Set();

    const newGrid = JSON.parse(JSON.stringify(grid));
    let moved = false;
    let scoreIncrease = 0;
    let hadMerge = false;
    

    // Process movement based on direction
  /*  switch (direction) {
      case DIRECTIONS.UP:
        for (let j = 0; j < GRID_SIZE; j++) {
          for (let i = 1; i < GRID_SIZE; i++) {
            if (newGrid[i][j] !== 0) {
              let row = i;
              while (row > 0 && newGrid[row - 1][j] === 0) {
                newGrid[row - 1][j] = newGrid[row][j];
                newGrid[row][j] = 0;
                row--;
                moved = true;
              }
              if (row > 0 && newGrid[row - 1][j] === newGrid[row][j]) {
                newGrid[row - 1][j] *= 2;
                scoreIncrease += newGrid[row - 1][j];
                newGrid[row][j] = 0;
                moved = true;
                hadMerge = true;
                if (newGrid[row - 1][j] === 2048) setGameWon(true);
              }
            }
          }
        }
        break;

      case DIRECTIONS.DOWN:
        for (let j = 0; j < GRID_SIZE; j++) {
          for (let i = GRID_SIZE - 2; i >= 0; i--) {
            if (newGrid[i][j] !== 0) {
              let row = i;
              while (row < GRID_SIZE - 1 && newGrid[row + 1][j] === 0) {
                newGrid[row + 1][j] = newGrid[row][j];
                newGrid[row][j] = 0;
                row++;
                moved = true;
              }
              if (row < GRID_SIZE - 1 && newGrid[row + 1][j] === newGrid[row][j]) {
                newGrid[row + 1][j] *= 2;
                scoreIncrease += newGrid[row + 1][j];
                newGrid[row][j] = 0;
                moved = true;
                hadMerge = true;
                if (newGrid[row + 1][j] === 2048) setGameWon(true);
              }
            }
          }
        }
        break;

      case DIRECTIONS.LEFT:
        for (let i = 0; i < GRID_SIZE; i++) {
          for (let j = 1; j < GRID_SIZE; j++) {
            if (newGrid[i][j] !== 0) {
              let col = j;
              while (col > 0 && newGrid[i][col - 1] === 0) {
                newGrid[i][col - 1] = newGrid[i][col];
                newGrid[i][col] = 0;
                col--;
                moved = true;
              }
              if (col > 0 && newGrid[i][col - 1] === newGrid[i][col]) {
                newGrid[i][col - 1] *= 2;
                scoreIncrease += newGrid[i][col - 1];
                newGrid[i][col] = 0;
                moved = true;
                hadMerge = true;
                if (newGrid[i][col - 1] === 2048) setGameWon(true);
              }
            }
          }
        }
        break;

      case DIRECTIONS.RIGHT:
        for (let i = 0; i < GRID_SIZE; i++) {
          for (let j = GRID_SIZE - 2; j >= 0; j--) {
            if (newGrid[i][j] !== 0) {
              let col = j;
              while (col < GRID_SIZE - 1 && newGrid[i][col + 1] === 0) {
                newGrid[i][col + 1] = newGrid[i][col];
                newGrid[i][col] = 0;
                col++;
                moved = true;
              }
              if (col < GRID_SIZE - 1 && newGrid[i][col + 1] === newGrid[i][col]) {
                newGrid[i][col + 1] *= 2;
                scoreIncrease += newGrid[i][col + 1];
                newGrid[i][col] = 0;
                moved = true;
                hadMerge = true;
                if (newGrid[i][col + 1] === 2048) setGameWon(true);
              }
            }
          }
        }
        break;

      default:
        break;
    }  */

        // Process the grid based on direction
    const processCell = (row, col) => {
      let currentValue = newGrid[row][col];
      if (currentValue === 0) return;

      let newRow = row;
      let newCol = col;
      let nextRow = row;
      let nextCol = col;

      if (direction === 'up') {
        nextRow = row - 1;
      } else if (direction === 'down') {
        nextRow = row + 1;
      } else if (direction === 'left') {
        nextCol = col - 1;
      } else if (direction === 'right') {
        nextCol = col + 1;
      }

      if (nextRow >= 0 && nextRow < 4 && nextCol >= 0 && nextCol < 4) {
        if (newGrid[nextRow][nextCol] === 0) {
          // Move to empty cell
          newGrid[nextRow][nextCol] = currentValue;
          newGrid[row][col] = 0;
          moved = true;
          
          // Add move animation
          newAnimations[`${nextRow}-${nextCol}`] = {
            type: 'move',
            fromRow: row,
            fromCol: col,
            key: Date.now()
          };
          
          processCell(nextRow, nextCol);
        } else if (
          newGrid[nextRow][nextCol] === currentValue &&
          !mergedTiles.has(`${nextRow}-${nextCol}`)
        ) {
          // Merge with same value
          newGrid[nextRow][nextCol] *= 2;
          newGrid[row][col] = 0;
          scoreIncrease += newGrid[nextRow][nextCol];
          moved = true;
          hadMerge = true;
          mergedTiles.add(`${nextRow}-${nextCol}`);
          
          // Add merge animation
          newAnimations[`${nextRow}-${nextCol}`] = {
            type: 'merge',
            fromRow: row,
            fromCol: col,
            key: Date.now()
          };
          
          // Add pop animation for merged tile
          setTimeout(() => {
            setTileAnimations(prev => ({
              ...prev,
              [`${nextRow}-${nextCol}`]: { type: 'pop', key: Date.now() }
            }));
          }, 100);

          if (newGrid[nextRow][nextCol] === 2048 && !gameWon) {
            setGameWon(true);
          }
     
           // Update this in your moveTiles function where merges happen:
if (newGrid[nextRow][nextCol] === currentValue * 2) {
  const mergedValue = newGrid[nextRow][nextCol];
  
  if ([128, 256, 512, 1024, 2048].includes(mergedValue)) {
    // Update both streak trackers
    setStreaks(prev => {
      const newStreaks = {
        ...prev,
        [mergedValue]: prev[mergedValue] + 1,
        highest: Math.max(prev.highest, mergedValue)
      };
      localStorage.setItem('2048-streaks', JSON.stringify(newStreaks));
      return newStreaks;
    });
    
    setSessionStreaks(prev => ({
      ...prev,
      [mergedValue]: prev[mergedValue] + 1,
      highest: Math.max(prev.highest, mergedValue)
    }));
    
    // Visual feedback for milestones
    if (mergedValue >= 512) {
      setTileAnimations(prev => ({
        ...prev,
        [`${nextRow}-${nextCol}`]: { 
          type: 'celebrate', 
          key: Date.now(),
          value: mergedValue
        }
      }));
    }
  }
  if ([256, 512, 1024, 2048].includes(mergedValue)) {
    setAchievements(prev => {
      const wasUnlocked = prev[mergedValue].unlocked; // Defined here
      const newCount = prev[mergedValue].count + 1;   // Defined here
      const shouldShow = !wasUnlocked || newCount % 5 === 0;
      

      const newState = {
        ...prev,
        [mergedValue]: {
          unlocked: true,
          showBadge: shouldShow,
          count: newCount
        }
      };
      
      localStorage.setItem('2048-achievements', JSON.stringify(newState));
      setSessionAchievements(prev => {
        const wasUnlocked = prev[mergedValue].unlocked;
        const newCount = prev[mergedValue].count + 1;
        const shouldShow = !wasUnlocked || newCount % 5 === 0;
        
        return {
          ...prev,
          [mergedValue]: {
            unlocked: true,
            showBadge: shouldShow,
            count: newCount
          }
        };
      });

      
        

       // Show badge if needed (from either tracker)
const shouldShowBadge = 
(!achievements[mergedValue].unlocked && !sessionAchievements[mergedValue].unlocked) || 
(achievements[mergedValue].count + 1) % 5 === 0;

      if (shouldShowBadge) {
        
        setTimeout(() => {
          setAchievements(prev => ({
            ...prev,
            [mergedValue]: { ...prev[mergedValue], showBadge: false }
          }));
          setSessionAchievements(prev => ({
            ...prev,
            [mergedValue]: { ...prev[mergedValue], showBadge: false }
          }));
          
        }, 3000);
        
        playSound(achievementSound);
        announceMilestone(mergedValue);
      }
      
      return newState;
    });
}
}
        }
      }
    };

    // Process cells in the correct order based on direction
    if (direction === 'up') {
      for (let i = 1; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
          processCell(i, j);
        }
      }
    } else if (direction === 'down') {
      for (let i = 2; i >= 0; i--) {
        for (let j = 0; j < 4; j++) {
          processCell(i, j);
        }
      }
    } else if (direction === 'left') {
      for (let j = 1; j < 4; j++) {
        for (let i = 0; i < 4; i++) {
          processCell(i, j);
        }
      }
    } else if (direction === 'right') {
      for (let j = 2; j >= 0; j--) {
        for (let i = 0; i < 4; i++) {
          processCell(i, j);
        }
      }
    }

    if (moved) {
      addRandomTile(newGrid);
      setGrid(newGrid);
      
        playSound(moveSound); 
      
        
     // setScore(prevScore => prevScore + scoreIncrease);
      setLastMoveHadMerge(hadMerge);
      setCurrentMoveScore(scoreIncrease);
      
    // Update the appropriate score
    if (isAIMove) {
      setAiScore(prev => {
       const newScore= prev + scoreIncrease
       if (newScore > bestScore) {
        updateBestScore(newScore);
      }
      return prev + scoreIncrease
      });
      setScoreUpdated(true);
      setTimeout(() => setScoreUpdated(false), 500);
    } else {
      setPlayerScore(prev => {
        const newScore = prev + scoreIncrease;
        if (newScore > bestScore) {
          updateBestScore(newScore);
          playSound(bestScoreSound);    
        }
        return prev + scoreIncrease

      });
      setScoreUpdated(true);
      setTimeout(() => setScoreUpdated(false), 500);
    }
      if (checkGameOver(newGrid)) {
        setGameOver(true);
        playSound(loseSound);
      }
      if (checkGameWon(newGrid)){
         setGameWon(true);
         playSound(winSound);
      }

       // Handle turn logic based on merges
    if (gameMode === 'turn-based') {
      if (hadMerge) {
        setConsecutiveMerges(prev => prev + 1);
        if(aiMove){
          playSound(aiMergeSound);
        } else {
          playSound(mergeSound);
        }
        
        //playSound(mergeSound);
        // Continue same turn if merge occurred
        if (!isAIMove) {
          // Player keeps turn
          return true;
        } else {
          // AI will automatically take next move
          return true;
        }
      } else {
        // No merge - switch turns
        setConsecutiveMerges(0);
        setPlayerTurn(!playerTurn);
      }

    }

      return true;
    }
    if (gameMode === 'turn-based' && isAIMove) {
      setPlayerTurn(true);
    }
setLastMoveDirection(direction);

    return false;
  }, [grid, gameOver, gameMode, playerTurn, keepPlaying, gameWon]);

  // AI move logic
  const aiMove = useCallback(() => {
    if (gameOver || gameMode !== 'turn-based' || playerTurn || (gameWon && !keepPlaying)) return;
    setAIThinking(true);
    const directions = [
      DIRECTIONS.UP,
      DIRECTIONS.RIGHT,
      DIRECTIONS.DOWN,
      DIRECTIONS.LEFT
    ];
    
    const mergeMoves = [];
  const regularMoves = [];
  
  for (const direction of directions) {
    const testGrid = JSON.parse(JSON.stringify(grid));
    const { hadMerge, moved } = simulateMove(testGrid, direction);
    
    if (moved) {
      if (hadMerge) {
        mergeMoves.push(direction);
      } else {
        regularMoves.push(direction);
      }
    }
  }

  
    // If merge moves available, pick one randomly
    // If we have merge moves available (and we want to continue merge chains)
  if (mergeMoves.length > 0) {
    // For better AI, evaluate which merge move is best
    let bestMergeScore = -1;
    let bestMergeDirection = null;
    
    for (const direction of mergeMoves) {
      const testGrid = JSON.parse(JSON.stringify(grid));
      const { newGrid, scoreIncrease } = simulateMove(testGrid, direction);
      
      const emptyCells = countEmptyCells(newGrid);
      const maxTile = getMaxTile(newGrid);
      const mergeScore = scoreIncrease * 2 + emptyCells + maxTile;
      
      if (mergeScore > bestMergeScore) {
        bestMergeScore = mergeScore;
        bestMergeDirection = direction;
      }
    }

    if (bestMergeDirection) {
      setTimeout(() => {
        moveTiles(bestMergeDirection, true);
      }, 500);
      return;
    }
  }

    // If no merge moves (or we're not continuing a chain), use regular moves
  if (regularMoves.length > 0) {
    let bestScore = -1;
    let bestDirection = null;

    for (const direction of regularMoves) {
      const testGrid = JSON.parse(JSON.stringify(grid));
      const { newGrid, scoreIncrease } = simulateMove(testGrid, direction);
      
      const emptyCells = countEmptyCells(newGrid);
      const maxTile = getMaxTile(newGrid);
      const heuristicScore = scoreIncrease + emptyCells * 5 + maxTile;

      if (heuristicScore > bestScore) {
        bestScore = heuristicScore;
        bestDirection = direction;
      }
    }

    if (bestDirection) {
      setTimeout(() => {
        moveTiles(bestDirection, true);
      }, 500);
      setTimeout(() => {
        setAIThinking(false);
      }, 200);
      return;
    }
   }
 
    //setAIThinking(false);

  }, [grid, gameOver, gameMode, playerTurn, moveTiles, lastMoveHadMerge, aiThinking, gameWon, keepPlaying]);

  // Simulate move without modifying state
  function simulateMove(grid, direction) {
    const newGrid = JSON.parse(JSON.stringify(grid));
    let moved = false;
    let scoreIncrease = 0;
    let hadMerge = false;

    switch (direction) {
      case DIRECTIONS.UP:
        for (let j = 0; j < GRID_SIZE; j++) {
          for (let i = 1; i < GRID_SIZE; i++) {
            if (newGrid[i][j] !== 0) {
              let row = i;
              while (row > 0 && newGrid[row - 1][j] === 0) {
                newGrid[row - 1][j] = newGrid[row][j];
                newGrid[row][j] = 0;
                row--;
                moved = true;
              }
              if (row > 0 && newGrid[row - 1][j] === newGrid[row][j]) {
                newGrid[row - 1][j] *= 2;
                scoreIncrease += newGrid[row - 1][j];
                newGrid[row][j] = 0;
                moved = true;
                hadMerge = true;
              }
            }
          }
        }
        break;

      case DIRECTIONS.DOWN:
        for (let j = 0; j < GRID_SIZE; j++) {
          for (let i = GRID_SIZE - 2; i >= 0; i--) {
            if (newGrid[i][j] !== 0) {
              let row = i;
              while (row < GRID_SIZE - 1 && newGrid[row + 1][j] === 0) {
                newGrid[row + 1][j] = newGrid[row][j];
                newGrid[row][j] = 0;
                row++;
                moved = true;
              }
              if (row < GRID_SIZE - 1 && newGrid[row + 1][j] === newGrid[row][j]) {
                newGrid[row + 1][j] *= 2;
                scoreIncrease += newGrid[row + 1][j];
                newGrid[row][j] = 0;
                moved = true;
                hadMerge = true;
              }
            }
          }
        }
        break;

      case DIRECTIONS.LEFT:
        for (let i = 0; i < GRID_SIZE; i++) {
          for (let j = 1; j < GRID_SIZE; j++) {
            if (newGrid[i][j] !== 0) {
              let col = j;
              while (col > 0 && newGrid[i][col - 1] === 0) {
                newGrid[i][col - 1] = newGrid[i][col];
                newGrid[i][col] = 0;
                col--;
                moved = true;
              }
              if (col > 0 && newGrid[i][col - 1] === newGrid[i][col]) {
                newGrid[i][col - 1] *= 2;
                scoreIncrease += newGrid[i][col - 1];
                newGrid[i][col] = 0;
                moved = true;
                hadMerge = true;
              }
            }
          }
        }
        break;

      case DIRECTIONS.RIGHT:
        for (let i = 0; i < GRID_SIZE; i++) {
          for (let j = GRID_SIZE - 2; j >= 0; j--) {
            if (newGrid[i][j] !== 0) {
              let col = j;
              while (col < GRID_SIZE - 1 && newGrid[i][col + 1] === 0) {
                newGrid[i][col + 1] = newGrid[i][col];
                newGrid[i][col] = 0;
                col++;
                moved = true;
              }
              if (col < GRID_SIZE - 1 && newGrid[i][col + 1] === newGrid[i][col]) {
                newGrid[i][col + 1] *= 2;
                scoreIncrease += newGrid[i][col + 1];
                newGrid[i][col] = 0;
                moved = true;
                hadMerge = true;
              }
            }
          }
        }
        break;

      default:
        break;
    }

    return { newGrid, scoreIncrease, moved };
  }

  function countEmptyCells(grid) {
    let count = 0;
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        if (grid[i][j] === 0) count++;
      }
    }
    return count;
  }

  function getMaxTile(grid) {
    let max = 0;
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        if (grid[i][j] > max) max = grid[i][j];
      }
    }
    return max;
  }

  // Trigger AI move when it's AI's turn
  useEffect(() => {
    if (gameMode === 'turn-based' && !playerTurn && !gameOver) {
      const timer = setTimeout(() => {
        aiMove();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [playerTurn, gameMode, gameOver, aiMove]);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (gameMode !== 'turn-based' || playerTurn) {
        switch (e.key) {
          case 'ArrowUp': moveTiles(DIRECTIONS.UP); break;
          case 'ArrowRight': moveTiles(DIRECTIONS.RIGHT); break;
          case 'ArrowDown': moveTiles(DIRECTIONS.DOWN); break;
          case 'ArrowLeft': moveTiles(DIRECTIONS.LEFT); break;
          default: break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [moveTiles, gameMode, playerTurn]);

  // Reset game
  const resetGame = () => {
    setGrid(initializeGrid());
    setPlayerScore(0);
  setAiScore(0);
  setCurrentMoveScore(0);
    setConsecutiveMerges(0);
    setGameOver(false);
    setGameWon(false);
    setLastMoveHadMerge(false);
    setHighlightDirection(null);
    setTileAnimations({});
    setHighlightDirection(null);
    resetSessionStreaks();
    resetSessionAchievements();
    setGameMode('turn-based');
    setPlayerTurn(true);
    setAIThinking(false);
  };

  // Change game mode
  const changeGameMode = (mode) => {
    setGameMode(mode);
    setPlayerTurn(true);
  };

  const getDirectionHighlightStyle = () => {
    if (!highlightDirection || !lastMoveDirection) return {};
    
    const baseStyle = {
      position: 'absolute',
      width: '100%',
      height: '100%',
      borderRadius: '6px',
      pointerEvents: 'none',
      opacity: 0.3,
      animation: 'pulse 0.2s ease-out',
    };

    switch (lastMoveDirection) {
      case 'up':
        return {
          ...baseStyle,
          background: 'linear-gradient(to bottom, rgba(255,255,255,0.8), rgba(255,255,255,0))',
          top: 0,
        };
      case 'down':
        return {
          ...baseStyle,
          background: 'linear-gradient(to top, rgba(255,255,255,0.8), rgba(255,255,255,0))',
          bottom: 0,
        };
      case 'left':
        return {
          ...baseStyle,
          background: 'linear-gradient(to right, rgba(255,255,255,0.8), rgba(255,255,255,0))',
          left: 0,
        };
      case 'right':
        return {
          ...baseStyle,
          background: 'linear-gradient(to left, rgba(255,255,255,0.8), rgba(255,255,255,0))',
          right: 0,
        };
      default:
        return {};
    }
  };


  const getTileAnimation = (row, col) => {
    const animation = tileAnimations[`${row}-${col}`];
    if (!animation) return {};
    
    switch (animation.type) {
      case 'move':
        const fromRow = animation.fromRow;
        const fromCol = animation.fromCol;
        const translateX = (col - fromCol) * 110 + '%';
        const translateY = (row - fromRow) * 110 + '%';
        return {
          transform: `translate(${translateX}, ${translateY})`,
          transition: 'transform 0.1s ease-out',
          zIndex: 1,
        };
      case 'merge':
        return {
          transform: 'scale(1.1)',
          transition: 'transform 0.1s ease-out',
          zIndex: 2,
        };
      case 'pop':
        return {
          animation: 'pop 0.2s ease-out',
        };
      case 'appear':
        return {
          animation: 'appear 0.2s ease-out',
        };
      default:
        return {};
    }
  };

  const getFontSize = (value) => {
    const sizes = {
      0: '45px',
      2: '45px',
      4: '45px',
      8: '45px',
      16: '45px',
      32: '45px',
      64: '45px',
      128: '40px',
      256: '40px',
      512: '40px',
      1024: '35px',
      2048: '35px',
      4096: '30px',
      8192: '30px'
    };
    return sizes[value] || '30px';
  };

  const getTileColor = (value) => {
    const colors = {
      0: 'var(--tile-0)',
      2: 'var(--tile-2)',
      4: 'var(--tile-4)',
      8: 'var(--tile-8)',
      16: 'var(--tile-16)',
      32: 'var(--tile-32)',
      64: 'var(--tile-64)',
      128: 'var(--tile-128)',
      256: 'var(--tile-256)',
      512: 'var(--tile-512)',
      1024: 'var(--tile-1024)',
      2048: 'var(--tile-2048)',
      4096: 'var(--tile-super)',
      8192: 'var(--tile-super)'
    };
    return colors[value] || 'var(--tile-super)';
  };
  
  const getTextColor = (value) => {
    return value > 4 ? 'var(--text-light)' : 'var(--text-dark)';
  };

  const updateBestScore = (newScore) => {
    if (newScore > bestScore) {
      const newBest = Math.max(newScore, bestScore);
      setBestScore(newBest);
      setNewBest(true); 
      setTimeout(() => setNewBest(false), 1500);
      localStorage.setItem('bestScore', newBest.toString());
      return true;
    }
    return false;
  };

  const resetAllStreaks = () => {
    setStreaks({
      128: 0,
      256: 0,
      512: 0,
      1024: 0,
      2048: 0,
      highest: 0
    });
    localStorage.removeItem('2048-streaks');
  };
  
  const resetSessionStreaks = () => {
    setSessionStreaks({
      128: 0,
      256: 0,
      512: 0,
      1024: 0,
      2048: 0,
      highest: 0
    });
  };

  // 5. Reset functions
const resetSessionAchievements = () => {
  setSessionAchievements({
    256: { unlocked: false, showBadge: false, count: 0 },
    512: { unlocked: false, showBadge: false, count: 0 },
    1024: { unlocked: false, showBadge: false, count: 0 },
    2048: { unlocked: false, showBadge: false, count: 0 }
  });
};

const resetAllAchievements = () => {
  setAchievements({
    256: { unlocked: false, showBadge: false, count: 0 },
    512: { unlocked: false, showBadge: false, count: 0 },
    1024: { unlocked: false, showBadge: false, count: 0 },
    2048: { unlocked: false, showBadge: false, count: 0 }
  });
  localStorage.removeItem('2048-achievements');
};

const announceMilestone = (value) => {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(
      `Congratulations! You reached ${value}!`
    );
    window.speechSynthesis.speak(utterance);
  }
};

  return (
    <div className="app">
      <div className="background-image"></div>
      <header className="game-header">
      <h1>2048 Player VS AI</h1>
      </header>
      <div className="game-info">
       {/*} <div className="score">Score: {score}</div> */}
       <div className="score-display">
  <div className={`player-score ${playerTurn ? 'active-turn' : ''}`}>
    <div className="score-label">Your Score</div>
    <div className={`score-value ${scoreUpdated ? 'score-update' : ''}`}>
      {playerScore}
      {playerTurn && currentMoveScore > 0 && (
        <span className="score-bump">+{currentMoveScore}</span>
      )}
    </div>
  </div>
  
  <div className={`ai-score ${!playerTurn ? 'active-turn' : ''}`}>
    <div className="score-label">AI Score</div>
    <div className={`score-value ${scoreUpdated ? 'score-update' : ''}`}>
      {aiScore}
      {!playerTurn && currentMoveScore > 0 && (
        <span className="score-bump">+{currentMoveScore}</span>
      )}
    </div>
  </div>
  <div className="best-score">
    <div className="score-label">Best Score</div>
    <div className={`score-value ${newBest ? 'new-best' : ''}`}>
      {bestScore}
      
    </div>
  </div>
  
</div>
        <div className="turn-indicator">
          {gameMode === 'turn-based' && (
            <>
            <div className={`turn-status ${playerTurn ? 'player' : 'ai'}`}>
        {playerTurn 
          ? (lastMoveHadMerge ?
            <div className="indicator-content">
                <span className="indicator-icon">👤</span>
                <span>Keep going! (Merge made)</span>
              </div>
             : 
             <div className="indicator-content">
             <span className="indicator-icon">👤</span>
             <span>Your Turn</span>
           </div> )
          : (lastMoveHadMerge ?
            <div className="indicator-content">
                <span className="indicator-icon">🤖</span>
                <span>AI Continuing Merge..."</span>
              </div>
              : 
              <div className="indicator-content">
                <span className="indicator-icon">🤖</span>
                <span>AI Thinking...</span>
              </div>
              )
        }
       {/*} {playerTurn ? (
              <div className="indicator-content">
                <span className="indicator-icon">👤</span>
                <span>Your Turn</span>
              </div>
            ) : (
              <div className="indicator-content">
                <span className="indicator-icon">🤖</span>
                <span>AI Thinking...</span>
              </div>
            )}  */}
      </div>
      <div className="move-type">
        {!playerTurn && lastMoveHadMerge && "AI will continue until no merges"}
      </div>
            {consecutiveMerges > 0 && (
              <div className="merge-streak">
                Merge streak: {consecutiveMerges}
              </div>
            )}
          </>
          )}
        </div>
        
      </div>

      <div className="game-mode-selector">
       {/* <button 
          onClick={() => changeGameMode('player')} 
          className={`button ${gameMode === 'player' ? 'active' : ''}`}
        >
          Player Only
        </button>  
        <button 
          onClick={() => changeGameMode('turn-based')} 
          className={`button ${gameMode === 'turn-based' ? 'active' : ''}`}
        >
          Player vs AI
        </button> */}
        <button onClick={resetGame} className="button">New Game</button>
        <button 
    className="sound-toggle"
    onClick={() => {
      [moveSound, aiMoveSound, mergeSound, aiMergeSound, appearSound, winSound, loseSound, bestScoreSound, achievementSound].forEach(sound => {
        if (sound.current) {
          sound.current.muted = !sound.current.muted;
        }
      });
    }}
    aria-label="Toggle sound"
  >
    🔈
  </button>
  {aiThinking && <div className="ai-thinking">AI is thinking...</div>}
      </div>
     
      {gameWon && (
    <div className={`win-indicator ${keepPlaying ? 'continued' : ''}`}>
      <span className="icon">🏆</span>
      <span className="text">
        {keepPlaying ? 'You Won! (Continuing)' : 'You Won!'}
      </span>
    </div>
  )}

   {/*   {gameWon && (
        <div className="game-message game-won">
          <p>You won!</p>
          <button onClick={() =>{ 
            setGameWon(false)
          }}>Keep playing</button>
        </div>
      )}

      {gameWon && (
    <div className={`win-indicator ${keepPlaying ? 'continued' : ''}`}>
      <span className="icon">🏆</span>
      <span className="text">
        {keepPlaying ? 'You Won! (Continuing)' : 'You Won!'}
      </span>
    </div>
  )}  */}

{gameOver && !gameWon && (
    <div className="game-over-indicator">
      <span className="icon">💀</span>
      <span className="text">Game Over!</span>
    </div>
  )}
{gameOver && (
  <>
  <div className="game-over-overlay">
    <div className="game-over-content">
      <h2>Game Over!</h2>
      <p>Your score: {score}</p>
      <p>Best score: {bestScore}</p>
      <p>AI: {aiScore} </p>
      <div className="game-over-buttons">
        <button onClick={resetGame} className="new-game-button">
          New Game
        </button>
        {gameWon && (
          <button 
            onClick={() => setGameWon(false)} 
            className="keep-playing-button"
          >
            Keep Playing
          </button>
        )}
      </div>
    </div>
  </div>
  
  </>
)}

{gameOver && (
  <div className="game-message game-over">
    <div className="message-content">
      <h2>Game Over!</h2>
      <p>Final Scores:</p>
      <div className="final-scores">
        <div>Player: {playerScore}</div>
        <div>AI: {aiScore}</div>
      </div>
      <button onClick={resetGame} className='new-game-button' >Try Again</button>
    </div>
  </div>
)}

      <div className="grid">
        {grid.map((row, rowIndex) => (
          <div key={rowIndex} className="grid-row">
            {row.map((cell, colIndex) => (
              <div
                key={colIndex}
                data-value={cell}
                className={`grid-cell ${cell ? `tile-${cell}` : ''} ${
                  highlightDirection ? `highlight-${highlightDirection}` : ''
                }`}
                style={{
                  backgroundColor: getTileColor(cell),
                  color: getTextColor(cell),
                  fontSize: getFontSize(cell),
                  visibility: cell === 0 ? 'hidden' : 'visible',
                  ...getTileAnimation(rowIndex, colIndex),
                }}
              >
                {cell !== 0 ? cell : ''}
              </div>
            ))}
          </div>
        ))}
      </div>
      {!playerTurn && (
  <div className="ai-thinking">
    <div className="thinking-dots">
      <span className="dot">.</span>
      <span className="dot">.</span>
      <span className="dot">.</span>
    </div>
    {highlightDirection && (
      <div className="direction-preview">
        {highlightDirection === DIRECTIONS.UP && '↑'}
        {highlightDirection === DIRECTIONS.RIGHT && '→'}
        {highlightDirection === DIRECTIONS.DOWN && '↓'}
        {highlightDirection === DIRECTIONS.LEFT && '←'}
      </div>
    )}
  </div>
)}
      
      {playerTurn && (
        <>
        {highlightDirection && (
          <div className="direction-highlight" style={getDirectionHighlightStyle()}></div>
        )}
      <div className="direction-hints">
        <button 
          className={`direction-btn up ${lastMoveDirection === 'up' && highlightDirection ? 'active' : ''}`} 
          onClick={() => moveTiles('up')}
        >
          ↑
        </button>
        <div className="horizontal-buttons">
          <button 
            className={`direction-btn left ${lastMoveDirection === 'left' && highlightDirection ? 'active' : ''}`} 
            onClick={() => moveTiles('left')}
          >
            ←
          </button>
          <button 
            className={`direction-btn down ${lastMoveDirection === 'down' && highlightDirection ? 'active' : ''}`} 
            onClick={() => moveTiles('down')}
          >
            ↓
          </button>
          <button 
            className={`direction-btn right ${lastMoveDirection === 'right' && highlightDirection ? 'active' : ''}`} 
            onClick={() => moveTiles('right')}
          >
            →
          </button>
        </div>
      </div>
      </>
      )}
      <div className="streaks-container">
  <div className="streak-tracker">
    <h3>Session Milestones</h3>
    <div className="streak-items">
      {[128, 256, 512, 1024, 2048].map(value => (
        <div key={`session-${value}`} className="streak-item">
          <span className={`tile-${value}`}>{value}</span>
          <span className="count">×{sessionStreaks[value]}</span>
        </div>
      ))}
    </div>
    <div className="highest-tile">
      Session Best: <span>{sessionStreaks.highest || '—'}</span>
    </div>
    <button onClick={resetSessionStreaks} className="reset-btn">
      Reset Session
    </button>
  </div>

  <div className="streak-tracker">
    <h3>All-Time Milestones</h3>
    <div className="streak-items">
      {[128, 256, 512, 1024, 2048].map(value => (
        <div key={`alltime-${value}`} className="streak-item">
          <span className={`tile-${value}`}>{value}</span>
          <span className="count">×{streaks[value]}</span>
        </div>
      ))}
    </div>
    <div className="highest-tile">
      All-Time Best: <span>{streaks.highest || '—'}</span>
    </div>
    <button onClick={resetAllStreaks} className="reset-btn">
      Reset All
    </button>
  </div>
</div>

<div className="unlocked-achievements">
  <h3>Milestone Badges</h3>
  <div className="achievement-grid">
    {[256, 512, 1024, 2048].map(value => (
      <div 
        key={`achievement-${value}`} 
        className={`achievement-cell ${achievements[value].unlocked ? 'unlocked' : 'locked'}`}
      >
        {achievements[value].unlocked ? (
          <>
            <div className="achievement-icon">{badgeInfo[value].icon}</div>
            <div className="achievement-label">{value}! (×{achievements[value].count})</div>
          </>
        ) : (
          <div className="achievement-locked">?</div>
        )}
      </div>
    ))}
  </div>
  <button onClick={resetAllAchievements} className="reset-btn">
      Reset Achievement Badge
    </button>
</div>

<div className="unlocked-achievements">
  <h3>Session Milestone Badges</h3>
  <div className="achievement-grid">
    {[256, 512, 1024, 2048].map(value => (
      <div 
        key={`achievement-${value}`} 
        className={`achievement-cell ${sessionAchievements[value].unlocked ? 'unlocked' : 'locked'}`}
      >
        {sessionAchievements[value].unlocked ? (
          <>
            <div className="achievement-icon">{badgeInfo[value].icon}</div>
            <div className="achievement-label">{value}! (×{sessionAchievements[value].count})</div>
          </>
        ) : (
          <div className="achievement-locked">?</div>
        )}
      </div>
    ))}
  </div>
  <button onClick={resetSessionAchievements} className="reset-btn">
      Reset Session AchievementBadge
    </button>
</div>


      <div className="instructions">
        <p>Use arrow keys to move tiles. Join the numbers to get to 2048!</p>
        {gameMode === 'turn-based' && (
          <p>Take turns with the AI - you move first, then the AI moves.</p>
        )}
      </div>
      <footer className="game-footer">
        <div className="footer-content">
          <p>Join the numbers and get to the <strong>2048 tile!</strong></p>
          <div className="footer-links">
            <a href="#how-to-play">How to Play</a>
            <a href="#about">About</a>
            <a href="#contact">Contact</a>
          </div>
          <p className="copyright">© {new Date().getFullYear()} 2048 Game</p>
        </div>
      </footer>
    </div>
  );
}

export default App;