/* Teaching Portal v2 — client. No client-side role switching: the session and
   every permission decision come from the server (/api/*). */
(function () {
  'use strict';

  var state = { token: '', user: null, view: 'dashboard', notice: '' };
  try {
    state.token = sessionStorage.getItem('tp_token') || '';
    state.user = JSON.parse(sessionStorage.getItem('tp_user') || 'null');
  } catch (e) { state.user = null; }

  // Teacher workflow order is fixed server-side too: Schedule -> Materials -> Share.
  var NAV = {
    admin:   ['dashboard', 'schedule', 'materials', 'share', 'billing', 'users', 'audit', 'student'],
    staff:   ['dashboard', 'billing'],
    teacher: ['dashboard', 'schedule', 'materials', 'share'],
    student: ['student']
  };
  var LABELS = {
    dashboard: 'حالة التكاملات', schedule: 'جدولة الدروس', materials: 'إدارة المواد',
    share: 'المشاركة مع الطلاب', billing: 'الفوترة', users: 'إدارة المستخدمين',
    audit: 'سجل التدقيق', student: 'عرض الطالب'
  };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function money(n) { return Number(n).toLocaleString('en-US'); }

  async function api(path, opts) {
    opts = opts || {};
    var headers = { 'Content-Type': 'application/json' };
    if (state.token) headers.Authorization = 'Bearer ' + state.token;
    var res = await fetch(path, {
      method: opts.method || 'GET', headers: headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined
    });
    var data = null;
    try { data = await res.json(); } catch (e) { data = null; }
    if (res.status === 401) { clearSession(); renderLogin('انتهت الجلسة أو بيانات الدخول غير صالحة.'); throw new Error('unauthenticated'); }
    if (!res.ok) throw new Error((data && data.error) || ('HTTP ' + res.status));
    return data;
  }

  function setSession(token, user) {
    state.token = token; state.user = user;
    sessionStorage.setItem('tp_token', token);
    sessionStorage.setItem('tp_user', JSON.stringify(user));
  }
  function clearSession() {
    state.token = ''; state.user = null;
    sessionStorage.removeItem('tp_token'); sessionStorage.removeItem('tp_user');
  }
  function allowed(v) { return state.user && NAV[state.user.role].indexOf(v) !== -1; }
  function noticeHtml() { return state.notice ? '<p class="notice">' + esc(state.notice) + '</p>' : ''; }

  function renderChrome() {
    var ub = document.getElementById('userBox');
    if (!state.user) { ub.innerHTML = ''; document.getElementById('mainNav').innerHTML = ''; return; }
    ub.innerHTML = '<span>' + esc(state.user.name) + ' · ' + esc(state.user.id) + ' · <b>' + esc(state.user.role) + '</b></span>'
      + ' <button class="ghost small" onclick="TP.logout()">خروج</button>';
    document.getElementById('mainNav').innerHTML = NAV[state.user.role].map(function (v) {
      return '<button class="nav-btn' + (state.view === v ? ' active' : '') + '" onclick="TP.go(\'' + v + '\')">' + LABELS[v] + '</button>';
    }).join('');
  }

  function renderLogin(msg) {
    renderChrome();
    document.getElementById('app').innerHTML =
      '<div class="card login-card"><h2>تسجيل الدخول</h2>'
      + (msg ? '<p class="error">' + esc(msg) + '</p>' : '')
      + '<label>معرّف المستخدم <input id="loginId" type="text" placeholder="USR-401"></label>'
      + '<label>كلمة المرور <input id="loginPass" type="password"></label>'
      + '<button onclick="TP.login()">دخول</button>'
      + '<p class="muted">الحسابات الأولية موثّقة في README وdocs/reconciliation-report.md ويُطلب تغيير كلمات مرورها بعد أول دخول. لا تُنشأ أي حسابات تلقائيًا.</p></div>';
  }

  function showLoading() { document.getElementById('app').innerHTML = '<p class="muted">جارٍ التحميل…</p>'; }

  /* ---------- views ---------- */

  function badge(status) {
    if (status === 'connected') return '<span class="badge ok">متصل ويعمل (اختبار مباشر ناجح)</span>';
    return '<span class="badge off">غير متصل</span>';
  }

  async function viewDashboard() {
    var ig = await api('/api/integrations');
    function card(title, c, extra) {
      return '<div class="card"><h3>' + title + ' ' + badge(c.status) + '</h3>'
        + '<p class="muted">المصدر: <code>' + esc(c.key) + '</code> — مُكوَّن: ' + (c.configured ? 'نعم' : 'لا')
        + ' · اختبار مباشر: ' + (c.liveTest ? 'ناجح' : 'لا/لم يُجرَ') + '</p>' + (extra || '') + '</div>';
    }
    document.getElementById('app').innerHTML = '<h2>حالة التكاملات</h2>'
      + '<p class="rule">القاعدة: لا تظهر ميزة كمتاحة إلا بمفتاح مُكوَّن <b>و</b>اختبار مباشر ناجح لحظة العرض. فُحصت هذه الحالات الآن من الخادم (' + esc(ig.checkedAt) + ').</p>'
      + card('الاجتماعات (Meetings)', ig.meetings, '<p>إنشاء/انضمام الاجتماعات معطّل. معرّفات meetingRef القديمة تُعرض كنص فقط.</p>')
      + card('الإشعارات (Notifications)', ig.notifications, '<p>البديل: مشاركة داخل البوابة أو مشاركة يدوية.</p>')
      + card('قاعدة البيانات (Database)', ig.database, '<p>التخزين الدائم للمستخدمين والجلسات والمواد والفواتير وسجل التدقيق.</p>')
      + card('تخزين إثباتات الدفع (Storage)', ig.storage, '<p>حاوية <code>portal-receipts</code> لرفع إثباتات الدفع من مسار الفوترة.</p>');
  }

  async function viewSchedule() {
    var data = await api('/api/lessons');
    var courses = (await api('/api/courses')).courses;
    var title = {}; courses.forEach(function (c) { title[c.id] = c.title; });
    var rows = data.lessons.map(function (s) {
      return '<tr><td>' + esc(s.id) + '</td><td>' + esc(title[s.course_id] || s.course_id) + '</td>'
        + '<td>' + esc(s.starts_at) + '</td>'
        + '<td>' + (s.meeting_ref ? esc(s.meeting_ref) + ' <span class="badge warn">معرّف قديم — غير قابل للانضمام</span>' : '—') + '</td>'
        + '<td>' + esc(s.share_state) + '</td><td>' + (s.student_visible ? 'نعم' : 'لا') + '</td></tr>';
    }).join('');
    var opts = courses.map(function (c) { return '<option value="' + c.id + '">' + esc(c.title) + ' (' + c.id + ')</option>'; }).join('');
    document.getElementById('app').innerHTML = noticeHtml() + '<h2>جدولة الدروس</h2>'
      + '<table><thead><tr><th>الجلسة</th><th>المقرر</th><th>البدء</th><th>الاجتماع</th><th>المشاركة</th><th>ظاهرة للطلاب</th></tr></thead><tbody>' + rows + '</tbody></table>'
      + '<div class="card"><h3>جدولة جلسة جديدة</h3>'
      + '<label>المقرر <select id="sesCourse">' + opts + '</select></label>'
      + '<label>تاريخ ووقت البدء <input id="sesStart" type="datetime-local"></label>'
      + '<button onclick="TP.addLesson()">جدولة</button> '
      + '<button disabled title="تكامل الاجتماعات غير متصل">إنشاء اجتماع (غير متاح — التكامل غير متصل)</button>'
      + '<p class="muted">تُحفظ الجلسة في قاعدة البيانات وتُسجَّل في سجل التدقيق.</p></div>';
  }

  function linkBadge(m) {
    if (m.link_state === 'stale') return '<span class="badge bad">رابط قديم/غير صالح — يتطلب إعادة رفع</span>';
    if (m.link_state === 'ok') return '<span class="badge ok">متاح</span>';
    return '<span class="muted">لا رابط</span>';
  }

  async function viewMaterials() {
    var data = await api('/api/materials');
    var courses = (await api('/api/courses')).courses;
    var title = {}; courses.forEach(function (c) { title[c.id] = c.title; });
    var rows = data.materials.map(function (m) {
      return '<tr><td>' + esc(m.id) + '</td><td>' + esc(title[m.course_id] || m.course_id) + '</td>'
        + '<td>' + esc(m.kind) + '</td><td>' + esc(m.title) + '</td><td>' + esc(m.version) + '</td>'
        + '<td>' + linkBadge(m) + '</td><td>' + (m.learner_visible ? 'نعم' : 'لا') + '</td></tr>';
    }).join('');
    var opts = courses.map(function (c) { return '<option value="' + c.id + '">' + esc(c.title) + ' (' + c.id + ')</option>'; }).join('');
    document.getElementById('app').innerHTML = noticeHtml() + '<h2>إدارة المواد</h2>'
      + '<table><thead><tr><th>المادة</th><th>المقرر</th><th>النوع</th><th>العنوان</th><th>الإصدار</th><th>الرابط</th><th>ظاهرة للطلاب</th></tr></thead><tbody>' + rows + '</tbody></table>'
      + '<div class="card"><h3>إضافة مادة (سجل)</h3>'
      + '<label>المقرر <select id="matCourse">' + opts + '</select></label>'
      + '<label>النوع <select id="matKind"><option value="pdf">pdf</option><option value="video">video</option><option value="link">link</option><option value="image">image</option><option value="csv">csv</option></select></label>'
      + '<label>العنوان <input id="matTitle" type="text"></label>'
      + '<button onclick="TP.addMaterial()">إضافة</button> '
      + '<button disabled title="رفع ملفات المواد لم يُفعَّل بعد">رفع ملف مادة (غير متاح)</button></div>';
  }

  async function viewShare() {
    var lessons = (await api('/api/lessons')).lessons;
    var materials = (await api('/api/materials')).materials;
    var courses = (await api('/api/courses')).courses;
    var title = {}; courses.forEach(function (c) { title[c.id] = c.title; });
    var srows = lessons.map(function (s) {
      var action = s.share_state === 'shared' ? '<span class="badge ok">تمت المشاركة</span>'
        : '<button class="small" onclick="TP.share(\'lesson\',\'' + s.id + '\')">مشاركة مع الطلاب</button>';
      return '<tr><td>' + esc(s.id) + '</td><td>' + esc(title[s.course_id] || s.course_id) + '</td><td>' + esc(s.share_state) + '</td><td>' + action + '</td></tr>';
    }).join('');
    var mrows = materials.map(function (m) {
      var action = m.learner_visible ? '<span class="badge ok">ظاهرة للطلاب</span>'
        : '<button class="small" onclick="TP.share(\'material\',\'' + m.id + '\')">مشاركة مع الطلاب</button>';
      return '<tr><td>' + esc(m.id) + '</td><td>' + esc(title[m.course_id] || m.course_id) + '</td><td>' + esc(m.title) + '</td><td>' + linkBadge(m) + '</td><td>' + action + '</td></tr>';
    }).join('');
    document.getElementById('app').innerHTML = noticeHtml() + '<h2>المشاركة مع الطلاب</h2>'
      + '<p class="notice">الإشعارات غير متصلة: المشاركة تجعل المحتوى ظاهرًا داخل البوابة فقط. كل مشاركة تتطلب تأكيدًا وتُسجَّل في سجل التدقيق.</p>'
      + '<h3>الجلسات</h3><table><thead><tr><th>الجلسة</th><th>المقرر</th><th>الحالة</th><th>إجراء</th></tr></thead><tbody>' + srows + '</tbody></table>'
      + '<h3>المواد</h3><table><thead><tr><th>المادة</th><th>المقرر</th><th>العنوان</th><th>الرابط</th><th>إجراء</th></tr></thead><tbody>' + mrows + '</tbody></table>';
  }

  async function viewBilling() {
    var data = await api('/api/invoices');
    var rows = data.invoices.map(function (inv) {
      var inconsistent = inv.prior_total_consistent === false;
      return '<tr><td>' + esc(inv.id) + '</td><td>' + esc(inv.payer_ref) + '</td>'
        + '<td>' + money(inv.amount_ex_tax) + '</td>'
        + '<td>' + money(inv.tax) + ' (' + Math.round(Number(inv.tax_rate) * 100) + '%)</td>'
        + '<td><b>' + money(inv.total) + '</b>' + (inconsistent ? ' <span class="badge bad" title="prior_total=' + inv.prior_total + '">سابقة غير متسقة</span>' : '') + '</td>'
        + '<td>' + esc(inv.status) + (inv.void_reason ? ' — ' + esc(inv.void_reason) : '') + '</td>'
        + '<td>' + (inv.receipt_ref ? '<span class="badge ok">' + esc(inv.receipt_ref) + '</span>' : '—') + '</td>'
        + '<td>'
        + '<input type="file" id="rcpt-' + esc(inv.id) + '" style="max-width:150px"> '
        + '<button class="small" onclick="TP.uploadReceipt(\'' + inv.id + '\')">رفع إثبات دفع</button> '
        + (inv.status !== 'void' ? '<button class="small" onclick="TP.invoiceAction(\'' + inv.id + '\',\'issue\')">إصدار</button> '
          + '<button class="small" onclick="TP.invoiceAction(\'' + inv.id + '\',\'mark-paid\')">تعليم كمدفوعة</button> '
          + '<button class="small danger" onclick="TP.voidInvoice(\'' + inv.id + '\')">إلغاء</button> ' : '')
        + '<button class="small" onclick="TP.downloadPdf(\'' + inv.id + '\')">PDF بالهوية</button>'
        + '</td></tr>';
    }).join('');
    document.getElementById('app').innerHTML = noticeHtml() + '<h2>الفوترة</h2>'
      + '<p class="rule">الإجماليات شاملة الضريبة وتُحسب على الخادم: الإجمالي = المبلغ × (1 + الضريبة). تعليم «مدفوعة» يتطلب إثبات دفع مرفوعًا. الإلغاء يتطلب سببًا ويُسجَّل.</p>'
      + '<table><thead><tr><th>الفاتورة</th><th>مرجع الدافع</th><th>قبل الضريبة</th><th>الضريبة</th><th>الإجمالي (شامل)</th><th>الحالة</th><th>إثبات الدفع</th><th>إجراءات</th></tr></thead><tbody>' + rows + '</tbody></table>'
      + '<div class="card"><h3>فاتورة يدوية جديدة</h3>'
      + '<p class="notice">إدخال الفاتورة <b>لا ينشئ</b> حساب طالب ولا بريدًا مفترضًا — يُخزَّن «مرجع الدافع» نصًا كما هو، ولا يوجد حقل بريد إلكتروني.</p>'
      + '<label>مرجع الدافع <input id="invPayer" type="text" placeholder="مثال: USR-404 أو مرجع خارجي"></label>'
      + '<label>المبلغ قبل الضريبة <input id="invAmount" type="number" min="1"></label>'
      + '<label>نسبة الضريبة <input id="invTax" type="number" step="0.01" value="0.1"></label>'
      + '<button onclick="TP.createInvoice()">إنشاء الفاتورة</button></div>';
    window._invoices = data.invoices;
  }

  async function viewUsers() {
    var data = await api('/api/admin/users');
    var rows = data.users.map(function (u) {
      return '<tr><td>' + esc(u.id) + '</td><td>' + esc(u.name) + '</td>'
        + '<td><select id="role-' + esc(u.id) + '">' + ['admin', 'staff', 'teacher', 'student'].map(function (r) {
          return '<option value="' + r + '"' + (u.role === r ? ' selected' : '') + '>' + r + '</option>'; }).join('') + '</select></td>'
        + '<td>' + (u.active ? '<span class="badge ok">نشط</span>' : '<span class="badge bad">موقوف</span>') + '</td>'
        + '<td>'
        + '<button class="small" onclick="TP.changeRole(\'' + u.id + '\')">حفظ الدور</button> '
        + '<button class="small" onclick="TP.resetPassword(\'' + u.id + '\')">إعادة كلمة المرور</button> '
        + '<button class="small danger" onclick="TP.toggleUser(\'' + u.id + '\',' + u.active + ')">' + (u.active ? 'إيقاف' : 'تفعيل') + '</button>'
        + '</td></tr>';
    }).join('');
    document.getElementById('app').innerHTML = noticeHtml() + '<h2>إدارة المستخدمين</h2>'
      + '<p class="rule">إجراءات حساسة (إنشاء، تغيير دور، إيقاف، إعادة كلمة مرور) تتطلب تأكيدًا وتُسجَّل في سجل التدقيق. إعادة كلمة المرور تُنهي جلسات المستخدم فورًا.</p>'
      + '<table><thead><tr><th>المعرّف</th><th>الاسم</th><th>الدور</th><th>الحالة</th><th>إجراءات</th></tr></thead><tbody>' + rows + '</tbody></table>'
      + '<div class="card"><h3>إنشاء مستخدم جديد (إجراء صريح)</h3>'
      + '<label>المعرّف <input id="usrId" type="text" placeholder="USR-405"></label>'
      + '<label>الاسم <input id="usrName" type="text"></label>'
      + '<label>الدور <select id="usrRole"><option value="staff">staff</option><option value="teacher">teacher</option><option value="student">student</option><option value="admin">admin</option></select></label>'
      + '<label>كلمة مرور أولية <input id="usrPass" type="password"></label>'
      + '<button onclick="TP.createUser()">إنشاء</button></div>';
  }

  async function viewAudit() {
    var data = await api('/api/admin/audit');
    var rows = data.audit.map(function (a) {
      return '<tr><td>' + esc(a.id) + '</td><td>' + esc(a.created_at) + '</td><td>' + esc(a.actor) + '</td>'
        + '<td>' + esc(a.action) + '</td><td>' + esc(a.target || '—') + '</td>'
        + '<td><code>' + esc(JSON.stringify(a.detail || {})) + '</code></td></tr>';
    }).join('');
    document.getElementById('app').innerHTML = '<h2>سجل التدقيق</h2>'
      + '<table><thead><tr><th>#</th><th>الوقت</th><th>الفاعل</th><th>الإجراء</th><th>الهدف</th><th>التفاصيل</th></tr></thead><tbody>' + rows + '</tbody></table>';
  }

  async function viewStudent() {
    var lessons = (await api('/api/lessons')).lessons;
    var materials = (await api('/api/materials')).materials;
    var courses = (await api('/api/courses')).courses;
    var title = {}; courses.forEach(function (c) { title[c.id] = c.title; });
    // For privileged roles this view intentionally shows the student perspective.
    var vs = lessons.filter(function (s) { return s.student_visible && s.share_state === 'shared'; });
    var vm = materials.filter(function (m) { return m.learner_visible; });
    var srows = vs.map(function (s) {
      return '<tr><td>' + esc(s.id) + '</td><td>' + esc(title[s.course_id] || s.course_id) + '</td><td>' + esc(s.starts_at) + '</td></tr>';
    }).join('') || '<tr><td colspan="3" class="muted">لا جلسات منشورة حاليًا.</td></tr>';
    var mrows = vm.map(function (m) {
      return '<tr><td>' + esc(m.id) + '</td><td>' + esc(title[m.course_id] || m.course_id) + '</td>'
        + '<td>' + esc(m.title) + '</td><td>' + esc(m.version) + '</td><td>' + linkBadge(m) + '</td></tr>';
    }).join('') || '<tr><td colspan="5" class="muted">لا مواد منشورة حاليًا.</td></tr>';
    document.getElementById('app').innerHTML = '<h2>عرض الطالب</h2>'
      + '<p class="muted">يعرض فقط ما نُشر للطلاب (تصفية مفروضة على الخادم لدور الطالب).</p>'
      + '<h3>الجلسات المنشورة</h3><table><thead><tr><th>الجلسة</th><th>المقرر</th><th>البدء</th></tr></thead><tbody>' + srows + '</tbody></table>'
      + '<h3>المواد المنشورة</h3><table><thead><tr><th>المادة</th><th>المقرر</th><th>العنوان</th><th>الإصدار</th><th>الرابط</th></tr></thead><tbody>' + mrows + '</tbody></table>';
  }

  var LOADERS = {
    dashboard: viewDashboard, schedule: viewSchedule, materials: viewMaterials,
    share: viewShare, billing: viewBilling, users: viewUsers, audit: viewAudit, student: viewStudent
  };

  async function load() {
    renderChrome();
    if (!state.user) { renderLogin(); return; }
    showLoading();
    try { await LOADERS[state.view](); }
    catch (e) {
      if (e.message !== 'unauthenticated') {
        document.getElementById('app').innerHTML = '<p class="error">خطأ: ' + esc(e.message) + '</p>';
      }
    }
  }

  /* ---------- actions (sensitive ones always confirm first) ---------- */

  window.TP = {
    login: async function () {
      var userId = document.getElementById('loginId').value.trim();
      var password = document.getElementById('loginPass').value;
      try {
        var data = await api('/api/auth', { method: 'POST', body: { userId: userId, password: password } });
        setSession(data.token, data.user);
        state.view = NAV[data.user.role][0];
        state.notice = '';
        load();
      } catch (e) { if (e.message !== 'unauthenticated') renderLogin('تعذّر الدخول: ' + e.message); }
    },
    logout: async function () {
      try { await api('/api/auth', { method: 'DELETE' }); } catch (e) {}
      clearSession(); renderLogin();
    },
    go: function (v) { if (!allowed(v)) return; state.view = v; state.notice = ''; load(); },
    addLesson: async function () {
      var courseId = document.getElementById('sesCourse').value;
      var startsAt = document.getElementById('sesStart').value;
      if (!startsAt) { window.alert('حدّد تاريخ البدء.'); return; }
      if (!window.confirm('تأكيد: جدولة جلسة جديدة للمقرر ' + courseId + '؟')) return;
      var data = await api('/api/lessons', { method: 'POST', body: { courseId: courseId, startsAt: startsAt } });
      state.notice = 'جُدولت الجلسة ' + data.lesson.id + ' وحُفظت في قاعدة البيانات. لم يُنشأ اجتماع: التكامل غير متصل.';
      load();
    },
    addMaterial: async function () {
      var courseId = document.getElementById('matCourse').value;
      var kind = document.getElementById('matKind').value;
      var title = document.getElementById('matTitle').value.trim();
      if (!title) { window.alert('عنوان المادة مطلوب.'); return; }
      if (!window.confirm('تأكيد: إضافة مادة «' + title + '»؟')) return;
      var data = await api('/api/materials', { method: 'POST', body: { courseId: courseId, kind: kind, title: title } });
      state.notice = 'أُضيفت المادة ' + data.material.id + ' كسجل دائم.';
      load();
    },
    share: async function (type, id) {
      if (!window.confirm('تأكيد حساس: مشاركة ' + id + ' مع الطلاب؟ ستصبح ظاهرة لهم فورًا.')) return;
      var data = await api('/api/share', { method: 'POST', body: { type: type, id: id } });
      state.notice = 'تمت مشاركة ' + id + ' داخل البوابة. الإشعارات: ' + data.notifications + ' — شارك التفاصيل يدويًا عند الحاجة.';
      load();
    },
    createInvoice: async function () {
      var payerRef = document.getElementById('invPayer').value.trim();
      var amount = Number(document.getElementById('invAmount').value);
      var taxRate = Number(document.getElementById('invTax').value);
      if (!payerRef || !amount || amount <= 0 || !(taxRate >= 0 && taxRate < 1)) { window.alert('تحقق من الحقول.'); return; }
      var total = Math.round(amount * (1 + taxRate));
      if (!window.confirm('تأكيد: إنشاء فاتورة يدوية للدافع «' + payerRef + '» بإجمالي شامل الضريبة ' + money(total) + '؟ لن يُنشأ أي حساب طالب أو بريد.')) return;
      var data = await api('/api/invoices', { method: 'POST', body: { payerRef: payerRef, amountExTax: amount, taxRate: taxRate } });
      state.notice = 'أُنشئت الفاتورة ' + data.invoice.id + ' بإجمالي ' + money(data.invoice.total) + '. ' + data.note;
      load();
    },
    invoiceAction: async function (id, action) {
      var label = action === 'issue' ? 'إصدار' : 'تعليم كمدفوعة';
      if (action === 'mark-paid' && !window.confirm('تأكيد: تعليم ' + id + ' كمدفوعة؟ (يرفض الخادم إن لم يوجد إثبات دفع)')) return;
      if (action === 'issue' && !window.confirm('تأكيد: ' + label + ' الفاتورة ' + id + '؟')) return;
      try {
        await api('/api/invoices', { method: 'PATCH', body: { id: id, action: action } });
        state.notice = 'تم: ' + label + ' ' + id + '.';
      } catch (e) { state.notice = 'رُفض الإجراء: ' + e.message; }
      load();
    },
    voidInvoice: async function (id) {
      var reason = window.prompt('إلغاء الفاتورة ' + id + ' — السبب (إلزامي):');
      if (!reason || !reason.trim()) return;
      if (!window.confirm('تأكيد حساس: إلغاء الفاتورة ' + id + ' نهائيًا؟ السبب: ' + reason)) return;
      await api('/api/invoices', { method: 'PATCH', body: { id: id, action: 'void', reason: reason.trim() } });
      state.notice = 'أُلغيت الفاتورة ' + id + ' وسُجّل السبب.';
      load();
    },
    uploadReceipt: async function (id) {
      var input = document.getElementById('rcpt-' + id);
      var file = input && input.files && input.files[0];
      if (!file) { window.alert('اختر ملف إثبات الدفع أولًا.'); return; }
      if (file.size > 2 * 1024 * 1024) { window.alert('الحد الأقصى 2MB.'); return; }
      if (!window.confirm('تأكيد: رفع «' + file.name + '» كإثبات دفع للفاتورة ' + id + '؟ ستُعلَّم الفاتورة كمدفوعة.')) return;
      var base64 = await new Promise(function (resolve, reject) {
        var r = new FileReader();
        r.onload = function () { resolve(String(r.result).split(',')[1] || ''); };
        r.onerror = reject;
        r.readAsDataURL(file);
      });
      var data = await api('/api/receipts?invoice=' + encodeURIComponent(id), {
        method: 'POST', body: { fileName: file.name, contentBase64: base64, contentType: file.type || 'application/octet-stream' }
      });
      state.notice = 'رُفع إثبات الدفع إلى ' + data.receipt.file_path + ' وأصبحت ' + id + ' مدفوعة.';
      load();
    },
    downloadPdf: function (id) {
      var inv = (window._invoices || []).filter(function (i) { return i.id === id; })[0];
      if (!inv) return;
      var blob = window.buildInvoicePdf({
        id: inv.id, studentId: inv.payer_ref, amountExTax: inv.amount_ex_tax,
        taxRate: Number(inv.tax_rate), status: inv.status, receiptRef: inv.receipt_ref, createdBy: inv.created_by
      }, { name: 'Teaching Portal', tagline: 'Education operations portal' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = id + '.pdf';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    },
    createUser: async function () {
      var id = document.getElementById('usrId').value.trim();
      var name = document.getElementById('usrName').value.trim();
      var role = document.getElementById('usrRole').value;
      var password = document.getElementById('usrPass').value;
      if (!id || !name || password.length < 8) { window.alert('معرّف واسم وكلمة مرور (8+ أحرف) مطلوبة.'); return; }
      if (!window.confirm('تأكيد حساس: إنشاء مستخدم ' + id + ' بدور ' + role + '؟')) return;
      await api('/api/admin/users', { method: 'POST', body: { id: id, name: name, role: role, password: password } });
      state.notice = 'أُنشئ المستخدم ' + id + ' بدور ' + role + '.';
      load();
    },
    changeRole: async function (id) {
      var role = document.getElementById('role-' + id).value;
      if (!window.confirm('تأكيد حساس: تغيير دور ' + id + ' إلى ' + role + '؟')) return;
      await api('/api/admin/users', { method: 'PATCH', body: { id: id, role: role } });
      state.notice = 'غُيّر دور ' + id + ' إلى ' + role + '.';
      load();
    },
    toggleUser: async function (id, active) {
      var next = !active;
      if (!window.confirm('تأكيد حساس: ' + (next ? 'تفعيل' : 'إيقاف') + ' المستخدم ' + id + '؟')) return;
      try {
        await api('/api/admin/users', { method: 'PATCH', body: { id: id, active: next } });
        state.notice = (next ? 'فُعّل ' : 'أُوقف ') + id + '.';
      } catch (e) { state.notice = 'رُفض: ' + e.message; }
      load();
    },
    resetPassword: async function (id) {
      var pass = window.prompt('كلمة مرور جديدة للمستخدم ' + id + ' (8+ أحرف). ستُنهى جلساته فورًا:');
      if (!pass) return;
      if (pass.length < 8) { window.alert('قصيرة جدًا.'); return; }
      if (!window.confirm('تأكيد حساس: إعادة كلمة مرور ' + id + ' وإنهاء جلساته؟')) return;
      await api('/api/admin/users', { method: 'PATCH', body: { id: id, password: pass } });
      state.notice = 'أُعيدت كلمة مرور ' + id + ' وأُنهيت جلساته.';
      load();
    }
  };

  (async function init() {
    if (state.token) {
      try {
        var me = await api('/api/auth');
        state.user = me.user;
      } catch (e) { /* cleared inside api() on 401 */ }
    }
    load();
  })();
})();
