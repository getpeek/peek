import { useEditor, useValue } from "tldraw";
import "./BackToContent.css";

export const BackToContent = () => {
  const editor = useEditor();

  const shouldRender = useValue(
    "showBackToContent",
    () => {
      const renderingShapes = editor.getRenderingShapes().length;
      const culledShapesCount = editor.getCulledShapes().size;
      return culledShapesCount === renderingShapes && culledShapesCount > 0;
    },
    [editor.getRenderingShapes(), editor.getCulledShapes().size],
  );

  const goBackToContent = () => {
    const bounds = editor.getCurrentPageBounds();
    if (!bounds) {
      return;
    }

    editor.zoomToBounds(bounds, { animation: { duration: 200 } });
  };

  if (!shouldRender) {
    return null;
  }

  return (
    <button className="back-to-content" onClick={goBackToContent}>
      Back to content
    </button>
  );
};
