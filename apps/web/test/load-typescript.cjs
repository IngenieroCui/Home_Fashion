const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// Run small, framework-independent modules using the compiler already used by Next.
// Type checking remains part of the production build.
module.exports = function load(relativePath) {
  const filename = path.resolve(__dirname, '..', relativePath);
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: filename
  });
  const compiled = { exports: {} };
  new Function('module', 'exports', outputText)(compiled, compiled.exports);
  return compiled.exports;
};
