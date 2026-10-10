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
  const localRequire = (specifier) => {
    if (specifier.startsWith('.'))
      return module.exports(
        path.relative(
          path.resolve(__dirname, '..'),
          path.resolve(path.dirname(filename), specifier + '.ts')
        )
      );
    return require(specifier);
  };
  new Function('module', 'exports', 'require', outputText)(
    compiled,
    compiled.exports,
    localRequire
  );
  return compiled.exports;
};
