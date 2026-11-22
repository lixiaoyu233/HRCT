/* 纤护呼吸公益项目 · HRCT 自查结果卡
 * 把结果页关键信息画成一张图片，患者长按即可保存。
 * 纯绘制函数（不依赖 DOM），浏览器和 Node 都能用。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.HRCTPoster = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var BRAND = '#0f6f68';
  var INK = '#1c2a2e';
  var MUTED = '#5c6f74';
  var LINE = '#dbe5e2';
  var FONT = '"PingFang SC","Hiragino Sans GB","Microsoft YaHei",-apple-system,sans-serif';

  var STATUS_PALETTE = {
    pass: ['#e7f6ee', '#0b7a4b'],
    fail: ['#fdecea', '#b42318'],
    need: ['#fff4e5', '#b25a06']
  };

  function setFont(ctx, size, bold) {
    ctx.font = (bold ? 'bold ' : '') + size + 'px ' + FONT;
  }

  function text(ctx, str, x, y, size, color, bold, align) {
    setFont(ctx, size, bold);
    ctx.fillStyle = color;
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(String(str), x, y);
    ctx.textAlign = 'left';
  }

  function measure(ctx, str, size, bold) {
    setFont(ctx, size, bold);
    return ctx.measureText(String(str)).width;
  }

  var NO_START = '）】》」』、，。；：！？%”’·…';
  var NO_END = '（【《「『“‘';

  function wrap(ctx, str, maxWidth, size, bold) {
    setFont(ctx, size, bold);
    var chars = String(str === null || str === undefined ? '' : str).split('');
    var lines = [], line = '';
    for (var i = 0; i < chars.length; i++) {
      var test = line + chars[i];
      if (line && ctx.measureText(test).width > maxWidth) {
        /* 标点禁则：行首不放收尾标点，行尾不放起首标点 */
        if (NO_START.indexOf(chars[i]) >= 0) {
          lines.push(test);
          line = '';
        } else if (NO_END.indexOf(line.charAt(line.length - 1)) >= 0) {
          lines.push(line.slice(0, -1));
          line = line.charAt(line.length - 1) + chars[i];
        } else {
          lines.push(line);
          line = chars[i];
        }
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  function roundRect(ctx, x, y, w, h, r) {
    var radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  /* 返回整张图的最终高度 */
  function draw(ctx, opt) {
    var W = opt.width || 750;
    var PAD = 48;
    var y = 0;
    var maxHeight = opt.maxHeight || 3000;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, maxHeight);
    ctx.fillStyle = opt.brand || BRAND;
    ctx.fillRect(0, 0, W, 12);

    /* 页头 */
    y = 58;
    text(ctx, opt.org || '', PAD, y, 26, MUTED);
    y += 42;
    text(ctx, opt.project || '', PAD, y, 46, INK, true);
    y += 64;
    text(ctx, opt.subtitle || '', PAD, y, 26, MUTED);
    y += 54;

    /* 结论卡 */
    var pal = STATUS_PALETTE[opt.status.cls] || ['#eef4f2', BRAND];
    var subLines = wrap(ctx, opt.status.sub || '', W - PAD * 2 - 88, 26, false);
    var boxH = 104 + subLines.length * 38 + 34;
    roundRect(ctx, PAD, y, W - PAD * 2, boxH, 22);
    ctx.fillStyle = pal[0];
    ctx.fill();
    ctx.fillStyle = pal[1];
    roundRect(ctx, PAD, y, 10, boxH, 5);
    ctx.fill();
    text(ctx, opt.status.title, PAD + 40, y + 30, 58, pal[1], true);
    subLines.forEach(function (ln, i) {
      text(ctx, ln, PAD + 40, y + 108 + i * 38, 26, '#33454a');
    });
    y += boxH + 40;

    /* 关键信息：短值同行右对齐；长值另起一行占满宽度 */
    (opt.rows || []).forEach(function (row) {
      var label = row[0];
      var value = row[1];
      var labelW = measure(ctx, label, 26, false) + 28;
      var inline = wrap(ctx, value, W - PAD * 2 - labelW, 28, true);
      if (inline.length <= 1) {
        text(ctx, label, PAD, y, 26, MUTED);
        text(ctx, value, W - PAD, y, 28, INK, true, 'right');
        y += 58;
      } else {
        text(ctx, label, PAD, y, 26, MUTED);
        y += 42;
        var lines = wrap(ctx, value, W - PAD * 2, 28, true);
        lines.forEach(function (ln, i) {
          text(ctx, ln, PAD, y + i * 40, 28, INK, true);
        });
        y += lines.length * 40 + 16;
      }
    });

    /* 优先推荐徽章 */
    if (opt.badge) {
      var bw = measure(ctx, opt.badge, 26, true) + 52;
      roundRect(ctx, PAD, y + 4, bw, 52, 26);
      ctx.fillStyle = '#0b7a4b';
      ctx.fill();
      text(ctx, opt.badge, PAD + 26, y + 16, 26, '#ffffff', true);
      y += 52 + 20;
    }

    /* 报销材料 */
    if (opt.materials && opt.materials.length) {
      y += 10;
      ctx.fillStyle = LINE;
      ctx.fillRect(PAD, y, W - PAD * 2, 1);
      y += 34;
      text(ctx, '报销需要准备的材料', PAD, y, 34, INK, true);
      y += 60;
      opt.materials.forEach(function (m, i) {
        ctx.fillStyle = '#e3f2ef';
        ctx.beginPath();
        ctx.arc(PAD + 16, y + 16, 16, 0, Math.PI * 2);
        ctx.fill();
        text(ctx, String(i + 1), PAD + 16, y + 3, 19, '#0b5650', true, 'center');
        text(ctx, m, PAD + 46, y, 27, '#2b3b40');
        y += 50;
      });
      if (opt.materialsNote) {
        var noteLines = wrap(ctx, opt.materialsNote, W - PAD * 2, 24, false);
        noteLines.forEach(function (ln, i) {
          text(ctx, ln, PAD, y + 8 + i * 34, 24, MUTED);
        });
        y += 8 + noteLines.length * 34 + 10;
      }
      (opt.notes || []).forEach(function (note) {
        var ls = wrap(ctx, note, W - PAD * 2, 24, false);
        ls.forEach(function (ln, i) {
          text(ctx, ln, PAD, y + i * 34, 24, '#a35a12');
        });
        y += ls.length * 34 + 8;
      });
    }

    /* 二维码：单个居中；有两个则并排（自查明细 + 提交报销材料） */
    function drawOne(q, cx, top, target) {
      var n = q.getModuleCount();
      var scale = Math.max(2, Math.floor(target / n));
      var qw = n * scale;
      var x = Math.round(cx - qw / 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - 24, top - 24, qw + 48, qw + 48);
      ctx.strokeStyle = LINE;
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 24, top - 24, qw + 48, qw + 48);
      ctx.fillStyle = '#000000';
      for (var r = 0; r < n; r++) {
        for (var c = 0; c < n; c++) {
          if (q.isDark(r, c)) ctx.fillRect(x + c * scale, top + r * scale, scale, scale);
        }
      }
      return qw;
    }

    function drawCaption(cap, cx, top, maxW) {
      var lines = wrap(ctx, cap || '', maxW, 24, false);
      lines.slice(0, 2).forEach(function (ln, i) {
        text(ctx, ln, cx, top + i * 32, 24, MUTED, false, 'center');
      });
      return Math.min(lines.length, 2) * 32;
    }

    if (opt.qr && opt.qr.qr && opt.qr2 && opt.qr2.qr) {
      var colW = (W - PAD * 2) / 2;
      var cx1 = PAD + colW / 2;
      var cx2 = PAD + colW * 1.5;
      y += 26;
      var t1 = drawOne(opt.qr.qr, cx1, y, 240);
      var t2 = drawOne(opt.qr2.qr, cx2, y, 240);
      y += Math.max(t1, t2) + 52;
      drawCaption(opt.qr.caption, cx1, y, colW - 24);
      drawCaption(opt.qr2.caption, cx2, y, colW - 24);
      y += 32 * 2 + 18;
    } else if (opt.qr && opt.qr.qr) {
      y += 26;
      var qw = drawOne(opt.qr.qr, W / 2, y, 300);
      y += qw + 56;
      text(ctx, opt.qr.caption || '', W / 2, y, 26, MUTED, false, 'center');
      y += 30 + 30;
    }

    /* 页脚 */
    ctx.fillStyle = LINE;
    ctx.fillRect(PAD, y, W - PAD * 2, 1);
    y += 28;
    text(ctx, opt.footer.time, PAD, y, 24, MUTED);
    y += 36;
    text(ctx, opt.footer.version, PAD, y, 22, '#8a9a97');
    y += 36;
    var discLines = wrap(ctx, opt.footer.disclaimer, W - PAD * 2, 22, false);
    discLines.forEach(function (ln, i) {
      text(ctx, ln, PAD, y + i * 32, 22, '#8a9a97');
    });
    y += discLines.length * 32;

    return y + 48;
  }

  return { draw: draw };
});
