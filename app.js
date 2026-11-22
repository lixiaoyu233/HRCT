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
    exclusions: {}
  };

  var errorMsg = '';

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
    return '<ul class="mat-list mat-list--fold">' + R.materials.map(function (m) {
      return '<li>' + esc(m) + '</li>';
    }).join('') + '</ul>';
  }

  function viewCover() {
    return card(
      '<p class="kicker">' + esc(R.org) + '</p>' +
      '<h2 class="cover-title">' + esc(R.projectName) + '</h2>' +
      '<p class="cover-sub">HRCT 筛查目标人群自查表</p>' +
      '<p class="cover-lead">本项目面向已确诊的<b>弥漫型系统性硬化症（SSc）</b>或<b>类风湿关节炎（RA）</b>患者，帮助您初步判断是否符合<b>免费 HRCT</b> 筛查条件。</p>' +
      '<ul class="facts">' +
        '<li><b>约 3 分钟</b>，逐项选择即可</li>' +
        '<li><b>不收集任何个人信息</b>，所有判断都在您的手机上完成</li>' +
        '<li>结果仅供参考，<b>最终以医生评估和检查结果为准</b></li>' +
      '</ul>' +
      '<button type="button" class="btn btn--primary" data-act="start">开始自查</button>' +
      '<details class="fold">' +
        '<summary>报销需要准备哪些材料？</summary>' +
        materialsList() +
      '</details>'
    );
  }

  /* ---------------- 第 1 步：基本信息 ---------------- */

  function birthField() {
    var now = today();
    var maxY = now.getFullYear();
    var y = state.birth.y, m = state.birth.m, d = state.birth.d;
    var yearOk = y && y >= 1900 && y <= maxY;

    var yearInput = '<input class="date-input" id="by" type="text" inputmode="numeric" ' +
      'pattern="[0-9]*" maxlength="4" autocomplete="bday-year" aria-label="出生年份" ' +
      'placeholder="年" value="' + (yearOk ? y : '') + '">';

    var months = '<option value="">月</option>';
    for (var j = 1; j <= 12; j++) months += opt(j, j + ' 月', m === j);

    var maxD = (yearOk && m) ? new Date(y, m, 0).getDate() : 31;
    if (d && d > maxD) d = maxD;
    var days = '<option value="">日</option>';
    for (var k = 1; k <= maxD; k++) days += opt(k, k + ' 日', d === k);

    var live = '';
    if (yearOk && m && d) {
      var age = L.computeAge({ y: y, m: m, d: d }, now);
      var bad = age < R.ageMin || age > R.ageMax;
      live = '<p class="live' + (bad ? ' live--warn' : '') + '">出生日期：' + y + ' 年 ' + m + ' 月 ' + d + ' 日 · <b>' +
        age + ' 周岁</b>' + (bad ? '，不在 18–75 周岁范围内' : '') + '</p>';
    } else if (y !== null && !yearOk) {
      live = '<p class="live live--warn">请输入 4 位出生年份，例如 1963</p>';
    } else if (yearOk && (!m || !d)) {
      live = '<p class="live">已填 ' + y + ' 年，请再选择月份和日期</p>';
    }

    return '<div class="field">' +
      '<p class="field-label">您的出生日期</p>' +
      '<p class="field-help">请输入 4 位出生年份（如 1963），再选月和日；按出生日期精确计算年龄。</p>' +
      '<div class="date-row">' +
        yearInput +
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

  function materialsSection(r) {
    var tail = '';
    if (r && r.status === 'pass') {
      tail = '<div class="submit-block">' +
          '<p class="submit-hint">完成 HRCT 检查、拿到报告和发票后，点击下方按钮填写《' + esc(R.formName) + '》</p>' +
          '<a class="btn btn--primary" href="' + esc(R.formUrl) + '" rel="noopener">已完成检查，去提交报销材料</a>' +
          '<p class="submit-note">如无法打开，请联系项目工作人员。</p>' +
        '</div>';
    } else if (r && r.status === 'need') {
      tail = '<p class="sec-note">请先与医生确认上面的待确认项目，确认符合后重新自查，再提交材料。</p>';
    }
    return '<h3 class="sec-title">报销需要准备的材料</h3>' +
      '<ul class="mat-list">' + R.materials.map(function (m) {
        return '<li>' + esc(m) + '</li>';
      }).join('') + '</ul>' +
      '<p class="sec-note">以上材料在完成 HRCT 检查后拍照，连同本页结果卡一起，在《' + esc(R.formName) + '》中提交。</p>' +
      '<p class="sec-note sec-note--warn">发票抬头请填写<b>患者本人姓名</b>；银行卡须为<b>患者本人</b>账户。</p>' +
      tail;
  }

  function statusMeta(r) {
    if (r.status === 'pass') {
      return { cls: 'pass', icon: '✓', title: '初步符合', sub: '建议携带资料到项目，由医生进一步评估' };
    }
    if (r.status === 'fail') {
      return { cls: 'fail', icon: '✕', title: '暂不符合本项目要求', sub: '以下项目不符合项目条件' };
    }
    return {
      cls: 'need',
      icon: '!',
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
    return rows ? '<div class="kv-list">' + rows + '</div>' : '';
  }

  function raDetail(r) {
    if (!r.ra) return '';
    var met = r.ra.metItems.map(function (f) { return '<li class="ok">' + esc(f.label) + '</li>'; }).join('');
    var unsure = r.ra.unsureItems.map(function (f) { return '<li class="warn">' + esc(f.label) + '（待确认）</li>'; }).join('');
    var unmet = r.ra.unmetItems.map(function (f) { return '<li class="off">' + esc(f.label) + '（未满足）</li>'; }).join('');
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

    var body = r.status === 'fail'
      ? '<p class="status-body">如其中某项填写有误，可重新自查。</p>'
      : '';

    return '<section class="card status status--' + m.cls + '">' +
        '<p class="status-kicker">自查结果 · ' + esc(r.generatedAt) + '</p>' +
        '<div class="status-head">' +
          '<span class="status-icon" aria-hidden="true">' + m.icon + '</span>' +
          '<div class="status-head__text">' +
            '<h2 class="status-title">' + esc(m.title) + '</h2>' +
            '<p class="status-sub">' + esc(m.sub) + '</p>' +
          '</div>' +
        '</div>' +
        body +
        keyInfo(r) +
        (r.status === 'pass'
          ? '<div class="qr-block">' +
              '<div class="qr-box" id="qrBox"></div>' +
              '<div class="qr-text">' +
                '<p class="qr-title">扫一扫查看自查明细</p>' +
                '<p class="qr-sub">供医生 / 项目工作人员核对</p>' +
                '<p class="qr-hint">长按二维码可保存</p>' +
              '</div>' +
            '</div>'
          : '') +
      '</section>' +
      (r.status !== 'fail' ? card(materialsSection(r)) : '') +
      (r.notMatched.length ? card(notMatchedSection(r)) : '') +
      (r.pending.length ? card(pendingSection(r)) : '') +
      (state.disease === 'ra' ? card(raDetail(r)) : '') +
      card(
        '<div class="result-foot">' +
          '<p class="sec-note">可截图保存本页，就诊时出示给医生 / 项目工作人员。</p>' +
          '<button type="button" class="btn btn--ghost" data-act="restart">重新自查</button>' +
          '<p class="sec-note sec-note--small">规则版本 ' + esc(R.version) + ' · 生效 ' + esc(R.effectiveDate) +
            '；本页仅用于初步自查，不构成医学诊断。</p>' +
        '</div>'
      ) +
      (r.status === 'pass'
        ? card(
            '<h3 class="sec-title">自查结果卡</h3>' +
            '<p class="sec-note">长按下方图片可保存，发给医生或项目工作人员；也可以直接截图本页。</p>' +
            '<div class="result-card" id="cardBox"><p class="sec-note">正在生成…</p></div>' +
            '<button type="button" class="btn btn--ghost" data-act="savecard">保存结果卡</button>' +
            '<p class="sec-note sec-note--small">提交报销材料时需要上传这张结果卡，请先保存到相册；长按图片即可保存。</p>'
          )
        : '');
  }

  /* ---------------- 结果卡图片 ---------------- */

  function mountCard() {
    var box = document.getElementById('cardBox');
    if (!box) return;
    if (typeof qrcode !== 'function' || !window.HRCTPoster) {
      box.innerHTML = '<p class="card-error">结果卡生成失败，请直接截图本页。</p>';
      return;
    }
    try {
      var r = L.evaluate(state, today());
      var m = statusMeta(r);
      var qr = null;
      if (r.status === 'pass') {
        var url = (qrCache && qrCache.url) || buildQrUrl();
        qr = qrcode(0, 'M');
        qr.addData(url);
        qr.make();
      }
      var rows = [];
      if (r.age !== null) rows.push(['年龄', r.age + ' 周岁']);
      if (state.disease === 'ssc') {
        rows.push(['确诊类型', '弥漫型 SSc']);
        rows.push(['SSc 病程', r.ssc.text || '']);
      } else {
        rows.push(['确诊类型', '类风湿关节炎（RA）']);
        rows.push(['高危因素', '已满足 ' + r.ra.met + ' / 7 项（要求 ≥2 项）']);
      }
      var data = {
        width: 750,
        maxHeight: 2600,
        org: R.org,
        project: R.projectName,
        subtitle: 'HRCT 筛查自查结果',
        status: { cls: m.cls, title: m.title, sub: m.sub },
        rows: rows,
        badge: (r.status === 'pass' && r.ssc && r.ssc.priority) ? '优先推荐签署' : null,
        materials: R.materials,
        materialsNote: '以上材料在完成 HRCT 检查后拍照，连同本页结果卡一起，在《' + R.formName + '》中提交。',
        notes: ['发票抬头请填写患者本人姓名；银行卡须为患者本人账户。'],
        qr: qr ? { qr: qr, caption: '扫码查看自查明细（供医生 / 项目工作人员核对）' } : null,
        footer: {
          time: '生成时间 · ' + r.generatedAt,
          version: '规则版本 ' + R.version + ' · 生效 ' + R.effectiveDate,
          disclaimer: '本页仅用于初步自查，不构成医学诊断，不能替代医生评估。'
        }
      };
      var temp = document.createElement('canvas');
      temp.width = 750;
      temp.height = 2600;
      var tctx = temp.getContext ? temp.getContext('2d') : null;
      if (!tctx) throw new Error('canvas unsupported');
      var height = window.HRCTPoster.draw(tctx, data);
      var out = document.createElement('canvas');
      out.width = 750;
      out.height = height;
      out.getContext('2d').drawImage(temp, 0, 0);
      var img = document.createElement('img');
      img.className = 'result-card__img';
      img.alt = '自查结果卡';
      img.src = out.toDataURL('image/png');
      box.innerHTML = '';
      box.appendChild(img);
    } catch (e) {
      box.innerHTML = '<p class="card-error">结果卡生成失败，请直接截图本页。</p>';
    }
  }

  /* ---------------- 结果二维码 ---------------- */

  function siteBase() {
    if (typeof location !== 'undefined' && /^https?:$/.test(location.protocol)) {
      return location.origin + location.pathname;
    }
    return R.siteUrl;
  }

  var qrCache = null;

  function buildQrUrl() {
    var ts = Math.floor(Date.now() / 1000);
    return siteBase() + R.readonlyHash + L.encodeInput(state, ts);
  }

  function mountQr() {
    var box = document.getElementById('qrBox');
    if (!box) return;
    if (typeof qrcode !== 'function') {
      box.innerHTML = '<p class="qr-error">二维码生成失败</p>';
      return;
    }
    try {
      var url = buildQrUrl();
      qrCache = { url: url };
      var qr = qrcode(0, 'M');
      qr.addData(url);
      qr.make();
      var count = qr.getModuleCount();
      var scale = 8;
      var margin = 2;
      var size = (count + margin * 2) * scale;
      var canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      var ctx = canvas.getContext ? canvas.getContext('2d') : null;
      if (!ctx) throw new Error('canvas unsupported');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = '#000000';
      for (var row = 0; row < count; row++) {
        for (var col = 0; col < count; col++) {
          if (qr.isDark(row, col)) {
            ctx.fillRect((col + margin) * scale, (row + margin) * scale, scale, scale);
          }
        }
      }
      var img = document.createElement('img');
      img.alt = '自查结果二维码';
      img.src = canvas.toDataURL('image/png');
      box.appendChild(img);
    } catch (e) {
      box.innerHTML = '<p class="qr-error">二维码生成失败</p>';
    }
  }

  /* ---------------- 结果卡大图查看 ---------------- */

  function openCardViewer() {
    var box = document.getElementById('cardBox');
    var img = box ? box.querySelector('img') : null;
    if (!img) return;
    var overlay = document.createElement('div');
    overlay.className = 'viewer';
    overlay.innerHTML = '<div class="viewer__bar">' +
        '<span class="viewer__tip">长按图片保存到相册</span>' +
        '<button type="button" class="viewer__close" data-close="1" aria-label="关闭">✕</button>' +
      '</div>' +
      '<div class="viewer__scroll"><img alt="自查结果卡" src="' + img.src + '"></div>';
    document.body.appendChild(overlay);

    function close() {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      document.removeEventListener('keydown', onKey);
    }
    function onKey(e) {
      if (e.key === 'Escape') close();
    }
    overlay.addEventListener('click', function (e) {
      var t = e.target;
      if (t === overlay || (t.closest && t.closest('[data-close]'))) close();
    });
    document.addEventListener('keydown', onKey);
  }

  /* ---------------- 只读回放（扫码查看） ---------------- */

  function fmtTs(ts) {
    return L.stamp(new Date(ts * 1000));
  }

  function answerText(v) {
    if (v === 'yes') return '是';
    if (v === 'no') return '否';
    if (v === 'unknown') return '不清楚';
    return '未作答';
  }

  function viewReadonly(payload) {
    var parsed;
    try {
      parsed = L.decodeInput(payload);
    } catch (err) {
      return card(
        '<h2 class="step-title">无法读取自查结果</h2>' +
        '<p class="sec-note">' + esc(err.message) + '。请让患者重新生成二维码。</p>' +
        '<div class="nav"><a class="btn btn--ghost" href="' + esc(siteBase()) + '">返回自查页</a></div>'
      );
    }
    var input = parsed.input;
    var r = L.evaluate(input, new Date(parsed.ts * 1000));
    var m = statusMeta(r);

    var rows = '<div class="kv"><span>填写时间</span><b>' + esc(fmtTs(parsed.ts)) + '</b></div>';
    if (r.age !== null) rows += '<div class="kv"><span>年龄</span><b>' + r.age + ' 周岁</b></div>';
    rows += '<div class="kv"><span>确诊类型</span><b>' +
      (input.disease === 'ssc' ? '弥漫型 SSc' : '类风湿关节炎（RA）') + '</b></div>';

    var detail = '';
    if (input.disease === 'ssc') {
      detail += '<div class="kv"><span>非雷诺症状出现时间</span><b>' +
        (input.sscStart ? (input.sscStart.y + ' 年 ' + input.sscStart.m + ' 月') : '记不清') + '</b></div>';
      detail += '<div class="kv"><span>SSc 病程</span><b>' + esc(r.ssc.text || '') + '</b></div>';
    } else {
      detail += '<ul class="plain qr-plain">' + R.raFactors.map(function (f) {
        var val;
        if (f.auto === 'age') val = (r.age !== null && r.age > 60) ? '是' : '否';
        else if (f.auto === 'sex') val = input.sex === 'male' ? '是' : '否';
        else val = answerText(input.ra[f.id]);
        return '<li class="' + (val === '是' ? 'bad' : 'off') + '">' +
          esc(f.label) + '：' + val + '</li>';
      }).join('') + '</ul>';
    }

    var exList = '<ul class="plain qr-plain">' + R.exclusions.map(function (e) {
      var v = input.exclusions[e.id];
      var cls = v === 'yes' ? 'bad' : (v === 'unknown' ? 'warn' : 'off');
      return '<li class="' + cls + '">' + esc(e.label) + '：' + answerText(v) + '</li>';
    }).join('') + '</ul>';

    var pending = r.pending.length
      ? '<h3 class="sec-title">需要医生确认的项目</h3><ul class="pending-list">' +
        r.pending.map(function (p) {
          return '<li><p class="pending-list__title">' + esc(p.title) + '</p></li>';
        }).join('') + '</ul>'
      : '';

    return '<section class="card status status--' + m.cls + '">' +
        '<p class="status-kicker">自查结果回放 · ' + esc(fmtTs(parsed.ts)) + '</p>' +
        '<div class="status-head">' +
          '<span class="status-icon" aria-hidden="true">' + m.icon + '</span>' +
          '<div class="status-head__text">' +
            '<h2 class="status-title">' + esc(m.title) + '</h2>' +
            '<p class="status-sub">' + esc(m.sub) + '</p>' +
          '</div>' +
        '</div>' +
        '<div class="kv-list">' + rows + detail + '</div>' +
      '</section>' +
      card('<h3 class="sec-title">排除条件</h3>' + exList) +
      (pending ? card(pending) : '') +
      card(
        '<p class="sec-note">本页数据由患者出示的二维码生成，页面不保存、不上传任何信息；结论按填写时间重新计算，仅作初步自查参考。</p>' +
        '<div class="nav"><a class="btn btn--ghost" href="' + esc(siteBase()) + '">返回自查页</a></div>' +
        '<p class="sec-note sec-note--small">规则版本 ' + esc(r.rules.version) + ' · 生效 ' + esc(r.rules.effectiveDate) + '</p>'
      );
  }

  /* ---------------- 提交成功页 ---------------- */

  function viewSubmitted() {
    return card(
      '<span class="done-icon" aria-hidden="true">✓</span>' +
      '<h2 class="step-title done-title">材料已提交</h2>' +
      '<p class="status-body">我们已收到您的报销材料。审核结果会通过您填写的联系方式通知您；如需补充材料，工作人员会与您联系。</p>' +
      '<p class="sec-note">本页仅为提交确认，不保存任何材料内容。</p>' +
      '<div class="nav"><a class="btn btn--ghost" href="' + esc(siteBase()) + '">返回自查页</a></div>'
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
    if (state.step === 4) { mountQr(); mountCard(); }
    if (keepScroll) window.scrollTo(0, y);
    else window.scrollTo(0, 0);
  }

  function validate(step) {
    if (step === 1) {
      var maxY = today().getFullYear();
      if (!state.birth.y || state.birth.y < 1900 || state.birth.y > maxY) {
        return '请填写 4 位出生年份，例如 1963。';
      }
      if (!state.birth.m || !state.birth.d) return '请选择出生月份和日期。';
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

  function restart() {
    state = {
      step: 0,
      birth: { y: null, m: null, d: null },
      sex: null,
      disease: null,
      sscStart: { y: null, m: null },
      sscUnknown: false,
      ra: {},
      exclusions: {}
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
    else if (act === 'restart') restart();
    else if (act === 'savecard') openCardViewer();
  });

  app.addEventListener('input', function (e) {
    if (e.target && e.target.id === 'by') {
      var v = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
      if (v !== e.target.value) e.target.value = v;
    }
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

  var initHash = window.location.hash || '';
  if (initHash.indexOf(R.readonlyHash) === 0) {
    app.innerHTML = viewReadonly(initHash.slice(R.readonlyHash.length));
    return;
  }
  if (initHash.indexOf(R.submittedHash) === 0) {
    app.innerHTML = viewSubmitted();
    return;
  }

  load();
  if (state.step >= 4) {
    if (!state.disease || !state.birth.y) state.step = 0;
  }
  if (state.step >= 1 && validate(1)) state.step = 0;
  else if (state.step >= 2 && validate(2)) state.step = 1;
  else if (state.step >= 3 && validate(3)) state.step = 2;
  render(false);
})();
