/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 * @format
 */

'use strict';

/*::
import type {Diagnostic} from 'typescript';
*/

const path = require('node:path');
const ts = require('typescript');

const TYPE_TESTS_DIR = __dirname;
const FANTOM_DIR = path.dirname(TYPE_TESTS_DIR);

/**
 * Type-checks Fantom's own declarations, which the type tests' `skipLibCheck`
 * leaves out, so that an import they make that stops resolving fails instead of
 * typing its names as `any`.
 */
function checkGeneratedDeclarations() /*: ReadonlyArray<Diagnostic> */ {
  const {config} = ts.readConfigFile(
    path.join(TYPE_TESTS_DIR, 'tsconfig.json'),
    ts.sys.readFile,
  );
  const {fileNames, options} = ts.parseJsonConfigFileContent(
    config,
    ts.sys,
    TYPE_TESTS_DIR,
  );
  const program = ts.createProgram([...fileNames], {
    ...options,
    skipLibCheck: false,
  });
  return program
    .getSourceFiles()
    .filter(
      sourceFile =>
        sourceFile.isDeclarationFile &&
        path.resolve(sourceFile.fileName).startsWith(FANTOM_DIR + path.sep),
    )
    .flatMap(sourceFile => [
      ...program.getSyntacticDiagnostics(sourceFile),
      ...program.getSemanticDiagnostics(sourceFile),
    ]);
}

const diagnostics = checkGeneratedDeclarations();
if (diagnostics.length > 0) {
  console.error(
    ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCanonicalFileName: fileName => fileName,
      getCurrentDirectory: ts.sys.getCurrentDirectory,
      getNewLine: () => ts.sys.newLine,
    }),
  );
  process.exitCode = 1;
}
