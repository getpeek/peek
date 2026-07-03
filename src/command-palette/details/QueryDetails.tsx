import { SqlPreview } from "./SqlPreview";
import { useQueryInfo } from "../../canvas/nodes/Result/queryInfo";

export const QueryDetails = ({ sql, rows }: { sql: string; rows?: number }) => {
  const info = useQueryInfo(sql);
  const table = info?.tables[0]?.name;

  return (
    <div className='cp-strip'>
      <span className='cp-strip-tag'>SQL</span>
      <SqlPreview sql={sql} singleLine className='cp-strip-sql' />
      <span className='cp-strip-meta'>
        {rows === undefined ? (
          table ? (
            <>
              <span className='m-dim'>table</span>
              <span className='m-strong'>{table}</span>
            </>
          ) : (
            <span className='m-dim'>{info?.statementType ?? "query"}</span>
          )
        ) : (
          <>
            <span className='m-strong'>{rows.toLocaleString()}</span>
            <span className='m-dim'>{rows === 1 ? "row" : "rows"}</span>
          </>
        )}
      </span>
    </div>
  );
};
