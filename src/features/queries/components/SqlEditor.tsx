import Editor from "@monaco-editor/react";
import type { Monaco } from "@monaco-editor/react";
import type { editor, IDisposable, languages } from "monaco-editor";
import { useEffect, useRef } from "react";

import type { QueryEditorMetadata, SqlDiagnostic } from "@/data/types";

type SqlEditorProps = {
	value: string;
	isDark: boolean;
	onChange: (value: string) => void;
	onRun: () => void;
	onRunStatement: () => void;
	metadata?: QueryEditorMetadata;
	diagnostics: SqlDiagnostic[];
};

function completionItemsFromMetadata(
	metadata: QueryEditorMetadata | undefined,
): languages.CompletionItem[] {
	if (!metadata) return [];
	const items: languages.CompletionItem[] = [];
	for (const table of metadata.tables) {
		const fqTable = `${table.schema}.${table.name}`;
		items.push({
			label: fqTable,
			kind: 18,
			insertText: fqTable,
			detail: "table",
		});
		for (const column of table.columns) {
			items.push({
				label: `${fqTable}.${column.name}`,
				kind: 5,
				insertText: `${table.name}.${column.name}`,
				detail: column.dataType,
			});
		}
	}
	for (const fn of metadata.functions) {
		items.push({
			label: `${fn.schema}.${fn.name}`,
			kind: 1,
			insertText: `${fn.name}($1)`,
			insertTextRules: 4,
			detail: fn.returnType,
		});
	}
	return items;
}

export function SqlEditor({
	value,
	isDark,
	onChange,
	onRun,
	onRunStatement,
	metadata,
	diagnostics,
}: SqlEditorProps) {
	const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
	const monacoRef = useRef<Monaco | null>(null);
	const providerRef = useRef<IDisposable | null>(null);
	const markersOwner = "veloxdb-sql-lint";

	useEffect(() => {
		const model = editorRef.current?.getModel();
		if (!model) return;
		const markers: editor.IMarkerData[] = diagnostics.map((item) => {
			const line = Math.max(1, item.line ?? 1);
			const col = Math.max(1, item.column ?? 1);
			return {
				message: item.message,
				severity:
					item.severity === "warning" ? 4 : item.severity === "info" ? 2 : 8,
				startLineNumber: line,
				startColumn: col,
				endLineNumber: Math.max(line, item.endLine ?? line),
				endColumn: Math.max(col + 1, item.endColumn ?? col + 1),
			};
		});
		monacoRef.current?.editor.setModelMarkers(model, markersOwner, markers);
	}, [diagnostics]);

	const handleMount = (
		instance: editor.IStandaloneCodeEditor,
		monaco: Monaco,
	) => {
		editorRef.current = instance;
		monacoRef.current = monaco;
		providerRef.current?.dispose();
		providerRef.current = instance.getModel()
			? monaco.languages.registerCompletionItemProvider("sql", {
					provideCompletionItems: (model, position) => {
						const word = model.getWordUntilPosition(position);
						const range = {
							startLineNumber: position.lineNumber,
							endLineNumber: position.lineNumber,
							startColumn: word.startColumn,
							endColumn: word.endColumn,
						};
						const suggestions = completionItemsFromMetadata(metadata).map((item) => ({
							...item,
							range,
						}));
						return { suggestions };
					},
			  })
			: null;

		instance.addAction({
			id: "veloxdb-run-query",
			label: "Run query",
			keybindings: [2048 | 3, 256 | 3],
			run: () => onRun(),
		});
		instance.addAction({
			id: "veloxdb-run-statement",
			label: "Run statement",
			keybindings: [1024 | 3],
			run: () => onRunStatement(),
		});
	};

	useEffect(() => {
		providerRef.current?.dispose();
		if (!editorRef.current || !monacoRef.current) return;
		providerRef.current = monacoRef.current.languages.registerCompletionItemProvider(
			"sql",
			{
			provideCompletionItems: (model, position) => {
				const word = model.getWordUntilPosition(position);
				const range = {
					startLineNumber: position.lineNumber,
					endLineNumber: position.lineNumber,
					startColumn: word.startColumn,
					endColumn: word.endColumn,
				};
				return {
					suggestions: completionItemsFromMetadata(metadata).map((item) => ({
						...item,
						range,
					})),
				};
			},
			},
		);
		return () => providerRef.current?.dispose();
	}, [metadata]);

	return (
		<Editor
			height="100%"
			defaultLanguage="sql"
			theme={isDark ? "vs-dark" : "vs-light"}
			value={value}
			onMount={handleMount}
			onChange={(nextValue) => onChange(nextValue ?? "")}
			options={{
				automaticLayout: true,
				minimap: { enabled: false },
				fontFamily: "JetBrains Mono Variable, monospace",
				fontSize: 13,
				padding: { top: 16, bottom: 16 },
				lineNumbersMinChars: 3,
				scrollBeyondLastLine: false,
				wordWrap: "on",
				tabSize: 2,
			}}
		/>
	);
}
