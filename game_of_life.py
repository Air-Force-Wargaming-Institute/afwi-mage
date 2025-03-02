import numpy as np
import matplotlib.pyplot as plt
from matplotlib.animation import FuncAnimation

class GameOfLife:
    def __init__(self, size=50):
        self.size = size
        # Initialize random grid with 0s and 1s
        self.grid = np.random.choice([0, 1], size=(size, size), p=[0.85, 0.15])
    
    def update(self):
        # Create a padded grid to handle edge cases
        padded = np.pad(self.grid, pad_width=1, mode='wrap')
        
        # Count neighbors using array slicing
        neighbors = (
            padded[:-2, :-2] + padded[:-2, 1:-1] + padded[:-2, 2:] +
            padded[1:-1, :-2] + padded[1:-1, 2:] +
            padded[2:, :-2] + padded[2:, 1:-1] + padded[2:, 2:]
        )
        
        # Apply Conway's rules
        # 1. Any live cell with < 2 live neighbors dies (underpopulation)
        # 2. Any live cell with 2-3 live neighbors lives
        # 3. Any live cell with > 3 live neighbors dies (overpopulation)
        # 4. Any dead cell with exactly 3 live neighbors becomes alive (reproduction)
        new_grid = np.zeros_like(self.grid)
        new_grid[(self.grid == 1) & ((neighbors == 2) | (neighbors == 3))] = 1
        new_grid[(self.grid == 0) & (neighbors == 3)] = 1
        
        self.grid = new_grid

def animate(frame):
    game.update()
    img.set_array(game.grid)
    return [img]

# Create game instance and setup visualization
game = GameOfLife(100)
fig, ax = plt.subplots()
img = ax.imshow(game.grid, interpolation='nearest')
ax.set_xticks([])
ax.set_yticks([])

# Create animation
anim = FuncAnimation(fig, animate, frames=200, interval=100, blit=True)
plt.show()