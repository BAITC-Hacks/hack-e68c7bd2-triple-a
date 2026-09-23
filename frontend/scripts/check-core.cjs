/* Dependency-light regression checks for the actual TS service modules.
   Requires TypeScript only; uses no alternative implementation of the search logic. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const cache = new Map();
globalThis.__frontendTestEnv = { BASE_URL: '/', VITE_SEARCH_MODE: 'api' };
function load(relative) {
  const file = path.resolve(root, relative.endsWith('.ts') ? relative : `${relative}.ts`);
  if (cache.has(file)) return cache.get(file).exports;
  const source = fs.readFileSync(file, 'utf8').replaceAll('import.meta.env', 'globalThis.__frontendTestEnv');
  const code = ts.transpileModule(source, { fileName: file, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} }; cache.set(file, module);
  vm.runInThisContext(`(function(module,exports,require){${code}\n})`, { filename: file })(module, module.exports, name => {
    if (name.startsWith('.')) return load(path.relative(root, path.resolve(path.dirname(file),name)));
    return require(name);
  });
  return module.exports;
}
let passed = 0;
function check(name, fn) { try { fn(); passed++; console.log(`PASS ${name}`); } catch (error) { console.error(`FAIL ${name}`); throw error; } }
const { parseCatalog, searchCatalog } = load('src/services/staticSearch');
const { parseSearchResponse, resolveApiBaseUrl } = load('src/services/searchApi');
const { validateSearchForm, toSearchRequest } = load('src/utils/validation');
const { loadSearchDraft, saveSearchDraft, removeSearchDraft } = load('src/utils/storage');
const { CATEGORIES } = load('src/config/search');
const data = JSON.parse(fs.readFileSync(path.join(root,'public/data/contractors.json'),'utf8'));
const catalog = parseCatalog(data);
const base = {city:'Алматы',event_date:'2026-11-14',event_type:'свадьба',category:'Фотограф',budget_kzt:300000,duration_hours:null,language:null};
const form = {...base,budget_kzt:'300000',duration_hours:'',language:''};
const result = searchCatalog(catalog,base);
check('catalog has 69 unique profiles',()=>assert.equal(catalog.length,69));
check('all 17 categories can be selected',()=>assert.deepEqual([...new Set(catalog.flatMap(x=>x.categories))].sort(),[...CATEGORIES].sort()));
check('all 16 synthetic markers retained',()=>assert.equal(catalog.filter(x=>x.synthetic).length,16));
check('known demo returns expected top 3',()=>assert.deepEqual(result.results.map(x=>x.id),['HK-91112','HK-76268','HK-68220']));
check('missing category distinguished',()=>assert.equal(searchCatalog(catalog,{...base,category:'Не существует'}).status,'no_category'));
check('low budget produces no_match',()=>assert.equal(searchCatalog(catalog,{...base,budget_kzt:1000}).status,'no_match'));
check('rare category explains fewer than 3',()=>assert.match(searchCatalog(catalog,{...base,category:'Флорист',budget_kzt:350000}).message,/1 из 2/));
check('search order repeated exactly',()=>assert.deepEqual(searchCatalog(catalog,base),result));
check('response parser accepts required fields and extras',()=>assert.deepEqual(parseSearchResponse(result),result));
for (const value of [null,{}, {status:'ok',results:[]}, {status:'ok',results:'bad'}, {status:'no_match',results:[result.results[0]]}, {status:'ok',results:[result.results[0],result.results[0]]}]) {
 check('reject malformed API response '+JSON.stringify(value).slice(0,30),()=>assert.throws(()=>parseSearchResponse(value)));
}
for (const bad of [null,[],[...data,data[0]],[{...data[0],busy_dates:['2026-11-31']}],[{...data[0],busy_dates:['20261114']}],[{...data[0],busy_dates:['2027-01-01']}],[{...data[0],synthetic:'false'}]]) {
 check('reject malformed catalog '+passed,()=>assert.throws(()=>parseCatalog(bad)));
}
check('valid form has no errors',()=>assert.deepEqual(validateSearchForm(form),{}));
check('typed request matches contract',()=>assert.deepEqual(toSearchRequest(form),base));
for (const value of ['20261114','2026-W46-6','2026-11-31','2026-09-22','2027-01-01','']) {
 check('invalid date '+value,()=>assert.ok(validateSearchForm({...form,event_date:value}).event_date));
}
for (const value of ['-1','0','1.5','NaN','9007199254740992']) {
 check('invalid budget '+value,()=>assert.ok(validateSearchForm({...form,budget_kzt:value}).budget_kzt));
 check('invalid duration '+value,()=>assert.ok(validateSearchForm({...form,duration_hours:value}).duration_hours));
}
for (const value of ['2026-09-23','2026-12-31']) check('calendar boundary '+value,()=>assert.deepEqual(validateSearchForm({...form,event_date:value}),{}));
check('default API uses same-origin /api',()=>assert.equal(resolveApiBaseUrl(),'/api'));
check('API trailing slash normalized',()=>assert.equal(resolveApiBaseUrl('https://example.test/api/'),'https://example.test/api'));
for (const value of ['javascript:alert(1)','//evil.test','https://user:password@example.test','https://example.test/?key=x','file:///etc/passwd']) {
 check('reject unsafe API URL '+value,()=>assert.throws(()=>resolveApiBaseUrl(value)));
}
const map=new Map(); const storage={getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value),removeItem:key=>map.delete(key)};
check('draft save and restore',()=>{assert.ok(saveSearchDraft(form,storage));assert.deepEqual(loadSearchDraft(storage).values,form)});
check('draft reset removes persisted data',()=>{assert.ok(removeSearchDraft(storage));assert.equal(map.size,0)});
check('blocked storage handled',()=>assert.equal(loadSearchDraft({getItem(){throw new Error('blocked')}}).storageAvailable,false));
check('corrupted draft ignored',()=>{map.set('shabyt.search-draft.v1','{broken');assert.equal(loadSearchDraft(storage).values.city,'')});
if (process.argv[2]) {
 const cases=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
 for(let i=0;i<cases.length;i++) {
  check('API/static parity '+i,()=>{const actual=searchCatalog(catalog,cases[i].request);assert.equal(actual.status,cases[i].status);assert.deepEqual(actual.results.map(x=>x.id),cases[i].ids)});
 }
}
console.log(`\n${passed} core checks passed (actual service TS transpiled with TypeScript; not a Vite build).`);
