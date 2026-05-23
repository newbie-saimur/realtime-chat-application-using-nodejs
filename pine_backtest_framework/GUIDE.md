# PRO Backtest Engine v1.0 — Complete Guide

## Table of Contents
1. [Architecture Overview](#1-architecture-overview)
2. [How to Add New Strategy Logic](#2-how-to-add-new-strategy-logic)
3. [How to Optimize Settings](#3-how-to-optimize-settings)
4. [TradingView Limitations](#4-tradingview-limitations)
5. [Recommended Backtesting Workflow](#5-recommended-backtesting-workflow)
6. [Section-by-Section Reference](#6-section-by-section-reference)

---

## 1. Architecture Overview

```
ProBacktestEngine_v6.pine
│
├── Section 1  — USER INPUTS (categorized groups)
├── Section 2  — CORE UTILITIES (pip size, ATR, helper functions)
├── Section 3  — SESSION ENGINE (London/NY/Asian + killzones)
├── Section 4  — TREND FILTER ENGINE (EMA stack)
├── Section 5  — LIQUIDITY ENGINE (swing high/low sweeps)
├── Section 6  — MARKET STRUCTURE ENGINE (BOS / CHOCH)
├── Section 7  — FAIR VALUE GAP ENGINE (3-candle imbalance)
├── Section 8  — ORDER BLOCK ENGINE (origin candle detection)
├── Section 9  — CONFIRMATION FILTERS (RSI, volume, SMT)
├── Section 10 — RISK MANAGEMENT ENGINE (daily loss, trade limits)
├── Section 11 — TRADE MANAGEMENT (BE, trailing, partial TP)
├── Section 12 — CUSTOM STRATEGY LOGIC  ← YOUR PLUGIN ZONE
├── Section 13 — ORDER EXECUTION LAYER (entry + multi-TP exits)
├── Section 14 — ANALYTICS & PERFORMANCE TRACKING
├── Section 15 — DASHBOARD RENDERING
└── Section 16 — VISUALIZATION LAYER
```

The engine is fully non-repainting. All confirmed signals use `[1]` bar offset
before execution decisions, and `strategy.calc_on_every_tick = false` so orders
only execute at bar close (confirmed OHLC data).

---

## 2. How to Add New Strategy Logic

All custom logic lives in **Section 12**. The zone is clearly marked:

```pine
// ════ SECTION 12 — CUSTOM STRATEGY LOGIC ════
```

### Step 1 — Define your entry conditions

Replace or extend the `longCondition` and `shortCondition` variables:

```pine
// EXAMPLE: SMC Liquidity + CHOCH + FVG confluence
longCondition  = bullLiqSweep[1] and chochBull and priceInBullFVG and isInKillzone
shortCondition = bearLiqSweep[1] and chochBear and priceInBearFVG and isInKillzone
```

### Step 2 — Add custom exit logic (optional)

```pine
customExitLong  = bearFVG_formed or bosBear   // close long on bearish structure
customExitShort = bullFVG_formed or bosBull   // close short on bullish structure
```

### Step 3 — Turn on only the filters you need

In the **Settings panel** on TradingView, toggle:
- `enableFVG`            — require FVG entry zone
- `enableLiquiditySweep` — require prior sweep
- `enableBOS`            — require BOS confirmation
- `enableCHOCH`          — require CHOCH reversal signal
- `enableOrderBlock`     — require OB zone
- `enableEMAFilter`      — require EMA trend alignment
- `enableSessionFilter`  — restrict to active sessions only

### Available Building Blocks (ready to use in Section 12)

| Variable | Description |
|---|---|
| `bullLiqSweep` | Bullish liquidity sweep (bears swept, price reclaimed) |
| `bearLiqSweep` | Bearish liquidity sweep (bulls swept, price rejected) |
| `bosBull` | Bullish Break of Structure |
| `bosBear` | Bearish Break of Structure |
| `chochBull` | Bullish Change of Character (reversal) |
| `chochBear` | Bearish Change of Character (reversal) |
| `priceInBullFVG` | Price inside a bullish FVG zone |
| `priceInBearFVG` | Price inside a bearish FVG zone |
| `bullFVG_formed` | A new bullish FVG formed this bar |
| `bearFVG_formed` | A new bearish FVG formed this bar |
| `priceInBullOB` | Price inside a bullish order block |
| `priceInBearOB` | Price inside a bearish order block |
| `isActiveSession` | Current bar is in a valid trading session |
| `isInKillzone` | Current bar is in London or NY killzone |
| `trendDir` | +1 bullish / -1 bearish / 0 neutral |
| `trendFilterOK_Long` | EMA trend aligned for longs |
| `trendFilterOK_Short` | EMA trend aligned for shorts |
| `structureTrend` | Market structure: +1 uptrend, -1 downtrend |
| `lastSwingHigh` | Most recent confirmed swing high price |
| `lastSwingLow` | Most recent confirmed swing low price |
| `atrValue` | Current ATR value |
| `rsiVal` | Current RSI value |

### Example Strategy Recipes

**Pure SMC (Smart Money Concepts):**
```pine
longCondition  = bullLiqSweep and chochBull and priceInBullFVG and trendDir == 1
shortCondition = bearLiqSweep and chochBear and priceInBearFVG and trendDir == -1
```

**Order Block + Killzone:**
```pine
longCondition  = priceInBullOB and isInKillzone and bosBull
shortCondition = priceInBearOB and isInKillzone and bosBear
```

**Session Open + FVG:**
```pine
longCondition  = isLondonKZ and bullFVG_formed and trendDir == 1
shortCondition = isLondonKZ and bearFVG_formed and trendDir == -1
```

**Scalping (EMA + Volume):**
```pine
longCondition  = ta.crossover(emaFast, emaSlow) and volSpike and isInKillzone
shortCondition = ta.crossunder(emaFast, emaSlow) and volSpike and isInKillzone
```

---

## 3. How to Optimize Settings

### Risk Management Optimization

Start conservative and scale up once edge is proven:

| Parameter | Conservative | Balanced | Aggressive |
|---|---|---|---|
| Risk % Per Trade | 0.5% | 1.0% | 2.0% |
| Max Daily Loss % | 2% | 3% | 5% |
| Max Trades/Day | 3 | 5 | 10 |
| Max Consec. Losses | 2 | 3 | 5 |

### SL Mode Selection

- **ATR (recommended):** Adapts to volatility. Use multiplier 1.5–2.0 for swing, 0.75–1.2 for scalping.
- **Fixed:** Use when backtesting specific pip-based systems.
- **Structure:** Uses the nearest swing level. Best for SMC strategies.

### Take Profit Optimization

The default multi-TP structure (33%/33%/34%) balances:
- TP1 = secure partial profit + fund break-even
- TP2 = core target
- TP3 = runner for extended moves

Recommended starting RR targets:
- Scalping: TP1=1.0, TP2=1.5, TP3=2.5
- Intraday: TP1=1.5, TP2=2.5, TP3=4.0
- Swing: TP1=2.0, TP2=4.0, TP3=8.0

### Session Timing

Sessions use Exchange timezone (UTC+0 by default). Adjust to match your broker's
chart timezone:

- London: 08:00–17:00 UTC
- New York: 13:00–22:00 UTC
- Asian: 00:00–09:00 UTC
- London Killzone: 07:00–09:00 UTC
- NY Killzone: 12:00–14:00 UTC

### EMA Settings by Timeframe

| Timeframe | Fast | Slow | Trend |
|---|---|---|---|
| 1m | 9 | 21 | 50 |
| 5m | 12 | 26 | 100 |
| 15m | 20 | 50 | 200 |
| 1H | 20 | 50 | 200 |
| 4H | 20 | 50 | 200 |
| Daily | 10 | 21 | 50 |

---

## 4. TradingView Limitations

### Label/Box Limit
TradingView limits labels and boxes to **500 visible objects** at once.
The engine is optimized to avoid this:
- FVG boxes only draw for **active** (unmitigated) zones
- BOS/CHOCH/sweep labels draw only on signal bars (not retroactively)
- OB boxes overwrite (not accumulate) on each update

**Mitigation:** If you see "Too many objects" errors, reduce `fvgLookback`, 
`liquidityLookback`, or `obLookback` to generate fewer signals.

### Max Bars Back
Pine Script allows a maximum of **5000 bars** by default (extendable to 20,000
with `max_bars_back`). Add to the strategy declaration if needed:
```pine
max_bars_back = 5000
```

### `calc_on_every_tick`
Set to `false` (default) for accurate backtesting — orders execute only on
confirmed bar closes. Setting to `true` improves real-time behavior but
introduces lookahead in backtests.

### No Real-Time News Data
TradingView does not expose economic calendar data to Pine Script.
The `newsFilterOK` placeholder always returns `true`. To work around this,
manually mark high-impact news events with the `time()` function:
```pine
newsFilterOK = not (
    time == timestamp("2024-11-07 14:30 UTC") or   // FOMC
    time == timestamp("2024-12-06 13:30 UTC")       // NFP
)
```

### Pyramiding
The framework is set to `pyramiding = 1` (one position at a time). Increasing
this allows multiple simultaneous entries but requires proportional risk
reduction per entry.

### No Tick Data on Free Accounts
Historical tick data for slippage simulation requires a TradingView Pro+
subscription. The `slippage = 2` setting approximates 2 ticks of slippage
per trade.

### Repaint Risk Areas
The engine avoids repainting by:
- Using `[1]` offsets on all signal calculations
- Using confirmed `close[1]` for structure comparisons
- NOT using `request.security()` with `lookahead=barmerge.lookahead_on`
- Pivot detection uses `ta.pivothigh/pivotlow` which are inherently delayed

---

## 5. Recommended Backtesting Workflow

### Phase 1 — Baseline
1. Paste the script into TradingView Pine Editor
2. Apply to desired symbol and timeframe
3. Disable all filters (`enableEMAFilter=false`, etc.)
4. Run 2+ years of history
5. Note baseline win rate and profit factor

### Phase 2 — Filter Stacking
Enable filters one at a time and measure impact:
1. Enable `enableEMAFilter` → does win rate improve?
2. Enable `enableSessionFilter` → better performance in specific sessions?
3. Enable `enableFVG` → does FVG confluence improve quality?
4. Enable `enableLiquiditySweep` → does sweep confirmation help?

Always compare:
- Win Rate (target: >50%)
- Profit Factor (target: >1.5)
- Max Drawdown (target: <15%)
- Expectancy (target: >0.2R)

### Phase 3 — Risk Calibration
1. Find the SL mode with best results (ATR vs Structure)
2. Optimize ATR multiplier (1.0–2.5 range)
3. Test TP1 partial size (25%/33%/50%)
4. Enable Break-Even and measure impact on max drawdown

### Phase 4 — Forward Test
1. Switch to paper trading on demo account
2. Run for minimum 50 trades
3. Compare live results vs backtest
4. Accept 10–20% degradation from backtest as normal

### Phase 5 — Live Deployment
1. Start with minimum risk (0.5% per trade)
2. Monitor daily loss limiter
3. Scale only after 3 consecutive profitable months

---

## 6. Section-by-Section Reference

### Section 3 — Session Engine
Sessions use `time(timeframe.period, session_string, "UTC+0")`.
The session string format is `"HHMM-HHMM"`.

To add a custom session:
```pine
myCustomSession = input.session("0600-0800", "My Session", group=sessGroup)
isMySession     = not na(time(timeframe.period, myCustomSession, "UTC+0"))
```
Then include `isMySession` in the `isActiveSession` condition.

### Section 5 — Liquidity Engine
Swing points use `ta.pivothigh` / `ta.pivotlow` with your defined lookback.
Larger lookback = fewer but more significant levels.
Smaller lookback = more signals, more noise.

The sweep detection checks:
- Wick beyond the level (`low[1] < lastSwingLow`)
- Close back above the level (`close[1] > lastSwingLow`)

This "wick-through-then-reject" pattern is the core SMC sweep definition.

### Section 6 — BOS / CHOCH
- **BOS** detects when price closes beyond the prior `bosLength`-bar extreme
- **CHOCH** fires when the `structureTrend` flips direction

`structureTrend` updates automatically from BOS/CHOCH events.
CHOCH is most powerful when combined with a liquidity sweep (trap-and-reverse).

### Section 7 — FVG Engine
Stores up to 10 active FVGs in arrays. Each FVG is deactivated when price
trades through it (mitigation). Only unmitigated FVGs trigger the filter.

To increase FVG memory:
```pine
maxFVGStorage = 20   // increase from 10
```

### Section 8 — Order Block Engine
Finds the **last opposing candle** before an impulse move.
- Bullish OB = last bearish candle before bull impulse
- Bearish OB = last bullish candle before bear impulse

Only the most recent OB of each type is tracked. For multi-OB tracking,
convert `bullOBTop/Bot` to arrays (same pattern as FVG section).

### Section 10 — Risk Management
The risk gate checks 5 conditions before any trade:
1. Within backtest date range
2. Daily loss < `maxDailyLossPct`
3. Trades today < `maxTradesPerDay`
4. Consecutive losses < `maxConsecLosses`
5. Cooldown bars elapsed since last loss

All 5 must pass for `riskGateOK = true`.

### Section 11 — Trade Management
- **Break-Even:** Moves SL to entry + buffer when price reaches `breakEvenRR × SL distance`
- **Trailing:** Uses ATR-based trailing calculated on each bar
- Both systems call `strategy.exit()` with updated stop prices

Note: Pine Script only processes the **last** `strategy.exit()` call for a given
`id`. The framework uses separate exit IDs (`"BE Long"`, `"Trail Long"`) so they
don't overwrite the TP exits.
