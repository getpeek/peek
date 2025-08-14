import {
  Editor,
  TLShapeId,
  TLArrowBinding,
  Vec,
  createShapeId,
  TLArrowShape,
} from "tldraw";

export function createArrowBetweenShapes(
  editor: Editor,
  startShapeId: TLShapeId,
  endShapeId: TLShapeId,
  options = {} as {
    parentId?: TLShapeId;
    start?: Partial<Omit<TLArrowBinding["props"], "terminal">>;
    end?: Partial<Omit<TLArrowBinding["props"], "terminal">>;
  },
) {
  const { start = {}, end = {}, parentId } = options;

  const {
    normalizedAnchor: startNormalizedAnchor = { x: 0.5, y: 0.5 },
    isExact: startIsExact = false,
    isPrecise: startIsPrecise = false,
  } = start;
  const {
    normalizedAnchor: endNormalizedAnchor = { x: 0.5, y: 0.5 },
    isExact: endIsExact = false,
    isPrecise: endIsPrecise = false,
  } = end;

  const startTerminalNormalizedPosition = Vec.From(startNormalizedAnchor);
  const endTerminalNormalizedPosition = Vec.From(endNormalizedAnchor);

  const parent = parentId ? editor.getShape(parentId) : undefined;
  if (parentId && !parent)
    throw Error(`Parent shape with id ${parentId} not found`);

  const startShapePageBounds = editor.getShapePageBounds(startShapeId);
  const endShapePageBounds = editor.getShapePageBounds(endShapeId);

  const startShapePageRotation = editor
    .getShapePageTransform(startShapeId)
    .rotation();
  const endShapePageRotation = editor
    .getShapePageTransform(endShapeId)
    .rotation();

  if (!startShapePageBounds || !endShapePageBounds) return;

  const startTerminalPagePosition = Vec.Add(
    startShapePageBounds.point,
    Vec.MulV(
      startShapePageBounds.size,
      Vec.Rot(startTerminalNormalizedPosition, startShapePageRotation),
    ),
  );
  const endTerminalPagePosition = Vec.Add(
    endShapePageBounds.point,
    Vec.MulV(
      startShapePageBounds.size,
      Vec.Rot(endTerminalNormalizedPosition, endShapePageRotation),
    ),
  );

  const arrowPointInParentSpace = Vec.Min(
    startTerminalPagePosition,
    endTerminalPagePosition,
  );
  if (parent) {
    arrowPointInParentSpace.setTo(
      editor
        .getShapePageTransform(parent.id)!
        .applyToPoint(arrowPointInParentSpace),
    );
  }

  const arrowId = createShapeId();
  editor.run(() => {
    editor.markHistoryStoppingPoint("creating_arrow");
    editor.createShape<TLArrowShape>({
      id: arrowId,
      type: "arrow",
      x: arrowPointInParentSpace.x,
      y: arrowPointInParentSpace.y,
      props: {
        kind: "arc",
        size: "s",
        color: "grey",
        bend: 0.5,
      },
    });

    editor.createBindings<TLArrowBinding>([
      {
        fromId: arrowId,
        toId: startShapeId,
        type: "arrow",
        props: {
          terminal: "start",
          normalizedAnchor: startNormalizedAnchor,
          isExact: startIsExact,
          isPrecise: startIsPrecise,
        },
      },
      {
        fromId: arrowId,
        toId: endShapeId,
        type: "arrow",
        props: {
          terminal: "end",
          normalizedAnchor: endNormalizedAnchor,
          isExact: endIsExact,
          isPrecise: endIsPrecise,
        },
      },
    ]);
  });
}
