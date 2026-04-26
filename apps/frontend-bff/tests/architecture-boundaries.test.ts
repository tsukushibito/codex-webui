import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";
import { describe, expect, it } from "vitest";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(testDir, "..");
const appDir = path.join(appRoot, "app");

const sourceExtensions = [".ts", ".tsx"];
const guardedRouteDirectories = [
  "app/api/v1/home",
  "app/api/v1/notifications",
  "app/api/v1/requests",
  "app/api/v1/threads",
  "app/api/v1/workspaces",
];

const allowedFilePaths = new Set(
  [
    "app/api/v1/approvals/[approvalId]/approve/route.ts",
    "app/api/v1/approvals/[approvalId]/deny/route.ts",
    "app/api/v1/approvals/[approvalId]/route.ts",
    "app/api/v1/approvals/route.ts",
    "app/api/v1/approvals/stream/route.ts",
    "app/api/v1/sessions/[sessionId]/events/route.ts",
    "app/api/v1/sessions/[sessionId]/messages/route.ts",
    "app/api/v1/sessions/[sessionId]/route.ts",
    "app/api/v1/sessions/[sessionId]/start/route.ts",
    "app/api/v1/sessions/[sessionId]/stop/route.ts",
    "app/api/v1/sessions/[sessionId]/stream/route.ts",
    "app/api/v1/workspaces/[workspaceId]/sessions/route.ts",
    "src/chat-send-recovery.ts",
    "src/handlers/legacy-streams.ts",
    "src/handlers/legacy.ts",
    "src/legacy-types.ts",
    "src/mappings/legacy.ts",
    "src/retired-routes.ts",
    "src/session-status.ts",
    "tests/chat-send-recovery.test.ts",
    "tests/routes.test.ts",
    "tests/session-status.test.ts",
  ].map((filePath) => toAbsolutePath(filePath)),
);

const forbiddenModuleMatchers = [
  /^app\/api\/v1\/sessions(?:\/|$)/,
  /^app\/api\/v1\/approvals(?:\/|$)/,
  /^app\/api\/v1\/workspaces\/\[workspaceId\]\/sessions\/route\.ts$/,
  /^src\/legacy-types\.ts$/,
  /^src\/handlers\/legacy-streams\.ts$/,
  /^src\/handlers\/legacy\.ts$/,
  /^src\/mappings\/legacy\.ts$/,
];

const forbiddenPathMatchers = [
  /^\/api\/v1\/sessions(?:\/|$)/,
  /^\/api\/v1\/approvals(?:\/|$)/,
  /^\/api\/v1\/workspaces\/(?:\$\{[^}]+\}|[^/]+)\/sessions(?:\/|$|\$\{)/,
];

type Demand = "all" | Set<string>;

interface ImportEdge {
  modulePath: string;
  demand: Demand;
}

interface ExportEdge {
  exportName: string;
  localName: string;
  modulePath: string;
  node: ts.ExportDeclaration;
}

interface ModuleInfo {
  sourceFile: ts.SourceFile;
  importEdges: ImportEdge[];
  exportEdges: ExportEdge[];
  exportedDeclarationNodes: Map<string, ts.Node>;
}

interface TraversalState {
  demand: Demand;
  scanWholeFile: boolean;
}

describe("frontend-bff architecture boundaries", () => {
  it("keeps active v0.9 surfaces off retired routes and public path assumptions", () => {
    const rootFiles = collectGuardRootFiles();
    const traversalStates = collectTraversalStates(rootFiles);
    const violations = [
      ...collectModuleViolations(traversalStates),
      ...collectPathViolations(traversalStates),
    ];

    expect(violations).toEqual([]);
  });

  it("checks shared barrels by requested export instead of allowing them wholesale", () => {
    const activeHandlerStates = new Map<string, TraversalState>([
      [toAbsolutePath("src/handlers.ts"), demandState(["getHome"])],
    ]);
    const legacyHandlerStates = new Map<string, TraversalState>([
      [toAbsolutePath("src/handlers.ts"), demandState(["listSessions"])],
    ]);
    const activeMappingStates = new Map<string, TraversalState>([
      [toAbsolutePath("src/mappings.ts"), demandState(["mapThread"])],
    ]);
    const legacyMappingStates = new Map<string, TraversalState>([
      [toAbsolutePath("src/mappings.ts"), demandState(["mapSession"])],
    ]);

    expect(collectModuleViolations(activeHandlerStates)).toEqual([]);
    expect(collectModuleViolations(activeMappingStates)).toEqual([]);
    expect(collectModuleViolations(legacyHandlerStates)).toEqual([
      "src/handlers.ts re-exports retired module src/handlers/legacy.ts",
    ]);
    expect(collectModuleViolations(legacyMappingStates)).toEqual([
      "src/mappings.ts re-exports retired module src/mappings/legacy.ts",
    ]);
  });
});

