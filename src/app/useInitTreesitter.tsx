import { useSetAtom } from "jotai";
import { useEffect } from "react";
import { Parser, Language } from "web-tree-sitter";
import { sqlParserAtom, sqlLanguageAtom } from "../state";
import { indexedDBService } from "../db/IndexedDBService";

export const useTreesitter = () => {
  const setSqlParser = useSetAtom(sqlParserAtom);
  const setSqlLanguage = useSetAtom(sqlLanguageAtom);

  useEffect(() => {
    const initTreeSitter = async () => {
      await Parser.init();

      const wasmPath = new URL("/tree-sitter-sql.wasm", window.location.origin)
        .href;
      const SQL = await Language.load(wasmPath);

      const parser = new Parser();
      parser.setLanguage(SQL);
      setSqlParser(parser);
      setSqlLanguage(SQL);
    };

    indexedDBService.init().catch(console.error);
    initTreeSitter().then(() => {});
  }, [setSqlParser, setSqlLanguage]);
};
