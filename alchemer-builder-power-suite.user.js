// ==UserScript==
// @name         Alchemer Builder Power Suite
// @namespace    http://tampermonkey.net/
// @version      9.1.0
// @description  Enterprise-grade suite for Alchemer Builder: eye-catching SaaS left nav button, auto-highlighting minimap, expandable textareas, canvas scroll unlock, and inline question controls.
// @author       Jenish Mangukiya
// @match        https://*.alchemer.com/builder/build*
// @match        https://*.alchemer-ca.com/builder/build*
// @match        https://*.surveygizmo.com/builder/build*
// @updateURL    https://raw.githubusercontent.com/jenishmangukiya/alchemer-builder-power-suite/main/alchemer-builder-power-suite.user.js
// @downloadURL  https://raw.githubusercontent.com/jenishmangukiya/alchemer-builder-power-suite/main/alchemer-builder-power-suite.user.js
// @grant        GM_addStyle
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict';

    // Persistent Settings
    let isMinimapVisible = localStorage.getItem('alc_minimap_visible') === 'true';
    let isQuickDisableEnabled = localStorage.getItem('alc_quick_disable_enabled') !== 'false';
    let isScrollUnlocked = localStorage.getItem('alc_scroll_unlocked') !== 'false';
    let isExpandableTextareaEnabled = localStorage.getItem('alc_expandable_textarea_enabled') !== 'false';
    let isMenuExpanded = false;

    // Cache to prevent flickers on interval re-renders
    let lastMinimapSignature = '';

    // Inline SVG Icon Definitions
    const SVG_ICONS = {
        bolt: `<svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor"><path d="M13 2L3.5 13.5H11L9.5 22L20.5 10.5H13L15 2H13Z"/></svg>`,
        survey: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>`,
        minimap: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a8 8 0 00-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 00-8-8z"/><circle cx="12" cy="10" r="3"/></svg>`,
        controls: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15a3 3 0 100-6 3 3 0 000 6z"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>`,
        unlock: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 019.9-1"/></svg>`,
        expand: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>`
    };

    // 1. Inject UI Design System Styles
    GM_addStyle(`
        /* --- Background Canvas Scroll Fix Classes --- */
        body.alc-scroll-unlocked,
        body.alc-scroll-unlocked.modal-open,
        body.alc-scroll-unlocked.pane-open,
        body.alc-scroll-unlocked #content-wrapper,
        body.alc-scroll-unlocked .survey-canvas,
        body.alc-scroll-unlocked .layout-1column {
            overflow: auto !important;
            overflow-y: auto !important;
            height: auto !important;
            position: static !important;
        }

        body.alc-scroll-unlocked .pane-backdrop,
        body.alc-scroll-unlocked .modal-backdrop,
        body.alc-scroll-unlocked .ui-widget-overlay {
            pointer-events: none !important;
            display: none !important;
        }

        /* Base Main Question Edit Pane Style */
        body.alc-scroll-unlocked #question-edit-pane.pane-open,
        body.alc-scroll-unlocked div[id*="-edit-pane"].pane-open,
        body.alc-scroll-unlocked .pane.pane-open {
            position: fixed !important;
            top: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            height: 100vh !important;
            max-height: 100vh !important;
            overflow-y: auto !important;
            z-index: 99990 !important;
            pointer-events: auto !important;
            box-shadow: -10px 0 30px rgba(0, 0, 0, 0.25) !important;
        }

        /* Overlapping / Secondary Sub-Edit Panes Layering Fix */
        body.alc-scroll-unlocked .pane.pane-open .pane.pane-open,
        body.alc-scroll-unlocked .pane.pane-open ~ .pane.pane-open,
        body.alc-scroll-unlocked div[id*="-edit-pane"].pane-open ~ div[id*="-edit-pane"].pane-open,
        body.alc-scroll-unlocked .pane.pane-open:not(#question-edit-pane),
        body.alc-scroll-unlocked div[id*="option"].pane-open,
        body.alc-scroll-unlocked .sub-pane.pane-open {
            z-index: 99995 !important;
        }

        /* --- Expandable Textarea Edit Pane Styles --- */
        body.alc-expandable-textareas [data-options-row] textarea,
        body.alc-expandable-textareas [data-options-row] textarea[name$="-title"],
        body.alc-expandable-textareas .options-grid textarea,
        body.alc-expandable-textareas .pane textarea,
        body.alc-expandable-textareas div[id*="-edit-pane"] textarea {
            resize: vertical !important;
            field-sizing: content !important;
            min-height: 38px !important;
            max-height: 300px !important;
            height: auto !important;
            overflow-y: auto !important;
            line-height: 1.4 !important;
            box-sizing: border-box !important;
            border-radius: 6px !important;
            padding: 8px 10px !important;
            font-size: 13px !important;
            transition: border-color 0.2s ease, box-shadow 0.2s ease !important;
        }

        body.alc-expandable-textareas [data-options-row] textarea:focus,
        body.alc-expandable-textareas .options-grid textarea:focus,
        body.alc-expandable-textareas .pane textarea:focus {
            min-height: 64px !important;
            border-color: #10B981 !important;
            box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2) !important;
        }

        /* --- Left Nav Eye-Catching SaaS Badge Styles --- */
        li.alc-nav-item {
            position: relative !important;
            list-style: none !important;
            width: 100% !important;
            box-sizing: border-box !important;
            margin-top: 8px !important;
        }

        .alc-nav-trigger {
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            padding: 8px 2px !important;
            text-decoration: none !important;
            cursor: pointer !important;
            transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
            border-radius: 10px !important;
            margin: 4px auto !important;
            width: 48px !important;
            position: relative !important;
        }

        .alc-nav-icon-badge {
            width: 32px !important;
            height: 32px !important;
            border-radius: 9px !important;
            background: linear-gradient(135deg, #10B981 0%, #0284C7 100%) !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            color: #FFFFFF !important;
            box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4) !important;
            transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }

        .alc-nav-trigger:hover .alc-nav-icon-badge,
        li.alc-nav-item.open .alc-nav-icon-badge {
            transform: translateY(-2px) scale(1.08) !important;
            box-shadow: 0 6px 18px rgba(16, 185, 129, 0.6) !important;
            background: linear-gradient(135deg, #34D399 0%, #38BDF8 100%) !important;
        }

        .alc-nav-label {
            font-size: 9px !important;
            font-weight: 800 !important;
            margin-top: 5px !important;
            text-align: center !important;
            letter-spacing: 0.8px !important;
            text-transform: uppercase !important;
            color: #34D399 !important;
            text-shadow: 0 1px 4px rgba(0, 0, 0, 0.4) !important;
            transition: color 0.2s ease !important;
        }

        .alc-nav-trigger:hover .alc-nav-label,
        li.alc-nav-item.open .alc-nav-label {
            color: #FFFFFF !important;
        }

        /* Pulsing Live Beacon Indicator */
        .alc-nav-trigger::before {
            content: '' !important;
            position: absolute !important;
            top: 6px !important;
            right: 6px !important;
            width: 7px !important;
            height: 7px !important;
            border-radius: 50% !important;
            background-color: #34D399 !important;
            box-shadow: 0 0 8px #34D399 !important;
            animation: alc-pulse-beacon 2s infinite !important;
            z-index: 5 !important;
        }

        @keyframes alc-pulse-beacon {
            0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(52, 211, 153, 0.8); }
            70% { transform: scale(1.1); box-shadow: 0 0 0 6px rgba(52, 211, 153, 0); }
            100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(52, 211, 153, 0); }
        }

        /* Popover Executive Flyout Card Attached to Sidebar */
        #alc-speeddial-menu {
            position: fixed !important;
            z-index: 2147483647 !important;
            display: flex;
            flex-direction: column;
            gap: 6px;
            background: #0F172A;
            border: 1px solid #334155;
            padding: 14px;
            border-radius: 14px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);
            opacity: 0;
            visibility: hidden;
            transform: translateX(-12px) scale(0.96);
            transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
            pointer-events: none;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            width: 250px;
            box-sizing: border-box;
        }

        li.alc-nav-item.open #alc-speeddial-menu {
            opacity: 1;
            visibility: visible;
            transform: translateX(0) scale(1);
            pointer-events: auto;
        }

        .alc-popover-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding-bottom: 8px;
            margin-bottom: 4px;
            border-bottom: 1px solid #1E293B;
        }

        .alc-popover-title {
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 0.8px;
            text-transform: uppercase;
            color: #94A3B8;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .alc-popover-badge {
            background: rgba(16, 185, 129, 0.15);
            color: #10B981;
            font-size: 9px;
            font-weight: 700;
            padding: 2px 6px;
            border-radius: 4px;
            border: 1px solid rgba(16, 185, 129, 0.3);
        }

        /* Setting Item Buttons inside Flyout */
        .alc-dial-item {
            background: #1E293B;
            color: #E2E8F0;
            border: 1px solid #334155;
            padding: 9px 12px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 12px;
            cursor: pointer;
            text-decoration: none;
            display: flex;
            align-items: center;
            justify-content: space-between;
            transition: all 0.15s ease;
            width: 100%;
            box-sizing: border-box;
            outline: none;
        }

        .alc-dial-item:hover {
            background: #334155;
            border-color: #475569;
            color: #FFFFFF;
            transform: translateY(-1px);
        }

        .alc-dial-item-left {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .alc-dial-item-icon {
            display: flex;
            align-items: center;
            color: #94A3B8;
            transition: color 0.15s ease;
        }

        .alc-dial-item:hover .alc-dial-item-icon {
            color: #10B981;
        }

        .alc-status-pill {
            font-size: 10px;
            font-weight: 700;
            padding: 2px 6px;
            border-radius: 4px;
            text-transform: uppercase;
            letter-spacing: 0.4px;
            background: #0F172A;
            color: #64748B;
            border: 1px solid #334155;
        }

        .alc-dial-item.active .alc-status-pill {
            background: rgba(16, 185, 129, 0.2);
            color: #34D399;
            border-color: rgba(52, 211, 153, 0.4);
        }

        /* --- Page Minimap Glass Rail --- */
        #alc-page-minimap {
            position: fixed;
            right: 0;
            top: 50%;
            transform: translateY(-50%);
            max-height: 82vh;
            overflow-y: auto;
            z-index: 999990;
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 5px;
            padding: 12px 10px 12px 320px;
            pointer-events: none;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            transition: opacity 0.25s ease, visibility 0.25s ease;
            scrollbar-width: thin;
            scrollbar-color: rgba(16, 185, 129, 0.5) transparent;
        }

        #alc-page-minimap::-webkit-scrollbar {
            width: 3px;
        }

        #alc-page-minimap::-webkit-scrollbar-thumb {
            background: rgba(16, 185, 129, 0.5);
            border-radius: 3px;
        }

        #alc-page-minimap.hidden {
            opacity: 0;
            visibility: hidden;
            pointer-events: none;
        }

        .alc-minimap-line {
            width: 20px;
            height: 6px;
            background-color: #10B981;
            border-radius: 3px;
            cursor: pointer;
            position: relative;
            transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
            opacity: 0.6;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
            flex-shrink: 0;
            pointer-events: auto;
        }

        .alc-minimap-line:hover {
            width: 30px;
            height: 9px;
            opacity: 1;
            background-color: #059669;
            box-shadow: 0 0 10px rgba(16, 185, 129, 0.5);
        }

        /* Active Page Highlighted State */
        .alc-minimap-line.active {
            width: 30px;
            height: 9px;
            background-color: #0EA5E9 !important;
            opacity: 1 !important;
            box-shadow: 0 0 12px rgba(14, 165, 233, 0.8) !important;
        }

        .alc-minimap-line::after {
            content: attr(data-title);
            position: absolute;
            right: 36px;
            top: 50%;
            transform: translateY(-50%);
            background: #0F172A;
            color: #F8FAFC;
            padding: 6px 12px;
            border-radius: 8px;
            font-size: 11px;
            font-weight: 600;
            white-space: nowrap;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.15s ease, transform 0.15s ease;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.4);
            border: 1px solid #334155;
            z-index: 10;
        }

        .alc-minimap-line:hover::after {
            opacity: 1;
        }

        /* --- Question Action Strip Styling --- */
        .alc-action-controls {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-top: 10px;
            padding-top: 8px;
            border-top: 1px dashed #CBD5E1;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            user-select: none;
        }

        .alc-switch-container {
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .alc-switch-label {
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #64748B;
        }

        .alc-switch {
            position: relative;
            display: inline-block;
            width: 32px;
            height: 18px;
            flex-shrink: 0;
        }

        .alc-switch input {
            opacity: 0;
            width: 0;
            height: 0;
        }

        .alc-slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: #CBD5E1;
            transition: .2s ease;
            border-radius: 18px;
        }

        .alc-slider:before {
            position: absolute;
            content: "";
            height: 14px;
            width: 14px;
            left: 2px;
            bottom: 2px;
            background-color: white;
            transition: .2s ease;
            border-radius: 50%;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        }

        input:checked + .alc-slider {
            background-color: #10B981;
        }

        input:not(:checked) + .alc-slider {
            background-color: #EF4444;
        }

        input:checked + .alc-slider:before {
            transform: translateX(14px);
        }

        .alc-switch.is-busy .alc-slider {
            opacity: 0.5;
            cursor: wait;
        }

        .alc-req-select {
            flex: 1;
            padding: 4px 8px;
            font-size: 11px;
            font-weight: 600;
            color: #1E293B;
            background-color: #FFFFFF;
            border: 1px solid #CBD5E1;
            border-radius: 6px;
            outline: none;
            cursor: pointer;
            transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .alc-req-select:hover {
            border-color: #10B981;
        }

        .alc-req-select:focus {
            border-color: #10B981;
            box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
        }

        .alc-req-select:disabled {
            opacity: 0.5;
            cursor: wait;
        }
    `);

    function waitForElement(selector, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const start = Date.now();
            const timer = setInterval(() => {
                const el = document.querySelector(selector);
                if (el) {
                    clearInterval(timer);
                    resolve(el);
                } else if (Date.now() - start > timeout) {
                    clearInterval(timer);
                    reject(new Error('Timeout waiting for ' + selector));
                }
            }, 100);
        });
    }

    // 2. Scroll Lock Remover Logic
    function applyScrollState() {
        if (isScrollUnlocked) {
            document.body.classList.add('alc-scroll-unlocked');
            if (document.body.classList.contains('pane-open') || document.body.classList.contains('modal-open')) {
                document.body.style.setProperty('overflow', 'auto', 'important');
                document.body.style.setProperty('overflow-y', 'auto', 'important');
                document.body.style.setProperty('position', 'static', 'important');

                const html = document.documentElement;
                if (html) {
                    html.style.setProperty('overflow', 'auto', 'important');
                    html.style.setProperty('overflow-y', 'auto', 'important');
                }
            }
        } else {
            document.body.classList.remove('alc-scroll-unlocked');
            document.body.style.removeProperty('overflow');
            document.body.style.removeProperty('overflow-y');
            document.body.style.removeProperty('position');

            const html = document.documentElement;
            if (html) {
                html.style.removeProperty('overflow');
                html.style.removeProperty('overflow-y');
            }
        }
    }

    // 3. Expandable Textarea Logic
    function applyExpandableTextareaState() {
        if (isExpandableTextareaEnabled) {
            document.body.classList.add('alc-expandable-textareas');
        } else {
            document.body.classList.remove('alc-expandable-textareas');
        }
    }

    function autoResizeTextarea(ta) {
        if (!isExpandableTextareaEnabled) return;
        ta.style.height = 'auto';
        ta.style.height = Math.min(Math.max(ta.scrollHeight, 38), 300) + 'px';
    }

    function initExpandableTextareas() {
        applyExpandableTextareaState();
        if (!isExpandableTextareaEnabled) return;

        const textareas = document.querySelectorAll('.pane textarea, div[id*="-edit-pane"] textarea, [data-options-row] textarea');
        textareas.forEach(ta => {
            if (!ta.dataset.alcAutoresize) {
                ta.dataset.alcAutoresize = 'true';
                ta.addEventListener('input', () => autoResizeTextarea(ta));
                ta.addEventListener('focus', () => autoResizeTextarea(ta));
                autoResizeTextarea(ta);
            }
        });
    }

    // URL Helper Methods for Toggle
    function isSinglePageActive() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('c') === '0' && urlParams.get('p') === '0';
    }

    function toggleSinglePageMode() {
        const url = new URL(window.location.href);
        if (isSinglePageActive()) {
            url.searchParams.delete('c');
            url.searchParams.delete('p');
        } else {
            url.searchParams.set('c', '0');
            url.searchParams.set('p', '0');
        }
        window.location.href = url.toString();
    }

    // 4. Left Nav Sidebar Integration
    function initSidebarWidget() {
        if (document.getElementById('alc-suite-nav-item')) return;

        const navList = document.querySelector('.primary-nav_list') ||
                        document.querySelector('.primary_nav_list') ||
                        document.querySelector('.primary-nav_scroll-wrapper ul') ||
                        document.querySelector('#primary-nav ul') ||
                        document.querySelector('nav[role="navigation"] ul');

        if (!navList) return;

        const navItem = document.createElement('li');
        navItem.id = 'alc-suite-nav-item';
        navItem.className = 'alc-nav-item';

        const trigger = document.createElement('a');
        trigger.className = 'alc-nav-trigger';
        trigger.href = 'javascript:void(0);';
        trigger.title = 'Speed Dial Suite Pro';
        trigger.innerHTML = `
            <div class="alc-nav-icon-badge">
                ${SVG_ICONS.bolt}
            </div>
            <span class="alc-nav-label">SUITE</span>
        `;

        // --- Executive Speed Dial Popover Menu ---
        const menu = document.createElement('div');
        menu.id = 'alc-speeddial-menu';

        // Popover Header
        const header = document.createElement('div');
        header.className = 'alc-popover-header';
        header.innerHTML = `
            <span class="alc-popover-title">${SVG_ICONS.bolt} BUILDER SUITE</span>
            <span class="alc-popover-badge">v9.1 PRO</span>
        `;
        menu.appendChild(header);

        // Item 1: Single Page Mode Toggle
        const singlePageBtn = document.createElement('button');
        singlePageBtn.type = 'button';
        singlePageBtn.className = 'alc-dial-item';
        updateSinglePageBtnState(singlePageBtn);

        singlePageBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleSinglePageMode();
        });
        menu.appendChild(singlePageBtn);

        // Item 2: Minimap Toggle
        const toggleMinimapBtn = document.createElement('button');
        toggleMinimapBtn.type = 'button';
        toggleMinimapBtn.className = 'alc-dial-item';
        updateMinimapBtnState(toggleMinimapBtn);

        toggleMinimapBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            isMinimapVisible = !isMinimapVisible;
            localStorage.setItem('alc_minimap_visible', isMinimapVisible);
            updateMinimapBtnState(toggleMinimapBtn);

            const minimap = document.getElementById('alc-page-minimap');
            if (minimap) {
                minimap.classList.toggle('hidden', !isMinimapVisible);
            }
        });
        menu.appendChild(toggleMinimapBtn);

        // Item 3: Quick Controls Toggle
        const toggleDisableFeatureBtn = document.createElement('button');
        toggleDisableFeatureBtn.type = 'button';
        toggleDisableFeatureBtn.className = 'alc-dial-item';
        updateDisableBtnState(toggleDisableFeatureBtn);

        toggleDisableFeatureBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            isQuickDisableEnabled = !isQuickDisableEnabled;
            localStorage.setItem('alc_quick_disable_enabled', isQuickDisableEnabled);
            updateDisableBtnState(toggleDisableFeatureBtn);
            injectActionLinks();
        });
        menu.appendChild(toggleDisableFeatureBtn);

        // Item 4: Canvas Scroll Unlock
        const toggleScrollBtn = document.createElement('button');
        toggleScrollBtn.type = 'button';
        toggleScrollBtn.className = 'alc-dial-item';
        updateScrollBtnState(toggleScrollBtn);

        toggleScrollBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            isScrollUnlocked = !isScrollUnlocked;
            localStorage.setItem('alc_scroll_unlocked', isScrollUnlocked);
            updateScrollBtnState(toggleScrollBtn);
            applyScrollState();
        });
        menu.appendChild(toggleScrollBtn);

        // Item 5: Expandable Textareas Toggle
        const toggleTextareaBtn = document.createElement('button');
        toggleTextareaBtn.type = 'button';
        toggleTextareaBtn.className = 'alc-dial-item';
        updateTextareaBtnState(toggleTextareaBtn);

        toggleTextareaBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            isExpandableTextareaEnabled = !isExpandableTextareaEnabled;
            localStorage.setItem('alc_expandable_textarea_enabled', isExpandableTextareaEnabled);
            updateTextareaBtnState(toggleTextareaBtn);
            applyExpandableTextareaState();
            initExpandableTextareas();
        });
        menu.appendChild(toggleTextareaBtn);

        navItem.appendChild(trigger);
        navItem.appendChild(menu);
        navList.appendChild(navItem);

        // Trigger Click Handler & Dynamic Position Clamping
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            isMenuExpanded = !isMenuExpanded;
            navItem.classList.toggle('open', isMenuExpanded);

            if (isMenuExpanded) {
                const rect = trigger.getBoundingClientRect();
                const menuHeight = menu.offsetHeight || 250;
                let topPos = rect.top;

                if (topPos + menuHeight > window.innerHeight - 15) {
                    topPos = Math.max(15, window.innerHeight - menuHeight - 15);
                }

                menu.style.top = `${topPos}px`;
                menu.style.left = `${rect.right + 12}px`;
            }
        });

        // Auto Close Menu when clicking outside
        document.addEventListener('click', (e) => {
            if (isMenuExpanded && !navItem.contains(e.target)) {
                isMenuExpanded = false;
                navItem.classList.remove('open');
            }
        });
    }

    function updateSinglePageBtnState(btn) {
        const active = isSinglePageActive();
        btn.classList.toggle('active', active);
        btn.innerHTML = `
            <div class="alc-dial-item-left">
                <span class="alc-dial-item-icon">${SVG_ICONS.survey}</span>
                <span>Entire Survey Mode</span>
            </div>
            <span class="alc-status-pill">${active ? 'ON' : 'OFF'}</span>
        `;
    }

    function updateMinimapBtnState(btn) {
        btn.classList.toggle('active', isMinimapVisible);
        btn.innerHTML = `
            <div class="alc-dial-item-left">
                <span class="alc-dial-item-icon">${SVG_ICONS.minimap}</span>
                <span>Page Minimap</span>
            </div>
            <span class="alc-status-pill">${isMinimapVisible ? 'ON' : 'OFF'}</span>
        `;
    }

    function updateDisableBtnState(btn) {
        btn.classList.toggle('active', isQuickDisableEnabled);
        btn.innerHTML = `
            <div class="alc-dial-item-left">
                <span class="alc-dial-item-icon">${SVG_ICONS.controls}</span>
                <span>Quick Controls</span>
            </div>
            <span class="alc-status-pill">${isQuickDisableEnabled ? 'ON' : 'OFF'}</span>
        `;
    }

    function updateScrollBtnState(btn) {
        btn.classList.toggle('active', isScrollUnlocked);
        btn.innerHTML = `
            <div class="alc-dial-item-left">
                <span class="alc-dial-item-icon">${SVG_ICONS.unlock}</span>
                <span>Edit Canvas Scroll</span>
            </div>
            <span class="alc-status-pill">${isScrollUnlocked ? 'ON' : 'OFF'}</span>
        `;
    }

    function updateTextareaBtnState(btn) {
        btn.classList.toggle('active', isExpandableTextareaEnabled);
        btn.innerHTML = `
            <div class="alc-dial-item-left">
                <span class="alc-dial-item-icon">${SVG_ICONS.expand}</span>
                <span>Expand Textareas</span>
            </div>
            <span class="alc-status-pill">${isExpandableTextareaEnabled ? 'ON' : 'OFF'}</span>
        `;
    }

    // 5. Page Minimap Real-Time Scrolling & Active Page Highlight
    function highlightActivePage(sections) {
        const minimap = document.getElementById('alc-page-minimap');
        if (!minimap || !isMinimapVisible) return;

        const pageSections = sections || document.querySelectorAll('.survey-canvas section.page, section[data-pid], section[id^="section-"]');
        const lines = minimap.querySelectorAll('.alc-minimap-line');
        if (pageSections.length === 0 || lines.length === 0) return;

        let activeIdx = 0;
        let minDistance = Infinity;

        pageSections.forEach((sectionEl, idx) => {
            const rect = sectionEl.getBoundingClientRect();
            const diff = Math.abs(rect.top - 120);
            if (rect.top <= window.innerHeight * 0.65 && rect.bottom >= 100) {
                if (diff < minDistance) {
                    minDistance = diff;
                    activeIdx = idx;
                }
            }
        });

        lines.forEach((line, idx) => {
            if (idx === activeIdx) {
                if (!line.classList.contains('active')) {
                    line.classList.add('active');
                    line.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            } else {
                line.classList.remove('active');
            }
        });
    }

    function initPageMinimap() {
        let minimap = document.getElementById('alc-page-minimap');
        if (!minimap) {
            minimap = document.createElement('div');
            minimap.id = 'alc-page-minimap';
            document.body.appendChild(minimap);

            window.addEventListener('scroll', () => highlightActivePage(), { passive: true });
        }

        minimap.classList.toggle('hidden', !isMinimapVisible);
        if (!isMinimapVisible) return;

        const pageSections = document.querySelectorAll('.survey-canvas section.page, section[data-pid], section[id^="section-"]');

        if (pageSections.length === 0) {
            minimap.innerHTML = '';
            lastMinimapSignature = '';
            return;
        }

        const currentData = Array.from(pageSections).map((sectionEl, idx) => {
            const headingEl = sectionEl.querySelector('header h3.heading3, header h3, .heading3');
            let rawTitle = headingEl ? headingEl.innerText : sectionEl.innerText;
            rawTitle = rawTitle.replace(/\s+/g, ' ').trim();
            const displayTitle = rawTitle.length > 35 ? rawTitle.substring(0, 35) + '...' : rawTitle || `Page ${idx + 1}`;
            return { displayTitle: `P.${idx + 1} — ${displayTitle}`, sectionEl };
        });

        const currentSignature = currentData.map(d => d.displayTitle).join('||');

        if (currentSignature !== lastMinimapSignature || minimap.children.length !== currentData.length) {
            lastMinimapSignature = currentSignature;
            minimap.innerHTML = '';

            currentData.forEach(({ displayTitle, sectionEl }) => {
                const line = document.createElement('div');
                line.className = 'alc-minimap-line';
                line.setAttribute('data-title', displayTitle);

                line.addEventListener('click', () => {
                    sectionEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                });

                minimap.appendChild(line);
            });
        }

        highlightActivePage(pageSections);
    }

    // 6. Requirement Detection Helper
    function detectRequirementState(articleEl) {
        if (!articleEl) return 'not_required';
        const metaItems = articleEl.querySelectorAll('.q-meta-data ul li, .js-meta-data ul li');

        for (const item of metaItems) {
            const text = item.innerText.trim();
            if (text === 'Soft Required') {
                return 'soft_required';
            } else if (text === 'Required') {
                return 'required';
            }
        }
        return 'not_required';
    }

    // 7. Injection of Switch Toggle & Requirement Controls
    function injectActionLinks() {
        const containers = document.querySelectorAll('.question-action-links');

        containers.forEach(container => {
            const existingControls = container.querySelector('.alc-action-controls');

            if (!isQuickDisableEnabled) {
                if (existingControls) existingControls.remove();
                return;
            }

            const editBtn = container.querySelector('a.edit-link');
            if (!editBtn) return;

            const questionCard = container.closest('article.action-element, article[id^="element-"]');
            const isCurrentlyDisabled = questionCard ? questionCard.classList.contains('disabled-element') : false;
            const currentReqState = detectRequirementState(questionCard);

            if (existingControls) {
                const existingCheckbox = existingControls.querySelector('input[type="checkbox"]');
                const existingLabel = existingControls.querySelector('.alc-switch-label');
                const existingSelect = existingControls.querySelector('.alc-req-select');

                if (existingCheckbox && !existingControls.dataset.busy) {
                    existingCheckbox.checked = !isCurrentlyDisabled;
                    if (existingLabel) existingLabel.textContent = isCurrentlyDisabled ? 'Off' : 'On';
                }
                if (existingSelect && !existingControls.dataset.busy) {
                    existingSelect.value = currentReqState;
                }
                return;
            }

            const controlsWrap = document.createElement('div');
            controlsWrap.className = 'alc-action-controls';

            // Switch Toggle
            const switchWrap = document.createElement('div');
            switchWrap.className = 'alc-switch-container';

            const labelText = document.createElement('span');
            labelText.className = 'alc-switch-label';
            labelText.textContent = isCurrentlyDisabled ? 'Off' : 'On';

            const switchLabel = document.createElement('label');
            switchLabel.className = 'alc-switch';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = !isCurrentlyDisabled;

            const slider = document.createElement('span');
            slider.className = 'alc-slider';

            switchLabel.appendChild(checkbox);
            switchLabel.appendChild(slider);

            switchWrap.appendChild(labelText);
            switchWrap.appendChild(switchLabel);

            // Requirement Select Dropdown
            const selectReq = document.createElement('select');
            selectReq.className = 'alc-req-select';

            const optNotReq = document.createElement('option');
            optNotReq.value = 'not_required';
            optNotReq.textContent = 'Not required';

            const optReq = document.createElement('option');
            optReq.value = 'required';
            optReq.textContent = 'Required';

            const optSoftReq = document.createElement('option');
            optSoftReq.value = 'soft_required';
            optSoftReq.textContent = 'Soft Required';

            selectReq.appendChild(optNotReq);
            selectReq.appendChild(optReq);
            selectReq.appendChild(optSoftReq);

            selectReq.value = currentReqState;

            controlsWrap.appendChild(switchWrap);
            controlsWrap.appendChild(selectReq);

            // Handler: Toggle Switch
            checkbox.addEventListener('change', async () => {
                const shouldEnable = checkbox.checked;
                switchLabel.classList.add('is-busy');
                controlsWrap.dataset.busy = 'true';
                checkbox.disabled = true;
                selectReq.disabled = true;

                try {
                    editBtn.click();

                    const logicTab = await waitForElement('a[data-toggle="tab"][href="#question-logic"]');
                    logicTab.click();

                    const targetSelector = shouldEnable ? '#disabledno' : '#disabledyes';
                    const targetRadio = await waitForElement(targetSelector);
                    targetRadio.click();

                    const saveBtn = await waitForElement('#js-question-edit-action-submit, button.js-save-quest[type="submit"]');
                    saveBtn.click();

                    labelText.textContent = shouldEnable ? 'On' : 'Off';

                    if (questionCard) {
                        questionCard.classList.toggle('disabled-element', !shouldEnable);
                    }
                } catch (err) {
                    console.error('[Alchemer Builder Suite] Error toggling status:', err);
                    checkbox.checked = !shouldEnable;
                    labelText.textContent = checkbox.checked ? 'On' : 'Off';
                } finally {
                    switchLabel.classList.remove('is-busy');
                    delete controlsWrap.dataset.busy;
                    checkbox.disabled = false;
                    selectReq.disabled = false;
                }
            });

            // Handler: Requirement Dropdown Change
            selectReq.addEventListener('change', async () => {
                const selectedValue = selectReq.value;
                controlsWrap.dataset.busy = 'true';
                checkbox.disabled = true;
                selectReq.disabled = true;

                try {
                    editBtn.click();

                    const validationTab = await waitForElement('a[data-toggle="tab"][href="#question-validation"]');
                    validationTab.click();

                    let radioId = '#required-none';
                    if (selectedValue === 'required') {
                        radioId = '#required-hard';
                    } else if (selectedValue === 'soft_required') {
                        radioId = '#required-soft';
                    }

                    const targetRadio = await waitForElement(radioId);
                    targetRadio.click();
                    targetRadio.dispatchEvent(new Event('change', { bubbles: true }));

                    const saveBtn = await waitForElement('button.js-save-quest[type="submit"], #js-question-edit-action-submit');
                    saveBtn.click();

                } catch (err) {
                    console.error('[Alchemer Builder Suite] Error updating requirement setting:', err);
                    selectReq.value = detectRequirementState(questionCard);
                } finally {
                    delete controlsWrap.dataset.busy;
                    checkbox.disabled = false;
                    selectReq.disabled = false;
                }
            });

            container.appendChild(controlsWrap);
        });
    }

    // Main Execution Loop
    function runSuite() {
        applyScrollState();
        initSidebarWidget();
        initExpandableTextareas();
        initPageMinimap();
        injectActionLinks();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(runSuite, 800));
    } else {
        setTimeout(runSuite, 800);
    }

    setInterval(runSuite, 1000);
})();