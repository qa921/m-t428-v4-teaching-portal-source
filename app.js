/* Teaching Portal — unified release logic.
   Role model, teacher path (Schedule -> Materials -> Share), honest integration
   states, tax-inclusive billing with manual invoices, payment proof, branded PDF. */
(function () {
  'use strict';

  var state = {
    role: 'teacher',
    view: 'dashboard',
    data: JSON.parse(JSON.stringify(window.SEED)),
    notice: ''
  };

  var PERMS = {
    admin:   ['dashboard', 'schedule', 'materials', 'share', 'billing', 'student'],
    staff:   ['dashboard', 'billing'],
    teacher: ['dashboard', 'schedule', 'materials', 'share'],
    student: ['student']
  };

  // Canonical order guarantees the requested teacher workflow:
  // Schedule -> Materials -> Share (fixes the prior Materials-before-Schedule nav).
  var VIEW_ORDER = ['dashboard', 'schedule', 'materials', 'share', 'billing', 'student'];

  var LABELS = {
    dashboard: 'حالة التكاملات',
    schedule: 'جدولة الدروس',
    materials: 'إدارة المواد',
    share: 'المشاركة مع الطلاب',
    billing: 'الفوترة',
    student: 'عرض الطالب'
  };

  function can(v) { return PERMS[state.role].indexOf(v) !== -1; }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function money(n) { return Number(n).toLocaleString('en-US'); }
  function taxOf(inv) { return Math.round(inv.amountExTax * inv.taxRate); }
  function totalOf(inv) { return inv.amountExTax + taxOf(inv); }
  function courseTitle(id) {
    var c = state.data.courses.filter(function (x) { return x.id === id; })[0];
    return c ? c.title : id;
  }
  function isStaleLink(m) { return state.data.staleLinks.indexOf(m.id) !== -1; }
  function shareBadge(st) {
    var map = {
      'shared': ['ok', 'مُشاركة'],
      'not-shared': ['off', 'غير مُشاركة'],
      'missing': ['bad', 'مفقودة'],
      'draft': ['warn', 'مسودة']
    };
    var m = map[st] || ['warn', st];
    return '<span class="badge ' + m[0] + '">' + m[1] + '</span>';
  }

  /* ---------- views ---------- */

  function intCard(title, cfg, extra) {
    var active = cfg.configured && cfg.liveTest;
    var badge = active ? '<span class="badge ok">متصل ويعمل</span>'
      : (cfg.status === 'unknown' ? '<span class="badge warn">غير مؤكد</span>'
      : '<span class="badge off">غير متصل</span>');
    return '<div class="card"><h3>' + title + ' ' + badge + '</h3>'
      + '<p class="muted">' + esc(cfg.note) + '</p>'
      + '<p class="muted">المفتاح <code>' + esc(cfg.key) + '</code>: '
      + (cfg.configured ? 'مُكوَّن' : 'غير موجود')
      + ' · اختبار مباشر: ' + (cfg.liveTest ? 'ناجح' : 'لم يُجرَ') + '</p>'
      + (extra || '') + '</div>';
  }

  function viewDashboard() {
    var ig = state.data.integrations;
    return '<h2>حالة التكاملات</h2>'
      + '<p class="rule">القاعدة المعتمدة: لا تظهر أي ميزة تكامل كمتاحة إلا إذا وُجد مفتاح مُكوَّن <b>و</b> نجح اختبار مباشر. '
      + 'حاليًا <b>لا يوجد أي تكامل مفعّل</b>، لذلك تظهر جميعها كغير متصلة/غير مؤكدة وتُعطَّل الأزرار المرتبطة بها.</p>'
      + intCard('الاجتماعات (Meetings)', ig.meetings,
          '<p>إنشاء الاجتماعات والانضمام إليها <b>معطّل</b>. معرّفات meetingRef الظاهرة في الجدولة قديمة ولا تُستخدم كروابط.</p>')
      + intCard('الإشعارات (Notifications)', ig.notifications,
          '<p>البديل المتاح حاليًا: المشاركة داخل البوابة أو المشاركة اليدوية مع الطلاب.</p>')
      + intCard('التخزين (Storage)', ig.storage,
          '<p>رفع الملفات معطّل حتى يُتحقق من حاوية التخزين؛ تُدار المواد كسجلات مع روابط مؤكدة فقط.</p>');
  }

  function viewSchedule() {
    var rows = state.data.sessions.map(function (s) {
      return '<tr><td>' + esc(s.id) + '</td><td>' + esc(courseTitle(s.courseId)) + '</td>'
        + '<td>' + esc(s.startsAt) + '</td>'
        + '<td>' + (s.meetingRef ? esc(s.meetingRef) + ' <span class="badge warn">معرّف قديم — غير قابل للانضمام</span>' : '—') + '</td>'
        + '<td>' + shareBadge(s.shareState) + '</td>'
        + '<td>' + (s.studentVisible ? 'نعم' : 'لا') + '</td></tr>';
    }).join('');
    var opts = state.data.courses.map(function (c) {
      return '<option value="' + c.id + '">' + esc(c.title) + ' (' + c.id + ')</option>';
    }).join('');
    return '<h2>جدولة الدروس</h2>'
      + '<table><thead><tr><th>الجلسة</th><th>المقرر</th><th>البدء</th><th>الاجتماع</th><th>المشاركة</th><th>ظاهرة للطلاب</th></tr></thead><tbody>'
      + rows + '</tbody></table>'
      + '<div class="card"><h3>جدولة جلسة جديدة</h3>'
      + '<label>المقرر <select id="sesCourse">' + opts + '</select></label>'
      + '<label>تاريخ ووقت البدء <input id="sesStart" type="datetime-local"></label>'
      + '<button onclick="TP.addSession()">جدولة</button> '
      + '<button disabled title="تكامل الاجتماعات غير متصل: MEETING_PROVIDER_TOKEN غير موجود">إنشاء اجتماع (غير متاح — التكامل غير متصل)</button>'
      + '<p class="muted">زر إنشاء الاجتماع معطّل عمدًا حتى يُكوَّن مزوّد الاجتماعات وينجح اختبار مباشر.</p></div>';
  }

  function linkStatus(m) {
    if (!m.priorLink) return '<span class="muted">لا رابط</span>';
    if (isStaleLink(m)) return '<span class="badge bad">رابط قديم/غير صالح — يتطلب إعادة رفع</span>';
    return '<span class="badge ok">متاح</span>';
  }

  function viewMaterials() {
    var rows = state.data.materials.map(function (m) {
      return '<tr><td>' + esc(m.id) + '</td><td>' + esc(courseTitle(m.courseId)) + '</td>'
        + '<td>' + esc(m.kind) + '</td><td>' + esc(m.title) + '</td><td>' + esc(m.version) + '</td>'
        + '<td>' + linkStatus(m) + '</td>'
        + '<td>' + (m.learnerVisible ? 'نعم' : 'لا') + '</td></tr>';
    }).join('');
    var opts = state.data.courses.map(function (c) {
      return '<option value="' + c.id + '">' + esc(c.title) + ' (' + c.id + ')</option>';
    }).join('');
    return '<h2>إدارة المواد</h2>'
      + '<table><thead><tr><th>المادة</th><th>المقرر</th><th>النوع</th><th>العنوان</th><th>الإصدار</th><th>الرابط</th><th>ظاهرة للطلاب</th></tr></thead><tbody>'
      + rows + '</tbody></table>'
      + '<div class="card"><h3>إضافة مادة (سجل)</h3>'
      + '<label>المقرر <select id="matCourse">' + opts + '</select></label>'
      + '<label>النوع <select id="matKind"><option value="pdf">pdf</option><option value="video">video</option><option value="link">link</option><option value="image">image</option><option value="csv">csv</option></select></label>'
      + '<label>العنوان <input id="matTitle" type="text"></label>'
      + '<button onclick="TP.addMaterial()">إضافة</button> '
      + '<button disabled title="حالة التخزين غير مؤكدة: STORAGE_UPLOAD_BUCKET لم يُتحقق منه">رفع ملف (غير متاح — التخزين غير مؤكد)</button>'
      + '<p class="muted">رفع الملفات معطّل حتى يُتحقق من التخزين؛ تُضاف المواد كسجلات بلا روابط جديدة.</p></div>';
  }

  function viewShare() {
    var srows = state.data.sessions.map(function (s) {
      var action = s.shareState === 'shared'
        ? '<span class="badge ok">تمت المشاركة</span>'
        : '<button onclick="TP.shareSession(\'' + s.id + '\')">مشاركة مع الطلاب</button>';
      return '<tr><td>' + esc(s.id) + '</td><td>' + esc(courseTitle(s.courseId)) + '</td>'
        + '<td>' + shareBadge(s.shareState) + '</td><td>' + action + '</td></tr>';
    }).join('');
    var mrows = state.data.materials.map(function (m) {
      var blocked = m.priorLink && isStaleLink(m);
      var action = m.learnerVisible
        ? '<span class="badge ok">ظاهرة للطلاب</span>'
        : '<button onclick="TP.shareMaterial(\'' + m.id + '\')">مشاركة مع الطلاب</button>';
      return '<tr><td>' + esc(m.id) + '</td><td>' + esc(courseTitle(m.courseId)) + '</td>'
        + '<td>' + esc(m.title) + '</td>'
        + '<td>' + (blocked ? '<span class="badge bad">الرابط قديم — لن يُقدَّم للطلاب</span>' : linkStatus(m)) + '</td>'
        + '<td>' + action + '</td></tr>';
    }).join('');
    return '<h2>المشاركة مع الطلاب</h2>'
      + '<p class="notice">الإشعارات غير متصلة (NOTIFICATION_PROVIDER_KEY غير موجود). المشاركة هنا تجعل المحتوى ظاهرًا داخل البوابة فقط؛ '
      + 'شارك التفاصيل يدويًا مع الطلاب عند الحاجة.</p>'
      + '<h3>الجلسات</h3>'
      + '<table><thead><tr><th>الجلسة</th><th>المقرر</th><th>الحالة</th><th>إجراء</th></tr></thead><tbody>' + srows + '</tbody></table>'
      + '<h3>المواد</h3>'
      + '<table><thead><tr><th>المادة</th><th>المقرر</th><th>العنوان</th><th>الرابط</th><th>إجراء</th></tr></thead><tbody>' + mrows + '</tbody></table>';
  }

  function viewBilling() {
    var rows = state.data.invoices.map(function (inv) {
      var total = totalOf(inv);
      var mismatch = inv.priorTotal !== total;
      return '<tr><td>' + esc(inv.id) + '</td><td>' + esc(inv.studentId) + '</td>'
        + '<td>' + money(inv.amountExTax) + '</td>'
        + '<td>' + money(taxOf(inv)) + ' (' + Math.round(inv.taxRate * 100) + '%)</td>'
        + '<td><b>' + money(total) + '</b>'
        + (mismatch ? ' <span class="badge bad" title="السجل السابق priorTotal=' + inv.priorTotal + '">سابقة غير متسقة</span>' : '') + '</td>'
        + '<td>' + esc(inv.status) + '</td>'
        + '<td>' + (inv.receiptRef ? esc(inv.receiptRef) : '—') + '</td>'
        + '<td><button onclick="TP.attachReceipt(\'' + inv.id + '\')">إرفاق إثبات دفع</button> '
        + '<button onclick="TP.downloadPdf(\'' + inv.id + '\')">PDF بالهوية</button></td></tr>';
    }).join('');
    return '<h2>الفوترة</h2>'
      + '<p class="rule">التسعير شامل الضريبة ومتسق في كل مكان: الإجمالي = المبلغ قبل الضريبة × (1 + نسبة الضريبة). '
      + 'السجلات السابقة غير المتسقة (INV-501 وINV-504) موسومة ولا تُعتمد أرقامها القديمة.</p>'
      + '<table><thead><tr><th>الفاتورة</th><th>مرجع الدافع</th><th>قبل الضريبة</th><th>الضريبة</th><th>الإجمالي (شامل)</th><th>الحالة</th><th>إثبات الدفع</th><th>إجراءات</th></tr></thead><tbody>'
      + rows + '</tbody></table>'
      + '<div class="card"><h3>فاتورة يدوية جديدة</h3>'
      + '<p class="notice">تنبيه: إدخال الفاتورة <b>لا ينشئ</b> حساب طالب ولا عنوان بريد مفترضًا. '
      + 'لا يوجد حقل بريد إلكتروني أصلًا؛ يُسجَّل «مرجع الدافع» كنص كما أُدخل فقط.</p>'
      + '<label>مرجع الدافع <input id="invStudent" type="text" placeholder="مثال: USR-404 أو مرجع خارجي"></label>'
      + '<label>المبلغ قبل الضريبة <input id="invAmount" type="number" min="1"></label>'
      + '<label>نسبة الضريبة <input id="invTax" type="number" step="0.01" value="0.1"></label>'
      + '<button onclick="TP.createInvoice()">إنشاء الفاتورة</button></div>';
  }

  function viewStudent() {
    var vs = state.data.sessions.filter(function (s) { return s.studentVisible && s.shareState === 'shared'; });
    var vm = state.data.materials.filter(function (m) { return m.learnerVisible; });
    var srows = vs.map(function (s) {
      return '<tr><td>' + esc(s.id) + '</td><td>' + esc(courseTitle(s.courseId)) + '</td><td>' + esc(s.startsAt) + '</td></tr>';
    }).join('') || '<tr><td colspan="3" class="muted">لا جلسات منشورة حاليًا.</td></tr>';
    var mrows = vm.map(function (m) {
      var link = !m.priorLink ? '<span class="muted">لا رابط</span>'
        : (isStaleLink(m) ? '<span class="badge bad">غير متاح حاليًا (رابط قديم)</span>'
        : '<span class="badge ok">متاح</span>');
      return '<tr><td>' + esc(m.id) + '</td><td>' + esc(courseTitle(m.courseId)) + '</td>'
        + '<td>' + esc(m.title) + '</td><td>' + esc(m.version) + '</td><td>' + link + '</td></tr>';
    }).join('') || '<tr><td colspan="5" class="muted">لا مواد منشورة حاليًا.</td></tr>';
    return '<h2>عرض الطالب</h2>'
      + '<p class="muted">يعرض فقط ما شاركه المدرّس ونشره للطلاب.</p>'
      + '<h3>الجلسات المنشورة</h3>'
      + '<table><thead><tr><th>الجلسة</th><th>المقرر</th><th>البدء</th></tr></thead><tbody>' + srows + '</tbody></table>'
      + '<h3>المواد المنشورة</h3>'
      + '<table><thead><tr><th>المادة</th><th>المقرر</th><th>العنوان</th><th>الإصدار</th><th>الرابط</th></tr></thead><tbody>' + mrows + '</tbody></table>';
  }

  var VIEWS = {
    dashboard: viewDashboard,
    schedule: viewSchedule,
    materials: viewMaterials,
    share: viewShare,
    billing: viewBilling,
    student: viewStudent
  };

  /* ---------- render ---------- */

  function renderNav() {
    document.getElementById('mainNav').innerHTML = VIEW_ORDER.filter(can).map(function (v) {
      return '<button class="nav-btn' + (state.view === v ? ' active' : '')
        + '" onclick="TP.go(\'' + v + '\')">' + LABELS[v] + '</button>';
    }).join('');
  }

  function render() {
    renderNav();
    document.getElementById('app').innerHTML =
      (state.notice ? '<p class="notice">' + esc(state.notice) + '</p>' : '') + VIEWS[state.view]();
  }

  /* ---------- actions ---------- */

  function nextId(items, prefix) {
    var next = 1;
    items.forEach(function (i) {
      var n = parseInt(String(i.id).split('-')[1], 10);
      if (!isNaN(n) && n >= next) next = n + 1;
    });
    return prefix + '-' + next;
  }

  window.TP = {
    go: function (v) { if (!can(v)) return; state.view = v; state.notice = ''; render(); },
    setRole: function (r) {
      state.role = r;
      if (!can(state.view)) state.view = PERMS[r][0];
      state.notice = '';
      render();
    },
    addSession: function () {
      var course = document.getElementById('sesCourse').value;
      var start = document.getElementById('sesStart').value;
      if (!start) { window.alert('حدّد تاريخ ووقت البدء.'); return; }
      var id = nextId(state.data.sessions, 'SES');
      state.data.sessions.push({
        id: id, courseId: course, startsAt: start,
        meetingRef: null, shareState: 'not-shared', studentVisible: false
      });
      state.notice = 'جُدولت الجلسة ' + id + '. لم يُنشأ اجتماع: تكامل الاجتماعات غير متصل.';
      render();
    },
    addMaterial: function () {
      var course = document.getElementById('matCourse').value;
      var kind = document.getElementById('matKind').value;
      var title = document.getElementById('matTitle').value.trim();
      if (!title) { window.alert('عنوان المادة مطلوب.'); return; }
      var id = nextId(state.data.materials, 'MAT');
      state.data.materials.push({
        id: id, courseId: course, kind: kind, title: title,
        version: new Date().toISOString().slice(0, 10), learnerVisible: false, priorLink: null
      });
      state.notice = 'أُضيفت المادة ' + id + ' كسجل (رفع الملفات معطّل: التخزين غير مؤكد).';
      render();
    },
    shareSession: function (id) {
      var s = state.data.sessions.filter(function (x) { return x.id === id; })[0];
      if (!s) return;
      s.shareState = 'shared';
      s.studentVisible = true;
      state.notice = 'أصبحت الجلسة ' + id + ' ظاهرة للطلاب داخل البوابة. الإشعارات غير متصلة — شارك التفاصيل يدويًا.';
      render();
    },
    shareMaterial: function (id) {
      var m = state.data.materials.filter(function (x) { return x.id === id; })[0];
      if (!m) return;
      m.learnerVisible = true;
      var extra = (m.priorLink && isStaleLink(m)) ? ' تنبيه: رابطها قديم ولن يُقدَّم للطلاب حتى يُعاد رفعها.' : '';
      state.notice = 'أصبحت المادة ' + id + ' ظاهرة للطلاب داخل البوابة.' + extra;
      render();
    },
    createInvoice: function () {
      var ref = document.getElementById('invStudent').value.trim();
      var amount = Number(document.getElementById('invAmount').value);
      var tax = Number(document.getElementById('invTax').value);
      if (!ref) { window.alert('مرجع الدافع مطلوب.'); return; }
      if (!amount || amount <= 0) { window.alert('المبلغ غير صالح.'); return; }
      if (!(tax >= 0 && tax < 1)) { window.alert('نسبة الضريبة غير صالحة.'); return; }
      var id = nextId(state.data.invoices, 'INV');
      var inv = {
        id: id,
        studentId: ref, // stored verbatim: no student account and no email is created
        amountExTax: amount,
        taxRate: tax,
        priorTotal: Math.round(amount * (1 + tax)), // consistent tax-inclusive from birth
        status: 'manual-entry',
        receiptRef: null,
        createdBy: state.role + ' portal entry'
      };
      state.data.invoices.push(inv);
      state.notice = 'أُنشئت الفاتورة ' + id + ' بإجمالي شامل الضريبة ' + money(totalOf(inv))
        + '. لم يُنشأ أي حساب طالب أو عنوان بريد.';
      render();
    },
    attachReceipt: function (id) {
      var inv = state.data.invoices.filter(function (x) { return x.id === id; })[0];
      if (!inv) return;
      var ref = window.prompt('مرجع إثبات الدفع (مثال: RCPT-07):', inv.receiptRef || '');
      if (ref && ref.trim()) {
        inv.receiptRef = ref.trim();
        if (inv.status !== 'paid') inv.status = 'paid';
        state.notice = 'أُرفق إثبات الدفع ' + inv.receiptRef + ' بالفاتورة ' + id + '.';
        render();
      }
    },
    downloadPdf: function (id) {
      var inv = state.data.invoices.filter(function (x) { return x.id === id; })[0];
      if (!inv) return;
      var blob = window.buildInvoicePdf(inv, state.data.brand);
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = id + '.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  document.getElementById('roleSelect').addEventListener('change', function (e) {
    window.TP.setRole(e.target.value);
  });
  render();
})();
