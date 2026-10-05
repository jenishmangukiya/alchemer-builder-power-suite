<div align="center">

<img src="https://www.alchemer.com/wp-content/uploads/2026/03/Alchemer_wspace.png" alt="Alchemer" width="260">

### Alchemer Builder Power Suite

**Power tools that make building surveys in the [Alchemer](https://www.alchemer.com/) Builder faster and less frustrating.**

A Tampermonkey userscript that adds a collapsible floating speed dial, one-page survey mode, a smooth page minimap, quick enable/disable toggles, requirement controls, and canvas scroll unlocking — all directly inside the Alchemer survey builder.

[![Version](https://img.shields.io/badge/version-8.3.0-blue?style=flat-square)](https://github.com/jenishmangukiya/alchemer-builder-power-suite)
[![Platform](https://img.shields.io/badge/platform-Alchemer%20Builder-6f4bd8?style=flat-square)](https://www.alchemer.com/)
[![Powered by](https://img.shields.io/badge/powered%20by-Tampermonkey-00a94f?style=flat-square)](https://www.tampermonkey.net/)
[![Author](https://img.shields.io/badge/author-Jenish%20Mangukiya-orange?style=flat-square)](#-credits)

</div>

---

## 🧭 What is this?

[Alchemer](https://www.alchemer.com/) is a powerful, enterprise-grade online survey and data-collection platform (formerly **SurveyGizmo**). Its **Builder** is where you create and edit surveys — but the default editor can be fiddly: you bounce between pages, lose your place in long surveys, and fight with locked scroll while editing.

**Alchemer Builder Power Suite** is a lightweight userscript that layers a set of productivity tools on top of the Builder. It does **not** change your survey data — it only improves the editing experience in your browser.

> ⚠️ This is a third-party community tool. It is **not affiliated with, endorsed by, or sponsored by Alchemer**.

---

## 🚀 Installation

1. Install the [Tampermonkey extension](https://www.tampermonkey.net/) for your browser.
2. **[Click here to install Alchemer Builder Power Suite](https://raw.githubusercontent.com/jenishmangukiya/alchemer-builder-power-suite/main/alchemer-builder-power-suite.user.js)**
3. Click **Install** when the Tampermonkey prompt opens.
4. Open any Alchemer survey in the **Builder** — the ⚡ speed dial appears automatically.

> **Note:** Updates are automatic! Tampermonkey periodically checks this repository and installs new versions when available.

---

## ✨ Features

| Feature | What it does |
| --- | --- |
| **⚡ Floating Speed Dial** | A draggable toolbar that can be repositioned anywhere on screen and collapses to a single button. Its position is remembered. |
| **📄 Entire Survey Mode** | One click toggles `?c=0&p=0` and renders the whole survey on a single page — click again to return to normal paged mode. |
| **📍 Smooth Page Minimap** | Thicker indicators on the right margin let you jump across survey pages quickly, with no hover flicker. |
| **⚡ Quick Enable/Disable** | Turn individual questions on or off right from the question action menu, without opening full settings. |
| **📋 Requirement Controls** | Instantly switch a question between **Not Required**, **Required**, and **Soft Required** from the action links. |
| **🔓 Canvas Scroll Unlock** | Fixes locked background scrolling while edit panes or modals are open, so you can keep working. |

---

## 🕹️ How to use

1. Click the **⚡** button in the bottom-left corner to expand the speed dial menu.
2. Use the buttons to toggle features on or off — your choices are saved automatically.
3. Drag the **⋮⋮** handle to move the widget wherever you like.
4. Click anywhere outside the menu to collapse it.

### Speed dial options

- **📄 Entire Survey (?c=0&p=0)** — switch between full-page and paged survey views.
- **📍 Minimap: ON / OFF** — show or hide the right-margin page minimap.
- **⚡ Quick Controls: ON / OFF** — enable or disable the inline question controls.
- **🔓 Edit Scroll: ON / OFF** — unlock or lock background scrolling while editing.

---

## 🧩 Compatibility

- **Browsers:** Chrome, Edge, Firefox, Brave, and any Chromium/Firefox-based browser supported by Tampermonkey.
- **Sites:** Matches the Alchemer Builder on:
  - `https://*.alchemer.com/builder/build*`
  - `https://*.alchemer-ca.com/builder/build*` (Canada)
  - `https://*.surveygizmo.com/builder/build*` (legacy domain)
- **Requirements:** A userscript manager such as [Tampermonkey](https://www.tampermonkey.net/) (or Violentmonkey/Greasemonkey).

---

## 💾 Saved settings

The script remembers your preferences in your browser's `localStorage`:

| Key | Purpose | Default |
| --- | --- | --- |
| `alc_minimap_visible` | Show the page minimap | `false` |
| `alc_quick_disable_enabled` | Enable inline question controls | `true` |
| `alc_scroll_unlocked` | Unlock background canvas scrolling | `true` |
| `alc_widget_pos` | Remembered position of the speed dial | bottom-left |

---

## 🔒 Security & Privacy

This script is designed to be transparent and safe to run:

- **✅ 100% free** — no cost, no ads, no upsells, no "pro" tier.
- **✅ Open source** — every line is plain, readable JavaScript. You can review the entire script before installing.
- **✅ No data collection** — it runs entirely in your browser. It does **not** phone home, track you, or send any data to third-party servers.
- **✅ No external code** — nothing is downloaded or executed from remote servers at runtime, and there is no `eval` or obfuscated code.
- **✅ Scoped to Alchemer only** — it activates *only* on the Alchemer Builder URLs listed under [Compatibility](#-compatibility), and requests the single `GM_addStyle` permission.
- **✅ Your survey data stays intact** — it only enhances the editor UI; it never modifies, uploads, or stores your survey content.

> **Good practice:** Always review a userscript before installing it, and only install scripts from sources you trust. You can read this one in full right here: [alchemer-builder-power-suite.user.js](alchemer-builder-power-suite.user.js).

---

## ❓ FAQ

**Is it really free?**
Yes. The script is free and open source, with no ads, accounts, or paid features.

**Is it safe? Will it break my surveys?**
It only changes how the Builder looks and behaves in your browser — it does not edit survey data or publish anything. If you ever want to disable it, just turn the script off in Tampermonkey.

**Does it collect any of my data?**
No. There is no analytics, tracking, or network traffic. Your preferences are saved locally in your browser via `localStorage`.

**Will it work after Alchemer updates the Builder?**
The script targets stable Builder elements, but major platform UI changes could require an update. Tampermonkey auto-updates from this repository, so you'll get fixes automatically.

**Is this made by Alchemer?**
No. It's an independent, community-built tool and is not affiliated with or endorsed by Alchemer.

---

## 📁 Project files

```
alchemer-builder-power-suite/
├── alchemer-builder-power-suite.user.js   # The Tampermonkey userscript
└── README.md                              # This file
```

---

## 🧑‍💻 Credits

- **Author:** Jenish Mangukiya
- **Platform:** Built for the [Alchemer Survey Platform](https://www.alchemer.com/) (formerly SurveyGizmo)
- **Alchemer logo** is a trademark of Alchemer LLC, used here for identification purposes only.

---

<div align="center">

**Alchemer Builder Power Suite** · v8.3.0

Built to make survey building faster ⚡

</div>
