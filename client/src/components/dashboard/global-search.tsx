import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search, 
  Package, 
  User, 
  Building2, 
  MapPin, 
  FileText,
  Loader2,
  X,
  GripVertical
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { authenticatedRequest } from '@/lib/auth';
import { useDebounce } from '@/hooks/use-debounce';
import { useLocation } from 'wouter';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SearchResult {
  id: string;
  name: string;
  resultType: 'asset' | 'user' | 'vendor' | 'location' | 'license';
  // Asset fields
  type?: string;
  category?: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  status?: string;
  location?: string;
  assignedUserName?: string;
  // User fields
  email?: string;
  role?: string;
  department?: string;
  // Vendor/Location fields
  assetCount?: number;
  // License fields
  vendor?: string;
  version?: string;
  totalLicenses?: number;
  usedLicenses?: number;
}

interface GlobalSearchProps {
  onResultSelect?: (result: SearchResult) => void;
  placeholder?: string;
  className?: string;
  isDraggable?: boolean;
}

function DraggableGlobalSearch({ position, ...props }: GlobalSearchProps & { position: { x: number; y: number } }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: 'global-search-draggable' });

  const style = {
    position: 'fixed' as const,
    left: `${position.x}px`,
    top: `${position.y}px`,
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    zIndex: 45,
    width: '400px',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group"
      data-testid="draggable-global-search-container"
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute -top-2 -left-2 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing bg-background/90 hover:bg-background border border-border/50 shadow-sm"
        data-testid="global-search-drag-handle"
      >
        <GripVertical className="h-3 w-3 text-muted-foreground" />
      </div>
      <GlobalSearchInternal {...props} className="shadow-lg border rounded-lg bg-background/95 backdrop-blur-sm p-3" />
    </div>
  );
}

