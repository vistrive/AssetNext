import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DraggableTileWrapperProps {
  children: React.ReactNode;
  isDragMode: boolean;
  tileId: string;
}

export function DraggableTileWrapper({ children, isDragMode, tileId }: DraggableTileWrapperProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: tileId,
    disabled: !isDragMode
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 50 : 'auto',
    // When dragging, ensure content stays within screen bounds
    ...(isDragging && {
      maxWidth: '100vw',
      position: 'relative' as const,
    })
  };

  // If not in drag mode, render children normally without any drag functionality
  if (!isDragMode) {
    return <div className="min-w-0 max-w-full">{children}</div>;
  }

  // In drag mode, add drag handle and functionality but maintain same layout
  return (
    <div 
      ref={setNodeRef}
      style={style}
      className="min-w-0 max-w-full relative group"
      data-testid={`draggable-wrapper-${tileId}`}
    >
      {/* Drag Handle - only visible in drag mode */}
      <div className="absolute top-2 right-2 z-20 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="p-1 rounded cursor-grab active:cursor-grabbing bg-background/90 hover:bg-background border border-border/50 shadow-sm"
          data-testid={`drag-handle-${tileId}`}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
      
      {/* Tile Content */}
      <div className="h-full">
        {children}
      </div>
    </div>
  );
}