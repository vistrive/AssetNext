import { useState, useEffect, createContext, useContext, useRef } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GripVertical, RotateCcw } from 'lucide-react';

interface TilePosition {
  x: number;
  y: number;
}

interface DashboardTile {
  id: string;
  title: string;
  component: React.ReactNode;
  defaultPosition?: TilePosition;
  width?: number;
  height?: number;
  section?: string; // For grouping tiles by section
}

// Context for managing tile resets
interface TileResetContextType {
  resetTile: (tileId: string) => void;
  resetSection: (section: string) => void;
  resetAllTiles: () => void;
}

const TileResetContext = createContext<TileResetContextType | null>(null);

function DraggableTileInternal({ 
  tile, 
  position 
}: { 
  tile: DashboardTile; 
  position: TilePosition 
}) {
  const resetContext = useContext(TileResetContext);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tile.id });

  const style = {
    position: 'absolute' as const,
    left: `${position.x}px`,
    top: `${position.y}px`,
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 50 : 10,
    width: tile.width || 400,
    height: tile.height || 300,
  };

  const handleResetTile = () => {
    if (resetContext) {
      resetContext.resetTile(tile.id);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative"
      data-testid={`independent-tile-${tile.id}`}
    >
      {/* Floating Controls - positioned above the tile */}
      <div className="absolute top-2 right-2 z-20 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Reset Tile Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleResetTile}
          className="p-1 h-6 w-6 bg-background/90 hover:bg-background border border-border/50 shadow-sm"
          data-testid={`tile-reset-${tile.id}`}
          title="Reset to default position"
        >
          <RotateCcw className="h-3 w-3 text-muted-foreground" />
        </Button>
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="p-1 rounded cursor-grab active:cursor-grabbing bg-background/90 hover:bg-background border border-border/50 shadow-sm"
          data-testid={`tile-drag-handle-${tile.id}`}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
      
      {/* Single tile content without double card wrapping */}
      <div className="h-full">
        {tile.component}
      </div>
    </div>
  );
}

