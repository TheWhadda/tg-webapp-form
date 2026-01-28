/* ===== Palette (from your image) =====
Black:        #191919
White:        #FFFFFF
Main Purple 7:#7F42E1
Main Purple 6:#915DE6
Main Purple 4:#BA9AF1
Main Purple 1:#F5F0FF
Teal Light:   #CDECF1
Orange Light: #F9DED6
Amaranth:     #F6D1E9
====================================== */

:root {
  --bg: #191919;
  --white: #ffffff;

  --purple-7: #7f42e1;
  --purple-6: #915de6;
  --purple-4: #ba9af1;
  --purple-1: #f5f0ff;

  --teal: #cdecf1;
  --orange: #f9ded6;
  --pink: #f6d1e9;

  --surface: rgba(255, 255, 255, 0.06);
  --text-muted: rgba(255, 255, 255, 0.65);
  --text-dim: rgba(255, 255, 255, 0.5);
  --stroke: rgba(255, 255, 255, 0.12);
}

/* ===== Base ===== */
body {
  margin: 0;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: var(--bg);
  color: var(--white);
}

.app {
  padding: 16px;
}

/* ===== Utility fonts (Montserrat) ===== */
.titleFont {
  font-family: "Montserrat", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-weight: 800;
}

.primaryFont {
  font-family: "Montserrat", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-weight: 800;
  letter-spacing: 0.2px;
}

/* ===== Header ===== */
.header {
  margin-bottom: 12px;
}

.header__title {
  font-size: 20px;
  letter-spacing: 0.2px;
}

.header__meta {
  font-size: 12px;
  color: var(--text-dim);
}

/* ===== Card ===== */
.card {
  background: var(--surface);
  border: 1px solid var(--stroke);
  border-radius: 16px;
  padding: 16px;
  backdrop-filter: blur(6px);
}

/* ===== Sections ===== */
.section {
  margin-bottom: 16px;
}

.label {
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 8px;
  display: block;
}

/* ===== Inputs ===== */
.input,
.textarea {
  width: 100%;
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid var(--stroke);
  background: rgba(255, 255, 255, 0.04);
  color: var(--white);
  box-sizing: border-box;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.textarea {
  resize: vertical;
}

.input::placeholder,
.textarea::placeholder {
  color: rgba(255, 255, 255, 0.38);
}

.input:focus,
.textarea:focus {
  border-color: rgba(127, 66, 225, 0.55);
  box-shadow: 0 0 0 3px rgba(127, 66, 225, 0.25);
}

/* ===== Field wrapper with inside button ===== */
.fieldWrap {
  position: relative;
}

.textareaWithBtn {
  padding-right: 52px;
}

.iconInField {
  position: absolute;
  right: 10px;
  top: 10px;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: rgba(145, 93, 230, 0.18);
  border: 1px solid rgba(145, 93, 230, 0.35);
  color: var(--white);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.08s ease, background 0.15s ease, border-color 0.15s ease;
}

.iconInField:hover {
  background: rgba(145, 93, 230, 0.26);
  border-color: rgba(186, 154, 241, 0.5);
}

.iconInField:active {
  transform: scale(0.96);
}

/* ===== Hints ===== */
.hint {
  font-size: 12px;
  color: var(--text-dim);
  margin-top: 6px;
}

/* ===== Sizes (checkboxes) ===== */
.sizes {
  display: grid;
  gap: 8px;
}

.check {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--stroke);
  padding: 10px 12px;
  border-radius: 14px;
  cursor: pointer;
}

.check input {
  display: none;
}

.check__box {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(186, 154, 241, 0.55);
  border-radius: 6px;
  box-sizing: border-box;
  display: inline-block;
  position: relative;
}

.check input:checked + .check__box {
  border-color: var(--purple-7);
  background: rgba(127, 66, 225, 0.22);
}

.check input:checked + .check__box::after {
  content: "";
  position: absolute;
  inset: 0;
  margin: auto;
  width: 10px;
  height: 10px;
  border-radius: 3px;
  background: var(--purple-7);
}

.check__text {
  font-size: 14px;
}

/* ===== Primary button ===== */
.primary {
  width: 100%;
  padding: 12px;
  background: var(--purple-7);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  color: var(--white);
  font-size: 15px;
  cursor: pointer;
  transition: transform 0.08s ease, background 0.15s ease;
  position: relative;
}

.primary:hover {
  background: var(--purple-6);
}

.primary:active {
  transform: scale(0.98);
}

/* ===== Status (only for errors now) ===== */
.globalStatus {
  margin-top: 8px;
  font-size: 12px;
  opacity: 0.95;
}

.globalStatus[data-type="err"] {
  color: var(--orange);
}

/* ===== Result styles ===== */
.results {
  display: grid;
  gap: 8px;
}

.resultRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--stroke);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.04);
}

.resultInfo {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.resultTitle {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.92);
}

.resultInfo a {
  font-size: 12px;
  color: rgba(186, 154, 241, 0.95);
  text-decoration: none;
  word-break: break-all;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 240px;
}

.resultInfo a:hover {
  text-decoration: underline;
}

.resultBtn {
  background: rgba(145, 93, 230, 0.18);
  border: 1px solid rgba(145, 93, 230, 0.35);
  color: #fff;
  border-radius: 12px;
  padding: 10px 12px;
  cursor: pointer;
  flex: 0 0 auto;
}

.resultBtn:active {
  transform: scale(0.98);
}

/* ===== Disabled state ===== */
.iconInField[disabled],
.primary[disabled] {
  opacity: 0.7;
  cursor: not-allowed;
}

/* ===== Spinner (small buttons + centered primary) ===== */
@keyframes spin {
  to { transform: rotate(360deg); }
}

/* small ↻ loader */
.iconInField {
  position: absolute;
}

.iconInField[disabled] {
  color: rgba(255,255,255,0.35);
}

.iconInField[disabled]::after {
  content: "";
  position: absolute;
  inset: 0;
  margin: auto;
  width: 14px;
  height: 14px;
  border-radius: 999px;
  border: 2px solid rgba(255,255,255,0.30);
  border-top-color: var(--white);
  animation: spin 0.7s linear infinite;
}

/* primary loader centered */
.primary[disabled] {
  color: rgba(255,255,255,0.85);
}

.primary[disabled]::after {
  content: "";
  position: absolute;
  inset: 0;
  margin: auto;
  width: 18px;
  height: 18px;
  border-radius: 999px;
  border: 2px solid rgba(255,255,255,0.35);
  border-top-color: #fff;
  animation: spin 0.7s linear infinite;
}
