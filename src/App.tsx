import { PdfEditorProvider, usePdfEditor } from './context/PdfEditorContext';
import { UploadScreen } from './components/UploadScreen';
import { Toolbar } from './components/Toolbar';
import { Sidebar } from './components/Sidebar';
import { PdfViewer } from './components/PdfViewer';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

function EditorApp() {
  const { document } = usePdfEditor();
  useKeyboardShortcuts();

  if (!document) return <UploadScreen />;

  return (
    <div className="editor-layout">
      <Toolbar />
      <div className="editor-body">
        <Sidebar />
        <PdfViewer />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <PdfEditorProvider>
      <EditorApp />
    </PdfEditorProvider>
  );
}
