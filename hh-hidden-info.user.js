// ==UserScript==
// @name         HH.ru Расширенная информация о вакансии (Modern)
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  Добавляет скрытые данные (тип публикации, отклики, ТК РФ, даты) на обновленные карточки вакансий HH.ru
// @author       You
// @match        https://*.hh.ru/search/vacancy*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=hh.ru
// @updateURL    https://raw.githubusercontent.com/m11nan/hh-tamper-info/main/hh-hidden-info.user.js
// @downloadURL  https://raw.githubusercontent.com/m11nan/hh-tamper-info/main/hh-hidden-info.user.js
// @grant        GM_addStyle
// @run-at       document-idle
// ==/UserScript==

(function () {
    "use strict";

    /* ====================== CONSTANTS ====================== */

    const PUBLICATION_TYPES = {
        HH_PREMIUM: {
            bg: "#fff7ed",
            text: "#c2410c",
            border: "#ffedd5",
            label: "👑 Премиум",
        },
        HH_STANDARD_PLUS: {
            bg: "#eff6ff",
            text: "#1d4ed8",
            border: "#dbeafe",
            label: "⭐ Стандарт+",
        },
        HH_VP_OPTIMUM: {
            bg: "#faf5ff",
            text: "#7e22ce",
            border: "#f3e8ff",
            label: "⚡ Оптимум",
        },
        HH_STANDARD: {
            bg: "#f8fafc",
            text: "#475569",
            border: "#e2e8f0",
            label: "Стандарт",
        },
        HH_FREE: {
            bg: "#f3f4f6",
            text: "#4b5563",
            border: "#e5e7eb",
            label: "Бесплатная",
        },
    };

    const GPH_LABELS = {
        SELF_EMPLOYED: "Самозанятые",
        INDIVIDUAL_ENTREPRENEUR: "ИП",
        INDIVIDUAL_PERSON: "Физлица",
    };

    const MONTHS_RU = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
    const POLL_INTERVAL = 2000; // мс — fallback опроса для History API

    /* ====================== STYLES ====================== */

    GM_addStyle(`
        .hh-ext-wrap {
            font-family: "Golos Text", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            margin: 8px 0 0 0;
            display: flex;
            flex-direction: column;
            gap: 5px;
        }
        .hh-ext-row {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 6px;
        }
        .hh-ext-badge {
            display: inline-flex;
            align-items: center;
            padding: 5px 10px;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 600;
            line-height: 1.4;
            border: 1px solid transparent;
        }
        .hh-ext-tag {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            padding: 5px 10px;
            border-radius: 8px;
            font-size: 13px;
            line-height: 1.4;
            color: #2d3748;
            background: #f1f3f5;
        }
        .hh-ext-tag--green  { color: #0f766e; background: #ccfbf1; }
        .hh-ext-tag--red    { color: #991b1b; background: #fee2e2; }
        .hh-ext-tag--blue   { color: #1e40af; background: #dbeafe; }
        .hh-ext-tag--orange { color: #c2410c; background: #ffedd5; }
        .hh-ext-tag--gray   { color: #475569; background: #f1f5f9; }

        .hh-ext-responses {
            font-size: 13px;
            color: #4b5563;
        }
        .hh-ext-responses strong {
            color: #111827;
            font-weight: 600;
        }

        .hh-ext-date {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            font-size: 12px;
            color: #6b7280;
            cursor: help;
            white-space: nowrap;
            padding: 4px 8px;
            border-radius: 6px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            line-height: 1.4;
        }
        .hh-ext-date__label {
            color: #94a3b8;
            font-size: 11px;
            text-transform: lowercase;
        }
        .hh-ext-date--newer { color: #0f766e; border-color: #ccfbf1; background: #f0fdfa; }

        .hh-ext-company-badge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 4px 8px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 500;
            line-height: 1.4;
        }
        .hh-ext-company-badge svg {
            width: 14px;
            height: 14px;
            flex-shrink: 0;
        }
        .hh-ext-company-badge--trusted { color: #0f766e; background: #ccfbf1; }
        .hh-ext-company-badge--it      { color: #1e40af; background: #dbeafe; }

        .hh-ext-spacer { flex: 1; }
    `);

    /* ====================== DATA EXTRACTION ====================== */

    function extractPageData() {
        for (const s of document.querySelectorAll('script[type="application/json"]')) {
            const text = s.textContent;
            if (text && text.includes("vacancySearchResult")) {
                try {
                    return JSON.parse(text);
                } catch {}
            }
        }
        const html = document.documentElement.outerHTML;
        const marker = '{"redirectConfig"';
        const idx = html.indexOf(marker);
        if (idx !== -1) {
            const end = findMatchingBrace(html, idx);
            if (end > 0) {
                try {
                    return JSON.parse(html.slice(idx, end + 1));
                } catch {}
            }
        }
        return null;
    }

    function findMatchingBrace(str, start) {
        let depth = 0,
            inStr = false,
            esc = false;
        for (let i = start; i < str.length; i++) {
            const ch = str[i];
            if (esc) {
                esc = false;
                continue;
            }
            if (ch === "\\") {
                esc = true;
                continue;
            }
            if (ch === '"') {
                inStr = !inStr;
                continue;
            }
            if (inStr) continue;
            if (ch === "{") depth++;
            else if (ch === "}") {
                depth--;
                if (depth === 0) return i;
            }
        }
        return -1;
    }

    /* ====================== HELPERS ====================== */

    function getPubInfo(data) {
        const hh = data.vacancyProperties?.calculatedStates?.HH || {};
        let type = "HH_STANDARD";
        if (hh.premium) type = "HH_PREMIUM";
        else if (hh.optimum) type = "HH_VP_OPTIMUM";
        else if (hh.standardPlus) type = "HH_STANDARD_PLUS";
        else if (hh.free) type = "HH_FREE";
        return {
            type,
            translation: hh.translation || PUBLICATION_TYPES[type].label,
            color: PUBLICATION_TYPES[type] || PUBLICATION_TYPES.HH_STANDARD,
            isSuspicious: (hh.filteredPropertyNames || []).includes("HH_ANTIFRAUD_SUSPICIOUS_VACANCY"),
        };
    }

    function getGPH(contracts) {
        if (!contracts?.[0]?.civilLawContractsElement) return [];
        return contracts[0].civilLawContractsElement.map((c) => GPH_LABELS[c] || c);
    }

    function fmtDate(iso) {
        if (!iso) return "";
        const d = new Date(iso);
        const now = new Date();
        const isToday = d.toDateString() === now.toDateString();
        const prefix = isToday ? "сегодня" : `${d.getDate()} ${MONTHS_RU[d.getMonth()]}`;
        return {
            text: `${d.getDate()} ${MONTHS_RU[d.getMonth()]} ${d.getFullYear()}`,
            prefix,
        };
    }

    function fmtTime(iso) {
        if (!iso) return "";
        return new Date(iso).toLocaleString("ru-RU", {
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    }

    function buildCompanyBadges(company) {
        const parts = [];
        if (company["@trusted"]) {
            parts.push(`<span class="hh-ext-company-badge hh-ext-company-badge--trusted" title="Проверенный работодатель">
                <svg viewBox="0 0 16 16" fill="currentColor"><path d="M6.294 14.873c.467.53.989 1.123 1.704 1.123v-.008c.723 0 1.246-.594 1.704-1.124.273-.32.57-.658.828-.762.267-.114.687-.091 1.107-.068l.067.004.027.001c.707.04 1.434.08 1.918-.403.476-.475.435-1.21.395-1.916l-.001-.026-.003-.058c-.024-.416-.048-.845.067-1.114.113-.257.442-.546.764-.826l.018-.016c.525-.461 1.107-.972 1.107-1.686 0-.722-.595-1.244-1.125-1.701-.322-.273-.66-.57-.764-.827-.114-.267-.091-.686-.068-1.105l.004-.067c.048-.714.096-1.453-.394-1.942-.477-.484-1.212-.443-1.92-.403l-.025.001-.059.004c-.416.023-.846.047-1.115-.068-.257-.112-.547-.441-.828-.762l-.016-.018C9.224.58 8.713 0 7.998 0c-.723 0-1.246.594-1.704 1.124-.273.32-.57.658-.828.762-.267.115-.686.091-1.107.068l-.067-.004-.027-.001c-.707-.04-1.434-.08-1.918.403-.476.483-.435 1.209-.395 1.915l.001.027.004.063c.023.422.047.85-.068 1.117-.113.257-.442.546-.764.827l-.017.015C.582 6.778 0 7.288 0 8.002c0 .722.595 1.244 1.125 1.702.322.272.66.57.764.826.114.267.091.686.068 1.105l-.004.067c-.048.714-.096 1.453.394 1.942.477.484 1.212.443 1.92.403l.025-.001.058-.004c.417-.023.847-.047 1.116.068.257.112.547.442.828.763"/></svg>
                Проверенный
            </span>`);
        }
        if (company.accreditedITEmployer) {
            parts.push(`<span class="hh-ext-company-badge hh-ext-company-badge--it" title="ИТ-аккредитация">
                <svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 1.5L1 5.5l7 4 7-4-7-4zM1 11l7 4 7-4M1 8l7 4 7-4"/></svg>
                ИТ-аккредитация
            </span>`);
        }
        return parts.join("");
    }

    /* ====================== INJECTION ====================== */

    function injectInfo(card, data) {
        const company = data.company || {};
        const comp = data.compensation || {};
        const resp = data.autoResponse || {};
        const pubInfo = getPubInfo(data);

        const pubDate = data.publicationTime?.$ || "";
        const updDate = data.lastChangeTime?.$ || "";
        const creDate = data.creationTime || "";
        const gph = getGPH(data.civilLawContracts);

        const wrap = document.createElement("div");
        wrap.className = "hh-ext-wrap";

        // ────── Row 1: тип публикации + налоги + отклики ──────
        const r1 = document.createElement("div");
        r1.className = "hh-ext-row";

        const c = pubInfo.color;
        r1.insertAdjacentHTML(
            "beforeend",
            `<span class="hh-ext-badge" style="background:${c.bg};color:${c.text};border-color:${c.border}">${pubInfo.translation}</span>`,
        );

        if (pubInfo.isSuspicious) {
            r1.insertAdjacentHTML("beforeend", '<span class="hh-ext-tag hh-ext-tag--red">⚠ Подозрительная</span>');
        }

        if (comp.gross === true) {
            r1.insertAdjacentHTML("beforeend", '<span class="hh-ext-tag hh-ext-tag--red">⚠️ До вычета налогов</span>');
        } else if (comp.gross === false) {
            r1.insertAdjacentHTML("beforeend", '<span class="hh-ext-tag hh-ext-tag--green">✅ После вычета</span>');
        }

        if (data.responsesCount != null || data.totalResponsesCount != null) {
            const parts = [];
            if (data.responsesCount != null) parts.push(`+${data.responsesCount} новых`);
            if (data.totalResponsesCount != null) parts.push(`всего ${data.totalResponsesCount}`);
            r1.insertAdjacentHTML(
                "beforeend",
                `<span class="hh-ext-responses">📊 Отклики: <strong>${parts.join(" / ")}</strong></span>`,
            );
        }

        wrap.appendChild(r1);

        // ────── Row 2: ТК РФ + ГПХ + автоответ + бейджи компании ──────
        const r2 = document.createElement("div");
        r2.className = "hh-ext-row";

        if (data.acceptLaborContract != null) {
            const cls = data.acceptLaborContract ? "hh-ext-tag--green" : "hh-ext-tag--red";
            const txt = data.acceptLaborContract ? "📋 ТК РФ" : "📋 Без ТК РФ";
            r2.insertAdjacentHTML("beforeend", `<span class="hh-ext-tag ${cls}">${txt}</span>`);
        }

        if (gph.length) {
            r2.insertAdjacentHTML(
                "beforeend",
                `<span class="hh-ext-tag hh-ext-tag--orange">📝 ГПХ: ${gph.join(", ")}</span>`,
            );
        }

        if (resp.acceptAutoResponse != null) {
            const cls = resp.acceptAutoResponse ? "hh-ext-tag--blue" : "hh-ext-tag--red";
            const txt = resp.acceptAutoResponse ? "🤖 Автоответ ✓" : "🤖 Без автоответа";
            r2.insertAdjacentHTML("beforeend", `<span class="hh-ext-tag ${cls}">${txt}</span>`);
        }

        const companyBadges = buildCompanyBadges(company);
        if (companyBadges) {
            r2.insertAdjacentHTML("beforeend", companyBadges);
        }

        wrap.appendChild(r2);

        // ────── Row 3: даты ──────
        const r3 = document.createElement("div");
        r3.className = "hh-ext-row";

        if (creDate) {
            const f = fmtDate(creDate);
            const isNew = f.prefix === "сегодня";
            r3.insertAdjacentHTML(
                "beforeend",
                `<span class="hh-ext-date${isNew ? " hh-ext-date--newer" : ""}" title="Создана: ${fmtTime(creDate)}">
                    <span class="hh-ext-date__label">создана</span> ${f.text}
                </span>`,
            );
        }

        if (pubDate) {
            const f = fmtDate(pubDate);
            r3.insertAdjacentHTML(
                "beforeend",
                `<span class="hh-ext-date" title="Опубликована: ${fmtTime(pubDate)}">
                    <span class="hh-ext-date__label">опубл.</span> ${f.text}
                </span>`,
            );
        }

        if (updDate) {
            const f = fmtDate(updDate);
            r3.insertAdjacentHTML(
                "beforeend",
                `<span class="hh-ext-date" title="Обновлена: ${fmtTime(updDate)}">
                    <span class="hh-ext-date__label">обновл.</span> ${f.text}
                </span>`,
            );
        }

        wrap.appendChild(r3);

        // ────── Вставка: после блока адреса / перед описанием ──────
        const desc = card.querySelector(
            '[data-qa="vacancy-serp__vacancy_snippet_responsibility"],' +
                '[data-qa="vacancy-serp__vacancy_snippet_requirement"]',
        );
        const footer = card.querySelector(".vacancy-card-footer, .vacancy-card-footer--aYwBwcyTbrwsU6u8");

        // Ищем блок с адресом — вставляем сразу после него
        const address = card.querySelector('[data-qa="vacancy-serp__vacancy-address"]');
        const infoSection =
            address?.closest(".info-section--YaC_npvTFcwpFd1I, .info-section") || address?.parentElement;

        if (infoSection && infoSection.parentElement) {
            // Вставляем ПОСЛЕ секции с инфо (компания + рейтинг + адрес)
            infoSection.parentElement.insertBefore(wrap, infoSection.nextSibling);
        } else if (desc) {
            desc.parentElement.insertBefore(wrap, desc);
        } else if (footer) {
            footer.parentElement.insertBefore(wrap, footer);
        } else {
            card.appendChild(wrap);
        }
    }

    /* ====================== MAIN ====================== */

    let retryTimer = null;

    function processPage(from) {
        const pageData = extractPageData();
        if (!pageData) {
            if (from) console.log("[HH-EXT] processPage(" + from + "): extract вернул null");
            return;
        }

        const vacancies = pageData.vacancySearchResult?.vacancies;
        if (!vacancies?.length) {
            if (from) console.log("[HH-EXT] processPage(" + from + "): нет вакансий в данных");
            return;
        }

        const map = new Map(vacancies.map((v) => [String(v.vacancyId), v]));
        const cards = document.querySelectorAll('[data-qa="vacancy-serp__vacancy"], [data-qa="serp-item"]');

        if (from)
            console.log(
                "[HH-EXT] processPage(" +
                    from +
                    "): карточек=" +
                    cards.length +
                    ", вакансий в JSON=" +
                    vacancies.length,
            );

        let processed = 0;
        for (const card of cards) {
            if (card.classList.contains("hh-ext-done")) continue;

            const link = card.querySelector('[data-qa="serp-item__title"], [data-qa="vacancy-serp__vacancy-title"]');
            if (!link) {
                if (from) console.log("[HH-EXT]  нет ссылки в карточке");
                continue;
            }

            const m = (link.href || "").match(/vacancy\/(\d+)/);
            if (!m) {
                if (from) console.log("[HH-EXT]  нет ID в href:", link.href);
                continue;
            }

            const data = map.get(m[1]);
            if (!data) {
                if (from) console.log("[HH-EXT]  ID " + m[1] + " не найден в JSON");
                continue;
            }

            injectInfo(card, data);
            card.classList.add("hh-ext-done");
            processed++;
        }

        if (from) console.log("[HH-EXT] processPage(" + from + "): обработано=" + processed);

        const unprocessed = document.querySelectorAll('[data-qa="vacancy-serp__vacancy"]:not(.hh-ext-done)');
        if (unprocessed.length > 0 && processed === 0) {
            if (from) console.log("[HH-EXT]  retry через 1с (unprocessed=" + unprocessed.length + ")");
            if (retryTimer) clearTimeout(retryTimer);
            retryTimer = setTimeout(() => processPage("retry"), 1000);
        }
    }

    function resetAndReprocess(from) {
        console.log("[HH-EXT] resetAndReprocess от " + from);
        document.querySelectorAll(".hh-ext-done").forEach((el) => el.classList.remove("hh-ext-done"));
        processPage("reset:" + from);
    }

    function patchHistory() {
        const wrap = (original, label) =>
            function (...args) {
                console.log("[HH-EXT] history." + label + " intercepted");
                const rv = original.apply(this, args);
                setTimeout(() => resetAndReprocess("history." + label), 400);
                return rv;
            };
        history.pushState = wrap(history.pushState, "pushState");
        history.replaceState = wrap(history.replaceState, "replaceState");
        window.addEventListener("popstate", () => {
            console.log("[HH-EXT] popstate intercepted");
            setTimeout(() => resetAndReprocess("popstate"), 400);
        });
    }

    function initObserver() {
        let timer = null;
        const obs = new MutationObserver(() => {
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => {
                const fresh = document.querySelectorAll('[data-qa="vacancy-serp__vacancy"]:not(.hh-ext-done)');
                if (fresh.length > 0) {
                    console.log("[HH-EXT] observer: fresh=" + fresh.length);
                    processPage("observer");
                }
            }, 150);
        });
        obs.observe(document.body, { childList: true, subtree: true });
    }

    function initPoller() {
        // Fallback: React Router может вызывать оригинал pushState в обход нашей подмены.
        // Поэтому периодически проверяем наличие необработанных карточек.
        setInterval(() => {
            const fresh = document.querySelectorAll('[data-qa="vacancy-serp__vacancy"]:not(.hh-ext-done)');
            if (fresh.length > 0) {
                console.log("[HH-EXT] poller: fresh=" + fresh.length);
                processPage("poller");
            }
        }, POLL_INTERVAL);
    }

    console.log("[HH-EXT] скрипт загружен");
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => {
            console.log("[HH-EXT] DOMContentLoaded");
            setTimeout(() => processPage("init"), 200);
            initObserver();
            patchHistory();
            initPoller();
        });
    } else {
        console.log("[HH-EXT] readyState=" + document.readyState);
        setTimeout(() => processPage("init"), 200);
        initObserver();
        patchHistory();
        initPoller();
    }
})();
