// ============================================
// PSS ATTENDANCE SHEET
// Monthly station/date register with full record details
// ============================================

const ATTENDANCE_TIME_ZONE = 'Asia/Kolkata';

const attendanceState = {
    initialized: false,
    listenersBound: false,
    month: '',
    entries: [],
    cache: new Map(),
    model: null,
    loading: false,
    requestId: 0,
    search: '',
    filter: 'all',
    detail: null,
    error: '',
    usedFallback: false,
    loadedAt: 0
};

// --------------------------------------------
// Basic helpers
// --------------------------------------------

function attendanceEscape(value) {
    return String(value === null || value === undefined ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function attendancePad(value) {
    return String(value).padStart(2, '0');
}

function attendanceTodayIso() {
    if (typeof todayLocalISO === 'function') return todayLocalISO();
    try {
        return new Date().toLocaleDateString('en-CA', { timeZone: ATTENDANCE_TIME_ZONE });
    } catch (error) {
        const date = new Date();
        return `${date.getFullYear()}-${attendancePad(date.getMonth() + 1)}-${attendancePad(date.getDate())}`;
    }
}

function attendanceNormalizeDate(value) {
    if (!value) return '';
    if (typeof normalizeDateValue === 'function') {
        const normalized = normalizeDateValue(value);
        if (normalized) return normalized;
    }
    const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
    return match ? `${match[1]}-${match[2]}-${match[3]}` : '';
}

function attendanceMonthBounds(month) {
    const [year, monthNumber] = String(month || '').split('-').map(Number);
    const safeYear = Number.isFinite(year) ? year : new Date().getFullYear();
    const safeMonth = Number.isFinite(monthNumber) && monthNumber >= 1 && monthNumber <= 12
        ? monthNumber
        : new Date().getMonth() + 1;
    const days = new Date(Date.UTC(safeYear, safeMonth, 0)).getUTCDate();
    return {
        year: safeYear,
        monthNumber: safeMonth,
        days,
        month: `${safeYear}-${attendancePad(safeMonth)}`,
        start: `${safeYear}-${attendancePad(safeMonth)}-01`,
        end: `${safeYear}-${attendancePad(safeMonth)}-${attendancePad(days)}`
    };
}

function attendanceMonthLabel(month) {
    const bounds = attendanceMonthBounds(month);
    const date = new Date(Date.UTC(bounds.year, bounds.monthNumber - 1, 1, 12));
    try {
        return date.toLocaleDateString('en-IN', {
            timeZone: 'UTC',
            month: 'long',
            year: 'numeric'
        });
    } catch (error) {
        return bounds.month;
    }
}

function attendanceDateObject(isoDate) {
    const normalized = attendanceNormalizeDate(isoDate);
    if (!normalized) return null;
    const [year, month, day] = normalized.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day, 12));
}

function attendanceDateFormat(isoDate, options) {
    const date = attendanceDateObject(isoDate);
    if (!date) return '—';
    try {
        return date.toLocaleDateString('en-IN', { timeZone: 'UTC', ...options });
    } catch (error) {
        return isoDate;
    }
}

function attendanceDayLabel(isoDate) {
    return attendanceDateFormat(isoDate, { day: '2-digit' });
}

function attendanceWeekday(isoDate) {
    return attendanceDateFormat(isoDate, { weekday: 'short' });
}