function GlobalSearchInternal({ onResultSelect, placeholder = "Search assets, users, vendors...", className }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('all');
  const searchRef = useRef<HTMLDivElement>(null);
  const [, navigate] = useLocation();

  const debouncedQuery = useDebounce(query, 300);

  // Search query
  const { data: searchResults, isLoading, error } = useQuery({
    queryKey: ['/api/search', debouncedQuery, selectedType],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) return null;
      
      const params = new URLSearchParams({
        query: debouncedQuery,
        type: selectedType,
        limit: '20'
      });
      
      const response = await authenticatedRequest('GET', `/api/search?${params}`);
      return response.json();
    },
    enabled: debouncedQuery.length >= 2
  });

  // Click outside handler
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        document.getElementById('global-search-input')?.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleResultClick = (result: SearchResult) => {
    setIsOpen(false);
    setQuery('');

    // Navigate based on result type
    switch (result.resultType) {
      case 'asset':
        navigate(`/assets?search=${encodeURIComponent(result.name)}`);
        break;
      case 'user':
        navigate(`/users?search=${encodeURIComponent(result.email || result.name)}`);
        break;
      case 'license':
        navigate(`/software?search=${encodeURIComponent(result.name)}`);
        break;
      case 'vendor':
        navigate(`/assets?manufacturer=${encodeURIComponent(result.name)}`);
        break;
      case 'location':
        navigate(`/assets?location=${encodeURIComponent(result.name)}`);
        break;
      default:
        break;
    }

    onResultSelect?.(result);
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'asset': return <Package className="h-4 w-4" />;
      case 'user': return <User className="h-4 w-4" />;
      case 'vendor': return <Building2 className="h-4 w-4" />;
      case 'location': return <MapPin className="h-4 w-4" />;
      case 'license': return <FileText className="h-4 w-4" />;
      default: return <Search className="h-4 w-4" />;
    }
  };

  const getResultTypeLabel = (type: string) => {
    switch (type) {
      case 'asset': return 'Asset';
      case 'user': return 'User';
      case 'vendor': return 'Vendor';
      case 'location': return 'Location';
      case 'license': return 'License';
      default: return type;
    }
  };

  const getResultDescription = (result: SearchResult) => {
    switch (result.resultType) {
      case 'asset':
        return `${result.manufacturer || ''} ${result.model || ''} • ${result.category || ''} • ${result.status || ''}`.trim();
      case 'user':
        return `${result.email || ''} • ${result.role || ''} • ${result.department || ''}`.trim();
      case 'license':
        return `${result.vendor || ''} ${result.version || ''} • ${result.usedLicenses || 0}/${result.totalLicenses || 0} used`.trim();
      case 'vendor':
      case 'location':
        return `${result.assetCount || 0} assets`;
      default:
        return '';
    }
  };

  // Flatten search results for display
  const allResults: SearchResult[] = searchResults ? [
    ...(searchResults.results.assets || []),
    ...(searchResults.results.users || []),
    ...(searchResults.results.vendors || []),
    ...(searchResults.results.locations || []),
    ...(searchResults.results.softwareLicenses || [])
  ] : [];

  return (
    <div ref={searchRef} className={`relative ${className || ''}`} data-testid="global-search">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          id="global-search-input"
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(e.target.value.length >= 2);
          }}
          onFocus={() => setIsOpen(query.length >= 2)}
          className="pl-10 pr-16 sm:pr-20"
          data-testid="input-search"
        />
        {query && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setQuery('');
              setIsOpen(false);
            }}
            className="absolute right-8 sm:right-12 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            data-testid="button-clear-search"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground">
          ⌘K
        </div>
      </div>

      {/* Search Type Filter */}
      {isOpen && (
        <div className="flex gap-1 mt-2 flex-wrap">
          {['all', 'assets', 'users', 'vendors'].map((type) => (
            <Button
              key={type}
              variant={selectedType === type ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedType(type)}
              className="h-6 text-xs capitalize"
              data-testid={`filter-${type}`}
            >
              {type}
            </Button>
          ))}
        </div>
      )}

      {/* Search Results Dropdown */}
      {isOpen && (
        <Card className="absolute top-full left-0 right-0 mt-2 z-50 max-h-96 shadow-lg border" data-testid="search-results">
          <CardContent className="p-0">
            {isLoading && (
              <div className="flex items-center justify-center py-8" data-testid="search-loading">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">Searching...</span>
              </div>
            )}

            {error && (
              <div className="py-8 text-center" data-testid="search-error">
                <span className="text-sm text-muted-foreground">Search failed. Please try again.</span>
              </div>
            )}

            {!isLoading && !error && debouncedQuery.length >= 2 && (
              <>
                {allResults.length === 0 ? (
                  <div className="py-8 text-center" data-testid="no-results">
                    <span className="text-sm text-muted-foreground">
                      No results found for "{debouncedQuery}"
                    </span>
                  </div>
                ) : (
                  <ScrollArea className="max-h-80">
                    <div className="p-2" data-testid="search-results-list">
                      {searchResults?.totalResults && (
                        <div className="px-2 py-1 text-xs text-muted-foreground border-b">
                          {searchResults.totalResults} results found
                        </div>
                      )}
                      
                      {allResults.slice(0, 5).map((result, index) => (
                        <div
                          key={`${result.resultType}-${result.id}-${index}`}
                          onClick={() => handleResultClick(result)}
                          className="flex items-center gap-3 p-2 hover:bg-accent hover:text-accent-foreground cursor-pointer rounded-md transition-colors"
                          data-testid={`result-${result.resultType}-${result.id}`}
                        >
                          <div className="flex-shrink-0">
                            {getResultIcon(result.resultType)}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm truncate" data-testid={`name-${result.id}`}>
                                {result.name}
                              </span>
                              <Badge variant="secondary" className="text-xs" data-testid={`type-${result.id}`}>
                                {getResultTypeLabel(result.resultType)}
                              </Badge>
                            </div>
                            {getResultDescription(result) && (
                              <p className="text-xs text-muted-foreground truncate mt-1" data-testid={`description-${result.id}`}>
                                {getResultDescription(result)}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                      
                      {/* View All Results Button */}
                      {searchResults?.totalResults && searchResults.totalResults > 0 && (
                        <div className="border-t p-2 mt-2">
                          <Button
                            variant="ghost"
                            className="w-full justify-center"
                            onClick={() => {
                              setIsOpen(false);
                              setQuery('');
                              navigate(`/search-results?q=${encodeURIComponent(debouncedQuery)}&type=${selectedType}`);
                            }}
                            data-testid="button-view-all-results"
                          >
                            View All {searchResults.totalResults} Results
                          </Button>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                )}
              </>
            )}

            {debouncedQuery.length < 2 && debouncedQuery.length > 0 && (
              <div className="py-4 text-center" data-testid="min-chars-message">
                <span className="text-xs text-muted-foreground">
                  Type at least 2 characters to search
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Main export with draggable functionality
export function GlobalSearch(props: GlobalSearchProps) {
  // Check if draggable mode is requested
  if (props.isDraggable) {
    return <DraggableGlobalSearchWithContext {...props} />;
  }
  
  // Regular non-draggable version
  return <GlobalSearchInternal {...props} />;
}

// Draggable version with DndContext
function DraggableGlobalSearchWithContext(props: GlobalSearchProps) {
  const [position, setPosition] = useState(() => {
    const savedPosition = localStorage.getItem('globalSearchPosition');
    return savedPosition ? JSON.parse(savedPosition) : { x: 50, y: 100 };
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { delta } = event;
    const newPosition = {
      x: Math.max(0, Math.min(window.innerWidth - 400, position.x + delta.x)),
      y: Math.max(0, Math.min(window.innerHeight - 100, position.y + delta.y))
    };
    setPosition(newPosition);
    localStorage.setItem('globalSearchPosition', JSON.stringify(newPosition));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={['global-search-draggable']}>
        <DraggableGlobalSearch position={position} {...props} />
      </SortableContext>
    </DndContext>
  );
}