/* 判定逻辑单元测试：node test/cases.node.js */
'use strict';
var L = require('../logic.js');
var R = L.RULES;

var NOW = new Date(2026, 10, 19, 10, 0, 0); // 2026-11-19
var fails = 0, total = 0;

function ok(cond, name, extra) {
  total++;
  if (!cond) {
    fails++;
    console.log('✗ ' + name + (extra ? '  →  ' + extra : ''));
  }
}

function mk(over) {
  var base = {
    birth: { y: 1990, m: 5, d: 10 },
    sex: 'female',
    disease: 'ssc',
    sscStart: { y: 2023, m: 1 },
    sscUnknown: false,
    ra: {},
    exclusions: {}
  };
  var o = Object.assign({}, base, over || {});
  if (over && over.ra) o.ra = over.ra;
  if (over && over.exclusions) o.exclusions = over.exclusions;
  return o;
}

function raAll(v) {
  return { smoking: v === 'yes' ? 'current' : 'never', rf: v, ccp: v, inflammation: v, activity: v };
}

function exAll(v) {
  var o = {};
  R.exclusions.forEach(function (e) { o[e.id] = v; });
  return o;
}

/* ---------- 年龄边界 ---------- */
ok(L.computeAge({ y: 2008, m: 11, d: 19 }, new Date(2026, 10, 19)) === 18, '18 岁生日当天 = 18 周岁');
ok(L.computeAge({ y: 2008, m: 11, d: 20 }, new Date(2026, 10, 19)) === 17, '差一天满 18 = 17 周岁');
ok(L.computeAge({ y: 1950, m: 11, d: 20 }, new Date(2026, 10, 19)) === 75, '差一天满 76 = 75 周岁');

var r = L.evaluate(mk({ birth: { y: 2008, m: 11, d: 19 }, exclusions: exAll('no') }), NOW);
ok(r.status === 'pass', '刚满 18 岁通过', r.status);

r = L.evaluate(mk({ birth: { y: 2008, m: 11, d: 20 }, exclusions: exAll('no') }), NOW);
ok(r.status === 'fail' && /未满 18/.test(r.notMatched[0].title), '差一天 18 岁不符合', JSON.stringify(r.notMatched));

r = L.evaluate(mk({ birth: { y: 1950, m: 11, d: 19 }, exclusions: exAll('no') }), NOW);
ok(r.status === 'fail' && /超过 75/.test(r.notMatched[0].title), '76 岁不符合', JSON.stringify(r.notMatched));

r = L.evaluate(mk({ birth: { y: 1950, m: 11, d: 20 }, exclusions: exAll('no') }), NOW);
ok(r.status === 'pass', '75 岁通过', r.status);

/* ---------- SSc 病程边界 ---------- */
function sscAt(y, m) {
  return L.evaluate(mk({ sscStart: { y: y, m: m }, exclusions: exAll('no') }), NOW);
}

r = sscAt(2021, 12); // 59 个月
ok(r.status === 'pass' && r.ssc.months === 59 && !r.ssc.priority, '病程 59 个月符合且非优先', r.status + '/' + r.ssc.months);

r = sscAt(2021, 11); // 60 个月
ok(r.status === 'pass' && r.ssc.months === 60, '病程 60 个月（边界）符合', r.status + '/' + r.ssc.months);

r = sscAt(2021, 10); // 61 个月
ok(r.status === 'fail' && r.ssc.months === 61, '病程 61 个月不符合', r.status + '/' + (r.ssc && r.ssc.months));

r = sscAt(2025, 11); // 12 个月
ok(r.status === 'pass' && r.ssc.priority === true, '病程 12 个月 → 优先推荐', r.status + '/' + r.ssc.priority);

r = sscAt(2025, 5); // 18 个月
ok(r.status === 'pass' && r.ssc.priority === false, '病程 18 个月 → 不再优先', r.status + '/' + r.ssc.priority);

r = L.evaluate(mk({ sscUnknown: true, sscStart: null, exclusions: exAll('no') }), NOW);
ok(r.status === 'need' && r.pending.length === 1, '记不清病程 → 需医生评估', r.status + '/' + r.pending.length);

/* ---------- RA 高危因素 ---------- */
function raAt(over) {
  return L.evaluate(mk(Object.assign({ disease: 'ra', birth: { y: 1970, m: 1, d: 1 }, sex: 'female' }, over)), NOW);
}

