# Universal Backtest Framework — Strategy Guide

## 1. How the Strategy Works

The script combines four layers of confirmation before entering a trade:

| Layer | Long Condition | Short Condition |
|---|---|---|
| **Trend** | EMA20 > EMA50 | EMA20 < EMA50 |
| **Momentum** | RSI > threshold (default 50) | RSI < threshold (default 50) |
| **Structure** | Close breaks above rolling high | Close breaks below rolling low |
| **Optional** | VWAP / Volume / ADX / HTF EMA | Same (inverted) |

Only when all active layers agree does the strategy fire an entry on the **next bar open** (no repainting — `process_orders_on_close=false`).

### Exit Logic
Exits are managed by `strategy.exit()` with two hard levels:
- **Stop Loss** — set at entry, never moved up/down unless break-even is triggered
- **Take Profit** — derived from `SL distance × RR ratio`

Optional exits: trailing stop, break-even move, partial TP.

---

## 2. Risk Management System

### SL Modes
| Mode | How it works |
|---|---|
| `ATR` | `SL = ATR(14) × multiplier` — adapts to volatility |
| `Fixed` | Fixed points/pips from entry — good for consistent testing |
| `Percent` | `SL = entry_price × percent%` — works across different priced assets |

### Position Sizing
| Mode | Formula |
|---|---|
| `RiskPct` | `qty = (equity × risk%) / (SL_distance × point_value)` |
| `FixedLot` | Fixed contract/lot size per trade |

### Loss Protection
- **Max Daily DD** — blocks new trades if intraday equity drops by this % 
- **Max Consecutive Losses** — pauses trading after N consecutive losses
- **Cooldown Bars** — mandatory pause bars after a loss before re-entering

---

## 3. How to Optimize Parameters

**Step 1 — Start with fewer variables.** Pin down EMA lengths and RR ratio first. Keep filters off.

**Step 2 — Walk-forward test.** Optimize on 70% of data, validate on the remaining 30%. Never optimize on the full dataset.

**Step 3 — Use Pine Script's Strategy Tester optimizer** (right-click input → "Add to optimization"). Optimize one parameter at a time.

**Step 4 — Check for stability.** Good parameters show consistent results across a ±20% range, not a single spike.

**Step 5 — Enable filters one by one.** Add ADX, then VWAP, then Volume. Each filter should improve Profit Factor or reduce drawdown, not just add complexity.

---

## 4. Recommended Settings

### BTCUSDT (1h / 4h)
```
EMA Fast:           20
EMA Slow:           50
RSI Length:         14
RSI Long Min:       52
RSI Short Max:      48
SL Mode:            ATR
ATR Multiplier:     1.5–2.0
RR Ratio:           2.0–2.5
Risk %:             1.0
Use ADX:            true  (threshold 22)
Use Volume Filter:  true  (multiplier 1.3)
Commission:         0.05%
Leverage:           1–3×
```

### XAUUSD (15m / 1h)
```
EMA Fast:           20
EMA Slow:           50
RSI Length:         14
RSI Long Min:       50
RSI Short Max:      50
SL Mode:            ATR
ATR Multiplier:     1.2–1.8
RR Ratio:           1.5–2.0
Risk %:             0.5–1.0
Use VWAP:           true
Session Filter:     0800-1700 (London/NY overlap)
Commission:         0.01% (spread ~$0.30)
Leverage:           1×
```

### EURUSD (5m / 15m / 1h)
```
EMA Fast:           20
EMA Slow:           50
RSI Length:         14
RSI Long Min:       50
RSI Short Max:      50
SL Mode:            Fixed (10–15 pips)
RR Ratio:           1.5–2.0
Risk %:             0.5–1.0
Use ADX:            true  (threshold 20)
Session Filter:     0700-1500 (London session)
Commission:         0.003% (typical spread)
Leverage:           10–20× (forex standard)
```

---

## 5. Common Pine Script Backtesting Pitfalls

