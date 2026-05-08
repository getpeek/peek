import { SqlPreview } from "./SqlPreview";

export const QueryDetails = ({ sql }: { sql: string }) => {
  return (
    <div className='details-query'>
      <div className='details-eyebrow'>Navigate · Query node</div>
      <div className='details-title'>Go to query</div>
      <div className='details-subtitle'>
        Selects this query node and zooms the canvas to fit it.
      </div>
      <SqlPreview sql={sql} />
      <div className='details-action-hint'>
        <kbd className='details-key'>↵</kbd>
        <span>Jump to query on the canvas</span>
      </div>
    </div>
  );
};