r = raAt({ birth: { y: 1960, m: 1, d: 1 }, ra: raAll('no'), exclusions: exAll('no') });
ok(r.ra.met === 1 && r.status === 'fail', '66 岁女性仅年龄 1 项 → 不符合', r.ra.met + '/' + r.status);

r = raAt({ birth: { y: 1990, m: 1, d: 1 }, ra: raAll('no'), exclusions: exAll('no') });
ok(r.ra.met === 0 && r.status === 'fail', '36 岁女性 0 项 → 不符合', r.ra.met + '/' + r.status);

r = raAt({ birth: { y: 1960, m: 1, d: 1 }, ra: raAll('yes'), exclusions: exAll('no') });
ok(r.ra.met === 6 && r.status === 'pass', '年龄 + 5 问全是为 6 项 → 符合', r.ra.met + '/' + r.status);

r = raAt({ birth: { y: 1990, m: 1, d: 1 }, sex: 'male', ra: { smoking: 'quit', rf: 'no', ccp: 'no', inflammation: 'no', activity: 'no' }, exclusions: exAll('no') });
ok(r.ra.met === 2 && r.status === 'pass', '男性 + 曾吸烟 = 2 项 → 符合', r.ra.met + '/' + r.status);

r = raAt({ birth: { y: 1990, m: 1, d: 1 }, sex: 'male', ra: { smoking: 'never', rf: 'unknown', ccp: 'no', inflammation: 'no', activity: 'no' }, exclusions: exAll('no') });
ok(r.ra.met === 1 && r.ra.unsure === 1 && r.status === 'need', '1 项确定 + 1 项待定 → 需医生评估', r.ra.met + '/' + r.ra.unsure + '/' + r.status);

r = raAt({ birth: { y: 1990, m: 1, d: 1 }, sex: 'female', ra: { smoking: 'never', rf: 'unknown', ccp: 'no', inflammation: 'no', activity: 'no' }, exclusions: exAll('no') });
ok(r.ra.met === 0 && r.ra.unsure === 1 && r.status === 'fail', '1 项待定但无法达到 2 项 → 直接不符合', r.ra.met + '/' + r.ra.unsure + '/' + r.status);

r = raAt({ birth: { y: 1990, m: 1, d: 1 }, ra: { smoking: 'never', rf: 'unknown', ccp: 'unknown', inflammation: 'no', activity: 'no' }, exclusions: exAll('no') });
ok(r.ra.met === 0 && r.ra.unsure === 2 && r.status === 'need', '0 项确定 + 2 项待定 → 需医生评估', r.ra.met + '/' + r.ra.unsure + '/' + r.status);

/* ---------- 排除条件 ---------- */
r = L.evaluate(mk({ exclusions: Object.assign(exAll('no'), { e13: 'yes' }) }), NOW);
ok(r.status === 'fail' && r.notMatched.some(function (n) { return /严重过敏/.test(n.title); }), '排除项「是」一票否决', r.status);

r = L.evaluate(mk({ exclusions: Object.assign(exAll('no'), { e14: 'unknown' }) }), NOW);
ok(r.status === 'need' && r.pending.some(function (p) { return /气道阻塞/.test(p.title); }), '排除项「不清楚」→ 需医生评估', r.status);

r = L.evaluate(mk({ exclusions: Object.assign(exAll('no'), { e13: 'yes', e17: 'unknown' }) }), NOW);
ok(r.status === 'fail' && r.pending.length === 1, '有「是」时结论为不符合，但待定项仍列出', r.status + '/' + r.pending.length);

r = L.evaluate(mk({ exclusions: Object.assign(exAll('no'), { e19: 'unknown' }) }), NOW);
ok(r.status === 'pass', '第 19 项不提供「不清楚」，未知值不参与判定', r.status);

r = L.evaluate(mk({ exclusions: Object.assign(exAll('no'), { e20: 'unknown', e21: 'unknown' }) }), NOW);
ok(r.status === 'need' && r.pending.length === 2, '两项待定 → 列出 2 项', r.status + '/' + r.pending.length);

/* ---------- 组合 ---------- */
r = L.evaluate(mk({ birth: { y: 1950, m: 11, d: 19 }, exclusions: Object.assign(exAll('no'), { e17: 'yes' }) }), NOW);
ok(r.status === 'fail' && r.notMatched.length === 2, '年龄超限 + 排除项「是」→ 两条不符合原因', r.notMatched.length);

