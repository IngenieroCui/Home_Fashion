const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const load = require('./load-typescript.cjs');
const orders = load('src/lib/orders.ts');
function render(file, fixture) {
 const source = fs.readFileSync(path.join(__dirname, '../src/components', file), 'utf8');
 const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
 const mod = { exports: {} }; let state = 0;
 const localRequire = (name) => {
  if(name === 'react') return { ...React, useState: () => [state++ === 0 ? fixture : null, () => {}], useEffect: () => {}, useCallback: value => value };
  if(name === 'next/link') return { __esModule: true, default: props => React.createElement('a', { href: props.href }, props.children) };
  if(name === '@/lib/orders') return orders;
  if(name === '@/lib/workshop-jobs') return load('src/lib/workshop-jobs.ts');
  if(name.startsWith('./')) return new Proxy({}, { get: (_o, key) => key === '__esModule' ? true : () => null });
  if(name.startsWith('@/')) return {};
  return require(name);
 };
 new Function('module', 'exports', 'require', output)(mod, mod.exports, localRequire);
 return renderToStaticMarkup(React.createElement(Object.values(mod.exports)[0], { id: 'QA', canReview: false }));
}
test('Workshop detail renders supply and item/order statuses using existing Spanish labels', () => {
 const html = render('workshop-job-detail.tsx', { id:'QA',status:'IN_PROGRESS',code:'QA',workshopUser:{fullName:'QA'},assignedByUser:{fullName:'QA'},order:{id:'QA',status:'IN_PROGRESS'},orderItem:{status:'IN_PRODUCTION',supplyType:'MADE_TO_ORDER',quantity:1},progressReports:[] });
 assert.match(html, /Fabricación bajo pedido/); assert.match(html, /En fabricación/); assert.match(html, /En proceso/);
 assert.doesNotMatch(html, /MADE_TO_ORDER|IN_PRODUCTION|IN_PROGRESS/);
});
test('Workshop progress detail renders the item state using its shared label', () => {
 const html = render('workshop-progress-detail.tsx', { id:'QA',type:'PROGRESS',reviewStatus:'PENDING_REVIEW',workshopJob:{id:'QA',status:'IN_PROGRESS'},order:{id:'QA'},orderItem:{status:'IN_PRODUCTION',quantity:1},evidenceUrls:[] });
 assert.match(html, /En fabricación/); assert.doesNotMatch(html, /IN_PRODUCTION|IN_PROGRESS/);
});