function demandState(exportNames: string[]): TraversalState {
  return {
    demand: new Set(exportNames),
    scanWholeFile: false,
  };
}

function collectGuardRootFiles() {
  const rootFiles = new Set<string>([
    toAbsolutePath("app/page.tsx"),
    toAbsolutePath("app/approvals/page.tsx"),
  ]);

  for (const filePath of walkDirectory(path.join(appDir, "chat"))) {
    if (isSourceFile(filePath)) {
      rootFiles.add(filePath);
    }
  }

  for (const directory of guardedRouteDirectories) {
    for (const filePath of walkDirectory(toAbsolutePath(directory))) {
      if (!isSourceFile(filePath)) {
        continue;
      }

      const repoRelativePath = toRepoRelativePath(filePath);
      if (
        repoRelativePath === "app/api/v1/workspaces/[workspaceId]/sessions/route.ts" ||
        repoRelativePath.startsWith("app/api/v1/approvals/") ||
        repoRelativePath.startsWith("app/api/v1/sessions/")
      ) {
        continue;
      }

      rootFiles.add(filePath);
    }
  }

  return rootFiles;
}

function collectTraversalStates(rootFiles: Set<string>) {
  const states = new Map<string, TraversalState>();
  const queue = [...rootFiles];

  for (const filePath of rootFiles) {
    states.set(filePath, { demand: "all", scanWholeFile: true });
  }

  while (queue.length > 0) {
    const filePath = queue.shift();
    if (!filePath) {
      continue;
    }

    const state = states.get(filePath);
    if (!state) {
      continue;
    }

    if (allowedFilePaths.has(filePath) || !fs.existsSync(filePath)) {
      continue;
    }

    const moduleInfo = getModuleInfo(filePath);

    for (const edge of moduleInfo.importEdges) {
      if (allowedFilePaths.has(edge.modulePath)) {
        continue;
      }

      if (mergeTraversalState(states, edge.modulePath, edge.demand, false)) {
        queue.push(edge.modulePath);
      }
    }

    for (const edge of moduleInfo.exportEdges) {
      if (!isExportEdgeRelevant(edge, state.demand) || allowedFilePaths.has(edge.modulePath)) {
        continue;
      }

      const nextDemand = edge.localName === "*" ? "all" : new Set([edge.localName]);
      if (mergeTraversalState(states, edge.modulePath, nextDemand, false)) {
        queue.push(edge.modulePath);
      }
    }
  }

  return states;
}

function collectModuleViolations(states: Map<string, TraversalState>) {
  const violations: string[] = [];

  for (const [filePath, state] of states) {
    if (allowedFilePaths.has(filePath)) {
      continue;
    }

    const moduleInfo = getModuleInfo(filePath);

    for (const importEdge of moduleInfo.importEdges) {
      const match = matchForbiddenModule(importEdge.modulePath);
      if (!match) {
        continue;
      }

      violations.push(
        `${toRepoRelativePath(filePath)} imports retired module ${formatRepoPath(match)}`,
      );
    }

    for (const exportEdge of moduleInfo.exportEdges) {
      if (!isExportEdgeRelevant(exportEdge, state.demand)) {
        continue;
      }

      const match = matchForbiddenModule(exportEdge.modulePath);
      if (!match) {
        continue;
      }

      violations.push(
        `${toRepoRelativePath(filePath)} re-exports retired module ${formatRepoPath(match)}`,
      );
    }
  }

  return violations;
}

function collectPathViolations(states: Map<string, TraversalState>) {
  const violations: string[] = [];

  for (const [filePath, state] of states) {
    if (allowedFilePaths.has(filePath)) {
      continue;
    }

    const moduleInfo = getModuleInfo(filePath);
    const ignoredRanges = state.scanWholeFile
      ? []
      : collectUnusedExportRanges(moduleInfo, state.demand);

    walkNodes(moduleInfo.sourceFile, (node) => {
      if (isIgnoredNode(node, ignoredRanges) || isModuleSpecifierNode(node)) {
        return;
      }

      const candidate = extractLiteralCandidate(node);
      if (!candidate) {
        return;
      }

      const match = matchForbiddenPath(candidate);
      if (!match) {
        return;
      }

      violations.push(`${toRepoRelativePath(filePath)} uses retired path ${match}`);
    });
  }

  return violations;
}

