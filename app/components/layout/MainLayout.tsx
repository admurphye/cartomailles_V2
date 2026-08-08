import AppHeader from "./AppHeader";

type Props = {
  children: React.ReactNode;
  onNewProject: () => void;
  onOpenProject: () => void;
  onSaveProject: () => void;
  onExportPNG: () => void;
  onExportSVG: () => void;
  onExportPDF: () => void;
  onUndo: () => void;
  onRedo: () => void;
};

export default function MainLayout({
  children,
  onNewProject,
  onOpenProject,
  onSaveProject,
  onExportPNG,
  onExportSVG,
  onExportPDF,
  onUndo,
  onRedo,
}: Props) {
  return (
    <div className="flex flex-col h-screen min-h-0 bg-slate-100">
      <AppHeader
        onNewProject={onNewProject}
        onOpenProject={onOpenProject}
        onSaveProject={onSaveProject}
        onExportPNG={onExportPNG}
        onExportSVG={onExportSVG}
        onExportPDF={onExportPDF}
        onUndo={onUndo}
        onRedo={onRedo}
      />
      {children}
    </div>
  );
}
