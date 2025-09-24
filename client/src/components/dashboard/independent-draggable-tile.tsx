import { useState, useEffect } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GripVertical } from 'lucide-react';

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
}

function DraggableTileInternal({ 
  tile, 
  position 
}: { 
  tile: DashboardTile; 
  position: TilePosition 
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tile.id });

  const style = {
    position: 'fixed' as const,
    left: `${position.x}px`,
    top: `${position.y}px`,
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 50 : 10,
    width: tile.width || 400,
    height: tile.height || 300,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group shadow-lg"
      data-testid={`independent-tile-${tile.id}`}
    >
      <Card className="h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{tile.title}</CardTitle>
            {/* Drag Handle */}
            <div
              {...attributes}
              {...listeners}
              className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing bg-background/80 hover:bg-background border border-border/50"
              data-testid={`tile-drag-handle-${tile.id}`}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="h-full overflow-auto">
          {tile.component}
        </CardContent>
      </Card>
    </div>
  );
}

function IndependentDraggableTileWithContext({ tile }: { tile: DashboardTile }) {
  const [position, setPosition] = useState<TilePosition>(() => {
    const saved = localStorage.getItem(`tile-position-${tile.id}`);
    if (saved) {
      return JSON.parse(saved);
    }
    return tile.defaultPosition || { x: Math.random() * 200 + 100, y: Math.random() * 200 + 100 };
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    localStorage.setItem(`tile-position-${tile.id}`, JSON.stringify(position));
  }, [position, tile.id]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { delta } = event;
    
    if (delta) {
      const newPosition = {
        x: Math.max(0, Math.min(window.innerWidth - (tile.width || 400), position.x + delta.x)),
        y: Math.max(0, Math.min(window.innerHeight - (tile.height || 300), position.y + delta.y)),
      };
      setPosition(newPosition);
    }
  };

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
}

export function IndependentDraggableTiles({ tiles }: IndependentDraggableTilesProps) {
  return (
    <div data-testid="independent-draggable-tiles-container">
      {tiles.map((tile) => (
        <IndependentDraggableTileWithContext key={tile.id} tile={tile} />
      ))}
    </div>
  );
}