/**
 * ApexCalc Pro - Universal High-Precision Calculator & Utility Suite
 * Features:
 * - Robust Shunting-Yard parser supporting unary ops, implicit multiplication, auto-balancing
 * - Standard, Scientific (Trig/Log/Powers/DEG/RAD), Unit Converter, & Programmer (HEX/DEC/OCT/BIN)
 * - Memory Registers (MC, MR, M+, M-, MS)
 * - Web Audio API Synthesizer for tactile haptic-sound feedback
 * - Real-time calculation preview & dynamic display font sizing
 * - LocalStorage history persistence with search, delete, & text export
 * - 5 Custom Themes (Obsidian, Aurora, Cyberpunk, Emerald, Oceanic)
 * - Full Keyboard navigation with visual key feedback
 */

(function () {
  "use strict";

  // ==========================================
  // STATE MANAGEMENT
  // ==========================================
  const state = {
    mode: "standard", // standard | scientific | converter | programmer
    expression: "",
    result: "0",
    angleMode: "DEG", // DEG | RAD
    is2ndActive: false, // For scientific 2nd toggle (asin, acos, etc.)
    memory: 0,
    history: loadHistory(),
    soundEnabled: localStorage.getItem("apexcalc-sound") !== "false",
    theme: localStorage.getItem("apexcalc-theme") || "obsidian",
    programmerBase: "DEC", // HEX | DEC | OCT | BIN
    programmerBits: 32,
    converterCategory: "length",
    converterFromUnit: "m",
    converterToUnit: "km"
  };

  // ==========================================
  // DOM REFERENCES
  // ==========================================
  const elements = {
    // Top Controls
    themeSelect: document.getElementById("theme-select"),
    soundToggle: document.getElementById("sound-toggle"),
    soundIcon: document.getElementById("sound-icon"),
    shortcutsBtn: document.getElementById("shortcuts-btn"),
    historyToggleBtn: document.getElementById("history-btn"),
    historyBadge: document.getElementById("history-badge"),

    // Display Elements
    angleBadge: document.getElementById("angle-badge"),
    memoryBadge: document.getElementById("memory-badge"),
    expressionDisplay: document.getElementById("expression-display"),
    mainDisplay: document.getElementById("main-display"),
    previewDisplay: document.getElementById("preview-display"),
    copyBtn: document.getElementById("copy-btn"),

    // Keypads & Panels
    modeTabs: document.querySelectorAll(".mode-tab"),
    memoryBar: document.getElementById("memory-bar"),
    standardKeypad: document.getElementById("standard-keypad"),
    scientificKeypad: document.getElementById("scientific-keypad"),
    converterPanel: document.getElementById("converter-panel"),
    programmerPanel: document.getElementById("programmer-panel"),

    // Converter Elements
    convCategory: document.getElementById("conv-category"),
    convFromUnit: document.getElementById("conv-from-unit"),
    convToUnit: document.getElementById("conv-to-unit"),
    convFromInput: document.getElementById("conv-from-input"),
    convToResult: document.getElementById("conv-to-result"),
    convSwapBtn: document.getElementById("conv-swap-btn"),

    // Programmer Elements
    progHex: document.getElementById("prog-hex"),
    progDec: document.getElementById("prog-dec"),
    progOct: document.getElementById("prog-oct"),
    progBin: document.getElementById("prog-bin"),
    progBitSelector: document.getElementById("prog-bits"),

    // History Panel
    historyDrawer: document.getElementById("history-drawer"),
    historyOverlay: document.getElementById("history-overlay"),
    historyList: document.getElementById("history-list"),
    historySearch: document.getElementById("history-search"),
    clearHistoryBtn: document.getElementById("clear-history-btn"),
    exportHistoryBtn: document.getElementById("export-history-btn"),
    closeHistoryBtn: document.getElementById("close-history-btn"),

    // Shortcuts Modal
    shortcutsModal: document.getElementById("shortcuts-modal"),
    closeShortcutsBtn: document.getElementById("close-shortcuts-btn"),

    // Toast
    toast: document.getElementById("toast"),
    toastMessage: document.getElementById("toast-message")
  };

  // ==========================================
  // WEB AUDIO HAPTIC SOUND SYNTHESIZER
  // ==========================================
  let audioCtx = null;
  function playClickSound(freq = 600, duration = 0.035) {
    if (!state.soundEnabled) return;
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtx.state === "suspended") {
        audioCtx.resume();
      }
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.5, audioCtx.currentTime + duration);

      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      // Audio not permitted or not supported
    }
  }

  // ==========================================
  // TOAST NOTIFICATION
  // ==========================================
  let toastTimeout = null;
  function showToast(msg) {
    if (!elements.toast || !elements.toastMessage) return;
    elements.toastMessage.textContent = msg;
    elements.toast.classList.add("show");
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      elements.toast.classList.remove("show");
    }, 2400);
  }

  // ==========================================
  // MATHEMATICAL ENGINE (SHUNting-YARD + PARSER)
  // ==========================================

  // Clean floating-point artifacts (e.g. 0.1 + 0.2 = 0.3)
  function cleanFloat(val) {
    if (typeof val !== "number" || isNaN(val)) return NaN;
    if (!isFinite(val)) return val;
    const rounded = Number(val.toPrecision(12));
    if (Math.abs(rounded - Math.round(rounded)) < 1e-11) {
      return Math.round(rounded);
    }
    return rounded;
  }

  function factorial(n) {
    if (n < 0 || !Number.isInteger(n)) throw new Error("Factorial requires positive integer");
    if (n > 170) return Infinity;
    let res = 1;
    for (let i = 2; i <= n; i++) res *= i;
    return res;
  }

  // Tokenizer with unary operator detection and implicit multiplication
  function tokenize(raw) {
    let src = raw.replace(/\s+/g, "").replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-");
    const tokens = [];
    let i = 0;

    const functions = [
      "asin", "acos", "atan", "sinh", "cosh", "tanh",
      "sin", "cos", "tan", "sqrt", "cbrt", "ln", "log2", "log", "exp", "abs", "rand"
    ];

    while (i < src.length) {
      const char = src[i];

      // Number literal
      if (/\d|\./.test(char)) {
        const match = src.slice(i).match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/i);
        if (!match) throw new Error("Invalid number syntax");
        tokens.push({ type: "number", value: Number(match[0]) });
        i += match[0].length;
        continue;
      }

      // Check constants
      if (src.startsWith("pi", i)) {
        tokens.push({ type: "number", value: Math.PI });
        i += 2;
        continue;
      }
      if (src.startsWith("phi", i)) {
        tokens.push({ type: "number", value: 1.618033988749895 });
        i += 3;
        continue;
      }
      if (char === "e" && (i + 1 >= src.length || !/[a-z0-9]/i.test(src[i + 1]))) {
        tokens.push({ type: "number", value: Math.E });
        i += 1;
        continue;
      }

      // Check functions
      let foundFn = false;
      for (const fn of functions) {
        if (src.startsWith(fn, i)) {
          if (fn === "rand") {
            tokens.push({ type: "number", value: cleanFloat(Math.random()) });
          } else {
            tokens.push({ type: "function", value: fn });
          }
          i += fn.length;
          foundFn = true;
          break;
        }
      }
      if (foundFn) continue;

      // Single character operators & parentheses
      if ("+-*/^%!()".includes(char)) {
        tokens.push({ type: "operator", value: char });
        i += 1;
        continue;
      }

      throw new Error(`Unknown symbol: ${char}`);
    }

    // Insert implicit multiplications:
    // (number | ')' | '!' | const) followed by (number | '(' | function | const)
    const expanded = [];
    for (let j = 0; j < tokens.length; j++) {
      const cur = tokens[j];
      const prev = expanded[expanded.length - 1];

      if (prev) {
        const prevCanMultiply =
          prev.type === "number" ||
          (prev.type === "operator" && (prev.value === ")" || prev.value === "!"));
        const curCanMultiply =
          cur.type === "number" ||
          cur.type === "function" ||
          (cur.type === "operator" && cur.value === "(");

        if (prevCanMultiply && curCanMultiply) {
          expanded.push({ type: "operator", value: "*" });
        }
      }
      expanded.push(cur);
    }

    return expanded;
  }

  // Evaluate token stream using Shunting-Yard
  function evaluate(rawExpression, angleMode = "DEG") {
    if (!rawExpression || !rawExpression.trim()) return 0;
    const tokens = tokenize(rawExpression);
    if (!tokens.length) return 0;

    const outputQueue = [];
    const opStack = [];

    const precedence = {
      "+": 2, "-": 2,
      "*": 3, "/": 3, "%": 3,
      "^": 5,
      "neg": 4,
      "pos": 4
    };

    let prevToken = null;

    tokens.forEach((token) => {
      if (token.type === "number") {
        outputQueue.push(token);
        prevToken = token;
        return;
      }

      if (token.type === "function") {
        opStack.push(token);
        prevToken = token;
        return;
      }

      if (token.type === "operator") {
        const val = token.value;

        // Postfix Factorial
        if (val === "!") {
          outputQueue.push({ type: "factorial" });
          prevToken = token;
          return;
        }

        // Postfix Percentage if not between numbers
        if (val === "%") {
          // If previous was a number or closing paren, and next is not a number, treat as / 100
          outputQueue.push({ type: "number", value: 100 });
          outputQueue.push({ type: "binary", value: "/" });
          prevToken = { type: "number", value: 100 };
          return;
        }

        // Parentheses
        if (val === "(") {
          opStack.push(token);
          prevToken = token;
          return;
        }

        if (val === ")") {
          while (opStack.length && opStack[opStack.length - 1].value !== "(") {
            outputQueue.push(opStack.pop());
          }
          if (opStack.length && opStack[opStack.length - 1].value === "(") {
            opStack.pop();
          }
          if (opStack.length && opStack[opStack.length - 1].type === "function") {
            outputQueue.push(opStack.pop());
          }
          prevToken = token;
          return;
        }

        // Unary Operator Detection
        let isUnary = false;
        if (!prevToken || (prevToken.type === "operator" && prevToken.value !== ")" && prevToken.value !== "!")) {
          isUnary = true;
        }

        let opKey = val;
        if (isUnary) {
          if (val === "-") opKey = "neg";
          else if (val === "+") opKey = "pos";
          else throw new Error("Unexpected operator");
        }

        while (opStack.length) {
          const top = opStack[opStack.length - 1];
          if (top.value === "(") break;

          const topPrec = precedence[top.value] || 0;
          const curPrec = precedence[opKey] || 0;

          const isRightAssoc = opKey === "^" || opKey === "neg" || opKey === "pos";
          if ((!isRightAssoc && curPrec <= topPrec) || (isRightAssoc && curPrec < topPrec)) {
            outputQueue.push(opStack.pop());
          } else {
            break;
          }
        }

        opStack.push({ type: isUnary ? "unary" : "binary", value: opKey });
        prevToken = token;
      }
    });

    // Auto-balance remaining operators
    while (opStack.length) {
      const top = opStack.pop();
      if (top.value !== "(") {
        outputQueue.push(top);
      }
    }

    // Evaluate RPN
    const valStack = [];
    const toRad = (deg) => (deg * Math.PI) / 180;
    const toDeg = (rad) => (rad * 180) / Math.PI;

    outputQueue.forEach((token) => {
      if (token.type === "number") {
        valStack.push(token.value);
        return;
      }

      if (token.type === "factorial") {
        const a = valStack.pop();
        if (a === undefined) throw new Error("Invalid factorial");
        valStack.push(factorial(a));
        return;
      }

      if (token.type === "unary") {
        const a = valStack.pop();
        if (a === undefined) throw new Error("Invalid expression");
        if (token.value === "neg") valStack.push(-a);
        else if (token.value === "pos") valStack.push(+a);
        return;
      }

      if (token.type === "binary") {
        const b = valStack.pop();
        const a = valStack.pop();
        if (a === undefined || b === undefined) throw new Error("Invalid expression");

        switch (token.value) {
          case "+": valStack.push(a + b); break;
          case "-": valStack.push(a - b); break;
          case "*": valStack.push(a * b); break;
          case "/":
            if (b === 0) throw new Error("Cannot divide by zero");
            valStack.push(a / b);
            break;
          case "%":
            valStack.push(a % b);
            break;
          case "^":
            valStack.push(Math.pow(a, b));
            break;
          default:
            throw new Error(`Unknown operator ${token.value}`);
        }
        return;
      }

      if (token.type === "function") {
        const arg = valStack.pop();
        if (arg === undefined) throw new Error(`Missing argument for ${token.value}`);
        let res;

        switch (token.value) {
          case "sin": {
            const rad = angleMode === "DEG" ? toRad(arg) : arg;
            res = Math.sin(rad);
            if (Math.abs(res) < 1e-14) res = 0;
            break;
          }
          case "cos": {
            const rad = angleMode === "DEG" ? toRad(arg) : arg;
            res = Math.cos(rad);
            if (Math.abs(res) < 1e-14) res = 0;
            break;
          }
          case "tan": {
            if (angleMode === "DEG" && (Math.abs(arg) - 90) % 180 === 0) {
              throw new Error("Undefined (tan 90°)");
            }
            const rad = angleMode === "DEG" ? toRad(arg) : arg;
            res = Math.tan(rad);
            break;
          }
          case "asin": {
            if (arg < -1 || arg > 1) throw new Error("Domain error (-1 to 1)");
            res = Math.asin(arg);
            if (angleMode === "DEG") res = toDeg(res);
            break;
          }
          case "acos": {
            if (arg < -1 || arg > 1) throw new Error("Domain error (-1 to 1)");
            res = Math.acos(arg);
            if (angleMode === "DEG") res = toDeg(res);
            break;
          }
          case "atan": {
            res = Math.atan(arg);
            if (angleMode === "DEG") res = toDeg(res);
            break;
          }
          case "sinh": res = Math.sinh(arg); break;
          case "cosh": res = Math.cosh(arg); break;
          case "tanh": res = Math.tanh(arg); break;
          case "sqrt":
            if (arg < 0) throw new Error("Negative square root");
            res = Math.sqrt(arg);
            break;
          case "cbrt": res = Math.cbrt(arg); break;
          case "ln":
            if (arg <= 0) throw new Error("Domain error (ln > 0)");
            res = Math.log(arg);
            break;
          case "log":
            if (arg <= 0) throw new Error("Domain error (log > 0)");
            res = Math.log10(arg);
            break;
          case "log2":
            if (arg <= 0) throw new Error("Domain error (log2 > 0)");
            res = Math.log2(arg);
            break;
          case "exp": res = Math.exp(arg); break;
          case "abs": res = Math.abs(arg); break;
          default: throw new Error(`Unknown function ${token.value}`);
        }
        valStack.push(res);
      }
    });

    if (valStack.length !== 1 || !isFinite(valStack[0])) {
      throw new Error("Invalid expression");
    }

    return cleanFloat(valStack[0]);
  }

  // Format number for display
  function formatDisplay(num) {
    if (typeof num === "string") return num;
    if (isNaN(num)) return "Error";
    if (!isFinite(num)) return num > 0 ? "Infinity" : "-Infinity";

    if (Math.abs(num) >= 1e13 || (Math.abs(num) > 0 && Math.abs(num) < 1e-6)) {
      return num.toExponential(6).replace(/\.?0+e/, "e");
    }

    const parts = String(num).split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
  }

  // Auto-scale font size for main display to prevent clipping
  function adjustFontSize() {
    const textLen = elements.mainDisplay.value.length;
    if (textLen > 18) {
      elements.mainDisplay.style.fontSize = "1.75rem";
    } else if (textLen > 12) {
      elements.mainDisplay.style.fontSize = "2.5rem";
    } else if (textLen > 8) {
      elements.mainDisplay.style.fontSize = "3.25rem";
    } else {
      elements.mainDisplay.style.fontSize = "";
    }
  }

  // ==========================================
  // CALCULATOR DISPLAY & ACTIONS
  // ==========================================
  function updateDisplay() {
    elements.expressionDisplay.textContent = state.expression || "";
    elements.mainDisplay.value = state.result || "0";
    elements.expressionDisplay.scrollLeft = elements.expressionDisplay.scrollWidth;
    adjustFontSize();
    updateLivePreview();
  }

  function updateLivePreview() {
    if (!state.expression.trim() || state.expression === state.result) {
      elements.previewDisplay.textContent = "";
      return;
    }
    try {
      const previewVal = evaluate(state.expression, state.angleMode);
      if (!isNaN(previewVal) && isFinite(previewVal)) {
        elements.previewDisplay.textContent = `= ${formatDisplay(previewVal)}`;
      } else {
        elements.previewDisplay.textContent = "";
      }
    } catch (e) {
      elements.previewDisplay.textContent = "";
    }
  }

  function appendInput(val) {
    playClickSound(580);
    if (state.result === "Error" || state.result === "Cannot divide by zero") {
      state.expression = "";
      state.result = "0";
    }

    // Reciprocal shortcut 1/x
    if (val === "1/(") {
      if (state.expression.trim() && !/[+\-*/^(]$/.test(state.expression.trim())) {
        state.expression = `1/(${state.expression})`;
        state.result = state.expression;
        updateDisplay();
        return;
      }
    }

    state.expression += val;
    state.result = state.expression;
    updateDisplay();
  }

  function clearAll() {
    playClickSound(420);
    state.expression = "";
    state.result = "0";
    updateDisplay();
  }

  function backspace() {
    playClickSound(480);
    if (state.expression.length > 0) {
      const fnMatches = [
        "asin(", "acos(", "atan(", "sinh(", "cosh(", "tanh(",
        "sin(", "cos(", "tan(", "sqrt(", "cbrt(", "log(", "ln(", "abs("
      ];
      let removed = false;
      for (const fn of fnMatches) {
        if (state.expression.endsWith(fn)) {
          state.expression = state.expression.slice(0, -fn.length);
          removed = true;
          break;
        }
      }
      if (!removed) {
        state.expression = state.expression.slice(0, -1);
      }
      state.result = state.expression || "0";
    } else {
      state.result = "0";
    }
    updateDisplay();
  }

  function computeResult() {
    playClickSound(750, 0.05);
    if (!state.expression.trim()) return;

    try {
      const calculated = evaluate(state.expression, state.angleMode);
      const formatted = cleanFloat(calculated);

      addHistoryItem(state.expression, String(formatted));

      state.expression = "";
      state.result = String(formatted);
      updateDisplay();
    } catch (err) {
      state.result = err.message || "Error";
      elements.mainDisplay.value = state.result;
      adjustFontSize();
      elements.previewDisplay.textContent = "";
    }
  }

  // ==========================================
  // MEMORY MANAGEMENT
  // ==========================================
  function updateMemoryBadge() {
    if (state.memory !== 0) {
      elements.memoryBadge.textContent = `M: ${cleanFloat(state.memory)}`;
      elements.memoryBadge.classList.remove("hidden");
    } else {
      elements.memoryBadge.classList.add("hidden");
    }
  }

  function handleMemory(action) {
    playClickSound(650);
    const curVal = parseFloat(state.result) || 0;
    switch (action) {
      case "MC":
        state.memory = 0;
        showToast("Memory Cleared");
        break;
      case "MR":
        state.expression += String(cleanFloat(state.memory));
        state.result = state.expression;
        showToast(`Recalled: ${cleanFloat(state.memory)}`);
        break;
      case "M+":
        state.memory += curVal;
        showToast(`Memory +${curVal}`);
        break;
      case "M-":
        state.memory -= curVal;
        showToast(`Memory -${curVal}`);
        break;
      case "MS":
        state.memory = curVal;
        showToast(`Stored: ${curVal}`);
        break;
    }
    updateMemoryBadge();
    updateDisplay();
  }

  // ==========================================
  // HISTORY MANAGEMENT
  // ==========================================
  function loadHistory() {
    try {
      return JSON.parse(localStorage.getItem("apexcalc-history")) || [];
    } catch (e) {
      return [];
    }
  }

  function saveHistory() {
    try {
      localStorage.setItem("apexcalc-history", JSON.stringify(state.history.slice(0, 50)));
    } catch (e) {}
  }

  function addHistoryItem(expr, res) {
    const item = {
      id: Date.now(),
      expression: expr,
      result: res,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };
    state.history.unshift(item);
    if (state.history.length > 50) state.history.pop();
    saveHistory();
    renderHistory();
    updateHistoryBadge();
  }

  function updateHistoryBadge() {
    if (state.history.length > 0) {
      elements.historyBadge.textContent = state.history.length;
      elements.historyBadge.classList.remove("hidden");
    } else {
      elements.historyBadge.classList.add("hidden");
    }
  }

  function renderHistory(filter = "") {
    if (!elements.historyList) return;
    const filtered = state.history.filter(
      (h) => h.expression.toLowerCase().includes(filter.toLowerCase()) || h.result.includes(filter)
    );

    if (!filtered.length) {
      elements.historyList.innerHTML = `
        <div class="text-center py-12 text-gray-400">
          <i class="fa-solid fa-clock-rotate-left text-4xl mb-3 opacity-40"></i>
          <p class="text-sm">No calculations recorded yet.</p>
        </div>`;
      return;
    }

    elements.historyList.innerHTML = filtered
      .map(
        (item) => `
      <div class="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all group relative">
        <div class="flex justify-between items-center text-xs text-gray-400 mb-1">
          <span class="font-mono">${item.time}</span>
          <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button class="copy-history-btn p-1 hover:text-amber-400 text-gray-400" title="Copy result" data-res="${item.result}">
              <i class="fa-regular fa-copy"></i>
            </button>
            <button class="delete-history-btn p-1 hover:text-red-400 text-gray-400" title="Delete" data-id="${item.id}">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </div>
        <button class="w-full text-left font-mono-math history-insert-btn" data-expr="${item.expression}" data-res="${item.result}">
          <div class="text-sm text-gray-400 truncate">${escapeHtml(item.expression)} =</div>
          <div class="text-xl font-bold text-white tracking-wide">${escapeHtml(item.result)}</div>
        </button>
      </div>`
      )
      .join("");
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  }

  function toggleHistoryDrawer(open) {
    playClickSound(600);
    elements.historyDrawer.classList.toggle("translate-x-full", !open);
    elements.historyOverlay.classList.toggle("hidden", !open);
    elements.historyDrawer.setAttribute("aria-hidden", String(!open));
    if (open) renderHistory();
  }

  function exportHistory() {
    playClickSound(700);
    if (!state.history.length) {
      showToast("No history to export");
      return;
    }
    const content = state.history
      .map((item) => `[${item.time}] ${item.expression} = ${item.result}`)
      .join("\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ApexCalc_History_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("History exported successfully!");
  }

  // ==========================================
  // UNIT CONVERTER ENGINE
  // ==========================================
  const unitData = {
    length: {
      name: "Length",
      units: {
        m: { name: "Meters (m)", rate: 1 },
        km: { name: "Kilometers (km)", rate: 1000 },
        cm: { name: "Centimeters (cm)", rate: 0.01 },
        mm: { name: "Millimeters (mm)", rate: 0.001 },
        mi: { name: "Miles (mi)", rate: 1609.344 },
        yd: { name: "Yards (yd)", rate: 0.9144 },
        ft: { name: "Feet (ft)", rate: 0.3048 },
        in: { name: "Inches (in)", rate: 0.0254 }
      }
    },
    mass: {
      name: "Mass / Weight",
      units: {
        kg: { name: "Kilograms (kg)", rate: 1 },
        g: { name: "Grams (g)", rate: 0.001 },
        mg: { name: "Milligrams (mg)", rate: 0.000001 },
        lb: { name: "Pounds (lb)", rate: 0.45359237 },
        oz: { name: "Ounces (oz)", rate: 0.028349523 },
        ton: { name: "Metric Tons (t)", rate: 1000 }
      }
    },
    temperature: {
      name: "Temperature",
      units: {
        C: { name: "Celsius (°C)" },
        F: { name: "Fahrenheit (°F)" },
        K: { name: "Kelvin (K)" }
      }
    },
    data: {
      name: "Digital Data",
      units: {
        B: { name: "Bytes (B)", rate: 1 },
        KB: { name: "Kilobytes (KB)", rate: 1024 },
        MB: { name: "Megabytes (MB)", rate: 1048576 },
        GB: { name: "Gigabytes (GB)", rate: 1073741824 },
        TB: { name: "Terabytes (TB)", rate: 1099511627776 },
        PB: { name: "Petabytes (PB)", rate: 1125899906842624 }
      }
    },
    speed: {
      name: "Speed",
      units: {
        "m/s": { name: "Meters / second (m/s)", rate: 1 },
        "km/h": { name: "Kilometers / hour (km/h)", rate: 0.27777778 },
        mph: { name: "Miles / hour (mph)", rate: 0.44704 },
        knot: { name: "Knots (kn)", rate: 0.514444 }
      }
    },
    time: {
      name: "Time",
      units: {
        ms: { name: "Milliseconds (ms)", rate: 0.001 },
        s: { name: "Seconds (s)", rate: 1 },
        min: { name: "Minutes (min)", rate: 60 },
        h: { name: "Hours (hr)", rate: 3600 },
        d: { name: "Days (d)", rate: 86400 },
        wk: { name: "Weeks (wk)", rate: 604800 },
        yr: { name: "Years (yr)", rate: 31536000 }
      }
    }
  };

  function updateConverterUI() {
    const cat = unitData[state.converterCategory];
    if (!cat) return;

    elements.convFromUnit.innerHTML = Object.keys(cat.units)
      .map((k) => `<option value="${k}" ${k === state.converterFromUnit ? "selected" : ""}>${cat.units[k].name}</option>`)
      .join("");
    elements.convToUnit.innerHTML = Object.keys(cat.units)
      .map((k) => `<option value="${k}" ${k === state.converterToUnit ? "selected" : ""}>${cat.units[k].name}</option>`)
      .join("");

    calculateConversion();
  }

  function calculateConversion() {
    const catKey = state.converterCategory;
    const cat = unitData[catKey];
    const val = parseFloat(elements.convFromInput.value);
    if (isNaN(val)) {
      elements.convToResult.value = "";
      return;
    }

    const fromU = state.converterFromUnit;
    const toU = state.converterToUnit;

    let res = 0;
    if (catKey === "temperature") {
      let celsius = val;
      if (fromU === "F") celsius = (val - 32) * (5 / 9);
      else if (fromU === "K") celsius = val - 273.15;

      if (toU === "C") res = celsius;
      else if (toU === "F") res = celsius * (9 / 5) + 32;
      else if (toU === "K") res = celsius + 273.15;
    } else {
      const baseVal = val * cat.units[fromU].rate;
      res = baseVal / cat.units[toU].rate;
    }

    elements.convToResult.value = cleanFloat(res);
  }

  // ==========================================
  // PROGRAMMER MODE ENGINE
  // ==========================================
  let programmerValue = 0n;

  function updateProgrammerDisplays() {
    const bits = Number(state.programmerBits);
    const masked = BigInt.asUintN(bits, programmerValue);

    elements.progHex.textContent = masked.toString(16).toUpperCase();
    elements.progDec.textContent = BigInt.asIntN(bits, programmerValue).toString(10);
    elements.progOct.textContent = masked.toString(8);

    let binStr = masked.toString(2).padStart(bits, "0");
    let grouped = "";
    for (let i = 0; i < binStr.length; i += 4) {
      grouped += binStr.slice(i, i + 4) + " ";
    }
    elements.progBin.textContent = grouped.trim();

    const base = state.programmerBase;
    document.querySelectorAll(".prog-key").forEach((btn) => {
      const val = btn.dataset.val;
      if (!val) return;
      let disabled = false;
      if (base === "BIN" && !/^[01]$/.test(val) && !["CLR", "NOT", "LSH", "RSH", "="].includes(val)) disabled = true;
      else if (base === "OCT" && !/^[0-7]$/.test(val) && !["CLR", "NOT", "LSH", "RSH", "="].includes(val)) disabled = true;
      else if (base === "DEC" && !/^[0-9]$/.test(val) && !["CLR", "NOT", "LSH", "RSH", "="].includes(val)) disabled = true;
      btn.disabled = disabled;
      btn.classList.toggle("opacity-25", disabled);
      btn.classList.toggle("cursor-not-allowed", disabled);
    });
  }

  function handleProgrammerInput(val) {
    playClickSound(620);
    try {
      if (val === "CLR") {
        programmerValue = 0n;
      } else if (val === "NOT") {
        programmerValue = ~programmerValue;
      } else if (val === "LSH") {
        programmerValue = programmerValue << 1n;
      } else if (val === "RSH") {
        programmerValue = programmerValue >> 1n;
      } else if (/^[0-9A-F]$/i.test(val)) {
        let radix = 10;
        if (state.programmerBase === "HEX") radix = 16;
        else if (state.programmerBase === "OCT") radix = 8;
        else if (state.programmerBase === "BIN") radix = 2;

        const currentStr = programmerValue === 0n ? "" : programmerValue.toString(radix);
        const newStr = currentStr + val;
        programmerValue = BigInt(parseInt(newStr, radix));
      }
    } catch (e) {
      programmerValue = 0n;
    }
    updateProgrammerDisplays();
  }

  // ==========================================
  // MODE SWITCHING & 2ND TOGGLE
  // ==========================================
  function switchMode(newMode) {
    playClickSound(650);
    state.mode = newMode;
    elements.modeTabs.forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.mode === newMode);
    });

    elements.standardKeypad.classList.toggle("hidden", newMode !== "standard");
    elements.scientificKeypad.classList.toggle("hidden", newMode !== "scientific");
    elements.converterPanel.classList.toggle("hidden", newMode !== "converter");
    elements.programmerPanel.classList.toggle("hidden", newMode !== "programmer");

    elements.angleBadge.classList.toggle("hidden", newMode !== "scientific");
    elements.memoryBar.classList.toggle("hidden", newMode === "converter");

    if (newMode === "converter") {
      updateConverterUI();
    } else if (newMode === "programmer") {
      updateProgrammerDisplays();
    }
  }

  function toggle2nd() {
    playClickSound(700);
    state.is2ndActive = !state.is2ndActive;
    const btn2nd = document.getElementById("btn-2nd");
    if (btn2nd) btn2nd.classList.toggle("active", state.is2ndActive);

    const toggleMap = [
      { id: "btn-sin", norm: "sin(", alt: "asin(", normLbl: "sin", altLbl: "sin⁻¹" },
      { id: "btn-cos", norm: "cos(", alt: "acos(", normLbl: "cos", altLbl: "cos⁻¹" },
      { id: "btn-tan", norm: "tan(", alt: "atan(", normLbl: "tan", altLbl: "tan⁻¹" },
      { id: "btn-ln", norm: "ln(", alt: "exp(", normLbl: "ln", altLbl: "eˣ" },
      { id: "btn-log", norm: "log(", alt: "10^", normLbl: "log", altLbl: "10ˣ" },
      { id: "btn-sqrt", norm: "sqrt(", alt: "^2", normLbl: "√", altLbl: "x²" }
    ];

    toggleMap.forEach(({ id, norm, alt, normLbl, altLbl }) => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.value = state.is2ndActive ? alt : norm;
        btn.innerHTML = state.is2ndActive ? altLbl : normLbl;
      }
    });
  }

  function toggleAngleMode() {
    playClickSound(650);
    state.angleMode = state.angleMode === "DEG" ? "RAD" : "DEG";
    elements.angleBadge.textContent = state.angleMode;
    updateLivePreview();
  }

  // ==========================================
  // THEME MANAGEMENT
  // ==========================================
  function setTheme(theme) {
    state.theme = theme;
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("apexcalc-theme", theme);
    if (elements.themeSelect) elements.themeSelect.value = theme;
  }

  // ==========================================
  // RIPPLE EFFECT & BUTTON PRESS ANIMATION
  // ==========================================
  function createRipple(event, button) {
    const circle = document.createElement("span");
    const diameter = Math.max(button.clientWidth, button.clientHeight);
    const radius = diameter / 2;
    const rect = button.getBoundingClientRect();

    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${(event.clientX || rect.left + radius) - rect.left - radius}px`;
    circle.style.top = `${(event.clientY || rect.top + radius) - rect.top - radius}px`;
    circle.classList.add("ripple-effect");

    const existing = button.querySelector(".ripple-effect");
    if (existing) existing.remove();

    button.appendChild(circle);
    setTimeout(() => circle.remove(), 600);
  }

  // ==========================================
  // EVENT LISTENERS & SETUP
  // ==========================================
  function initEvents() {
    elements.modeTabs.forEach((tab) => {
      tab.addEventListener("click", () => switchMode(tab.dataset.mode));
    });

    elements.angleBadge.addEventListener("click", toggleAngleMode);

    document.addEventListener("click", (e) => {
      const btn = e.target.closest(".calc-btn");
      if (!btn) return;

      createRipple(e, btn);

      if (btn.dataset.mem) {
        handleMemory(btn.dataset.mem);
        return;
      }

      if (btn.classList.contains("prog-key")) {
        handleProgrammerInput(btn.dataset.val);
        return;
      }

      const val = btn.value;
      if (val === "C") clearAll();
      else if (val === "=") computeResult();
      else if (val === "⌫") backspace();
      else if (val === "2nd") toggle2nd();
      else if (val) appendInput(val);
    });

    elements.copyBtn.addEventListener("click", () => {
      playClickSound(700);
      navigator.clipboard.writeText(elements.mainDisplay.value);
      showToast("Copied to clipboard!");
    });

    elements.soundToggle.addEventListener("click", () => {
      state.soundEnabled = !state.soundEnabled;
      localStorage.setItem("apexcalc-sound", state.soundEnabled);
      elements.soundIcon.className = state.soundEnabled
        ? "fa-solid fa-volume-high text-amber-400"
        : "fa-solid fa-volume-xmark text-gray-400";
      playClickSound(600);
      showToast(state.soundEnabled ? "Sound Enabled" : "Sound Muted");
    });

    elements.themeSelect.addEventListener("change", (e) => {
      playClickSound(600);
      setTheme(e.target.value);
    });

    elements.historyToggleBtn.addEventListener("click", () => toggleHistoryDrawer(true));
    elements.closeHistoryBtn.addEventListener("click", () => toggleHistoryDrawer(false));
    elements.historyOverlay.addEventListener("click", () => toggleHistoryDrawer(false));

    elements.clearHistoryBtn.addEventListener("click", () => {
      playClickSound(400);
      state.history = [];
      localStorage.removeItem("apexcalc-history");
      renderHistory();
      updateHistoryBadge();
      showToast("History Cleared");
    });

    elements.exportHistoryBtn.addEventListener("click", exportHistory);

    elements.historySearch.addEventListener("input", (e) => {
      renderHistory(e.target.value);
    });

    elements.historyList.addEventListener("click", (e) => {
      const copyBtn = e.target.closest(".copy-history-btn");
      if (copyBtn) {
        navigator.clipboard.writeText(copyBtn.dataset.res);
        showToast("Result copied!");
        return;
      }

      const deleteBtn = e.target.closest(".delete-history-btn");
      if (deleteBtn) {
        const id = Number(deleteBtn.dataset.id);
        state.history = state.history.filter((h) => h.id !== id);
        saveHistory();
        renderHistory(elements.historySearch.value);
        updateHistoryBadge();
        return;
      }

      const insertBtn = e.target.closest(".history-insert-btn");
      if (insertBtn) {
        state.expression = insertBtn.dataset.res;
        state.result = insertBtn.dataset.res;
        updateDisplay();
        toggleHistoryDrawer(false);
      }
    });

    elements.shortcutsBtn.addEventListener("click", () => {
      playClickSound(600);
      elements.shortcutsModal.classList.remove("hidden");
    });
    elements.closeShortcutsBtn.addEventListener("click", () => {
      playClickSound(500);
      elements.shortcutsModal.classList.add("hidden");
    });
    elements.shortcutsModal.addEventListener("click", (e) => {
      if (e.target === elements.shortcutsModal) {
        elements.shortcutsModal.classList.add("hidden");
      }
    });

    elements.convCategory.addEventListener("change", (e) => {
      state.converterCategory = e.target.value;
      const units = Object.keys(unitData[state.converterCategory].units);
      state.converterFromUnit = units[0];
      state.converterToUnit = units[1] || units[0];
      updateConverterUI();
    });

    elements.convFromUnit.addEventListener("change", (e) => {
      state.converterFromUnit = e.target.value;
      calculateConversion();
    });

    elements.convToUnit.addEventListener("change", (e) => {
      state.converterToUnit = e.target.value;
      calculateConversion();
    });

    elements.convFromInput.addEventListener("input", calculateConversion);

    elements.convSwapBtn.addEventListener("click", () => {
      playClickSound(650);
      const temp = state.converterFromUnit;
      state.converterFromUnit = state.converterToUnit;
      state.converterToUnit = temp;
      updateConverterUI();
    });

    elements.progBitSelector.addEventListener("change", (e) => {
      state.programmerBits = Number(e.target.value);
      updateProgrammerDisplays();
    });

    document.querySelectorAll(".prog-base-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        playClickSound(600);
        state.programmerBase = btn.dataset.base;
        document.querySelectorAll(".prog-base-btn").forEach((b) => b.classList.remove("ring-2", "ring-amber-400"));
        btn.classList.add("ring-2", "ring-amber-400");
        updateProgrammerDisplays();
      });
    });

    document.addEventListener("keydown", handleKeyboard);
  }

  // ==========================================
  // PHYSICAL KEYBOARD HANDLER
  // ==========================================
  function handleKeyboard(event) {
    if (["INPUT", "SELECT"].includes(document.activeElement.tagName)) {
      if (event.key === "Escape") {
        document.activeElement.blur();
      }
      return;
    }

    const key = event.key;
    const lower = key.toLowerCase();

    if (event.altKey) {
      if (key === "1") { switchMode("standard"); event.preventDefault(); return; }
      if (key === "2") { switchMode("scientific"); event.preventDefault(); return; }
      if (key === "3") { switchMode("converter"); event.preventDefault(); return; }
      if (key === "4") { switchMode("programmer"); event.preventDefault(); return; }
    }

    if (event.ctrlKey || event.metaKey) {
      if (lower === "c" && !window.getSelection().toString()) {
        navigator.clipboard.writeText(elements.mainDisplay.value);
        showToast("Copied to clipboard!");
        event.preventDefault();
        return;
      }
      if (lower === "v") {
        navigator.clipboard.readText().then((clip) => {
          if (clip) {
            appendInput(clip.trim());
          }
        });
        event.preventDefault();
        return;
      }
      return;
    }

    if (key === "Escape") {
      if (!elements.shortcutsModal.classList.contains("hidden")) {
        elements.shortcutsModal.classList.add("hidden");
        return;
      }
      if (!elements.historyDrawer.classList.contains("translate-x-full")) {
        toggleHistoryDrawer(false);
        return;
      }
      clearAll();
      event.preventDefault();
      return;
    }

    if (key === "Enter" || key === "=") {
      computeResult();
      triggerVisualKey("=");
      event.preventDefault();
      return;
    }

    if (key === "Backspace") {
      backspace();
      triggerVisualKey("⌫");
      event.preventDefault();
      return;
    }

    if (lower === "c" || key === "Delete") {
      clearAll();
      triggerVisualKey("C");
      event.preventDefault();
      return;
    }

    if (lower === "h") {
      toggleHistoryDrawer(elements.historyDrawer.classList.contains("translate-x-full"));
      event.preventDefault();
      return;
    }

    if (lower === "m") {
      elements.soundToggle.click();
      event.preventDefault();
      return;
    }

    if (state.mode === "scientific") {
      if (lower === "s") { appendInput("sin("); event.preventDefault(); return; }
      if (lower === "o") { appendInput("cos("); event.preventDefault(); return; }
      if (lower === "t") { appendInput("tan("); event.preventDefault(); return; }
      if (lower === "p") { appendInput("pi"); event.preventDefault(); return; }
      if (lower === "e") { appendInput("e"); event.preventDefault(); return; }
      if (lower === "l") { appendInput("ln("); event.preventDefault(); return; }
      if (key === "!") { appendInput("!"); event.preventDefault(); return; }
    } else {
      if (lower === "s") { appendInput("sqrt("); event.preventDefault(); return; }
    }

    if (/^[0-9+\-*/^().%]$/.test(key)) {
      appendInput(key);
      triggerVisualKey(key);
      event.preventDefault();
    }
  }

  function triggerVisualKey(val) {
    const btn = Array.from(document.querySelectorAll(".calc-btn")).find(
      (b) => b.value === val || (val === "*" && b.value === "×") || (val === "/" && b.value === "÷")
    );
    if (btn) {
      btn.classList.add("pressed");
      setTimeout(() => btn.classList.remove("pressed"), 150);
    }
  }

  // ==========================================
  // INITIALIZATION
  // ==========================================
  function init() {
    setTheme(state.theme);
    if (elements.soundIcon) {
      elements.soundIcon.className = state.soundEnabled
        ? "fa-solid fa-volume-high text-amber-400"
        : "fa-solid fa-volume-xmark text-gray-400";
    }
    updateHistoryBadge();
    updateMemoryBadge();
    initEvents();
    updateDisplay();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