### 1. Repainting
**Problem:** Using `request.security()` with `lookahead=barmerge.lookahead_on` reads future values during backtesting.  
**Fix:** Always use `lookahead=barmerge.lookahead_off` (set in this script).

### 2. Look-ahead Bias in S/R Levels
**Problem:** `ta.highest(high, N)` on the current bar includes the current candle.  
**Fix:** Always use `[1]` offset: `ta.highest(high, N)[1]`. Applied in this script.

### 3. `calc_on_every_tick` Inflation
**Problem:** Setting `calc_on_every_tick=true` causes orders to execute at intrabar prices that don't exist in OHLC backtesting.  
**Fix:** Use `calc_on_every_tick=false` (set in this script).

### 4. `process_orders_on_close`
**Problem:** Entries trigger on the same close that generates the signal (not realistic).  
**Fix:** Use `process_orders_on_close=false` so orders fill at the next bar's open.

### 5. Commission / Spread Neglect
**Problem:** Strategies look great with 0 commission but fail live.  
**Fix:** Always set realistic commission in `strategy()` declaration.

### 6. Overfitting to History
**Problem:** Running hundreds of optimizer passes produces a curve-fit strategy.  
**Fix:** See anti-overfitting tips below.

### 7. Pyramiding Errors
**Problem:** Multiple entries stack up and distort position size.  
**Fix:** `pyramiding=0` and checking `strategy.position_size == 0` before entry.

---

## 6. Tips to Avoid Overfitting

1. **Limit free parameters.** Fewer inputs = less room to overfit. This framework has ~20 meaningful inputs — only optimize 3–5 at a time.

2. **Use out-of-sample (OOS) testing.** Optimize Jan 2020–Dec 2022, then run untouched on 2023–2024.

3. **Test across multiple symbols.** A good parameter set should work reasonably on BTCUSDT *and* ETHUSDT, not just the one you optimized on.

4. **Prefer robust ranges.** A parameter that works between 18–24 is better than one that only works at exactly 21.

5. **Check trade count.** Fewer than 30 trades = statistically unreliable. Aim for 100+.

6. **Watch Profit Factor vs. Net Profit.** A PF of 1.3 on 200 trades is more reliable than PF 3.0 on 15 trades.

7. **Monte Carlo thinking.** Randomly shuffle trade order in your head — does the strategy survive a different sequence of wins and losses?

8. **Keep commission realistic.** If your strategy only profits because commission is set to 0, it will fail live.

---

## 7. Alert Setup in TradingView

1. Open the script on a chart.
2. Right-click the chart → **Add Alert**.
3. In the **Condition** dropdown, select one of:
   - `UBF: BUY Signal`
   - `UBF: SELL Signal`
   - `UBF: Long TP Hit`
   - `UBF: Long SL Hit`
   - `UBF: Short TP Hit`
   - `UBF: Short SL Hit`
4. Set **Trigger** to `Once Per Bar Close` for no-repaint alerts.
5. Configure webhook URL if using an automated bot.

---

## 8. Timeframe Compatibility

| Timeframe | Notes |
|---|---|
| 1m | More noise, tighter SL recommended, higher commission impact |
| 5m | Good for scalping with ADX filter |
| 15m | Balanced — good default for Forex/Gold |
| 1h | Best for swing entries, wider ATR SL |
| 4h | Position trading, fewer but higher quality signals |

Enable **HTF Confirmation** on lower timeframes (e.g., trade on 15m but confirm with 1h trend) to reduce false signals.

---

## 9. News Filter Usage

The script contains a `news_filter_ok` variable (always `true` by default).  
To manually block trading during news:
1. Add a boolean input: `i_block_news = input.bool(false, "Block Trades (News Mode)")`
2. Replace `news_filter_ok = true` with `news_filter_ok = not i_block_news`
3. Toggle it on before high-impact events (NFP, CPI, FOMC, etc.)

---

## 10. File Structure

```
tradingview/
├── strategy_backtest_framework.pine   ← Main Pine Script strategy
└── STRATEGY_GUIDE.md                  ← This documentation
```
