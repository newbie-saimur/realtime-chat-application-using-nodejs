# Universal Backtest Framework v3.0 — Strategy Guide

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

## 10. Bar Replay Usage

TradingView's **Bar Replay** feature replays price history bar by bar, letting you see how the strategy would have acted in real time.

**How to use with this script:**
1. Paste the script in Pine Editor and click **Add to chart**.
2. In the date range input, choose your period (e.g. "Last 1 Year"). The chart shades bars **outside** the window in gray — the white/colored bars are your backtest window.
3. Click the **Replay** clock icon in the TradingView toolbar.
4. Drag the replay cursor to the **start** of your backtest window (beginning of the white/colored zone).
5. Press **Play** or step forward bar by bar.
6. The performance table updates live as each trade opens and closes.

**Key replay settings for accuracy:**
- Keep "Once Per Bar" (not "Once Per Bar Close") unchecked on alerts — the strategy itself fires on bar close internally.
- Use the same timeframe you ran the backtest on.
- Do not use `calc_on_every_tick=true` (already disabled in the script).

---

## 11. Walk-Forward Testing (v3)

Walk-forward testing is the most important anti-overfitting technique for algo strategies.

**How it works in this script:**
1. Enable **Walk-Forward Mode** in the Date Range group.
2. Set **In-Sample %** (default 70%). The period is split: IS = first 70%, OOS = last 30%.
3. The chart shades IS in **blue** and OOS in **green**.
4. **Entries are restricted to OOS only** when walk-forward is on.

**Workflow:**
1. Turn WF mode **OFF**. Optimize parameters on the full period visually.
2. Turn WF mode **ON** (IS=70%). The strategy now only trades the OOS zone.
3. Check OOS results: if they are significantly worse than IS, you are overfitting.
4. A good strategy degrades gracefully (OOS PF ≥ 80% of IS PF).

**What "good" OOS results look like:**
- OOS Win Rate within 5–10 pp of IS
- OOS PF ≥ 1.2 when IS PF was 1.5–2.0
- OOS Sharpe ≥ 0.5 when IS Sharpe was 1.0

---

## 12. New v3 Modules Explained

### Dynamic Spread Engine
Every long entry shifts the effective entry price **up** by `spread + slippage`. Every short entry shifts it **down**. This makes SL and TP levels reflect real execution cost. Combined with commission, this produces honest P&L. `Widen Spread in High Volatility` scales the spread by `ATR / ATR_50_bar_avg` to simulate volatile-market widening.

### Choppiness Index Filter
The Choppiness Index (CHOP) measures whether a market is trending or ranging:
- **CHOP < 38.2** = strong trend (best for this strategy)
- **CHOP > 61.8** = choppy/ranging (blocks trades when enabled)

Enable it to avoid trading in sideways markets where EMA signals are noisy.

### ATR Percentile Filter
Filters out very low-volatility bars (often false breakouts in tight ranges) and very high-volatility bars (erratic, wide spreads, unreliable fills). Set `ATR Pct Min=20` and `ATR Pct Max=80` to trade only in the middle 60% of volatility conditions.

### Sharpe / Sortino / Calmar Ratios
Computed using **Welford's online algorithm** — O(1) per bar, no arrays, no performance penalty.
- **Sharpe**: Mean return / Std of returns × √(bars per year). Target > 1.0.
- **Sortino**: Same but only penalizes downside volatility. Target > 1.5.
- **Calmar**: CAGR / Max Drawdown %. Target > 1.0. The most drawdown-sensitive ratio.

### Dynamic Risk Scaling
After each consecutive loss, risk is reduced: `risk = base × max(0.25, 1 - n × step)`. After a winning streak, risk slowly recovers (capped at `Max Risk %`). This is an **anti-Martingale** approach — never increase risk after losses.

### Quality Score (0–100)
| Component | Max pts | Earned when |
|---|---|---|
| Trade count | 25 | 100+ trades |
| Sharpe ratio | 25 | Sharpe ≥ 2.5 |
| Profit factor | 25 | PF 1.0–4.0 (penalizes >4) |
| Data period | 25 | 1+ year of data |

A score below 50 means the backtest result should not be trusted for live deployment.

### Monthly Returns Table
Shows last 12 months of P&L as a color-coded table (green = profit, red = loss). A good strategy should show mostly green months with losses contained. Consistent negative months in certain conditions (e.g., low-volatility summer) are informative for calendar filters.

---

## 13. How to Validate a Strategy Correctly

1. **Minimum 100 closed trades** before drawing any conclusions.
2. **Walk-forward test** (see Section 11) — OOS must remain profitable.
3. **Multi-symbol test** — apply the exact same parameters to 3+ similar symbols. A robust strategy works on BTCUSDT and ETHUSDT with similar (not identical) results.
4. **Multi-timeframe test** — a 1h strategy should be directionally consistent on 4h.
5. **Check the Quality Score** — target ≥ 65/100 before considering live deployment.
6. **Run with realistic spread and commission** — the Execution Realism score should read "REALISTIC".
7. **Stress-test** — enable randomized slippage and re-run. If results collapse, execution sensitivity is too high.

---

## 14. How to Avoid Curve Fitting

1. **Limit free parameters to 5 or fewer** during any single optimization pass.
2. **Use parameter stability ranges** — a good value should work across ±20% of its range.
3. **Watch for PF > 5** — the Quality Dashboard warns you. Real strategies rarely exceed PF 2.5–3.0 in live markets.
4. **Test in OOS first, optimize in IS second** — not the other way around.
5. **Prefer simple models** — EMA + RSI with sensible SL beats 15-filter complexity.
6. **30-trade minimum** — fewer trades mean any result could be luck. The Quality Dashboard warns when count < 30.
7. **Check drawdown realism** — if Max DD is < 3% of Net Profit, something is off (see `warn_dd_lo` flag).

---

## 15. Best Practices per Asset Class

### BTCUSDT (1h / 4h)
- Spread preset: BTCUSDT
- Commission: 0.05%
- ATR multiplier: 1.5–2.0
- RR: 2.0–2.5
- ADX threshold: 22 (BTC trends strongly when trending)
- Enable Volume Filter (multiplier 1.3)
- Walk-forward IS: 70%, OOS: 30% on 2 years of data

### XAUUSD (15m / 1h)
- Spread preset: XAUUSD
- Commission: 0.01%
- Enable Session: London-NY Overlap (best liquidity)
- ATR multiplier: 1.2–1.5
- RR: 1.5–2.0
- Enable VWAP filter
- Enable Choppiness filter (gold ranges frequently)

### EURUSD (5m / 15m / 1h)
- Spread preset: Forex Major
- Commission: 0.003%
- Enable Session: London or London-NY Overlap
- SL mode: ATR (1.2×) or Fixed (15 pips)
- RR: 1.5–2.0
- Leverage: 10–20× (with small % risk)
- Enable ATR percentile filter (20–75) to avoid low-vol Asian session

### GBPUSD (15m / 1h)
- Same as EURUSD but use Forex Minor spread preset
- GBP pairs have wider spreads, especially around London open
- ATR multiplier: 1.5–2.0 (GBP is more volatile than EUR)
- Enable Choppiness filter

---

## 16. File Structure

```
tradingview/
├── strategy_backtest_framework.pine   ← Main Pine Script strategy (v3.0)
└── STRATEGY_GUIDE.md                  ← This documentation
```