function getModuleInfo(filePath: string): ModuleInfo {
  const sourceText = fs.readFileSync(filePath, "utf8");
  const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true);
  const importEdges: ImportEdge[] = [];
  const exportEdges: ExportEdge[] = [];
  const exportedDeclarationNodes = new Map<string, ts.Node>();

  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
      const modulePath = resolveLocalModule(filePath, statement.moduleSpecifier.text);
      if (!modulePath) {
        continue;
      }

      importEdges.push({
        modulePath,
        demand: getImportDemand(statement.importClause),
      });
      continue;
    }

    if (ts.isExportDeclaration(statement)) {
      if (!statement.moduleSpecifier || !ts.isStringLiteral(statement.moduleSpecifier)) {
        continue;
      }

      const modulePath = resolveLocalModule(filePath, statement.moduleSpecifier.text);
      if (!modulePath) {
        continue;
      }

      if (!statement.exportClause) {
        exportEdges.push({
          exportName: "*",
          localName: "*",
          modulePath,
          node: statement,
        });
        continue;
      }

      if (!ts.isNamedExports(statement.exportClause)) {
        continue;
      }

      for (const specifier of statement.exportClause.elements) {
        exportEdges.push({
          exportName: specifier.name.text,
          localName: specifier.propertyName?.text ?? specifier.name.text,
          modulePath,
          node: statement,
        });
      }
      continue;
    }

    if (!hasExportModifier(statement)) {
      continue;
    }

    for (const [exportName, node] of getExportedDeclarationEntries(statement)) {
      exportedDeclarationNodes.set(exportName, node);
    }
  }

  return {
    sourceFile,
    importEdges,
    exportEdges,
    exportedDeclarationNodes,
  };
}

function mergeTraversalState(
  states: Map<string, TraversalState>,
  filePath: string,
  nextDemand: Demand,
  scanWholeFile: boolean,
) {
  const previous = states.get(filePath);
  if (!previous) {
    states.set(filePath, {
      demand: nextDemand === "all" ? "all" : new Set(nextDemand),
      scanWholeFile,
    });
    return true;
  }

  const previousDemand = previous.demand;
  const mergedDemand =
    previousDemand === "all" || nextDemand === "all"
      ? "all"
      : new Set([...previousDemand, ...nextDemand]);
  const demandChanged =
    previousDemand !== "all" &&
    (mergedDemand === "all" || mergedDemand.size !== previousDemand.size);
  const scanChanged = scanWholeFile && !previous.scanWholeFile;

  if (!demandChanged && !scanChanged) {
    return false;
  }

  states.set(filePath, {
    demand: mergedDemand,
    scanWholeFile: previous.scanWholeFile || scanWholeFile,
  });
  return true;
}

function collectUnusedExportRanges(moduleInfo: ModuleInfo, demand: Demand) {
  if (demand === "all") {
    return [];
  }

  const activeNodes = new Set<ts.Node>();
  for (const exportName of demand) {
    const node = moduleInfo.exportedDeclarationNodes.get(exportName);
    if (node) {
      activeNodes.add(node);
    }
  }

  const ranges: Array<[number, number]> = [];
  const addedNodes = new Set<ts.Node>();

  for (const node of moduleInfo.exportedDeclarationNodes.values()) {
    if (activeNodes.has(node) || addedNodes.has(node)) {
      continue;
    }

    addedNodes.add(node);
    ranges.push([node.getStart(moduleInfo.sourceFile), node.getEnd()]);
  }

  return ranges;
}

function getImportDemand(importClause: ts.ImportClause | undefined): Demand {
  if (!importClause) {
    return "all";
  }

  const names = new Set<string>();

  if (importClause.name) {
    names.add("default");
  }

  const namedBindings = importClause.namedBindings;
  if (namedBindings) {
    if (ts.isNamespaceImport(namedBindings)) {
      return "all";
    }

    for (const element of namedBindings.elements) {
      names.add(element.propertyName?.text ?? element.name.text);
    }
  }

  return names.size > 0 ? names : "all";
}

