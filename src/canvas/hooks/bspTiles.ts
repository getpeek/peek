export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// The titlebar (CustomTitleBar.css) is absolutely positioned over the top of the
// full-window canvas, so the usable canvas area starts this many pixels down.
export const TITLEBAR_HEIGHT = 50;

// Breathing room around the whole layout and between tiles, in flow units
// (== screen px at zoom 1).
export const FIT_PADDING = 24;
export const FIT_GAP = 16;

// Recursively partition `region` into `count` roughly-equal-area tiles. Each split
// runs along the region's longer axis and divides it proportionally to how many
// tiles fall on each side, so tiles stay close to square: 1 fills the region, 2
// split it in half, 3 → two-thirds then subdivided, 4 → quarters, and so on.
export function bspTiles(region: Rect, count: number, gap: number): Rect[] {
  if (count <= 1) {
    return [region];
  }

  const first = Math.ceil(count / 2);
  const second = count - first;

  if (region.width >= region.height) {
    const available = region.width - gap;
    const firstWidth = (available * first) / count;
    const secondWidth = available - firstWidth;
    return [
      ...bspTiles({ ...region, width: firstWidth }, first, gap),
      ...bspTiles(
        {
          x: region.x + firstWidth + gap,
          y: region.y,
          width: secondWidth,
          height: region.height,
        },
        second,
        gap,
      ),
    ];
  }

  const available = region.height - gap;
  const firstHeight = (available * first) / count;
  const secondHeight = available - firstHeight;
  return [
    ...bspTiles({ ...region, height: firstHeight }, first, gap),
    ...bspTiles(
      {
        x: region.x,
        y: region.y + firstHeight + gap,
        width: region.width,
        height: secondHeight,
      },
      second,
      gap,
    ),
  ];
}

export interface ViewportFit {
  placements: Array<{ id: string; rect: Rect }>;
  viewport: { x: number; y: number; zoom: number };
}

// Lay out `selectedIds` to fill the usable canvas at 100% zoom, keeping the layout
// centred on where the user is currently looking. `screenToFlow` converts a client
// point to flow coords under the current viewport; the returned viewport places the
// tiled region flush against the top-left of the usable area (below the titlebar).
export function computeViewportFit(
  selectedIds: string[],
  paneRect: { width: number; height: number; left: number; top: number } | undefined,
  screenToFlow: (p: { x: number; y: number }) => { x: number; y: number },
): ViewportFit {
  const paneWidth = paneRect?.width ?? window.innerWidth;
  const paneHeight = paneRect?.height ?? window.innerHeight;
  const paneLeft = paneRect?.left ?? 0;
  const paneTop = paneRect?.top ?? 0;
  const usableHeight = paneHeight - TITLEBAR_HEIGHT;
  const center = screenToFlow({
    x: paneLeft + paneWidth / 2,
    y: paneTop + TITLEBAR_HEIGHT + usableHeight / 2,
  });

  // At zoom 1 one flow unit is one screen px, so the usable area maps to a
  // paneWidth × usableHeight flow-space rectangle centred on `center`.
  const originX = center.x - paneWidth / 2;
  const originY = center.y - usableHeight / 2;
  const region: Rect = {
    x: originX + FIT_PADDING,
    y: originY + FIT_PADDING,
    width: paneWidth - 2 * FIT_PADDING,
    height: usableHeight - 2 * FIT_PADDING,
  };

  const tiles = bspTiles(region, selectedIds.length, FIT_GAP);
  return {
    placements: selectedIds.map((id, i) => ({ id, rect: tiles[i] })),
    // Places `region`'s origin at screen (0, TITLEBAR_HEIGHT), clear of the titlebar.
    viewport: { x: -originX, y: TITLEBAR_HEIGHT - originY, zoom: 1 },
  };
}
