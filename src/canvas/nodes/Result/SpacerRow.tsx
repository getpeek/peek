/** Invisible row that reserves the virtualizer's off-screen scroll height. */
export function SpacerRow({ height, colSpan }: { height: number; colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} style={{ height, padding: 0, border: "none" }} />
    </tr>
  );
}
