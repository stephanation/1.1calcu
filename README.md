# ⚡ ApexCalc Pro — Universal High-Precision Calculator & Suite

<div align="center">

![License](https://img.shields.io/badge/License-MIT-amber.svg?style=flat-square)
![Pure JavaScript](https://img.shields.io/badge/ES6%2B-JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v3-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)
![Web Audio API](https://img.shields.io/badge/Audio-Synthesizer-purple?style=flat-square)
![Zero Dependencies](https://img.shields.io/badge/Dependencies-Zero-emerald?style=flat-square)

**A high-precision, multi-modal calculator and engineering computing suite crafted with modern glassmorphic aesthetics, tactile haptic audio feedback, and mathematical rigor.**

[✨ Features](#-features) • [🧮 Modes](#-calculator-modes) • [⌨️ Keyboard Shortcuts](#️-keyboard-shortcuts) • [🎨 Themes](#-themes) • [🚀 Quick Start](#-quick-start)

</div>

---

## 🌟 Overview

**ApexCalc Pro** transforms the everyday web calculator into a full-featured computing environment. Built from the ground up with custom tokenization and an enhanced **Shunting-Yard evaluation algorithm**, it handles unary operations, nested functions, implicit multiplication, and auto-balancing parentheses without external libraries.

---

## ✨ Features

- 🎯 **Advanced Mathematical Engine**:
  - Full Shunting-Yard evaluator with operator precedence, unary minus/plus (`5 * -2 = -10`), and nested parentheses.
  - **Implicit Multiplication**: Type `2(3)` for `6`, `5π` for `15.707...`, or `3sin(30)` seamlessly.
  - **Auto-Balancing Parentheses**: Automatically closes pending `(` brackets when pressing `=`.
  - **Floating-Point Noise Filter**: Eliminates IEEE 754 precision artifacts (e.g. `0.1 + 0.2 = 0.3`).
  - **Live Preview Ghost Display**: Evaluates results in real-time as you type.
  - **Dynamic Font Autoscaling**: Automatically scales down display font size for long numbers to prevent truncation.

- 🔊 **Tactile Haptic Audio Feedback**:
  - Built-in Web Audio API synthesizer generates soft, pleasant mechanical click sounds on button presses.
  - Toggle audio on/off anytime with the sound button or `M` key (saved in `localStorage`).

- 🧠 **Memory Registers**:
  - Full memory bar: `MC` (Clear), `MR` (Recall), `M+` (Add), `M-` (Subtract), and `MS` (Store).
  - Visual badge indicator (`M: <val>`) displays active stored memory.

- 🕒 **Interactive History Drawer**:
  - Real-time persistence via `localStorage` (stores last 50 calculations).
  - Search/filter calculations dynamically.
  - One-click copy, individual item deletion, and re-insertion into active formula.
  - **Export History**: Download history directly as a formatted `.txt` file.

- 📋 **One-Click Clipboard & Toast System**:
  - Quick-copy current result or expressions with visual toast notifications.
  - Full native keyboard paste (`Ctrl+V`) support.

---

## 🧮 Calculator Modes

ApexCalc Pro offers 4 specialized operational modes easily switched via top tabs or `Alt + 1..4`:

### 1. 🧮 Standard Mode (`Alt + 1`)
- Core arithmetic operations: `+`, `−`, `×`, `÷`, `%`, `^`, `√`
- Parentheses and backspace editing
- Clean, focused ergonomics for everyday calculations

### 2. 🔬 Scientific Mode (`Alt + 2`)
- **Trigonometry**: `sin`, `cos`, `tan`, and hyperbolic `sinh`, `cosh`, `tanh`
- **Inverse Functions (`2nd` Key)**: `sin⁻¹`, `cos⁻¹`, `tan⁻¹`, `eˣ`, `10ˣ`, `x²`
- **Angle Modes**: Toggle between **DEG** (Degrees) and **RAD** (Radians) with precision zero-snapping (e.g., `sin(180°) = 0`)
- **Logarithms & Powers**: `ln`, `log10`, `log2`, `eˣ`, `xʸ`, `1/x`
- **Constants**: `π` (Pi), `e` (Euler's number), `φ` (Golden ratio)
- **Advanced Operators**: Factorial (`x!`), Absolute value (`|x|`), Random float (`RAND`)

### 3. 🔄 Unit Converter (`Alt + 3`)
- Real-time two-way unit conversion across 6 essential categories:
  - **Length**: Meters, Kilometers, Centimeters, Millimeters, Miles, Yards, Feet, Inches
  - **Mass / Weight**: Kilograms, Grams, Milligrams, Metric Tons, Pounds, Ounces
  - **Temperature**: Celsius (°C), Fahrenheit (°F), Kelvin (K)
  - **Digital Data**: Bytes (B), KB, MB, GB, TB, PB
  - **Speed**: m/s, km/h, mph, knots
  - **Time**: Milliseconds, Seconds, Minutes, Hours, Days, Weeks, Years
- Instant swap button to reverse conversion directions.

### 4. 💻 Programmer Mode (`Alt + 4`)
- Real-time multi-radix synchronization across:
  - **HEX** (Hexadecimal)
  - **DEC** (Decimal)
  - **OCT** (Octal)
  - **BIN** (Binary, grouped in 4-bit nibbles)
- Configurable word sizes: **64-bit** (QWORD), **32-bit** (DWORD), **16-bit** (WORD), **8-bit** (BYTE)
- Bitwise operations: `NOT`, `LSH` (`<<`), `RSH` (`>>`), `CLR`

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action | Mode |
| :--- | :--- | :--- |
| `0` – `9`, `.` | Input numbers & decimals | All |
| `+`, `-`, `*`, `/` | Basic operators | Standard / Scientific |
| `Enter` or `=` | Calculate result | All |
| `Backspace` | Delete previous character | All |
| `Esc` or `C` | Clear active display | All |
| `Ctrl + C` | Copy current result | All |
| `Ctrl + V` | Paste number/expression | All |
| `Alt + 1` | Switch to **Standard** mode | Global |
| `Alt + 2` | Switch to **Scientific** mode | Global |
| `Alt + 3` | Switch to **Converter** mode | Global |
| `Alt + 4` | Switch to **Programmer** mode | Global |
| `S` | Input `sin(` (or `sqrt(` in Standard) | Standard / Scientific |
| `O` | Input `cos(` | Scientific |
| `T` | Input `tan(` | Scientific |
| `L` | Input `ln(` | Scientific |
| `P` | Input `pi` (π) | Scientific |
| `E` | Input `e` | Scientific |
| `!` | Factorial | Scientific |
| `H` | Toggle History drawer | Global |
| `M` | Toggle Audio sound on/off | Global |

---

## 🎨 Themes

ApexCalc Pro includes 5 carefully balanced color themes stored in `localStorage`:

1. 🌌 **Obsidian** *(Default)* — Sleek slate & deep midnight with amber and gold accents.
2. ☀️ **Aurora** — Crisp, clean light mode with deep indigo and emerald highlights.
3. 💜 **Cyberpunk** — Neon synthwave aesthetic with electric cyan and magenta glows.
4. 🌿 **Emerald** — Calming deep forest green with vibrant jade and mint tones.
5. 🌊 **Oceanic** — Royal deep navy with bright azure accents.

---

## 🚀 Quick Start

No dependencies or build steps required! Simply open `index.html` or `calcu.html` in any modern web browser:

```bash
# Clone the repository
git clone https://github.com/Stephanation/1.1calcu.git

# Navigate into the project folder
cd 1.1calcu

# Open in your browser (Windows)
start index.html

# Open on macOS
open index.html

# Open on Linux
xdg-open index.html
```

Or serve with any static web server:
```bash
npx serve .
# or
python -m http.server 8000
```

---

## 📁 Project Architecture

```
1.1calcu/
├── index.html        # Primary entry point with responsive layout & glassmorphic UI
├── calcu.html        # Backward-compatible direct entry point
├── README.md         # Comprehensive project documentation
├── scripts/
│   └── script.js     # Shunting-Yard evaluator, Web Audio synth, mode & history managers
└── styles/
    └── style.css     # CSS custom property themes, glassmorphism, & micro-interactions
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE). Feel free to use, enhance, and distribute!
