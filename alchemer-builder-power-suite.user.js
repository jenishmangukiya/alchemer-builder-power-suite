// ==UserScript==
// @name         Alchemer Builder Power Suite
// @namespace    http://tampermonkey.net/
// @version      8.3.0
// @description  Power tools for Alchemer Builder: collapsible floating speed dial, one-page survey mode, smooth minimap without hover flickers, quick enable/disable, requirement controls, and canvas scroll unlock.
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
    let isScrollUnlocked = localStorage.getItem('alc_scroll_unlocked') !== 'false'; // Enabled by default
    let isMenuExpanded = false;

    // Cache to prevent flickers on interval re-renders
    let lastMinimapSignature = '';

    // 1. Inject UI Styles
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
        }

        /* --- Speed Dial Container --- */
        #alc-speeddial-wrapper {
            position: fixed;
            z-index: 2147483647;
            display: flex;
            flex-direction: column;
            align-items: center;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            user-select: none;
            touch-action: none;
        }

        /* Speed Dial Menu Items Vertical Stack */
        #alc-speeddial-menu {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
            margin-bottom: 12px;
            opacity: 0;
            visibility: hidden;
            transform: translateY(15px) scale(0.95);
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            pointer-events: none;
        }

        #alc-speeddial-wrapper.open #alc-speeddial-menu {
            opacity: 1;
            visibility: visible;
            transform: translateY(0) scale(1);
            pointer-events: auto;
        }

        /* Pill Menu Items - Alchemer High Contrast Palette */
        .alc-dial-item {
            background: #FFFFFF;
            color: #0F172A;
            border: 1.5px solid #CBD5E1;
            padding: 9px 18px;
            border-radius: 25px;
            font-weight: 700;
            font-size: 13px;
            cursor: pointer;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            box-shadow: 0 4px 16px rgba(15, 23, 42, 0.12);
            white-space: nowrap;
            transition: all 0.2s ease;
        }

        .alc-dial-item:hover {
            background: #F8FAFC;
            border-color: #00A36C;
            color: #00A36C;
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(0, 163, 108, 0.2);
            text-decoration: none;
        }

        .alc-dial-item.active {
            background: #00A36C;
            color: #FFFFFF;
            border-color: #00A36C;
        }

        .alc-dial-item.active .alc-dial-icon {
            background: #FFFFFF;
            color: #00A36C;
        }

        .alc-dial-icon {
            width: 22px;
            height: 22px;
            border-radius: 50%;
            background: #F1F5F9;
            color: #334155;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: bold;
            transition: all 0.2s ease;
        }

        /* Control Bar Bottom Row (Handle + Main Trigger Button) */
        .alc-control-bar {
            display: flex;
            align-items: center;
            gap: 6px;
            background: #0F172A;
            backdrop-filter: blur(8px);
            padding: 4px 8px 4px 6px;
            border-radius: 35px;
            border: 1px solid #334155;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.35);
        }

        .alc-drag-handle {
            cursor: grab;
            padding: 6px 8px;
            color: #94A3B8;
            font-size: 16px;
            display: flex;
            align-items: center;
            line-height: 1;
            transition: color 0.2s ease;
        }

        .alc-drag-handle:hover {
            color: #FFFFFF;
        }

        .alc-drag-handle:active {
            cursor: grabbing;
        }

        /* Round Main FAB Trigger */
        .alc-fab-trigger {
            width: 46px;
            height: 46px;
            border-radius: 50%;
            background: #00A36C;
            color: #FFFFFF;
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            box-shadow: 0 4px 12px rgba(0, 163, 108, 0.4);
            transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.2s ease;
        }

        .alc-fab-trigger:hover {
            background: #00875A;
            transform: scale(1.05);
        }

        #alc-speeddial-wrapper.open .alc-fab-trigger {
            background: #DC2626;
            box-shadow: 0 4px 12px rgba(220, 38, 38, 0.4);
            transform: rotate(135deg);
        }

        /* --- Page Minimap (Thicker Bars with Zero-Flicker Hover) --- */
        #alc-page-minimap {
            position: fixed;
            right: 0;
            top: 50%;
            transform: translateY(-50%);
            z-index: 999990;
            display: flex;
            flex-direction: column;
            gap: 10px;
            padding: 12px 6px 12px 14px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            transition: opacity 0.2s ease, visibility 0.2s ease;
        }

        #alc-page-minimap.hidden {
            opacity: 0;
            visibility: hidden;
            pointer-events: none;
        }

        .alc-minimap-line {
            width: 24px;
            height: 8px;
            background-color: #00A36C;
            border-radius: 4px;
            cursor: pointer;
            position: relative;
            transition: all 0.2s ease;
            opacity: 0.85;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.15);
        }

        .alc-minimap-line:hover {
            width: 34px;
            height: 12px;
            opacity: 1;
            background-color: #00875A;
            box-shadow: 0 4px 8px rgba(0, 163, 108, 0.35);
        }

        .alc-minimap-line::after {
            content: attr(data-title);
            position: absolute;
            right: 42px;
            top: 50%;
            transform: translateY(-50%);
            background: #0F172A;
            color: #FFFFFF;
            padding: 5px 12px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 600;
            white-space: nowrap;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.15s ease-in-out;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
            border: 1px solid #334155;
        }

        .alc-minimap-line:hover::after {
            opacity: 1;
        }

        /* --- Question Action Link Controls --- */
        .alc-action-controls {
            display: flex;
            flex-direction: column;
            gap: 6px;
            margin-top: 8px;
            padding-top: 6px;
            border-top: 1px solid #E2E8F0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            user-select: none;
        }

        .alc-switch-container {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 4px;
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
            width: 34px;
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
            box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        }

        input:checked + .alc-slider {
            background-color: #00A36C;
        }

        input:not(:checked) + .alc-slider {
            background-color: #EF4444;
        }

        input:checked + .alc-slider:before {
            transform: translateX(16px);
        }

        .alc-switch.is-busy .alc-slider {
            opacity: 0.5;
            cursor: wait;
        }

        .alc-req-select {
            width: 100%;
            padding: 3px 6px;
            font-size: 11px;
            font-weight: 600;
            color: #1E293B;
            background-color: #FFFFFF;
            border: 1px solid #CBD5E1;
            border-radius: 4px;
            outline: none;
            cursor: pointer;
            transition: border-color 0.2s ease, opacity 0.2s ease;
        }

        .alc-req-select:hover {
            border-color: #00A36C;
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

    // 3. Floating Speed Dial Widget Initialization
    function initFloatingWidget() {
        if (document.getElementById('alc-speeddial-wrapper')) return;

        const wrapper = document.createElement('div');
        wrapper.id = 'alc-speeddial-wrapper';

        // --- Speed Dial Menu Items Vertical Stack ---
        const menu = document.createElement('div');
        menu.id = 'alc-speeddial-menu';

        // Item 1: Single Page Mode Toggle Button
        const singlePageBtn = document.createElement('button');
        singlePageBtn.type = 'button';
        singlePageBtn.className = 'alc-dial-item';

        if (isSinglePageActive()) {
            singlePageBtn.classList.add('active');
            singlePageBtn.innerHTML = `✓ Entire Survey Mode`;
        } else {
            singlePageBtn.innerHTML = `📄 Entire Survey (?c=0&p=0)`;
        }

        singlePageBtn.addEventListener('click', () => {
            toggleSinglePageMode();
        });
        menu.appendChild(singlePageBtn);

        // Item 2: Minimap Toggle
        const toggleMinimapBtn = document.createElement('button');
        toggleMinimapBtn.type = 'button';
        toggleMinimapBtn.className = 'alc-dial-item';
        updateMinimapBtnState(toggleMinimapBtn);

        toggleMinimapBtn.addEventListener('click', () => {
            isMinimapVisible = !isMinimapVisible;
            localStorage.setItem('alc_minimap_visible', isMinimapVisible);
            updateMinimapBtnState(toggleMinimapBtn);

            const minimap = document.getElementById('alc-page-minimap');
            if (minimap) {
                minimap.classList.toggle('hidden', !isMinimapVisible);
            }
        });
        menu.appendChild(toggleMinimapBtn);

        // Item 3: Enable/Disable Quick Controls
        const toggleDisableFeatureBtn = document.createElement('button');
        toggleDisableFeatureBtn.type = 'button';
        toggleDisableFeatureBtn.className = 'alc-dial-item';
        updateDisableBtnState(toggleDisableFeatureBtn);

        toggleDisableFeatureBtn.addEventListener('click', () => {
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

        toggleScrollBtn.addEventListener('click', () => {
            isScrollUnlocked = !isScrollUnlocked;
            localStorage.setItem('alc_scroll_unlocked', isScrollUnlocked);
            updateScrollBtnState(toggleScrollBtn);
            applyScrollState();
        });
        menu.appendChild(toggleScrollBtn);

        wrapper.appendChild(menu);

        // --- Bottom Control Bar (Handle + FAB Trigger) ---
        const controlBar = document.createElement('div');
        controlBar.className = 'alc-control-bar';

        const handle = document.createElement('div');
        handle.className = 'alc-drag-handle';
        handle.innerHTML = '⋮⋮';
        handle.title = 'Drag to reposition menu';
        controlBar.appendChild(handle);

        const fabTrigger = document.createElement('button');
        fabTrigger.className = 'alc-fab-trigger';
        fabTrigger.innerHTML = '⚡';
        fabTrigger.title = 'Click to open tools';

        fabTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            isMenuExpanded = !isMenuExpanded;
            wrapper.classList.toggle('open', isMenuExpanded);
        });
        controlBar.appendChild(fabTrigger);

        wrapper.appendChild(controlBar);
        document.body.appendChild(wrapper);

        // Auto Close Menu when clicking outside
        document.addEventListener('click', (e) => {
            if (isMenuExpanded && !wrapper.contains(e.target)) {
                isMenuExpanded = false;
                wrapper.classList.remove('open');
            }
        });

        // --- Boundary Validation & Viewport Clamping ---
        const savedPos = JSON.parse(localStorage.getItem('alc_widget_pos') || 'null');
        const widgetWidth = wrapper.offsetWidth || 120;
        const widgetHeight = wrapper.offsetHeight || 60;

        if (savedPos && typeof savedPos.left === 'number' && typeof savedPos.top === 'number') {
            const safeLeft = Math.max(10, Math.min(savedPos.left, window.innerWidth - widgetWidth - 10));
            const safeTop = Math.max(10, Math.min(savedPos.top, window.innerHeight - widgetHeight - 10));

            wrapper.style.left = safeLeft + 'px';
            wrapper.style.top = safeTop + 'px';
            wrapper.style.bottom = 'auto';
            wrapper.style.right = 'auto';
        } else {
            wrapper.style.left = '25px';
            wrapper.style.bottom = '25px';
            wrapper.style.top = 'auto';
            wrapper.style.right = 'auto';
        }

        // --- Dragging Event Handlers ---
        let isDragging = false;
        let startX, startY, initialLeft, initialTop;

        handle.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;

            const rect = wrapper.getBoundingClientRect();
            initialLeft = rect.left;
            initialTop = rect.top;

            wrapper.style.right = 'auto';
            wrapper.style.bottom = 'auto';

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });

        function onMouseMove(e) {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            let newLeft = Math.max(0, Math.min(initialLeft + dx, window.innerWidth - wrapper.offsetWidth));
            let newTop = Math.max(0, Math.min(initialTop + dy, window.innerHeight - wrapper.offsetHeight));

            wrapper.style.left = `${newLeft}px`;
            wrapper.style.top = `${newTop}px`;
        }

        function onMouseUp() {
            if (!isDragging) return;
            isDragging = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);

            const rect = wrapper.getBoundingClientRect();
            localStorage.setItem('alc_widget_pos', JSON.stringify({ left: rect.left, top: rect.top }));
        }

        // Resize Listener
        window.addEventListener('resize', () => {
            const rect = wrapper.getBoundingClientRect();
            const clampedLeft = Math.max(10, Math.min(rect.left, window.innerWidth - wrapper.offsetWidth - 10));
            const clampedTop = Math.max(10, Math.min(rect.top, window.innerHeight - wrapper.offsetHeight - 10));

            wrapper.style.left = clampedLeft + 'px';
            wrapper.style.top = clampedTop + 'px';
        });
    }

    function updateMinimapBtnState(btn) {
        if (isMinimapVisible) {
            btn.classList.add('active');
            btn.innerHTML = `📍 Minimap: ON`;
        } else {
            btn.classList.remove('active');
            btn.innerHTML = `📍 Minimap: OFF`;
        }
    }

    function updateDisableBtnState(btn) {
        if (isQuickDisableEnabled) {
            btn.classList.add('active');
            btn.innerHTML = `⚡ Quick Controls: ON`;
        } else {
            btn.classList.remove('active');
            btn.innerHTML = `⚡ Quick Controls: OFF`;
        }
    }

    function updateScrollBtnState(btn) {
        if (isScrollUnlocked) {
            btn.classList.add('active');
            btn.innerHTML = `🔓 Edit Scroll: ON`;
        } else {
            btn.classList.remove('active');
            btn.innerHTML = `🔒 Edit Scroll: OFF`;
        }
    }

    // 4. Page Minimap Initialization (Flicker Free)
    function initPageMinimap() {
        let minimap = document.getElementById('alc-page-minimap');
        if (!minimap) {
            minimap = document.createElement('div');
            minimap.id = 'alc-page-minimap';
            document.body.appendChild(minimap);
        }

        minimap.classList.toggle('hidden', !isMinimapVisible);

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
            return { displayTitle, sectionEl };
        });

        const currentSignature = currentData.map(d => d.displayTitle).join('||');

        if (currentSignature === lastMinimapSignature && minimap.children.length === currentData.length) {
            return;
        }

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

    // 5. Requirement Detection Helper
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

    // 6. Injection of Switch Toggle & Requirement Controls
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
                    if (existingLabel) existingLabel.textContent = isCurrentlyDisabled ? 'Disabled' : 'Enabled';
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
            labelText.textContent = isCurrentlyDisabled ? 'Disabled' : 'Enabled';

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

                    labelText.textContent = shouldEnable ? 'Enabled' : 'Disabled';

                    if (questionCard) {
                        questionCard.classList.toggle('disabled-element', !shouldEnable);
                    }
                } catch (err) {
                    console.error('[Alchemer Builder Power Suite] Error toggling status:', err);
                    checkbox.checked = !shouldEnable;
                    labelText.textContent = checkbox.checked ? 'Enabled' : 'Disabled';
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
                    console.error('[Alchemer Builder Power Suite] Error updating requirement setting:', err);
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
        initFloatingWidget();
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