function getExportedDeclarationEntries(statement: ts.Statement): Array<[string, ts.Node]> {
  if (ts.isFunctionDeclaration(statement) && statement.name) {
    return [[statement.name.text, statement]];
  }

  if (ts.isClassDeclaration(statement) && statement.name) {
    return [[statement.name.text, statement]];
  }

  if (ts.isEnumDeclaration(statement)) {
    return [[statement.name.text, statement]];
  }

  if (ts.isTypeAliasDeclaration(statement) || ts.isInterfaceDeclaration(statement)) {
    return [[statement.name.text, statement]];
  }

  if (ts.isVariableStatement(statement)) {
    const entries: Array<[string, ts.Node]> = [];
    for (const declaration of statement.declarationList.declarations) {
      collectBindingNames(declaration.name, (name) => {
        entries.push([name, statement]);
      });
    }
    return entries;
  }

  return [];
}

function collectBindingNames(name: ts.BindingName, onName: (name: string) => void) {
  if (ts.isIdentifier(name)) {
    onName(name.text);
    return;
  }

  for (const element of name.elements) {
    if (ts.isOmittedExpression(element)) {
      continue;
    }

    collectBindingNames(element.name, onName);
  }
}

function hasExportModifier(node: ts.Node) {
  return ts.canHaveModifiers(node)
    ? ts.getModifiers(node)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ===
        true
    : false;
}

function isExportEdgeRelevant(edge: ExportEdge, demand: Demand) {
  return demand === "all" || edge.exportName === "*" || demand.has(edge.exportName);
}

function resolveLocalModule(fromFilePath: string, specifier: string) {
  if (specifier.startsWith("@/")) {
    return resolveModulePath(path.join(appRoot, specifier.slice(2)));
  }

  if (specifier.startsWith(".")) {
    return resolveModulePath(path.resolve(path.dirname(fromFilePath), specifier));
  }

  return null;
}

function resolveModulePath(candidatePath: string) {
  const directMatch = sourceExtensions.find((extension) =>
    candidatePath.endsWith(extension) ? fs.existsSync(candidatePath) : false,
  );
  if (directMatch) {
    return candidatePath;
  }

  for (const extension of sourceExtensions) {
    const filePath = `${candidatePath}${extension}`;
    if (fs.existsSync(filePath)) {
      return filePath;
    }
  }

  for (const extension of sourceExtensions) {
    const indexPath = path.join(candidatePath, `index${extension}`);
    if (fs.existsSync(indexPath)) {
      return indexPath;
    }
  }

  return null;
}

function matchForbiddenModule(filePath: string) {
  const repoRelativePath = toRepoRelativePath(filePath);
  return forbiddenModuleMatchers.some((matcher) => matcher.test(repoRelativePath))
    ? filePath
    : null;
}

function matchForbiddenPath(candidate: string) {
  for (const matcher of forbiddenPathMatchers) {
    if (matcher.test(candidate)) {
      return candidate;
    }
  }

  return null;
}

function extractLiteralCandidate(node: ts.Node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }

  if (!ts.isTemplateExpression(node)) {
    return null;
  }

  return `${node.head.text}${node.templateSpans
    .map((span) => `\${${span.expression.getText()}}${span.literal.text}`)
    .join("")}`;
}

function isIgnoredNode(node: ts.Node, ranges: Array<[number, number]>) {
  return ranges.some(([start, end]) => node.getStart() >= start && node.getEnd() <= end);
}

function isModuleSpecifierNode(node: ts.Node) {
  const parent = node.parent;
  if (!parent) {
    return false;
  }

  return (
    (ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent)) &&
    parent.moduleSpecifier === node
  );
}

function walkNodes(node: ts.Node, onNode: (node: ts.Node) => void) {
  onNode(node);
  ts.forEachChild(node, (child) => {
    walkNodes(child, onNode);
  });
}

function walkDirectory(directoryPath: string): string[] {
  const files: string[] = [];

  for (const entry of fs.readdirSync(directoryPath, { withFileTypes: true })) {
    const entryPath = path.join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkDirectory(entryPath));
      continue;
    }

    files.push(entryPath);
  }

  return files;
}

function isSourceFile(filePath: string) {
  return sourceExtensions.some((extension) => filePath.endsWith(extension));
}

function toAbsolutePath(repoRelativePath: string) {
  return path.join(appRoot, repoRelativePath);
}

function toRepoRelativePath(filePath: string) {
  return path.relative(appRoot, filePath).replaceAll(path.sep, "/");
}

function formatRepoPath(filePath: string) {
  return toRepoRelativePath(filePath);
}