/* ---------- 展示辅助 ---------- */
ok(L.formatDuration(59) === '4 年 11 个月', 'formatDuration 59', L.formatDuration(59));
ok(L.formatDuration(60) === '5 年', 'formatDuration 60', L.formatDuration(60));
ok(L.formatDuration(12) === '1 年', 'formatDuration 12', L.formatDuration(12));
ok(L.formatDuration(7) === '7 个月', 'formatDuration 7', L.formatDuration(7));

/* ---------- 规则自检 ---------- */
ok(R.raFactors.length === 7, 'RA 高危因素共 7 项', String(R.raFactors.length));
ok(R.raFactors.filter(function (f) { return !!f.q; }).length === 5, '实际提问的 RA 项为 5 个', '');
ok(R.exclusions.length === 9, '排除条件共 9 项', String(R.exclusions.length));
ok(R.materials.length === 8, '报销材料共 8 项', String(R.materials.length));
ok(R.raMinFactors === 2 && R.sscMaxMonths === 60 && R.ageMin === 18 && R.ageMax === 75, '阈值配置正确', '');


/* ---------- 结果二维码：编码 / 解码 ---------- */
function sscInput() {
  return {
    birth: { y: 1963, m: 5, d: 10 }, sex: 'female', disease: 'ssc',
    sscStart: { y: 2025, m: 6 }, sscUnknown: false, ra: {}, exclusions: exAll('no')
  };
}
function raInput() {
  return {
    birth: { y: 1958, m: 2, d: 3 }, sex: 'male', disease: 'ra',
    sscStart: null, sscUnknown: false,
    ra: { smoking: 'current', rf: 'yes', ccp: 'unknown', inflammation: 'no', activity: 'no' },
    exclusions: Object.assign(exAll('no'), { e16: 'unknown' })
  };
}

var TS = 1795000000;
var p1 = L.encodeInput(sscInput(), TS);
var d1 = L.decodeInput(p1);
ok(JSON.stringify(d1.input) === JSON.stringify(sscInput()), 'SSc 答案编码→解码完全还原', p1);
ok(d1.ts === TS, '时间戳还原', String(d1.ts));
ok(L.evaluate(d1.input, new Date(TS * 1000)).status === 'pass', '解码后重算结论一致（初步符合）', '');
ok(/^[0-9A-Z.-]+$/.test(p1), '二维码载荷仅含 URL 安全字符', p1);

var p2 = L.encodeInput(raInput(), TS);
var d2 = L.decodeInput(p2);
ok(JSON.stringify(d2.input) === JSON.stringify(raInput()), 'RA 答案编码→解码完全还原', p2);
ok(L.evaluate(d2.input, new Date(TS * 1000)).status === 'need' ||
   L.evaluate(d2.input, new Date(TS * 1000)).status === 'pass', '解码后重算结论有效', '');

var url = L.buildResultUrl(p1);
ok(url.indexOf('https://lixiaoyu233.github.io/HRCT/#r=') === 0, '二维码链接格式正确', url);
ok(url.length < 160, '二维码链接长度可控（<160 字符）', String(url.length));

/* 篡改检测 */
var tampered = p1.slice(0, -5) + (p1.slice(-5, -4) === 'Y' ? 'Z' : 'Y') + p1.slice(-4);
var caught = false;
try { L.decodeInput(tampered); } catch (e) { caught = true; }
ok(caught, '载荷被改动时拒绝解析', tampered);

var badVer = '2' + p1.slice(1);
caught = false;
try { L.decodeInput(badVer); } catch (e) { caught = true; }
ok(caught, '版本号不对时拒绝解析', '');

caught = false;
try { L.decodeInput('abc.def'); } catch (e) { caught = true; }
ok(caught, '残缺二维码内容拒绝解析', '');

ok(L.decodeInput(L.encodeInput(sscInput(), TS)).input.sscUnknown === false, 'SSc 病程未知标记正确', '');
var unknownInput = sscInput();
unknownInput.sscUnknown = true;
unknownInput.sscStart = null;
var d3 = L.decodeInput(L.encodeInput(unknownInput, TS));
ok(d3.input.sscUnknown === true && d3.input.sscStart === null, '「记不清病程」可编码还原', '');

console.log('');
console.log(fails === 0 ? '全部通过：' + total + ' 项' : '失败 ' + fails + ' / ' + total + ' 项');
process.exit(fails === 0 ? 0 : 1);