function attendanceFullDate(isoDate) {
    return attendanceDateFormat(isoDate, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

function attendanceShortDate(isoDate) {
    return attendanceDateFormat(isoDate, { day: '2-digit', month: 'short' });
}

function attendanceWeekdayNumber(isoDate) {
    const date = attendanceDateObject(isoDate);
    return date ? date.getUTCDay() : -1;
}

function attendanceShiftMonth(month, amount) {
    const bounds = attendanceMonthBounds(month);
    const date = new Date(Date.UTC(bounds.year, bounds.monthNumber - 1 + amount, 1, 12));
    return `${date.getUTCFullYear()}-${attendancePad(date.getUTCMonth() + 1)}`;
}

function attendanceFormatNumber(value) {
    if (value === null || value === undefined || value === '') return '—';
    const number = Number(value);
    if (!Number.isFinite(number)) return attendanceEscape(value);
    return number.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function attendanceFormatTimestamp(value) {
    if (!value) return '—';
    if (typeof formatTimestamp === 'function') {
        const formatted = formatTimestamp(value);
        if (formatted) return formatted;
    }
    return String(value);
}

function attendanceRecordTime(record) {
    if (!record) return 'Saved record';
    if (record.timestamp) return attendanceFormatTimestamp(record.timestamp);
    if (record.updatedAt) return attendanceFormatTimestamp(record.updatedAt);
    return 'Saved record';
}
function attendanceConfigurationFor(station) {
    if (typeof getPSSConfigFor === 'function') {
        return getPSSConfigFor(station);
    }
    return null;
}

// --------------------------------------------
// Station and record model
// --------------------------------------------

function attendanceStationName(station) {
    if (!station) return '';
    return String(station.name || station.displayName || station.id || '').trim();
}

function attendanceBuildAliasResolver() {
    const aliases = new Map();
    const configured = Array.isArray(adminState?.pssStations) ? adminState.pssStations : [];

    configured.forEach(station => {
        const canonical = attendanceStationName(station);
        if (!canonical) return;
        const names = [
            station.name,
            station.displayName,
            station.id,
            ...(Array.isArray(station.alternateNames) ? station.alternateNames : [])
        ];
        names.forEach(name => {
            const key = String(name || '').trim().toLowerCase();
            if (key && !aliases.has(key)) aliases.set(key, canonical);
        });
    });

    return rawName => {
        const cleaned = String(rawName || '').trim();
        if (!cleaned) return '';
        return aliases.get(cleaned.toLowerCase()) || cleaned;
    };
}

function attendanceBuildStations(entries, resolveStation) {
    const configured = Array.isArray(adminState?.pssStations) ? adminState.pssStations : [];
    const configuredByName = new Map();
    const stations = new Map();

    configured.forEach(station => {
        const name = attendanceStationName(station);
        if (!name) return;
        configuredByName.set(name, station);
        stations.set(name, {
            name,
            config: station,
            isActive: station.isActive !== false
        });
    });

    (entries || []).forEach(entry => {
        const name = resolveStation(entry.pssStation);
        if (!name || stations.has(name)) return;
        stations.set(name, {
            name,
            config: configuredByName.get(name) || null,
            isActive: true
        });
    });

    return [...stations.values()].sort((left, right) =>
        left.name.localeCompare(right.name, 'en', { sensitivity: 'base' })
    );
}

function attendanceBuildIndex(entries, resolveStation, month) {
    const index = new Map();

    (entries || []).forEach(entry => {
        const station = resolveStation(entry.pssStation);
        const date = attendanceNormalizeDate(entry.date);
        if (!station || !date || date.slice(0, 7) !== month) return;

        const key = `${station}|${date}`;
        if (!index.has(key)) index.set(key, []);
        index.get(key).push(entry);
    });

    index.forEach(records => {
        records.sort((left, right) => {
            if (typeof entrySortValue === 'function') return entrySortValue(right) - entrySortValue(left);
            return String(right.date || '').localeCompare(String(left.date || ''));
        });
    });

    return index;
}

function attendanceBuildModel() {
    const bounds = attendanceMonthBounds(attendanceState.month);
    const today = attendanceTodayIso();
    const resolveStation = attendanceBuildAliasResolver();
    const entries = Array.isArray(attendanceState.entries) ? attendanceState.entries : [];
    const stations = attendanceBuildStations(entries, resolveStation);
    const index = attendanceBuildIndex(entries, resolveStation, bounds.month);

    const days = [];
    for (let dayNumber = 1; dayNumber <= bounds.days; dayNumber += 1) {
        const iso = `${bounds.month}-${attendancePad(dayNumber)}`;
        days.push({
            iso,
            dayNumber,
            weekday: attendanceWeekday(iso),
            isToday: iso === today,
            isFuture: iso > today,
            isWeekend: [0, 6].includes(attendanceWeekdayNumber(iso)),
            submittedCount: 0
        });
    }

    const rows = stations.map(station => {
        let submitted = 0;
        let missing = 0;
        let duplicates = 0;
        let rawRecords = 0;
        let latestDate = '';

        days.forEach(day => {
            const records = index.get(`${station.name}|${day.iso}`) || [];
            if (records.length) {
                rawRecords += records.length;
                duplicates += Math.max(0, records.length - 1);
                day.submittedCount += 1;
                if (!day.isFuture) submitted += 1;
                if (!latestDate || day.iso > latestDate) latestDate = day.iso;
            } else if (!day.isFuture) {
                missing += 1;
            }
        });

        const expected = submitted + missing;
        return {
            ...station,
            submitted,
            missing,
            expected,
            duplicates,
            rawRecords,
            latestDate,
            coverage: expected ? (submitted / expected) * 100 : 0
        };
    });

    const expectedCells = rows.reduce((sum, row) => sum + row.expected, 0);
    const submittedCells = rows.reduce((sum, row) => sum + row.submitted, 0);
    const missingCells = rows.reduce((sum, row) => sum + row.missing, 0);
    const duplicates = rows.reduce((sum, row) => sum + row.duplicates, 0);
    const rawRecords = rows.reduce((sum, row) => sum + row.rawRecords, 0);
    const trackedDays = days.filter(day => !day.isFuture).length;
    let latestDate = '';
    index.forEach((records, key) => {
        const date = key.slice(key.lastIndexOf('|') + 1);
        if (date && date > latestDate) latestDate = date;
    });

    return {
        bounds,
        label: attendanceMonthLabel(bounds.month),
        today,
        days,
        trackedDays,
        stations,
        rows,
        index,
        expectedCells,
        submittedCells,
        missingCells,
        duplicates,
        rawRecords,
        latestDate,
        coverage: expectedCells ? (submittedCells / expectedCells) * 100 : 0
    };
}

function attendanceFilteredRows(model) {
    const query = attendanceState.search.trim().toLowerCase();
    return model.rows.filter(row => {
        if (query) {
            const aliases = Array.isArray(row.config?.alternateNames) ? row.config.alternateNames : [];
            const haystack = [row.name, ...aliases].join(' ').toLowerCase();
            if (!haystack.includes(query)) return false;
        }

        if (attendanceState.filter === 'attention') {
            return row.missing > 0 || row.duplicates > 0;
        }
        if (attendanceState.filter === 'complete') {
            return row.expected > 0 && row.missing === 0;
        }
        if (attendanceState.filter === 'duplicates') {
            return row.duplicates > 0;
        }
        return true;
    });
}

// --------------------------------------------
// Firestore loading
// --------------------------------------------

async function attendanceFetchMonth(month) {
    const bounds = attendanceMonthBounds(month);
    let docs = [];
    let queryError = null;

    try {
        if (typeof db === 'undefined') throw new Error('Firestore is not available.');
        const snapshot = await db.collection('daily_entries')
            .where('date', '>=', bounds.start)
            .where('date', '<=', bounds.end)
            .get();
        docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        queryError = error;
        console.warn('Attendance range query failed, trying a single-bound query:', error);

        try {
            const snapshot = await db.collection('daily_entries')
                .where('date', '>=', bounds.start)
                .get();
            docs = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(entry => attendanceNormalizeDate(entry.date) <= bounds.end);
            queryError = null;
        } catch (retryError) {
            queryError = retryError;
            console.warn('Attendance fallback query failed, using cached records:', retryError);
        }
    }

    if (queryError) {
        const fallbackSource = typeof getCompleteAdminDataset === 'function'
            ? getCompleteAdminDataset()
            : (Array.isArray(adminState?.allSubmissions) ? adminState.allSubmissions : []);
        docs = (fallbackSource || []).filter(entry =>
            attendanceNormalizeDate(entry.date).slice(0, 7) === bounds.month
        );
    }

    return {
        entries: typeof decorateEntries === 'function' ? decorateEntries(docs) : docs,
        usedFallback: Boolean(queryError),
        error: queryError
    };
}

async function loadAttendanceMonth(month, force = false) {
    const target = /^\d{4}-\d{2}$/.test(String(month || ''))
        ? month
        : attendanceTodayIso().slice(0, 7);

    attendanceState.month = target;
    attendanceState.error = '';
    attendanceState.usedFallback = false;
    attendanceSyncMonthPicker(target);

    const cached = attendanceState.cache.get(target);
    const hasVisibleData = attendanceState.entries.length > 0 && attendanceState.model?.bounds?.month === target;

    if (cached && !force) {
        attendanceState.entries = cached.entries;
        attendanceState.loadedAt = cached.loadedAt;
        attendanceState.loading = false;
        attendanceState.error = cached.error || '';
        attendanceState.usedFallback = Boolean(cached.usedFallback);
        attendanceRenderAll();
        return;
    }

    const requestId = ++attendanceState.requestId;
    attendanceState.loading = true;
    attendanceSetRefreshBusy(true);
    attendanceUpdateHeadingForLoading(target);

    if (!hasVisibleData) {
        attendanceSetSheetState('loading', 'Loading attendance register', 'Fetching submissions for this month...');
        attendanceRenderSummarySkeleton();
    }

    try {
        const result = await attendanceFetchMonth(target);
        if (requestId !== attendanceState.requestId) return;

        const loadedAt = Date.now();
        attendanceState.entries = result.entries;
        attendanceState.loadedAt = loadedAt;
        attendanceState.error = result.usedFallback
            ? 'The live month query was unavailable. Showing locally loaded records instead.'
            : '';
        attendanceState.usedFallback = result.usedFallback;
        attendanceState.cache.set(target, {
            entries: result.entries,
            loadedAt,
            usedFallback: result.usedFallback,
            error: attendanceState.error
        });
    } catch (error) {
        console.error('Attendance load error:', error);
        if (requestId !== attendanceState.requestId) return;
        attendanceState.entries = [];
        attendanceState.error = 'Unable to load attendance data. Refresh the page or try again.';
        attendanceState.usedFallback = false;
    } finally {
        if (requestId !== attendanceState.requestId) return;
        attendanceState.loading = false;
        attendanceSetRefreshBusy(false);
        attendanceRenderAll();
    }
}

function refreshAttendanceWindow() {
    if (!attendanceState.initialized) return;
    attendanceState.cache.delete(attendanceState.month);
    loadAttendanceMonth(attendanceState.month, true);
}

function loadAttendanceWindow(options = {}) {
    const opts = typeof options === 'object' && options !== null ? options : {};
    if (!attendanceState.month) attendanceState.month = attendanceTodayIso().slice(0, 7);
    if (!attendanceState.listenersBound) setupAttendanceListeners();
    attendanceState.initialized = true;
    attendanceSyncMonthPicker(attendanceState.month);
    return loadAttendanceMonth(attendanceState.month, Boolean(opts.force));
}

// --------------------------------------------
// Rendering: summary and sheet
// --------------------------------------------

function attendanceUpdateHeadingForLoading(month) {
    const title = document.getElementById('attendanceMonthTitle');
    const subtitle = document.getElementById('attendanceMonthSubtitle');
    if (title) title.textContent = `${attendanceMonthLabel(month)} attendance`;
    if (subtitle) subtitle.textContent = 'Loading live submissions...';
}

function attendanceUpdateHeading(model) {
    const title = document.getElementById('attendanceMonthTitle');
    const subtitle = document.getElementById('attendanceMonthSubtitle');
    if (title) title.textContent = `${model.label} attendance`;
    if (subtitle) {
        const trackedLabel = model.trackedDays === model.bounds.days
            ? 'full month'
            : `${model.trackedDays} tracked ${model.trackedDays === 1 ? 'day' : 'days'}`;
        subtitle.textContent = `${model.stations.length} PSS stations · ${trackedLabel} · ${model.rawRecords} submitted ${model.rawRecords === 1 ? 'record' : 'records'}`;
    }
}

function attendanceSummaryCard(label, value, helper, tone, extra = '') {
    return `
        <article class="attendance-summary-card is-${tone}">
            <span class="attendance-summary-label">${attendanceEscape(label)}</span>
            <strong class="attendance-summary-value">${attendanceEscape(value)}</strong>
            <span class="attendance-summary-helper">${attendanceEscape(helper)}</span>
            ${extra}
        </article>
    `;
}

function attendanceRenderSummarySkeleton() {
    const summary = document.getElementById('attendanceSummary');
    if (!summary) return;
    summary.innerHTML = Array.from({ length: 5 }, () => `
        <article class="attendance-summary-card attendance-skeleton-card">
            <span class="attendance-skeleton-line is-short"></span>
            <span class="attendance-skeleton-line is-value"></span>
            <span class="attendance-skeleton-line"></span>
        </article>
    `).join('');
}

function attendanceRenderSummary(model) {
    const summary = document.getElementById('attendanceSummary');
    if (!summary) return;

    const coverage = Math.max(0, Math.min(100, model.coverage));
    const expectedLabel = `${model.submittedCells} of ${model.expectedCells} expected cells`;
    const daysHelper = model.trackedDays === model.bounds.days
        ? 'Full month tracked'
        : `Through ${attendanceShortDate(model.today)}`;

    summary.innerHTML = [
        attendanceSummaryCard(
            'PSS stations',
            String(model.stations.length),
            'In the monthly register',
            'violet'
        ),
        attendanceSummaryCard(
            'Days tracked',
            `${model.trackedDays} / ${model.bounds.days}`,
            daysHelper,
            'blue'
        ),
        attendanceSummaryCard(
            'Coverage',
            `${coverage.toFixed(0)}%`,
            expectedLabel,
            'green',
            `<span class="attendance-summary-progress"><span style="width:${coverage}%"></span></span>`
        ),
        attendanceSummaryCard(
            'Missing',
            String(model.missingCells),
            model.missingCells === 1 ? 'Station-day needs attention' : 'Station-days need attention',
            'red'
        ),
        attendanceSummaryCard(
            'Duplicates',
            String(model.duplicates),
            `${model.rawRecords} total records`,
            'amber'
        )
    ].join('');
}

function attendanceSetRefreshBusy(isBusy) {
    const button = document.getElementById('attendanceRefreshButton');
    if (!button) return;
    button.classList.toggle('is-loading', Boolean(isBusy));
    button.disabled = Boolean(isBusy);
}

function attendanceSetSheetState(type, title, message) {
    const state = document.getElementById('attendanceSheetState');
    const wrap = document.getElementById('attendanceSheetWrap');
    if (!state || !wrap) return;

    wrap.hidden = true;
    state.hidden = false;
    state.className = `attendance-sheet-state is-${type}`;

    if (type === 'loading') {
        state.innerHTML = `
            <span class="attendance-loader" aria-hidden="true"></span>
            <strong>${attendanceEscape(title)}</strong>
            <span>${attendanceEscape(message)}</span>
        `;
        return;
    }

    state.innerHTML = `
        <span class="attendance-state-icon" aria-hidden="true">${type === 'error' ? '!' : '—'}</span>
        <strong>${attendanceEscape(title)}</strong>
        <span>${attendanceEscape(message)}</span>
    `;
}

function attendanceShowSheet() {
    const state = document.getElementById('attendanceSheetState');
    const wrap = document.getElementById('attendanceSheetWrap');
    if (state) state.hidden = true;
    if (wrap) wrap.hidden = false;
}

function attendanceRenderNotice(model) {
    const notice = document.getElementById('attendanceNotice');
    if (!notice) return;

    const message = attendanceState.error || '';
    if (!message) {
        notice.hidden = true;
        notice.textContent = '';
        return;
    }

    notice.hidden = false;
    notice.textContent = message;
}

function attendanceDayClass(day) {
    return [
        day.isToday ? 'is-today' : '',
        day.isFuture ? 'is-future' : '',
        day.isWeekend ? 'is-weekend' : ''
    ].filter(Boolean).join(' ');
}

function attendanceCellClass(records, day) {
    const classes = ['attendance-cell'];
    if (records.length) {
        classes.push('is-submitted');
        if (records.length > 1) classes.push('is-duplicate');
    } else if (day.isFuture) {
        classes.push('is-future');
    } else {
        classes.push('is-missing');
    }
    if (day.isToday) classes.push('is-today');
    return classes.join(' ');
}

function attendanceRenderSheet(model) {
    const head = document.getElementById('attendanceSheetHead');
    const body = document.getElementById('attendanceSheetBody');
    const foot = document.getElementById('attendanceSheetFoot');
    const table = document.getElementById('attendanceSheet');
    const wrap = document.getElementById('attendanceSheetWrap');
    if (!head || !body || !foot || !table || !wrap) return;

    const rows = attendanceFilteredRows(model);
    const minWidth = 206 + (model.days.length * 48) + 112;
    table.style.minWidth = `${minWidth}px`;

    head.innerHTML = `
        <tr>
            <th class="attendance-station-head" scope="col">PSS station</th>
            ${model.days.map(day => `
                <th class="attendance-day-head ${attendanceDayClass(day)}" scope="col" title="${attendanceEscape(attendanceFullDate(day.iso))}">
                    <span class="attendance-day-name">${attendanceEscape(day.weekday)}</span>
                    <span class="attendance-day-number">${attendanceEscape(attendanceDayLabel(day.iso))}</span>
                </th>
            `).join('')}
            <th class="attendance-coverage-head" scope="col">Coverage</th>
        </tr>
    `;

    if (!model.stations.length) {
        body.innerHTML = `
            <tr>
                <td class="attendance-empty" colspan="${model.days.length + 2}">
                    No PSS stations were found. Load the station configuration and try again.
                </td>
            </tr>
        `;
    } else if (!rows.length) {
        body.innerHTML = `
            <tr>
                <td class="attendance-empty" colspan="${model.days.length + 2}">
                    No stations match this search or filter.
                </td>
            </tr>
        `;
    } else {
        body.innerHTML = rows.map(row => {
            const coverage = Math.max(0, Math.min(100, row.coverage));
            return `
                <tr class="attendance-row">
                    <th class="attendance-station-cell" scope="row">
                        <span class="attendance-station-name">${attendanceEscape(row.name)}</span>
                        <span class="attendance-station-meta">${row.submitted}/${row.expected} days${row.latestDate ? ` · last ${attendanceEscape(attendanceShortDate(row.latestDate))}` : ''}</span>
                    </th>
                    ${model.days.map(day => {
                        const records = model.index.get(`${row.name}|${day.iso}`) || [];
                        const duplicate = records.length > 1;
                        const label = records.length
                            ? `${row.name}, ${attendanceFullDate(day.iso)}, ${records.length} record${records.length === 1 ? '' : 's'} submitted`
                            : `${row.name}, ${attendanceFullDate(day.iso)}, no submission`;
                        const cellContent = records.length
                            ? (duplicate
                                ? `<span class="attendance-cell-count">${records.length}</span>`
                                : '<span class="attendance-cell-tick" aria-hidden="true">&#10003;</span>')
                            : (day.isFuture
                                ? ''
                                : '<span class="attendance-cell-dash" aria-hidden="true">&#8211;</span>');

                        return `
                            <td class="attendance-day-cell ${attendanceDayClass(day)}">
                                <button type="button"
                                    class="${attendanceCellClass(records, day)}"
                                    data-attendance-cell
                                    data-attendance-station="${attendanceEscape(row.name)}"
                                    data-attendance-date="${attendanceEscape(day.iso)}"
                                    aria-label="${attendanceEscape(label)}"
                                    title="${attendanceEscape(label)}"
                                    ${day.isFuture && !records.length ? 'disabled' : ''}>
                                    ${cellContent}
                                </button>
                            </td>
                        `;
                    }).join('')}
                    <td class="attendance-coverage-cell">
                        <span class="attendance-coverage-value">${coverage.toFixed(0)}%</span>
                        <span class="attendance-coverage-track"><span style="width:${coverage}%"></span></span>
                    </td>
                </tr>
            `;
        }).join('');
    }

    foot.innerHTML = `
        <tr>
            <th class="attendance-foot-label" scope="row">Day totals</th>
            ${model.days.map(day => {
                const value = day.isFuture ? '—' : String(day.submittedCount);
                return `<td class="attendance-foot-cell ${day.isFuture ? 'is-future' : ''} ${!day.isFuture && day.submittedCount === 0 ? 'is-zero' : ''}">${value}</td>`;
            }).join('')}
            <td class="attendance-foot-cell attendance-foot-coverage">${model.submittedCells}/${model.expectedCells}</td>
        </tr>
    `;

    attendanceShowSheet();
}

function attendanceRenderAll() {
    const model = attendanceBuildModel();
    attendanceState.model = model;
    attendanceUpdateHeading(model);
    attendanceRenderNotice(model);
    attendanceRenderSummary(model);
    attendanceRenderSheet(model);

    if (!model.stations.length) {
        attendanceSetSheetState('empty', 'No stations available', 'The PSS station configuration could not be loaded.');
    }
}

// --------------------------------------------
// Detail drawer
// --------------------------------------------

function attendanceHasReading(value, time) {
    if (value === null || value === undefined || value === '') return false;
    return Number(value) !== 0 || Boolean(time);
}

function attendanceReading(label, value, unit, time) {
    const formatted = attendanceFormatNumber(value);
    const hasValue = attendanceHasReading(value, time);
    const valueMarkup = !hasValue || formatted === '—'
        ? '<span class="attendance-reading-empty">Not recorded</span>'
        : `${formatted}${unit ? ` <small>${attendanceEscape(unit)}</small>` : ''}`;
    return `
        <div class="attendance-reading">
            <span class="attendance-reading-label">${attendanceEscape(label)}</span>
            <strong class="attendance-reading-value">${valueMarkup}</strong>
            <span class="attendance-reading-time">${time ? `@ ${attendanceEscape(time)}` : '—'}</span>
        </div>
    `;
}

function attendanceEquipmentData(record, key, flatPrefix) {
    const direct = record?.[key];
    if (direct && typeof direct === 'object') return direct;
    if (!flatPrefix) return null;
    return {
        maxVoltage: record?.[`${flatPrefix}_voltage_max`],
        maxVoltageTime: record?.[`${flatPrefix}_voltage_max_time`],
        minVoltage: record?.[`${flatPrefix}_voltage_min`],
        minVoltageTime: record?.[`${flatPrefix}_voltage_min_time`],
        maxLoad: record?.[`${flatPrefix}_load_max`],
        maxLoadTime: record?.[`${flatPrefix}_load_max_time`],
        minLoad: record?.[`${flatPrefix}_load_min`],
        minLoadTime: record?.[`${flatPrefix}_load_min_time`]
    };
}

function attendanceEquipmentCard(title, badge, data, options = {}) {
    const safe = data && typeof data === 'object' ? data : {};
    const voltageUnit = options.voltageUnit || 'kV';
    const maxVoltage = safe.maxVoltage ?? safe.maxVoltageKV;
    const minVoltage = safe.minVoltage ?? safe.minVoltageKV;
    const maxLoad = safe.maxLoad ?? safe.maxCurrent;
    const minLoad = safe.minLoad ?? safe.minCurrent;
    const readings = [
        { value: maxVoltage, time: safe.maxVoltageTime },
        { value: minVoltage, time: safe.minVoltageTime },
        { value: maxLoad, time: safe.maxLoadTime || safe.maxCurrentTime },
        { value: minLoad, time: safe.minLoadTime || safe.minCurrentTime }
    ];
    const hasValue = readings.some(reading => attendanceHasReading(reading.value, reading.time));

    return `
        <article class="attendance-equipment-card ${hasValue ? '' : 'is-empty'}">
            <div class="attendance-equipment-head">
                <div>
                    <h5 class="attendance-equipment-title">${attendanceEscape(title)}</h5>
                    ${badge ? `<span class="attendance-equipment-badge">${attendanceEscape(badge)}</span>` : ''}
                </div>
                <span class="attendance-equipment-state">${hasValue ? 'Submitted' : 'Not recorded'}</span>
            </div>
            <div class="attendance-reading-grid">
                ${attendanceReading('Max voltage', maxVoltage, voltageUnit, safe.maxVoltageTime)}
                ${attendanceReading('Min voltage', minVoltage, voltageUnit, safe.minVoltageTime)}
                ${attendanceReading('Max load', maxLoad, 'A', safe.maxLoadTime || safe.maxCurrentTime)}
                ${attendanceReading('Min load', minLoad, 'A', safe.minLoadTime || safe.minCurrentTime)}
            </div>
        </article>
    `;
}

function attendanceGetIncomers(record) {
    if (typeof getEntryIncomers === 'function') {
        return getEntryIncomers(record).map(circuit => ({
            ...circuit,
            data: circuit.data || attendanceEquipmentData(record, circuit.id, circuit.id)
        }));
    }

    return Object.keys(record || {})
        .filter(key => /^ic\d+$/.test(key))
        .map(key => ({
            id: key,
            name: `I/C-${key.slice(2)}`,
            data: attendanceEquipmentData(record, key, key)
        }));
}

function attendanceGetPtrCards(record) {
    const configuration = attendanceConfigurationFor(record.pssStation);
    const configuredCount = typeof getConfiguredPTRCount === 'function'
        ? getConfiguredPTRCount(configuration)
        : 2;
    const foundNumbers = new Set();

    Object.keys(record || {}).forEach(key => {
        const match = key.match(/^ptr(\d+)_(33kv|11kv)$/);
        if (match) foundNumbers.add(Number(match[1]));
    });

    const count = Math.max(configuredCount, ...foundNumbers, 0);
    const cards = [];

    for (let number = 1; number <= count; number += 1) {
        ['33kv', '11kv'].forEach(level => {
            const key = `ptr${number}_${level}`;
            cards.push({
                key,
                title: `PTR ${number}`,
                badge: level === '33kv' ? '33 kV' : '11 kV',
                data: attendanceEquipmentData(record, key, key)
            });
        });
    }

    return cards;
}

function attendanceGetFeeders(record) {
    const source = record?.feeders;
    let entries = [];

    if (Array.isArray(source)) {
        entries = source.map((feeder, index) => ({ key: String(index), feeder }));
    } else if (source && typeof source === 'object') {
        entries = Object.entries(source).map(([key, feeder]) => ({ key, feeder }));
    }

    return entries
        .filter(entry => entry.feeder && typeof entry.feeder === 'object')
        .map(entry => {
            let name = entry.feeder.name || entry.feeder.feederName || entry.key;
            if (name && typeof name === 'object') name = name.name || entry.key;
            return {
                name: String(name || `Feeder ${entry.key}`),
                ptrNo: entry.feeder.ptrNo,
                data: entry.feeder
            };
        })
        .sort((left, right) => {
            const leftPtr = Number(left.ptrNo);
            const rightPtr = Number(right.ptrNo);
            if (Number.isFinite(leftPtr) && Number.isFinite(rightPtr) && leftPtr !== rightPtr) {
                return leftPtr - rightPtr;
            }
            return left.name.localeCompare(right.name, 'en', { sensitivity: 'base' });
        });
}

function attendanceMetaItem(label, value) {
    const missing = value === null || value === undefined || value === '';
    return `
        <div class="attendance-meta-item">
            <span>${attendanceEscape(label)}</span>
            <strong>${attendanceEscape(missing ? '—' : value)}</strong>
        </div>
    `;
}

function attendanceRenderDetail(record, model, station, date, recordIndex) {
    const incomers = attendanceGetIncomers(record);
    const ptrCards = attendanceGetPtrCards(record);
    const feeders = attendanceGetFeeders(record);
    const stationTransformer = attendanceEquipmentData(record, 'stationTransformer', 'station_transformer');
    const charger = attendanceEquipmentData(record, 'charger', 'charger');
    const configuration = attendanceConfigurationFor(station);
    const records = attendanceState.detail?.records || [];
    const requestedTime = attendanceRecordTime(record);
    const submittedBy = record.staffName || record.submittedBy || record.lineman || '—';
    const phone = record.phoneNumber || record.phone || '—';

    return `
        <div class="attendance-detail-head">
            <span class="attendance-detail-kicker">PSS submission detail</span>
            <h3 id="attendanceDetailTitle">${attendanceEscape(station)}</h3>
            <p class="attendance-detail-date">${attendanceEscape(attendanceFullDate(date))}</p>
            <div class="attendance-detail-badges">
                <span class="attendance-status-pill is-submitted">Submitted</span>
                <span class="attendance-detail-badge">${attendanceEscape(requestedTime)}</span>
                <span class="attendance-detail-badge">Record ${recordIndex + 1} of ${records.length}</span>
            </div>
        </div>

        ${records.length > 1 ? `
            <div class="attendance-record-tabs" role="tablist" aria-label="Submitted records for this date">
                ${records.map((item, index) => `
                    <button type="button"
                        class="attendance-record-tab ${index === recordIndex ? 'active' : ''}"
                        data-attendance-record="${index}"
                        role="tab"
                        aria-selected="${index === recordIndex}">
                        <span>Record ${index + 1}</span>
                        <small>${attendanceEscape(attendanceRecordTime(item))}</small>
                    </button>
                `).join('')}
            </div>
        ` : ''}

        <div class="attendance-detail-metrics">
            <div class="attendance-detail-metric">
                <span>Total max load</span>
                <strong>${attendanceFormatNumber(record.totalMaxLoad)} <small>A</small></strong>
            </div>
            <div class="attendance-detail-metric">
                <span>Total min load</span>
                <strong>${attendanceFormatNumber(record.totalMinLoad)} <small>A</small></strong>
            </div>
            <div class="attendance-detail-metric">
                <span>Incomers</span>
                <strong>${incomers.length || '—'}</strong>
            </div>
            <div class="attendance-detail-metric">
                <span>Feeders</span>
                <strong>${feeders.length || record.feederCount || '—'}</strong>
            </div>
        </div>

        <section class="attendance-detail-section">
            <div class="attendance-detail-section-head">
                <h4>Incoming circuits</h4>
                <span>${incomers.length} configured</span>
            </div>
            <div class="attendance-equipment-grid">
                ${incomers.length
                    ? incomers.map(circuit => attendanceEquipmentCard(
                        circuit.name,
                        circuit.id.toUpperCase(),
                        circuit.data
                    )).join('')
                    : '<p class="attendance-detail-empty-copy">No incomer data is configured for this station.</p>'}
            </div>
        </section>

        <section class="attendance-detail-section">
            <div class="attendance-detail-section-head">
                <h4>PTR readings</h4>
                <span>${ptrCards.length} readings</span>
            </div>
            <div class="attendance-equipment-grid">
                ${ptrCards.length
                    ? ptrCards.map(card => attendanceEquipmentCard(card.title, card.badge, card.data)).join('')
                    : '<p class="attendance-detail-empty-copy">No PTR readings were submitted.</p>'}
            </div>
        </section>

        <section class="attendance-detail-section">
            <div class="attendance-detail-section-head">
                <h4>Feeders</h4>
                <span>${feeders.length} submitted</span>
            </div>
            <div class="attendance-equipment-grid">
                ${feeders.length
                    ? feeders.map(feeder => attendanceEquipmentCard(
                        feeder.name,
                        feeder.ptrNo ? `PTR ${feeder.ptrNo}` : 'Feeder',
                        feeder.data
                    )).join('')
                    : '<p class="attendance-detail-empty-copy">No feeder readings were submitted.</p>'}
            </div>
        </section>

        <section class="attendance-detail-section">
            <div class="attendance-detail-section-head">
                <h4>Additional equipment</h4>
                <span>Station assets</span>
            </div>
            <div class="attendance-equipment-grid">
                ${attendanceEquipmentCard('Station transformer', 'Station asset', stationTransformer)}
                ${attendanceEquipmentCard('Charger', 'Station asset', charger, { voltageUnit: 'V' })}
            </div>
        </section>

        <section class="attendance-detail-section">
            <div class="attendance-detail-section-head">
                <h4>Submission information</h4>
                <span>Record metadata</span>
            </div>
            <div class="attendance-meta-grid">
                ${attendanceMetaItem('Staff name', submittedBy)}
                ${attendanceMetaItem('Phone number', phone)}
                ${attendanceMetaItem('Record date', attendanceFullDate(record.date))}
                ${attendanceMetaItem('Submitted at', attendanceFormatTimestamp(record.timestamp))}
                ${attendanceMetaItem('Last updated', attendanceFormatTimestamp(record.updatedAt || record.lastUpdated))}
                ${attendanceMetaItem('Configured PTRs', configuration?.ptrCount ?? configuration?.ptr ?? '—')}
                ${attendanceMetaItem('Remarks', record.remarks || record.notes || '—')}
                ${attendanceMetaItem('Record reference', record.id || '—')}
            </div>
        </section>
    `;
}

function attendanceRenderMissingDetail(station, date, model) {
    let lastRecordDate = '';
    if (model) {
        model.days.forEach(day => {
            if (day.iso >= date) return;
            if (model.index.has(`${station}|${day.iso}`)) lastRecordDate = day.iso;
        });
    }

    return `
        <div class="attendance-detail-head">
            <span class="attendance-detail-kicker">PSS submission detail</span>
            <h3 id="attendanceDetailTitle">${attendanceEscape(station)}</h3>
            <p class="attendance-detail-date">${attendanceEscape(attendanceFullDate(date))}</p>
            <div class="attendance-detail-badges">
                <span class="attendance-status-pill is-missing">Not submitted</span>
                <span class="attendance-detail-badge">Attendance gap</span>
            </div>
        </div>

        <div class="attendance-missing-panel">
            <span class="attendance-missing-icon" aria-hidden="true">&#8211;</span>
            <h4>No reading was submitted</h4>
            <p>No daily entry is recorded for <strong>${attendanceEscape(station)}</strong> on ${attendanceEscape(attendanceFullDate(date))}.</p>
            ${lastRecordDate ? `
                <button type="button"
                    class="attendance-detail-action"
                    data-attendance-open-station="${attendanceEscape(station)}"
                    data-attendance-open-date="${attendanceEscape(lastRecordDate)}">
                    View last available record (${attendanceEscape(attendanceShortDate(lastRecordDate))})
                </button>
            ` : '<span class="attendance-missing-hint">No earlier record is available in this month.</span>'}
        </div>
    `;
}

function attendanceOpenDetail(station, date, recordIndex = 0) {
    const model = attendanceState.model;
    if (!model) return;
    const records = model.index.get(`${station}|${date}`) || [];
    attendanceState.detail = {
        station,
        date,
        records,
        recordIndex: records.length ? Math.min(Math.max(recordIndex, 0), records.length - 1) : 0
    };

    const content = document.getElementById('attendanceDetailContent');
    const overlay = document.getElementById('attendanceDetailOverlay');
    if (!content || !overlay) return;

    if (records.length) {
        content.innerHTML = attendanceRenderDetail(
            records[attendanceState.detail.recordIndex],
            model,
            station,
            date,
            attendanceState.detail.recordIndex
        );
    } else {
        content.innerHTML = attendanceRenderMissingDetail(station, date, model);
    }

    overlay.hidden = false;
    document.body.classList.add('attendance-drawer-open');
    const closeButton = overlay.querySelector('.attendance-detail-close');
    if (closeButton) closeButton.focus({ preventScroll: true });
}

function attendanceCloseDetail() {
    const overlay = document.getElementById('attendanceDetailOverlay');
    if (overlay) overlay.hidden = true;
    document.body.classList.remove('attendance-drawer-open');
    attendanceState.detail = null;
}

function attendanceSelectRecord(index) {
    if (!attendanceState.detail?.records?.length) return;
    const nextIndex = Math.min(Math.max(Number(index) || 0, 0), attendanceState.detail.records.length - 1);
    attendanceState.detail.recordIndex = nextIndex;
    const record = attendanceState.detail.records[nextIndex];
    const content = document.getElementById('attendanceDetailContent');
    if (!content) return;
    content.innerHTML = attendanceRenderDetail(
        record,
        attendanceState.model,
        attendanceState.detail.station,
        attendanceState.detail.date,
        nextIndex
    );
}

// --------------------------------------------
// Events
// --------------------------------------------

function attendanceSyncMonthPicker(month) {
    const picker = document.getElementById('attendanceMonthPicker');
    if (picker && picker.value !== month) picker.value = month;
}

function setupAttendanceListeners() {
    if (attendanceState.listenersBound) return;
    attendanceState.listenersBound = true;

    const picker = document.getElementById('attendanceMonthPicker');
    const previous = document.getElementById('attendancePrevMonth');
    const next = document.getElementById('attendanceNextMonth');
    const today = document.getElementById('attendanceTodayButton');
    const refresh = document.getElementById('attendanceRefreshButton');
    const search = document.getElementById('attendanceSearch');
    const filter = document.getElementById('attendanceFilter');
    const sheetWrap = document.getElementById('attendanceSheetWrap');
    const overlay = document.getElementById('attendanceDetailOverlay');
    const detailContent = document.getElementById('attendanceDetailContent');

    picker?.addEventListener('change', () => {
        if (!/^\d{4}-\d{2}$/.test(picker.value)) return;
        loadAttendanceMonth(picker.value);
    });

    previous?.addEventListener('click', () => {
        loadAttendanceMonth(attendanceShiftMonth(attendanceState.month, -1));
    });

    next?.addEventListener('click', () => {
        loadAttendanceMonth(attendanceShiftMonth(attendanceState.month, 1));
    });

    today?.addEventListener('click', () => {
        loadAttendanceMonth(attendanceTodayIso().slice(0, 7));
    });

    refresh?.addEventListener('click', () => {
        attendanceState.cache.delete(attendanceState.month);
        loadAttendanceMonth(attendanceState.month, true);
    });

    search?.addEventListener('input', () => {
        attendanceState.search = search.value || '';
        if (attendanceState.model) attendanceRenderSheet(attendanceState.model);
    });

    filter?.addEventListener('change', () => {
        attendanceState.filter = filter.value || 'all';
        if (attendanceState.model) attendanceRenderSheet(attendanceState.model);
    });

    sheetWrap?.addEventListener('click', event => {
        const cell = event.target.closest('[data-attendance-cell]');
        if (!cell || cell.disabled) return;
        attendanceOpenDetail(cell.dataset.attendanceStation, cell.dataset.attendanceDate);
    });

    overlay?.addEventListener('click', event => {
        if (event.target.closest('[data-attendance-close]')) {
            attendanceCloseDetail();
            return;
        }

        const recordTab = event.target.closest('[data-attendance-record]');
        if (recordTab) {
            attendanceSelectRecord(recordTab.dataset.attendanceRecord);
            return;
        }

        const lastRecord = event.target.closest('[data-attendance-open-date]');
        if (lastRecord) {
            attendanceOpenDetail(
                lastRecord.dataset.attendanceOpenStation,
                lastRecord.dataset.attendanceOpenDate
            );
        }
    });

    detailContent?.addEventListener('keydown', event => {
        if (event.key === 'Escape') attendanceCloseDetail();
    });

    document.addEventListener('keydown', event => {
        const drawer = document.getElementById('attendanceDetailOverlay');
        if (event.key === 'Escape' && drawer && !drawer.hidden) attendanceCloseDetail();
    });
}
