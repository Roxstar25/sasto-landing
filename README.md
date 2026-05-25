# Pipelined 🚀

A lightning-fast, zero-dependency job application tracker built with vanilla web technologies. 

[👉 **View Live Demo**](https://YOUR_USERNAME.github.io/pipelined)

## 📌 Overview
Pipelined is a client-side Kanban board designed to help job seekers track their application pipeline. It deliberately avoids heavy frameworks and build tools to showcase a deep understanding of core web APIs.

## ✨ Features
- **Drag and Drop:** Native HTML5 Drag and Drop API for moving jobs between columns.
- **Persistent Storage:** Synchronous `localStorage` integration ensures data is saved instantly.
- **Days-in-Stage Tracking:** Automatically calculates how long a job has been in its current column.
- **Urgency Indicators:** Color-coded dots (Green, Amber, Red) based on time spent in a stage.
- **Dark Mode:** Automatic system-level dark mode using CSS `prefers-color-scheme`.
- **Zero Dependencies:** No React, no NPM, no external CSS libraries, no icon fonts (inline SVGs only).

## 🛠️ Tech Stack
- **HTML5:** Semantic markup, native `<dialog>` element for modals.
- **CSS3:** Custom properties (variables), Flexbox, responsive design.
- **JavaScript (ES6+):** Strict mode, DOM manipulation, Web Storage API.

## 🧠 Architectural Decisions
1. **Why localStorage over IndexedDB?** For a text-based application tracking a few hundred listings, the data footprint is trivially small. `localStorage` provides a synchronous, blocking read/write that vastly simplifies the data layer without impacting UI performance.
2. **Why native Drag-and-Drop?** External libraries (like Sortable.js) add bundle weight and abstract away browser mechanics. The native API handles the exact requirements (moving an item between distinct zones) with perfect browser compatibility and zero bloat.
3. **Security:** To prevent XSS, no user-supplied text is rendered via `innerHTML`. The DOM is constructed safely using `document.createElement` and `textContent`.
