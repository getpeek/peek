import { ImportedDataSourceShape } from "./ImportedDataShape";
import { ImportedResultTable } from "./ImportedResultTable";

export const ImportedDataSource = ({
  shape,
}: {
  shape: ImportedDataSourceShape;
}) => {
  return <ImportedResultTable shape={shape} />;
};