function IndependentDraggableTileWithContext({ 
  tile, 
  onPositionChange 
}: { 
  tile: DashboardTile;
  onPositionChange: (tileId: string, position: TilePosition) => void;
}) {
  const isInit = useRef(true);
  const skipSave = useRef(false);
  const [position, setPosition] = useState<TilePosition>(() => {
    // Try to get saved position from enhanced layout storage
    const savedLayouts = localStorage.getItem('dashboard-layout-v1');
    if (savedLayouts) {
      const layouts = JSON.parse(savedLayouts);
      if (layouts[tile.id]) {
        // Clamp saved position to ensure it's within reasonable bounds
        const savedPos = layouts[tile.id];
        return {
          x: Math.max(20, Math.min(1200, savedPos.x)),
          y: Math.max(20, Math.min(1200, savedPos.y))
        };
      }
    }
    
    // Fallback to old storage method
    const oldSaved = localStorage.getItem(`tile-position-${tile.id}`);
    if (oldSaved) {
      const oldPos = JSON.parse(oldSaved);
      return {
        x: Math.max(20, Math.min(1200, oldPos.x)),
        y: Math.max(20, Math.min(1200, oldPos.y))
      };
    }
    
    // Provide safe default position within canvas bounds
    const defaultPos = tile.defaultPosition || { x: 100, y: 100 };
    return {
      x: Math.max(20, Math.min(1200, defaultPos.x)),
      y: Math.max(20, Math.min(1200, defaultPos.y))
    };
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    // Skip saving during initialization or when explicitly skipped
    if (isInit.current || skipSave.current) {
      isInit.current = false; // Clear init flag after first render
      return;
    }
    
    // Only call onPositionChange when position actually changes from user actions
    const timeoutId = setTimeout(() => {
      onPositionChange(tile.id, position);
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [position.x, position.y, tile.id]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { delta } = event;
    
    if (delta) {
      // Get the canvas container bounds for proper clamping
      const canvasElement = document.getElementById('dashboard-canvas');
      if (!canvasElement) return;
      
      const canvasBounds = canvasElement.getBoundingClientRect();
      const canvasWidth = canvasBounds.width;
      const canvasHeight = Math.max(canvasBounds.height, 1400); // Ensure minimum canvas height for scrolling
      
      // Clear init and skipSave flags for user-driven position changes
      isInit.current = false;
      skipSave.current = false;
      
      const newPosition = {
        x: Math.max(20, Math.min(canvasWidth - (tile.width || 400) - 20, position.x + delta.x)),
        y: Math.max(20, Math.min(canvasHeight - (tile.height || 300) - 20, position.y + delta.y)),
      };
      setPosition(newPosition);
    }
  };

  // Reset position function
  const resetPosition = () => {
    const defaultPos = tile.defaultPosition || { x: 100, y: 100 };
    // Clear flags to allow saving reset position
    isInit.current = false;
    skipSave.current = false;
    setPosition(defaultPos);
  };

  // Listen for reset events (individual, section, and global) and position clamping
  useEffect(() => {
    const handleReset = (event: CustomEvent) => {
      if (event.detail.tileId === tile.id) {
        resetPosition();
      }
    };

    const handleSectionReset = (event: CustomEvent) => {
      if (tile.section && event.detail.section === tile.section) {
        resetPosition();
      }
    };

    const handleGlobalReset = () => {
      resetPosition();
    };

    const handleClampPosition = (event: CustomEvent) => {
      if (event.detail.tileId === tile.id) {
        // Skip first clamp during initialization to preserve default positions
        if (isInit.current) {
          return;
        }
        
        const { canvasWidth, canvasHeight, tileWidth, tileHeight } = event.detail;
        
        // Set skipSave flag to prevent persisting clamp-induced position changes
        skipSave.current = true;
        setPosition(prev => ({
          x: Math.max(20, Math.min(canvasWidth - tileWidth - 20, prev.x)),
          y: Math.max(20, Math.min(canvasHeight - tileHeight - 20, prev.y))
        }));
        
        // Clear skipSave flag in next microtask
        setTimeout(() => {
          skipSave.current = false;
        }, 0);
      }
    };

    window.addEventListener('reset-tile' as any, handleReset);
    window.addEventListener('reset-section' as any, handleSectionReset);
    window.addEventListener('reset-all-tiles' as any, handleGlobalReset);
    window.addEventListener('clamp-tile-position' as any, handleClampPosition);
    
    return () => {
      window.removeEventListener('reset-tile' as any, handleReset);
      window.removeEventListener('reset-section' as any, handleSectionReset);
      window.removeEventListener('reset-all-tiles' as any, handleGlobalReset);
      window.removeEventListener('clamp-tile-position' as any, handleClampPosition);
    };
  }, [tile.id, tile.section]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={[tile.id]}>
        <DraggableTileInternal tile={tile} position={position} />
      </SortableContext>
    </DndContext>
  );
}

interface IndependentDraggableTilesProps {
  tiles: DashboardTile[];
  onLayoutChange?: (layouts: Record<string, TilePosition>) => void;
}

export function IndependentDraggableTiles({ tiles, onLayoutChange }: IndependentDraggableTilesProps) {
  const [positions, setPositions] = useState<Record<string, TilePosition>>({});

  const handlePositionChange = (tileId: string, position: TilePosition) => {
    setPositions(prev => {
      const newPositions = { ...prev, [tileId]: position };
      
      // Save to enhanced localStorage
      localStorage.setItem('dashboard-layout-v1', JSON.stringify(newPositions));
      
      // Notify parent component
      if (onLayoutChange) {
        onLayoutChange(newPositions);
      }
      
      return newPositions;
    });
  };

  // Clamp all positions on window resize (debounced to prevent transient narrow widths)
  useEffect(() => {
    let resizeTimeout: ReturnType<typeof setTimeout>;
    let isInitialized = false;
    
    const handleResize = () => {
      // Clear existing timeout
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      
      // Debounce resize events to avoid transient canvas widths
      resizeTimeout = setTimeout(() => {
        // Skip clamping during initial load to preserve default positions
        if (!isInitialized) {
          isInitialized = true;
          return;
        }
        
        const canvasElement = document.getElementById('dashboard-canvas');
        if (!canvasElement) return;
        
        const canvasBounds = canvasElement.getBoundingClientRect();
        const canvasWidth = canvasBounds.width;
        const canvasHeight = Math.max(canvasBounds.height, 1400);
        
        // Only clamp if canvas has reasonable width to avoid collapsing tiles
        if (canvasWidth < 600) return;
        
        // Dispatch resize event for all tiles to re-clamp their positions
        tiles.forEach(tile => {
          window.dispatchEvent(new CustomEvent('clamp-tile-position', { 
            detail: { 
              tileId: tile.id,
              canvasWidth,
              canvasHeight,
              tileWidth: tile.width || 400,
              tileHeight: tile.height || 300
            } 
          }));
        });
      }, 200); // 200ms debounce delay
    };

    // Initialize after first paint to ensure canvas is properly sized
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        isInitialized = true;
      });
    });

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
    };
  }, [tiles]);

  const resetContext: TileResetContextType = {
    resetTile: (tileId: string) => {
      // Dispatch custom event to reset specific tile
      window.dispatchEvent(new CustomEvent('reset-tile', { detail: { tileId } }));
    },
    resetSection: (section: string) => {
      // Reset all tiles in a section
      tiles
        .filter(tile => tile.section === section)
        .forEach(tile => {
          window.dispatchEvent(new CustomEvent('reset-tile', { detail: { tileId: tile.id } }));
        });
    },
    resetAllTiles: () => {
      // Clear all saved positions and reset to defaults
      localStorage.removeItem('dashboard-layout-v1');
      tiles.forEach(tile => {
        // Clear old individual tile storage
        localStorage.removeItem(`tile-position-${tile.id}`);
        // Dispatch reset event
        window.dispatchEvent(new CustomEvent('reset-tile', { detail: { tileId: tile.id } }));
      });
    }
  };

  return (
    <TileResetContext.Provider value={resetContext}>
      {/* Scrollable Canvas Container */}
      <div 
        id="dashboard-canvas"
        className="relative min-h-[1400px] w-full"
        data-testid="independent-draggable-tiles-container"
        style={{ 
          // Ensure the canvas extends beyond viewport for scrolling
          minHeight: 'max(100vh, 1400px)',
          paddingBottom: '200px' // Extra space at bottom
        }}
      >
        {tiles.map((tile) => (
          <IndependentDraggableTileWithContext 
            key={tile.id} 
            tile={tile} 
            onPositionChange={handlePositionChange}
          />
        ))}
      </div>
    </TileResetContext.Provider>
  );
}

// Export the context hook for use in dashboard header
export const useTileReset = () => {
  const context = useContext(TileResetContext);
  if (!context) {
    throw new Error('useTileReset must be used within TileResetContext');
  }
  return context;
};