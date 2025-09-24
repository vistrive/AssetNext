import { Sidebar } from "./sidebar";
import { TopBar } from "./topbar";

interface LayoutProps {
  children: React.ReactNode;
  title: string;
  description: string;
  onAddClick?: () => void;
  showAddButton?: boolean;
  addButtonText?: string;
  onBulkUploadClick?: () => void;
}

export function Layout({ 
  children, 
  title, 
  description, 
  onAddClick, 
  showAddButton = true, 
  addButtonText = "Add Asset",
  onBulkUploadClick 
}: LayoutProps) {
  return (
    <div className="h-screen bg-background flex">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar 
          title={title}
          description={description}
          onAddClick={onAddClick}
          showAddButton={showAddButton}
          addButtonText={addButtonText}
          onBulkUploadClick={onBulkUploadClick}
        />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}