import { useAtomValue } from "jotai";
import { useMemo } from "react";
import { schemaAtom } from "../../../state";
import { categorizeType } from "./columnType";
import "./TableDefinition.css";

interface Props {
  table: string;
  columns: [string, string][];
}

export function TableDefinitionTable({ table, columns }: Props) {
  const schema = useAtomValue(schemaAtom);

  const { isPk, isFk } = useMemo(() => {
    const declaredPks = new Set(schema.primaryKeys[table] ?? []);
    const fkSet = new Set<string>();
    for (const [from] of Object.entries(schema.references)) {
      const [fromTable, fromCol] = from.split(".");
      if (fromTable === table && fromCol) fkSet.add(fromCol);
    }
    const isPk = (col: string, index: number) => {
      if (declaredPks.has(col)) {
        return true;
      }
      if (/^id$/i.test(col)) {
        return true;
      }
      if (index === 0 && /_id$/i.test(col)) {
        return true;
      }
      return false;
    };
    const isFk = (col: string, index: number) =>
      fkSet.has(col) || (/_id$/i.test(col) && !isPk(col, index));
    return { isPk, isFk };
  }, [schema.primaryKeys, schema.references, table]);

  return (
    <table className="table-definition">
      <tbody>
        {columns.map(([name, type], i) => {
          const pk = isPk(name, i);
          const fk = !pk && isFk(name, i);
          const category = categorizeType(type);
          return (
            <tr key={name}>
              <td className={`col-name-cell ${pk ? "pk" : ""} ${fk ? "fk" : ""}`}>
                <span className="col-name">
                  {name}
                  {pk && <span className="col-tag pk">PK</span>}
                  {fk && <span className="col-tag fk">FK</span>}
                </span>
              </td>
              <td className={`col-type type-${category}`}>{type}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
