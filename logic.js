/* 纤护呼吸公益项目 · HRCT 筛查目标人群自查表
 * 规则与判定逻辑（纯函数，不依赖 DOM，可在 Node 中直接单元测试）
 * 规则版本：v1.0  生效日期：2026-11-19
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.HRCTLogic = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var TRI = [
    { value: 'yes', label: '是' },
    { value: 'no', label: '否' },
    { value: 'unknown', label: '不清楚' }
  ];

  var RULES = {
    projectName: '纤护呼吸公益项目',
    org: '北京开创者慈善基金会',
    version: 'v1.0',
    effectiveDate: '2026-11-19',

    /* —— 页面与表单地址 —— */
    siteUrl: 'https://lixiaoyu233.github.io/HRCT/',
    formUrl: 'https://f.wps.cn/g/RxGbTOfI/',
    formName: '报销材料收集表',
    readonlyHash: '#r=',
    submittedHash: '#submitted',

    /* —— 年龄：按出生日期精确计算周岁 —— */
    ageMin: 18,
    ageMax: 75,

    /* —— SSc：首个非雷诺症状起算，≤60 个月符合；<18 个月优先推荐 —— */
    sscMaxMonths: 60,
    sscPriorityMonths: 18,

    /* —— RA：7 项 ILD 高危因素，满足 ≥2 项符合 —— */
    raMinFactors: 2,

    types: [
      {
        value: 'ssc',
        label: '弥漫型系统性硬化症（SSc）',
        desc: '即硬皮病中皮肤变硬范围较广的类型'
      },
      {
        value: 'ra',
        label: '类风湿关节炎（RA）',
        desc: '以关节肿痛为主要表现'
      }
    ],

    raFactors: [
      { id: 'ageOver60', label: '年龄大于 60 岁', auto: 'age' },
      {
        id: 'smoking',
        label: '有吸烟史',
        q: {
          label: '您是否有吸烟史？',
          tip: '累计吸过 100 支以上即算有吸烟史，包括已戒烟。',
          options: [
            { value: 'never', label: '从未吸烟' },
            { value: 'quit', label: '曾经吸烟，已戒' },
            { value: 'current', label: '目前吸烟' }
          ],
          yesValues: ['quit', 'current']
        }
      },
      {
        id: 'rf',
        label: '类风湿因子（RF）升高',
        q: {
          label: '类风湿因子（RF）是否升高？',
          tip: '以最近一次风湿科化验单为准。',
          options: TRI,
          how: '查看最近一次化验单上「类风湿因子（RF）」的数值和参考范围'
        }
      },
      {
        id: 'ccp',
        label: '抗环瓜氨酸肽抗体（抗 CCP）阳性',
        q: {
          label: '抗 CCP 抗体是否阳性？',
          tip: '以最近一次风湿科化验单为准。',
          options: TRI,
          how: '查看化验单上「抗 CCP 抗体」一项的结果'
        }
      },
      {
        id: 'inflammation',
        label: '炎症标志物（ESR / CRP）升高',
        q: {
          label: '炎症标志物（ESR / CRP）是否升高？',
          tip: '血沉（ESR）或 C 反应蛋白（CRP）任一项升高即算。',
          options: TRI,
          how: '查看化验单上 ESR、CRP 的数值和参考范围'
        }
      },
      { id: 'male', label: '男性', auto: 'sex' },
      {
        id: 'activity',
        label: '高疾病活动度',
        q: {
          label: '医生是否说过您目前病情活动度较高？',
          tip: '例如需要加药或调整方案，或 DAS28 / CDAI 评分偏高。',
          options: TRI,
          how: '询问主诊医生目前的疾病活动度评分（DAS28 / CDAI）'
        }
      }
    ],

    exclusions: [
      {
        id: 'e13',
        label: '严重过敏反应史',
        text: '是否有过需要抢救或住院的严重过敏反应（如过敏性休克、严重药物／食物过敏）？',
        how: '回想是否有过需要急诊或住院治疗的过敏反应'
      },
      {
        id: 'e14',
        label: '气道阻塞、哮喘或肺动脉高压',
        text: '是否被诊断过哮喘、慢阻肺，或做过肺功能检查提示 FEV1/FVC < 0.7，或医生说过有肺动脉高压？',
        how: '查看肺功能报告上的 FEV1/FVC 比值，以及心脏超声对肺动脉压的描述'
      },
      {
        id: 'e15',
        label: '曾接受 IL-1β 单抗治疗',
        text: '是否使用过 IL-1β 单抗类药物（如卡那单抗）？',
        how: '核对用药记录或既往生物制剂清单'
      },
      {
        id: 'e16',
        label: '合并其他风湿免疫性疾病',
        text: '是否还被诊断过其他风湿免疫病（如强直性脊柱炎、皮肌炎、系统性红斑狼疮、干燥综合征等）？',
        how: '查看既往病历中的诊断记录'
      },
      {
        id: 'e17',
        label: '活动性出血或正在抗凝治疗',
        text: '近半年是否有过活动性出血（如消化道出血、脑出血），或正在服用抗凝药（如华法林、利伐沙班、达比加群等）？',
        how: '核对正在服用的药物清单，以及近半年有无出血就诊记录'
      },
      {
        id: 'e18',
        label: '带状疱疹、淋巴增殖性疾病、恶性肿瘤或活动性结核',
        text: '是否有反复发作的带状疱疹、淋巴增殖性疾病（如淋巴瘤）、恶性肿瘤史，或正在治疗的活动性结核？',
        how: '查看既往病史，确认是否正在抗结核治疗'
      },
      {
        id: 'e19',
        label: '干细胞治疗或骨髓移植史',
        text: '是否做过干细胞治疗或任何类型的骨髓移植？',
        how: '',
        allowUnknown: false
      },
      {
        id: 'e20',
        label: '免疫缺陷、病毒血清学阳性、尘肺或肝肾功能不全',
        text: '是否有严重免疫缺陷（如 HIV 感染）、乙肝／丙肝等血清学阳性、尘肺，或严重肝肾功能不全？',
        how: '查看化验单上的 HIV、乙肝／丙肝血清学结果，以及肝肾功能指标'
      },
      {
        id: 'e21',
        label: '严重心脑血管疾病或心功能不全',
        text: '是否有慢性心衰（NYHA IV 级）、心脏射血分数（EF）< 30%、严重心电图异常，或未控制的心脑血管病（如未控制的高血压、严重心律失常、脑卒中）？',
        how: '查看心脏超声报告的 EF 值、心电图报告和血压记录'
      }
    ],

    materials: [
      '身份证正反面照片',
      '疾病诊断证明',
      '知情同意书',
      'HRCT 检查报告',
      '发票',
      '银行卡照片',
      '开户行信息（开户银行、支行名称）'
    ]
  };

  /* 按出生日期计算周岁 */
  function computeAge(birth, now) {
    var y = now.getFullYear(), m = now.getMonth() + 1, d = now.getDate();
    var age = y - birth.y;
    if (m < birth.m || (m === birth.m && d < birth.d)) age--;
    return age;
  }

  /* 两个「年-月」之间的整月数 */
  function monthsBetween(from, to) {
    return (to.y - from.y) * 12 + (to.m - from.m);
  }

  function formatDuration(months) {
    if (months < 0) months = 0;
    var y = Math.floor(months / 12);
    var m = months % 12;
    if (y === 0) return m + ' 个月';
    if (m === 0) return y + ' 年';
    return y + ' 年 ' + m + ' 个月';
  }

  function pad(n) {
    return n < 10 ? '0' + n : '' + n;
  }

  function stamp(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
      ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  /**
   * 判定主函数
   * input: {
   *   birth: {y,m,d}, sex: 'male'|'female', disease: 'ssc'|'ra',
   *   sscStart: {y,m} | null, sscUnknown: boolean,
   *   ra: {factorId: value}, exclusions: {exclusionId: 'yes'|'no'|'unknown'}
   * }
   */
  function evaluate(input, now) {
    now = now || new Date();
    var ny = now.getFullYear(), nm = now.getMonth() + 1;

    var out = {
      rules: RULES,
      generatedAt: stamp(now),
      age: null,
      status: 'pass',
      notMatched: [],
      pending: [],
      ssc: null,
      ra: null
    };

    /* 1. 年龄 */
    var ageInvalid = false;
    if (input.birth && input.birth.y && input.birth.m && input.birth.d) {
      out.age = computeAge(input.birth, now);
      if (out.age < RULES.ageMin) {
        ageInvalid = true;
        out.notMatched.push({
          title: '年龄未满 18 周岁',
          detail: '按出生日期计算，您目前 ' + out.age + ' 周岁；本项目要求 18–75 周岁。'
        });
      } else if (out.age > RULES.ageMax) {
        ageInvalid = true;
        out.notMatched.push({
          title: '年龄超过 75 周岁',
          detail: '按出生日期计算，您目前 ' + out.age + ' 周岁；本项目要求 18–75 周岁。'
        });
      }
    }

    /* 2. SSc 病程 */
    var sscNot = false, sscUnknown = false;
    if (input.disease === 'ssc') {
      var s = { months: null, priority: false, verdict: 'met', text: '' };
      if (input.sscUnknown || !input.sscStart || !input.sscStart.y || !input.sscStart.m) {
        s.verdict = 'unknown';
        sscUnknown = true;
      } else {
        var months = monthsBetween(input.sscStart, { y: ny, m: nm });
        if (months < 0) months = 0;
        s.months = months;
        s.priority = months < RULES.sscPriorityMonths;
        s.verdict = months <= RULES.sscMaxMonths ? 'met' : 'not';
        if (s.verdict === 'not') {
          sscNot = true;
          out.notMatched.push({
            title: 'SSc 病程超过 5 年',
            detail: '从首次出现非雷诺症状算起约 ' + formatDuration(months) +
              '，超过本项目要求的 5 年（60 个月）。'
          });
        }
      }
      if (s.verdict === 'met') {
        s.text = '从首次出现非雷诺症状算起约 ' + formatDuration(s.months) + '（≤5 年）';
      } else if (s.verdict === 'not') {
        s.text = '从首次出现非雷诺症状算起约 ' + formatDuration(s.months) + '（超过 5 年）';
      } else {
        s.text = '首个非雷诺症状出现的时间尚不明确';
      }
      out.ssc = s;
    }

    /* 3. RA 高危因素 */
    var raNot = false;
    if (input.disease === 'ra') {
      var r = {
        met: 0,
        unsure: 0,
        total: RULES.raFactors.length,
        metItems: [],
        unsureItems: [],
        unmetItems: [],
        verdict: 'met'
      };
      RULES.raFactors.forEach(function (f) {
        var v = '';
        if (f.auto === 'age') {
          v = out.age !== null && out.age > 60 ? 'yes' : 'no';
        } else if (f.auto === 'sex') {
          v = input.sex === 'male' ? 'yes' : 'no';
        } else if (f.q) {
          v = input.ra ? input.ra[f.id] : '';
          if (f.q.yesValues) {
            if (f.q.yesValues.indexOf(v) >= 0) v = 'yes';
            else if (v) v = 'no';
          }
        }
        if (v === 'yes') {
          r.met++;
          r.metItems.push(f);
        } else if (v === 'unknown') {
          r.unsure++;
          r.unsureItems.push(f);
        } else {
          r.unmetItems.push(f);
        }
      });
      if (r.met >= RULES.raMinFactors) {
        r.verdict = 'met';
      } else if (r.met + r.unsure >= RULES.raMinFactors) {
        r.verdict = 'unknown';
      } else {
        r.verdict = 'not';
        raNot = true;
        out.notMatched.push({
          title: 'RA 高危因素不足',
          detail: '7 项 ILD 高危因素中目前仅满足 ' + r.met + ' 项；本项目要求至少 2 项。'
        });
      }
      out.ra = r;
    }

    /* 4. 排除条件 */
    var exYes = [], exUnsure = [];
    RULES.exclusions.forEach(function (e) {
      var v = input.exclusions ? input.exclusions[e.id] : '';
      if (v === 'yes') {
        exYes.push(e);
        out.notMatched.push({ title: '符合排除条件：' + e.label, detail: e.text });
      } else if (v === 'unknown' && e.allowUnknown !== false) {
        exUnsure.push(e);
      }
    });

    /* 5. 待确认项（只列会真正影响结论的） */
    if (sscUnknown) {
      out.pending.push({
        title: '首个非雷诺症状出现的时间',
        how: '查看门诊病历上记录的首次症状时间，或询问主诊医生'
      });
    }
    if (out.ra && out.ra.verdict === 'unknown') {
      out.ra.unsureItems.forEach(function (f) {
        out.pending.push({ title: f.label, how: (f.q && f.q.how) || '' });
      });
    }
    exUnsure.forEach(function (e) {
      out.pending.push({ title: '排除条件：' + e.label, how: e.how });
    });

    /* 6. 结论 */
    var hardFail = ageInvalid || sscNot || raNot;
    if (hardFail || exYes.length) out.status = 'fail';
    else if (out.pending.length) out.status = 'need';
    else out.status = 'pass';

    return out;
  }

  /* ================= 结果二维码：只编码原始答案，不编码结论 ================= */

  var RA_ORDER = ['smoking', 'rf', 'ccp', 'inflammation', 'activity'];

  function answerCode(v) {
    if (v === 'yes') return 'Y';
    if (v === 'no') return 'N';
    if (v === 'unknown') return 'U';
    if (v === 'quit') return 'Q';
    if (v === 'current') return 'C';
    return 'N'; /* never / 未答 */
  }

  function codeToAnswer(c, kind) {
    if (kind === 'smoking') {
      if (c === 'N') return 'never';
      if (c === 'Q') return 'quit';
      if (c === 'C') return 'current';
      return '';
    }
    if (c === 'Y') return 'yes';
    if (c === 'N') return 'no';
    if (c === 'U') return 'unknown';
    return '';
  }

  /* 4 位十六进制校验码，防止二维码内容被无意改坏 */
  function checksum16(str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h * 0x01000193) >>> 0;
    }
    return ('0000' + (h & 0xffff).toString(16)).slice(-4).toUpperCase();
  }

  function encodeInput(input, ts) {
    var b = input.birth || {};
    var sscStart = '-';
    if (input.disease === 'ssc' && !input.sscUnknown &&
        input.sscStart && input.sscStart.y && input.sscStart.m) {
      sscStart = String(input.sscStart.y) + pad(input.sscStart.m);
    }
    var ra = '-';
    if (input.disease === 'ra') {
      ra = RA_ORDER.map(function (id) {
        return answerCode(input.ra ? input.ra[id] : '');
      }).join('');
    }
    var ex = RULES.exclusions.map(function (e) {
      return answerCode(input.exclusions ? input.exclusions[e.id] : '');
    }).join('');
    var body = [
      '1',
      String(ts),
      String(b.y) + pad(b.m) + pad(b.d),
      input.sex === 'male' ? 'M' : 'F',
      input.disease === 'ssc' ? 'SS' : 'RA',
      sscStart,
      ra,
      ex
    ].join('.');
    return body + '.' + checksum16(body);
  }

  function decodeInput(payload) {
    if (typeof payload !== 'string' || !payload) throw new Error('二维码内容为空');
    var seg = payload.split('.');
    if (seg.length !== 9) throw new Error('二维码内容不完整');
    if (seg[0] !== '1') throw new Error('二维码版本不支持');
    if (!/^[0-9]{10}$/.test(seg[1])) throw new Error('时间格式不正确');
    if (!/^[0-9]{8}$/.test(seg[2])) throw new Error('出生日期格式不正确');
    if (checksum16(seg.slice(0, 8).join('.')) !== seg[8]) {
      throw new Error('二维码数据校验未通过（内容可能被改动）');
    }
    var by = parseInt(seg[2].slice(0, 4), 10);
    var bm = parseInt(seg[2].slice(4, 6), 10);
    var bd = parseInt(seg[2].slice(6, 8), 10);
    if (bm < 1 || bm > 12 || bd < 1 || bd > 31) throw new Error('出生日期不合法');
    if (seg[3] !== 'M' && seg[3] !== 'F') throw new Error('性别信息不合法');
    var disease = seg[4] === 'SS' ? 'ssc' : seg[4] === 'RA' ? 'ra' : null;
    if (!disease) throw new Error('疾病类型不合法');

    var input = {
      birth: { y: by, m: bm, d: bd },
      sex: seg[3] === 'M' ? 'male' : 'female',
      disease: disease,
      sscStart: null,
      sscUnknown: false,
      ra: {},
      exclusions: {}
    };

    if (disease === 'ssc') {
      if (seg[5] === '-') {
        input.sscUnknown = true;
      } else if (/^[0-9]{6}$/.test(seg[5])) {
        input.sscStart = { y: parseInt(seg[5].slice(0, 4), 10), m: parseInt(seg[5].slice(4, 6), 10) };
      } else {
        throw new Error('病程时间格式不正确');
      }
      if (seg[6] !== '-') throw new Error('RA 数据不合法');
    } else {
      if (!/^[YNQCU]{5}$/.test(seg[6])) throw new Error('高危因素数据不合法');
      for (var i = 0; i < 5; i++) {
        var ch = seg[6].charAt(i);
        if (i === 0) {
          if ('NQC'.indexOf(ch) < 0) throw new Error('吸烟史数据不合法');
        } else if ('YNU'.indexOf(ch) < 0) {
          throw new Error('高危因素数据不合法');
        }
        input.ra[RA_ORDER[i]] = codeToAnswer(ch, i === 0 ? 'smoking' : 'tri');
      }
    }

    if (!/^[YNU]{9}$/.test(seg[7])) throw new Error('排除条件数据不合法');
    RULES.exclusions.forEach(function (e, idx) {
      input.exclusions[e.id] = codeToAnswer(seg[7].charAt(idx), 'tri');
    });

    return { input: input, ts: parseInt(seg[1], 10) };
  }

  function buildResultUrl(payload) {
    return RULES.siteUrl + RULES.readonlyHash + payload;
  }

  return {
    RULES: RULES,
    TRI: TRI,
    computeAge: computeAge,
    monthsBetween: monthsBetween,
    formatDuration: formatDuration,
    stamp: stamp,
    evaluate: evaluate,
    encodeInput: encodeInput,
    decodeInput: decodeInput,
    buildResultUrl: buildResultUrl
  };
});
