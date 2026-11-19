/* 纤护呼吸公益项目 · HRCT 筛查目标人群自查表 —— 页面交互
 * 纯静态：不发起任何网络请求，不收集任何个人信息，答案只保存在本机浏览器。
 */
(function () {
  'use strict';

  var L = window.HRCTLogic;
  var R = L.RULES;
  var KEY = 'hrct-selfcheck-v1';

  var app = document.getElementById('app');
  var progress = document.getElementById('progress');
  var progressStep = document.getElementById('progressStep');
  var progressPct = document.getElementById('progressPct');
  var progressBar = document.getElementById('progressBar');

  var STATE_STEPS = ['基本信息', '疾病情况', '排除条件'];

  var state = {
    step: 0,
    birth: { y: null, m: null, d: null },
    sex: null,
    disease: null,
    sscStart: { y: null, m: null },
    sscUnknown: false,
    ra: {},
    exclusions: {},
    materialsChecked: {}
  };

  var errorMsg = '';
  var toastTimer = null;

  /* ---------------- 工具 ---------------- */

  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function pad2(n) {
    return n < 10 ? '0' + n : '' + n;
  }

  function today() {
    return new Date();
  }

  function card(inner, extraClass) {
    return '<section class="card' + (extraClass ? ' ' + extraClass : '') + '">' + inner + '</section>';
  }

  function opt(value, label, selected) {
    return '<option value="' + value + '"' + (selected ? ' selected' : '') + '>' + esc(label) + '</option>';
  }

  /* ---------------- 本地保存（仅本机） ---------------- */

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      /* 隐私模式下可能失败，忽略 */
    }
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return;
      var s = JSON.parse(raw);
      if (!s || typeof s !== 'object') return;
      if (s.birth) state.birth = { y: s.birth.y || null, m: s.birth.m || null, d: s.birth.d || null };
      if (s.sscStart) state.sscStart = { y: s.sscStart.y || null, m: s.sscStart.m || null };
      state.sex = s.sex || null;
      state.disease = s.disease || null;
      state.sscUnknown = !!s.sscUnknown;
      state.ra = s.ra && typeof s.ra === 'object' ? s.ra : {};
      state.exclusions = s.exclusions && typeof s.exclusions === 'object' ? s.exclusions : {};
      state.materialsChecked = s.materialsChecked && typeof s.materialsChecked === 'object' ? s.materialsChecked : {};
      state.step = typeof s.step === 'number' ? s.step : 0;
      if (state.step < 0 || state.step > 4) state.step = 0;
    } catch (e) {
      /* 忽略损坏的本地数据 */
    }
  }

  /* ---------------- 进度 ---------------- */

  function updateProgress() {
    if (state.step >= 1 && state.step <= 3) {
      progress.hidden = false;
      progressStep.textContent = STATE_STEPS[state.step - 1];
      var pct = Math.round((state.step / STATE_STEPS.length) * 100);
      progressPct.textContent = pct + '%';
      progressBar.style.width = pct + '%';
    } else {
      progress.hidden = true;
    }
  }

  /* ---------------- 通用问答组件 ---------------- */

  function pills(name, current, options) {
    return '<div class="pills">' + options.map(function (o) {
      var on = current === o.value;
      return '<label class="pill' + (on ? ' is-on' : '') + '">' +
        '<input type="radio" name="' + esc(name) + '" value="' + esc(o.value) + '"' + (on ? ' checked' : '') + '>' +
        '<span>' + esc(o.label) + '</span>' +
        '</label>';
    }).join('') + '</div>';
  }

  function choices(name, current, items) {
    return '<div class="choices">' + items.map(function (it) {
      var on = current === it.value;
      return '<label class="choice' + (on ? ' is-on' : '') + '">' +
        '<input type="radio" name="' + esc(name) + '" value="' + esc(it.value) + '"' + (on ? ' checked' : '') + '>' +
        '<span class="choice__body">' +
          '<span class="choice__title">' + esc(it.label) + '</span>' +
          (it.desc ? '<span class="choice__desc">' + esc(it.desc) + '</span>' : '') +
        '</span>' +
        '<span class="choice__tick" aria-hidden="true"></span>' +
        '</label>';
    }).join('') + '</div>';
  }

  function errorBlock() {
    if (!errorMsg) return '';
    return '<p class="error" role="alert">' + esc(errorMsg) + '</p>';
  }

  function navRow(isLast) {
    return '<div class="nav">' +
      (state.step > 1 ? '<button type="button" class="btn btn--ghost" data-act="prev">上一步</button>' : '') +
      '<button type="button" class="btn btn--primary' + (state.step > 1 ? ' btn--grow' : '') + '" data-act="next">' +
      (isLast ? '查看结果' : '下一步') + '</button>' +
      '</div>';
  }

  /* ---------------- 封面 ---------------- */

  function materialsList() {
    return '<ul class="materials">' + R.materials.map(function (m) {
      return '<li>' + esc(m) + '</li>';
    }).join('') + '</ul>';
  }

  function viewCover() {
    return card(
      '<p class="kicker">' + esc(R.org) + '</p>' +
      '<h2 class="cover-title">' + esc(R.projectName) + '</h2>' +
      '<p class="cover-sub">HRCT 筛查目标人群自查表</p>' +
      '<p class="cover-lead">本项目面向已确诊的<b>弥漫型系统性硬化症（SSc）</b>或<b>类风湿关节炎（RA）</b>患者，帮助您初步判断是否符合 HRCT 筛查条件。</p>' +
      '<ul class="facts">' +
        '<li><b>约 3 分钟</b>，逐项选择即可</li>' +
        '<li><b>不收集任何个人信息</b>，所有判断都在您的手机上完成</li>' +
        '<li>结果仅供参考，<b>最终以医生评估和检查结果为准</b></li>' +
      '</ul>' +
      '<button type="button" class="btn btn--primary" data-act="start">开始自查</button>' +
      '<details class="fold">' +
        '<summary>报销需要准备哪些材料？</summary>' +
        materialsList() +
        '<p class="fold__note">本页面不收集、不上传、不保存任何材料，请勿在此页上传证件照片。</p>' +
      '</details>'
    );
  }

  /* ---------------- 第 1 步：基本信息 ---------------- */

  function birthField() {
    var now = today();
    var maxY = now.getFullYear();
    var y = state.birth.y, m = state.birth.m, d = state.birth.d;

    var years = '<option value="">年</option>';
    for (var i = maxY; i >= maxY - 100; i--) years += opt(i, i + ' 年', y === i);

    var months = '<option value="">月</option>';
    for (var j = 1; j <= 12; j++) months += opt(j, j + ' 月', m === j);

    var maxD = (y && m) ? new Date(y, m, 0).getDate() : 31;
    if (d && d > maxD) d = maxD;
    var days = '<option value="">日</option>';
    for (var k = 1; k <= maxD; k++) days += opt(k, k + ' 日', d === k);

    var live = '';
    if (y && m && d) {
      var age = L.computeAge({ y: y, m: m, d: d }, now);
      var bad = age < R.ageMin || age > R.ageMax;
      live = '<p class="live' + (bad ? ' live--warn' : '') + '">按出生日期计算：<b>' + age + ' 周岁</b>' +
        (bad ? '，不在 18–75 周岁范围内' : '') + '</p>';
    }

    return '<div class="field">' +
      '<p class="field-label">您的出生日期</p>' +
      '<p class="field-help">本项目要求 18–75 周岁，按出生日期精确计算年龄。</p>' +
      '<div class="date-row">' +
        '<select class="date-select" id="by" aria-label="出生年份">' + years + '</select>' +
        '<select class="date-select" id="bm" aria-label="出生月份">' + months + '</select>' +
        '<select class="date-select" id="bd" aria-label="出生日期">' + days + '</select>' +
      '</div>' +
      live +
      '</div>';
  }

  function viewBasic() {
    return card(
      '<p class="step-kicker">第 1 步 / 共 3 步</p>' +
      '<h2 class="step-title">基本信息</h2>' +
      birthField() +
      '<div class="field">' +
        '<p class="field-label">您的性别</p>' +
        choices('sex', state.sex, [
          { value: 'male', label: '男' },
          { value: 'female', label: '女' }
        ]) +
      '</div>' +
      '<div class="field">' +
        '<p class="field-label">您的确诊疾病类型</p>' +
        '<p class="field-help">本项目仅纳入弥漫型 SSc 和 RA 两种；局限型 SSc 及其他风湿免疫病不在范围内。</p>' +
        choices('disease', state.disease, R.types) +
      '</div>' +
      errorBlock() +
      navRow(false)
    );
  }

  /* ---------------- 第 2 步：SSc 病程 ---------------- */

  function sscDurationText() {
    if (state.sscUnknown) {
      return '<p class="live live--warn">已选择「记不清」，将由医生按病历核算。</p>';
    }
    if (!state.sscStart.y || !state.sscStart.m) return '';
    var now = today();
    var months = L.monthsBetween(state.sscStart, { y: now.getFullYear(), m: now.getMonth() + 1 });
    if (months < 0) return '<p class="live live--warn">所选时间晚于当前日期，请重新选择。</p>';
    var within = months <= R.sscMaxMonths;
    var html = '<p class="live">距今约 <b>' + esc(L.formatDuration(months)) + '</b>（' + months + ' 个月）</p>';
    html += '<p class="live ' + (within ? 'live--ok' : 'live--warn') + '">' +
      (within ? '在 5 年内，符合本项要求' : '已超过 5 年，不符合本项要求') + '</p>';
    if (within && months < R.sscPriorityMonths) {
      html += '<p class="live live--ok">病程不足 18 个月，属于<b>优先推荐签署</b>人群</p>';
    }
    return html;
  }

  function sscStartField() {
    var now = today();
    var maxY = now.getFullYear();
    var y = state.sscStart.y, m = state.sscStart.m;
    var dis = state.sscUnknown ? ' disabled' : '';

    var years = '<option value="">年</option>';
    for (var i = maxY; i >= maxY - 45; i--) years += opt(i, i + ' 年', y === i);
    var months = '<option value="">月</option>';
    for (var j = 1; j <= 12; j++) months += opt(j, j + ' 月', m === j);

    return '<div class="field">' +
      '<p class="field-label">首次出现「非雷诺症状」的时间</p>' +
      '<p class="field-help">雷诺现象（手遇冷发白、发紫、发麻）不算；从皮肤变硬、手指肿胀、吞咽不适等出现的时间开始算。</p>' +
      '<div class="date-row">' +
        '<select class="date-select" id="sy" aria-label="症状出现年份"' + dis + '>' + years + '</select>' +
        '<select class="date-select" id="sm" aria-label="症状出现月份"' + dis + '>' + months + '</select>' +
      '</div>' +
      '<label class="check">' +
        '<input type="checkbox" name="sscUnknown"' + (state.sscUnknown ? ' checked' : '') + '>' +
        '<span>记不清具体时间（由医生按病历核算）</span>' +
      '</label>' +
      sscDurationText() +
      '</div>';
  }

  function viewSsc() {
    return card(
      '<p class="step-kicker">第 2 步 / 共 3 步</p>' +
      '<h2 class="step-title">SSc 病程</h2>' +
      '<p class="step-help">本项目要求：从首次出现非雷诺症状算起，<b>病程不超过 5 年</b>。</p>' +
      sscStartField() +
      errorBlock() +
      navRow(false)
    );
  }

  /* ---------------- 第 2 步：RA 高危因素 ---------------- */

  function autoFactorNote() {
    var age = (state.birth.y && state.birth.m && state.birth.d)
      ? L.computeAge(state.birth, today())
      : null;
    var rows = '';
    if (age !== null) {
      var over = age > 60;
      rows += '<li><span>年龄大于 60 岁</span><span class="tag ' + (over ? 'tag--on' : '') + '">' +
        (over ? '是（' + age + ' 岁）' : '否（' + age + ' 岁）') + '</span></li>';
    }
    var male = state.sex === 'male';
    rows += '<li><span>男性</span><span class="tag ' + (male ? 'tag--on' : '') + '">' +
      (male ? '是' : '否') + '</span></li>';
    return '<div class="auto-box">' +
      '<p class="auto-box__title">以下 2 项根据您的基本信息自动判断：</p>' +
      '<ul class="auto-box__list">' + rows + '</ul>' +
      '</div>';
  }

  function raQuestions() {
    return R.raFactors.filter(function (f) { return !!f.q; }).map(function (f) {
      var cur = state.ra[f.id] || '';
      return '<div class="field">' +
        '<p class="field-label">' + esc(f.q.label) + '</p>' +
        (f.q.tip ? '<p class="field-help">' + esc(f.q.tip) + '</p>' : '') +
        pills('ra.' + f.id, cur, f.q.options) +
        '</div>';
    }).join('');
  }

  function viewRa() {
    return card(
      '<p class="step-kicker">第 2 步 / 共 3 步</p>' +
      '<h2 class="step-title">类风湿关节炎高危因素</h2>' +
      '<p class="step-help">本项目要求：7 项 ILD 高危因素中<b>至少满足 2 项</b>。</p>' +
      autoFactorNote() +
      raQuestions() +
      errorBlock() +
      navRow(false)
    );
  }

  /* ---------------- 第 3 步：排除条件 ---------------- */

  function viewExclude() {
    var items = R.exclusions.map(function (e, idx) {
      var opts = e.allowUnknown === false
        ? [{ value: 'yes', label: '是' }, { value: 'no', label: '否' }]
        : L.TRI;
      return '<div class="field">' +
        '<p class="field-label"><span class="qnum">' + (idx + 1) + '</span>' + esc(e.text) + '</p>' +
        pills('ex.' + e.id, state.exclusions[e.id] || '', opts) +
        '</div>';
    }).join('');

    return card(
      '<p class="step-kicker">第 3 步 / 共 3 步</p>' +
      '<h2 class="step-title">排除条件</h2>' +
      '<p class="step-help">以下情况只要符合任意一项，就暂不适合参加本项目。确实不清楚的，请选「不清楚」，结果会提示医生帮您确认。</p>' +
      items +
      errorBlock() +
      navRow(true)
    );
  }

  /* ---------------- 第 4 步：结果 ---------------- */

  function resultText(r) {
    var lines = [];
    lines.push('【' + R.projectName + ' · HRCT 筛查自查结果】');
    lines.push('结论：' + (r.status === 'pass' ? '初步符合' : r.status === 'fail' ? '暂不符合' : '需医生确认'));
    lines.push('生成时间：' + r.generatedAt);
    lines.push('');
    lines.push('基本信息');
    if (r.age !== null) lines.push('年龄：' + r.age + ' 周岁');
    if (state.disease === 'ssc') {
      lines.push('确诊类型：弥漫型 SSc');
      lines.push('SSc 病程：' + (r.ssc.text || ''));
    } else if (state.disease === 'ra') {
      lines.push('确诊类型：类风湿关节炎（RA）');
      lines.push('高危因素：已满足 ' + r.ra.met + ' / 7 项（要求 ≥2 项）');
      if (r.ra.metItems.length) {
        lines.push('　已满足：' + r.ra.metItems.map(function (f) { return f.label; }).join('、'));
      }
    }
    if (r.notMatched.length) {
      lines.push('');
      lines.push('不符合的项目');
      r.notMatched.forEach(function (n, i) { lines.push((i + 1) + '. ' + n.title + '：' + n.detail); });
    }
    if (r.pending.length) {
      lines.push('');
      lines.push('需要医生确认的项目');
      r.pending.forEach(function (p, i) {
        lines.push((i + 1) + '. ' + p.title + (p.how ? '（如何确认：' + p.how + '）' : ''));
      });
    }
    lines.push('');
    lines.push('报销需要准备的材料');
    R.materials.forEach(function (m) { lines.push('- ' + m); });
    lines.push('');
    lines.push('本页仅用于初步自查，不构成医学诊断，不能替代医生评估。');
    lines.push('是否入组以项目点医生评估及 HRCT 检查结果为准。');
    lines.push('规则版本 ' + R.version + ' · 生效 ' + R.effectiveDate);
    return lines.join('\n');
  }

  function materialsSection() {
    return '<h3 class="sec-title">报销需要准备的材料</h3>' +
      '<p class="sec-note">以下材料在最终符合项目条件、需要报销时使用。' +
      '<b>本页面不收集、不上传、不保存任何材料</b>，请勿在此页上传证件照片或银行卡照片。</p>' +
      '<ul class="checklist">' + R.materials.map(function (m, i) {
        var on = !!state.materialsChecked[i];
        return '<li><label class="check check--list' + (on ? ' is-on' : '') + '">' +
          '<input type="checkbox" name="mat.' + i + '"' + (on ? ' checked' : '') + '>' +
          '<span class="check__box" aria-hidden="true"></span>' +
          '<span>' + esc(m) + '</span>' +
          '</label></li>';
      }).join('') + '</ul>' +
      '<p class="sec-note">勾选只保存在本机，不会上传。具体材料要求以项目点通知为准；建议保留发票原件，使用本人银行卡账户。</p>';
  }

  function statusMeta(r) {
    if (r.status === 'pass') {
      return {
        cls: 'pass',
        title: '初步符合',
        sub: '建议携带资料到项目点，由医生进一步评估'
      };
    }
    if (r.status === 'fail') {
      return {
        cls: 'fail',
        title: '暂不符合本项目要求',
        sub: '以下项目与项目条件不符'
      };
    }
    return {
      cls: 'need',
      title: '有 ' + r.pending.length + ' 项需要医生确认',
      sub: '这些项目会直接影响结果'
    };
  }

  function keyInfo(r) {
    var rows = '';
    if (r.age !== null) rows += '<div class="kv"><span>年龄</span><b>' + r.age + ' 周岁</b></div>';
    if (state.disease === 'ssc') {
      rows += '<div class="kv"><span>确诊类型</span><b>弥漫型 SSc</b></div>';
      rows += '<div class="kv"><span>SSc 病程</span><b>' + esc(r.ssc.text || '') + '</b></div>';
      if (r.status === 'pass' && r.ssc.priority) {
        rows += '<p class="badge">优先推荐签署</p>';
      }
    } else if (state.disease === 'ra') {
      rows += '<div class="kv"><span>确诊类型</span><b>类风湿关节炎（RA）</b></div>';
      rows += '<div class="kv"><span>高危因素</span><b>已满足 ' + r.ra.met + ' / 7 项（要求 ≥2 项）</b></div>';
    }
    return '<h3 class="sec-title">关键信息</h3>' + rows;
  }

  function raDetail(r) {
    if (!r.ra) return '';
    var met = r.ra.metItems.map(function (f) { return '<li class="ok">' + esc(f.label) + '</li>'; }).join('');
    var unsure = r.ra.unsureItems.map(function (f) { return '<li class="warn">' + esc(f.label) + '（待确认）</li>'; }).join('');
    var unmet = r.ra.unmetItems.map(function (f) { return '<li class="off">' + esc(f.label) + '</li>'; }).join('');
    return '<h3 class="sec-title">高危因素明细</h3><ul class="plain">' + met + unsure + unmet + '</ul>';
  }

  function notMatchedSection(r) {
    if (!r.notMatched.length) return '';
    return '<h3 class="sec-title">不符合的项目</h3>' +
      '<ul class="reason-list">' + r.notMatched.map(function (n) {
        return '<li><p class="reason-list__title">' + esc(n.title) + '</p>' +
          '<p class="reason-list__detail">' + esc(n.detail) + '</p></li>';
      }).join('') + '</ul>';
  }

  function pendingSection(r) {
    if (!r.pending.length) return '';
    return '<h3 class="sec-title">需要医生确认的项目</h3>' +
      '<p class="sec-note">以下项目您选择了「不清楚」或「记不清」，会直接影响结论，请就诊时向医生确认。</p>' +
      '<ul class="pending-list">' + r.pending.map(function (p, i) {
        return '<li><p class="pending-list__title"><span class="qnum">' + (i + 1) + '</span>' + esc(p.title) + '</p>' +
          (p.how ? '<p class="pending-list__how">如何确认：' + esc(p.how) + '</p>' : '') + '</li>';
      }).join('') + '</ul>';
  }

  function viewResult() {
    var r = L.evaluate(state, today());
    var m = statusMeta(r);

    var body = '';
    if (r.status === 'pass') {
      body = '<p class="status-body">根据您的自查结果，目前没有发现明确不符合本项目条件的情况。</p>';
    } else if (r.status === 'fail') {
      body = '<p class="status-body">根据您的自查结果，存在以下不符合项，暂时不符合本项目的筛查条件。' +
        '如果其中某项填写有误，可以返回修改后重新自查。</p>';
    } else {
      body = '<p class="status-body">以下项目您选择了「不清楚」或「记不清」，需要医生结合病历和化验单判断。' +
        '建议先补齐资料，再决定是否报名。</p>';
    }

    return '<section class="card status status--' + m.cls + '">' +
        '<p class="status-kicker">自查结果 · ' + esc(r.generatedAt) + '</p>' +
        '<h2 class="status-title">' + esc(m.title) + '</h2>' +
        '<p class="status-sub">' + esc(m.sub) + '</p>' +
        body +
      '</section>' +
      card(keyInfo(r)) +
      (state.disease === 'ra' ? card(raDetail(r)) : '') +
      (r.notMatched.length ? card(notMatchedSection(r)) : '') +
      (r.pending.length ? card(pendingSection(r)) : '') +
      card(materialsSection()) +
      card(
        '<div class="result-foot">' +
          '<p class="sec-note">可截图保存本页，或复制文字版发给医生 / 项目点工作人员。</p>' +
          '<div class="nav nav--stack">' +
            '<button type="button" class="btn btn--primary" data-act="copy">复制文字版</button>' +
            '<button type="button" class="btn btn--ghost" data-act="restart">重新自查</button>' +
          '</div>' +
          '<p class="sec-note sec-note--small">规则版本 ' + esc(R.version) + ' · 生效 ' + esc(R.effectiveDate) +
            '；本页仅用于初步自查，不构成医学诊断。</p>' +
        '</div>'
      );
  }

  /* ---------------- 渲染与事件 ---------------- */

  function view() {
    switch (state.step) {
      case 0: return viewCover();
      case 1: return viewBasic();
      case 2: return state.disease === 'ra' ? viewRa() : viewSsc();
      case 3: return viewExclude();
      case 4: return viewResult();
      default: return viewCover();
    }
  }

  function render(keepScroll) {
    var y = window.scrollY;
    app.innerHTML = view();
    updateProgress();
    if (keepScroll) window.scrollTo(0, y);
    else window.scrollTo(0, 0);
  }

  function showToast(text) {
    var t = document.createElement('div');
    t.className = 'toast';
    t.textContent = text;
    document.body.appendChild(t);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      if (t.parentNode) t.parentNode.removeChild(t);
    }, 1800);
  }

  function validate(step) {
    if (step === 1) {
      if (!state.birth.y || !state.birth.m || !state.birth.d) return '请选择完整的出生日期。';
      if (!state.sex) return '请选择性别。';
      if (!state.disease) return '请选择确诊疾病类型。';
      return '';
    }
    if (step === 2) {
      if (state.disease === 'ra') {
        var missing = R.raFactors.filter(function (f) { return !!f.q; }).filter(function (f) {
          return !state.ra[f.id];
        });
        if (missing.length) return '还有 ' + missing.length + ' 项没有选择，请逐项作答。';
      } else {
        if (!state.sscUnknown && (!state.sscStart.y || !state.sscStart.m)) {
          return '请选择首次出现非雷诺症状的时间，或勾选「记不清」。';
        }
        if (!state.sscUnknown && state.sscStart.y && state.sscStart.m) {
          var now = today();
          if (L.monthsBetween(state.sscStart, { y: now.getFullYear(), m: now.getMonth() + 1 }) < 0) {
            return '所选时间晚于当前日期，请重新选择。';
          }
        }
      }
      return '';
    }
    if (step === 3) {
      var left = R.exclusions.filter(function (e) { return !state.exclusions[e.id]; });
      if (left.length) return '还有 ' + left.length + ' 项没有选择，请逐项作答。';
      return '';
    }
    return '';
  }

  function goNext() {
    var msg = validate(state.step);
    if (msg) {
      errorMsg = msg;
      render(true);
      return;
    }
    errorMsg = '';
    if (state.step === 3) {
      state.step = 4;
    } else {
      state.step = Math.min(state.step + 1, 4);
      if (state.step === 2 && state.disease === 'ssc' && !state.sscStart.y) {
        /* 默认展开为当前年，减少滚动 */
      }
    }
    save();
    render(false);
  }

  function goPrev() {
    errorMsg = '';
    state.step = Math.max(state.step - 1, 0);
    save();
    render(false);
  }

  function doCopy() {
    var r = L.evaluate(state, today());
    var text = resultText(r);
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); showToast('已复制，可粘贴发送'); }
      catch (e) { showToast('复制失败，请长按选择文字'); }
      document.body.removeChild(ta);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        showToast('已复制，可粘贴发送');
      }).catch(fallback);
    } else {
      fallback();
    }
  }

  function restart() {
    state = {
      step: 0,
      birth: { y: null, m: null, d: null },
      sex: null,
      disease: null,
      sscStart: { y: null, m: null },
      sscUnknown: false,
      ra: {},
      exclusions: {},
      materialsChecked: {}
    };
    errorMsg = '';
    save();
    render(false);
  }

  app.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('[data-act]') : null;
    if (!btn) return;
    var act = btn.getAttribute('data-act');
    if (act === 'start') { state.step = 1; errorMsg = ''; save(); render(false); }
    else if (act === 'next') goNext();
    else if (act === 'prev') goPrev();
    else if (act === 'copy') doCopy();
    else if (act === 'restart') restart();
  });

  app.addEventListener('change', function (e) {
    var t = e.target;
    if (!t || !t.name && !t.id) return;

    if (t.name === 'sex') state.sex = t.value;
    else if (t.name === 'disease') {
      state.disease = t.value;
      if (t.value !== 'ssc') { state.sscUnknown = false; state.sscStart = { y: null, m: null }; }
    }
    else if (t.name === 'sscUnknown') state.sscUnknown = !!t.checked;
    else if (t.name.indexOf('ra.') === 0) state.ra[t.name.slice(3)] = t.value;
    else if (t.name.indexOf('ex.') === 0) state.exclusions[t.name.slice(3)] = t.value;
    else if (t.name.indexOf('mat.') === 0) state.materialsChecked[t.name.slice(4)] = !!t.checked;
    else if (t.id === 'by' || t.id === 'bm') {
      state.birth[t.id === 'by' ? 'y' : 'm'] = t.value ? parseInt(t.value, 10) : null;
      if (state.birth.y && state.birth.m && state.birth.d) {
        var maxD = new Date(state.birth.y, state.birth.m, 0).getDate();
        if (state.birth.d > maxD) state.birth.d = maxD;
      }
    }
    else if (t.id === 'bd') state.birth.d = t.value ? parseInt(t.value, 10) : null;
    else if (t.id === 'sy') state.sscStart.y = t.value ? parseInt(t.value, 10) : null;
    else if (t.id === 'sm') state.sscStart.m = t.value ? parseInt(t.value, 10) : null;
    else return;

    errorMsg = '';
    save();
    render(true);
  });

  /* ---------------- 启动 ---------------- */

  load();
  if (state.step >= 4) {
    if (!state.disease || !state.birth.y) state.step = 0;
  }
  if (state.step >= 1 && validate(1)) state.step = 0;
  else if (state.step >= 2 && validate(2)) state.step = 1;
  else if (state.step >= 3 && validate(3)) state.step = 2;
  render(false);
})();
