import { useEffect, useRef } from "react";
import Editor, { Monaco } from "@monaco-editor/react";
import { useAtomValue } from "jotai";
import { schemaAtom, sqlLanguageAtom, sqlParserAtom } from "../../../state";
import { createSqlProvider } from "./languageProvider";
import { editor, IDisposable } from "monaco-editor";
import { rosePineTheme } from "../../../themes/rosePineTheme";

export const MonacoManager = () => {
  const schema = useAtomValue(schemaAtom);
  const parser = useAtomValue(sqlParserAtom);
  const language = useAtomValue(sqlLanguageAtom);

  const monacoRef = useRef<Monaco | null>(null);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const providerRef = useRef<IDisposable | null>(null);
  const lastSchemaRef = useRef<string>("");

  const registerCompletionProvider = () => {
    if (!monacoRef.current || !schema || !parser || !language) {
      return;
    }

    const currentSchemaString = JSON.stringify(schema);
    if (currentSchemaString === lastSchemaRef.current) {
      return;
    }

    if (providerRef.current) {
      console.log("disposing old provider");
      providerRef.current.dispose();
      providerRef.current = null;
    }

    const provider = createSqlProvider({
      ...schema,
      parser,
      language,
    });

    providerRef.current =
      monacoRef.current.languages.registerCompletionItemProvider(
        "sql",
        provider,
      );

    lastSchemaRef.current = currentSchemaString;
  };

  useEffect(() => {
    registerCompletionProvider();
  }, [schema, parser, language]);

  return (
    <div
      style={{
        position: "absolute",
        left: -9999,
        top: -9999,
        width: 1,
        height: 1,
      }}
    >
      <Editor
        height="1px"
        width="1px"
        defaultLanguage="sql"
        defaultValue=""
        theme="vs-dark"
        onMount={(editor, monaco) => {
          monacoRef.current = monaco;
          editorRef.current = editor;

          // Register Rose Pine theme
          monaco.editor.defineTheme("rose-pine", rosePineTheme);

          registerCompletionProvider();
        }}
        options={{
          readOnly: true,
          minimap: { enabled: false },
          lineNumbers: "off",
          folding: false,
          scrollBeyondLastLine: false,
          renderLineHighlight: "none",
          selectionHighlight: false,
          contextmenu: false,
        }}
      />
    </div>
  );
};
