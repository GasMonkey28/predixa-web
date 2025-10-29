#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
OptiSpark: Enhanced Daily LONG/SHORT Tier Builder with Market Explanation System (Lambda-ready)
- Loads DB + config from S3 each invocation (no redeploy to change thresholds).
- Optional writes: S3 JSON + SQLite table upsert (with version-aware fallback).
- NEW: Enhanced analysis with market explanation system and user-friendly JSON output.
- Generates summary JSON similar to local.ipynb but saves to AWS S3 bucket.
"""

import os, json, sqlite3, boto3, re, shutil
import numpy as np
import pandas as pd
from contextlib import closing
from botocore.exceptions import ClientError
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional

# ---------- /tmp helpers ----------
def _tmp_free_mb(path="/tmp"):
    total, used, free = shutil.disk_usage(path)
    return free // (1024 * 1024)

def _download_db_once(s3, bucket, key, local):
    """
    Head the object to estimate size, ensure we have space, then download.
    Skip download if file already exists (warm Lambda).
    """
    if os.path.exists(local):
        return
    try:
        head = s3.head_object(Bucket=bucket, Key=key)
        size_mb = head["ContentLength"] // (1024 * 1024)
    except ClientError as e:
        raise RuntimeError(f"S3 head failed for s3://{bucket}/{key}: {e}")

    free_mb = _tmp_free_mb()
    # Require file size + 256 MB safety margin
    if free_mb < size_mb + 256:
        raise OSError(f"Insufficient /tmp space: need ~{size_mb+256}MB, have {free_mb}MB")

    os.makedirs(os.path.dirname(local), exist_ok=True)
    s3.download_file(bucket, key, local)

def _cleanup_tmp(paths):
    for p in paths:
        try:
            if os.path.isfile(p):
                os.remove(p)
        except Exception:
            # Best-effort cleanup; don't fail the invocation because of this
            pass


MODELS_PREFIX   = os.getenv("MODELS_PREFIX", "ml_out")
SOURCE          = os.getenv("SOURCE", "s3_json")   # 's3_json' or 'sqlite'
MODEL_NAMES_ENV = os.getenv("MODEL_NAMES")         # optional CSV override

# =========================
# Env / S3 Paths
# =========================
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")

# Accept both Lambda-style and your local names
DB_BUCKET  = (
    os.getenv("DB_BUCKET")
    or os.getenv("S3_DATABASE_BUCKET")
    or "tradespark-822233328169-us-east-1"
)
DB_KEY     = (
    os.getenv("DB_KEY")
    or os.getenv("S3_DATABASE_KEY")
    or "db/tradespark.db"
)

CONFIG_BUCKET = os.getenv("CONFIG_BUCKET", DB_BUCKET)
CONFIG_KEY    = os.getenv("CONFIG_KEY",    "tiers/config.json")

# Optional flags (must be exactly "1" to enable)
WRITE_TIER_TO_S3 = os.getenv("WRITE_TIER_TO_S3", "0") == "1"
STORE_IN_DB      = os.getenv("STORE_IN_DB", "0") == "1"

# Optional backfill/test override: "YYYY-MM-DD"
AS_OF_OVERRIDE   = os.getenv("AS_OF_OVERRIDE")

# Historical lookback for percentile histograms (cap for runtime)
HIST_MAX_DAYS    = int(os.getenv("HIST_MAX_DAYS", "180"))  # typical: 90–270

# Local temp path on Lambda
DB_LOCAL = "/tmp/tradespark.db"


# =========================
# S3 client
# =========================
s3 = boto3.client("s3", region_name=AWS_REGION)

def download_db():
    _download_db_once(s3, DB_BUCKET, DB_KEY, DB_LOCAL)
    print(f"✅ DB ready at {DB_LOCAL}")


def load_config_from_s3():
    try:
        obj = s3.get_object(Bucket=CONFIG_BUCKET, Key=CONFIG_KEY)
        cfg = json.loads(obj["Body"].read())
        print(f"✅ Loaded config from s3://{CONFIG_BUCKET}/{CONFIG_KEY}")
        return cfg
    except Exception as e:
        print(f"⚠️ Could not load config s3://{CONFIG_BUCKET}/{CONFIG_KEY}: {e}")
        return {}

_cfg = {}
def _cfg_get(path, default):
    cur = _cfg
    try:
        for k in path:
            cur = cur[k]
        return cur
    except Exception:
        return default

def _extract_date_from_prefix(p: str):
    # supports like 'ml_out/2025-09-26/' → '2025-09-26'
    m = re.search(r"(\d{4}-\d{2}-\d{2})/?$", p.rstrip("/"))
    return m.group(1) if m else None

def _list_common_prefixes(bucket, prefix, continuation_token=None):
    kw = dict(Bucket=bucket, Prefix=prefix, Delimiter="/")
    if continuation_token:
        kw["ContinuationToken"] = continuation_token
    return s3.list_objects_v2(**kw)

def list_available_dates_from_s3(bucket: str, base_prefix: str) -> list[str]:
    """
    Paginated listing of 'MODELS_PREFIX/YYYY-MM-DD/' folders.
    Returns sorted list of date strings.
    """
    base = base_prefix.rstrip("/") + "/"
    dates = []
    token = None
    while True:
        resp = _list_common_prefixes(bucket, base, token)
        for cp in resp.get("CommonPrefixes", []):
            d = _extract_date_from_prefix(cp["Prefix"])
            if d:
                dates.append(d)
        if resp.get("IsTruncated"):
            token = resp.get("NextContinuationToken")
        else:
            break
    return sorted(set(dates))

def load_eval_from_s3_for_dates(as_of_dates: list[str], model_names: list[str]) -> pd.DataFrame:
    """
    Bulk loader: same schema as load_eval_from_s3 but across many dates.
    """
    rows = []
    for as_of_date in as_of_dates:
        base = f"{MODELS_PREFIX.rstrip('/')}/{as_of_date}/"
        for m in model_names:
            key = f"{base}{m}.json"
            try:
                obj = s3.get_object(Bucket=DB_BUCKET, Key=key)
                data = json.loads(obj["Body"].read())
            except Exception as e:
                # Skip silently if missing for this date/model
                continue

            preds   = data.get("predictions", {}) or {}
            metrics = data.get("metrics", {}) or {}
            rmse_pct = metrics.get("rmse_pct", {}) or {}
            acc_pct  = metrics.get("acc_pct",  {}) or {}
            rmse_abs = data.get("rmse", {}) or {}

            row = {"as_of_date_today": as_of_date, "model_name": m}

            for i in range(1, 9):
                yk = f"y{i}"
                if yk in preds:
                    row[f"{yk}_pred"] = float(preds[yk])

            for i in range(1, 9):
                yk = f"y{i}"
                if yk in rmse_abs:
                    row[f"{yk}_rmse"] = float(rmse_abs[yk])
                if yk in rmse_pct:
                    row[f"{yk}_rmse_pct"] = float(rmse_pct[yk])
                elif yk in rmse_abs:
                    row[f"{yk}_rmse_pct"] = float(rmse_abs[yk]) * 100.0
                if yk in acc_pct:
                    row[f"{yk}_acc"] = float(acc_pct[yk])
                elif yk in rmse_abs:
                    r = float(rmse_abs[yk])
                    row[f"{yk}_acc"] = max(0.0, 100.0 - r * 10.0)

            tf = data.get("top_features", None)
            top_pairs = []
            if isinstance(tf, list):
                top_pairs = [(str(item.get("name")), float(item.get("importance", 0.0))) for item in tf]
            elif isinstance(tf, dict):
                for k in sorted(tf.keys(), key=lambda x: int(re.sub(r"\D+", "", x) or "9999")):
                    item = tf[k] or {}
                    top_pairs.append((str(item.get("name")), float(item.get("importance", 0.0))))

            top_pairs = (top_pairs + [("_pad_", 0.0)]*20)[:20]
            for i, (nm, imp) in enumerate(top_pairs, start=1):
                row[f"top_feature_{i}_name"] = nm
                row[f"top_feature_{i}_importance"] = imp

            rows.append(row)

    df = pd.DataFrame(rows)
    if not df.empty:
        df["as_of_date_today"] = pd.to_datetime(df["as_of_date_today"])
    return df

def load_history_from_db(model_names, as_of_str, lookback_days):
    """
    Read historical rows (< as_of_str) for the given models from SQLite DB in S3.
    Returns a DataFrame with the same columns you already use downstream.
    """
    # Ensure local DB copy exists
    download_db()
    conn = sqlite3.connect(DB_LOCAL)

    try:
        df = pd.read_sql_query(
            f"""
            SELECT *
            FROM model_eval_summary
            WHERE model_name IN ({",".join(["?"]*len(model_names))})
              AND DATE(as_of_date_today) < DATE(?)
            ORDER BY as_of_date_today ASC
            """,
            conn,
            params=model_names + [as_of_str]
        )
    finally:
        conn.close()

    if df.empty:
        return df

    df["as_of_date_today"] = pd.to_datetime(df["as_of_date_today"])

    # Keep only the trailing `lookback_days` worth of distinct dates (like your local script)
    min_keep_date = pd.to_datetime(as_of_str) - pd.Timedelta(days=lookback_days)
    df = df[df["as_of_date_today"] >= min_keep_date]

    # Keep just the columns you rely on later (safe if others are present)
    need = {"as_of_date_today","model_name"}
    for k in [1,2,3,7,8]:
        need.update({f"y{k}_pred", f"y{k}_rmse_pct", f"y{k}_acc"})
    cols = [c for c in df.columns if c in need]
    if cols:
        df = df[cols].copy()

    return df


# =========================
# Math / helpers
# =========================
def _to_float(x, default=np.nan):
    try: return float(x)
    except Exception: return default

def robust_z(series, value):
    s = pd.Series(series).dropna()
    if len(s) < 10:
        mu = s.mean() if len(s) else 0.0
        sd = s.std(ddof=0) if len(s) else 1.0
        if sd <= 1e-9: sd = 1.0
        return (value - mu) / sd
    med = s.median()
    mad = (np.abs(s - med)).median()
    if mad < 1e-9:
        sd = s.std(ddof=0)
        if sd <= 1e-9: sd = 1.0
        return (value - s.mean()) / sd
    return 0.6745 * (value - med) / mad

def relu(x):
    try: return max(0.0, float(x))
    except Exception: return 0.0

def softmax_temp(x, T=1.0):
    x = np.array(x, dtype=float)
    if x.size == 0 or np.all(~np.isfinite(x)): return np.zeros_like(x)
    x = x / max(T, 1e-9)
    x = x - np.nanmax(x)
    ex = np.exp(np.nan_to_num(x, nan=-1e9))
    s = ex.sum()
    return (ex / s) if s > 0 else np.zeros_like(ex)

def apply_floor(w, floor=0.0):
    w = np.array(w, dtype=float) + floor
    s = w.sum()
    return (w / s) if s > 0 else (np.ones_like(w) / len(w))

def blend_with_prior(w, prior, alpha=1.0):
    w = np.array(w, dtype=float)
    prior = np.array(prior, dtype=float)
    if w.size != prior.size:
        s = w.sum()
        return w / (s if s > 0 else 1.0)
    mix = alpha*w + (1.0-alpha)*prior
    s = mix.sum()
    return (mix / s) if s > 0 else (np.ones_like(mix) / len(mix))

def norm_conf(today_val, hist_series, invert=False):
    s = pd.Series(hist_series).dropna()
    if len(s) < 10 or not np.isfinite(today_val):
        if not np.isfinite(today_val): return 0.5
        v01 = np.clip(today_val/100.0, 0, 1)
        return (1.0 - v01) if invert else v01
    q10, q90 = np.nanpercentile(s, [10, 90])
    span = max(q90 - q10, 1e-6)
    if invert:
        return float(np.clip((q90 - today_val)/span, 0, 1))
    return float(np.clip((today_val - q10)/span, 0, 1))

def make_conf(row_today, hist_df, acc_cols, rmse_cols):
    acc_today  = np.nanmean([_to_float(row_today.get(c)) for c in acc_cols])
    rmse_today = np.nanmean([_to_float(row_today.get(c)) for c in rmse_cols])
    acc_hist   = pd.concat([pd.to_numeric(hist_df[c], errors="coerce")
                            for c in acc_cols if c in hist_df], axis=1).mean(axis=1)
    rmse_hist  = pd.concat([pd.to_numeric(hist_df[c], errors="coerce")
                            for c in rmse_cols if c in hist_df], axis=1).mean(axis=1)
    return 0.5*norm_conf(acc_today, acc_hist, invert=False) + 0.5*norm_conf(rmse_today, rmse_hist, invert=True)

def side_skill(sub_df, side, as_of, roll_primary, roll_fallback, min_hist):
    if side == "long":
        acc_cols, rmse_cols = ["y1_acc", "y8_acc"], ["y1_rmse_pct", "y8_rmse_pct"]
    else:
        acc_cols, rmse_cols = ["y2_acc", "y7_acc"], ["y2_rmse_pct", "y7_rmse_pct"]

    hist = sub_df[sub_df["as_of_date_today"] < as_of].tail(roll_primary)
    if len(hist) < min_hist:
        hist = sub_df[sub_df["as_of_date_today"] < as_of].tail(roll_fallback)
    if len(hist) < min_hist:
        hist = sub_df[sub_df["as_of_date_today"] < as_of]
    if hist.empty: return 0.0

    def mean_cols(cols):
        cols = [c for c in cols if c in hist.columns]
        if not cols: return np.nan
        arr = pd.concat([pd.to_numeric(hist[c], errors="coerce") for c in cols], axis=1).mean(axis=1)
        return arr.dropna().mean()

    acc_mean_raw  = mean_cols(acc_cols)
    rmse_mean_raw = mean_cols(rmse_cols)

    acc_mean  = np.clip(acc_mean_raw,  0, 100) if np.isfinite(acc_mean_raw)  else 50.0
    rmse_mean = np.clip(rmse_mean_raw, 0, 200) if np.isfinite(rmse_mean_raw) else 50.0

    return float(0.6*acc_mean + 0.4*(100.0 - rmse_mean))

def bias_tag(side, score, hist):
    z = robust_z(hist if len(hist) else [0,1], score)
    if side == "long":
        if z >= 2.5:  return "Strong buy-the-dip bias"
        if z >= 1.5:  return "Buy-the-dip bias"
        if z <= -2.5: return "Strong sell-the-rip bias"
        if z <= -1.5: return "Sell-the-rip bias"
        return "Neutral/Two-way"
    else:
        if z >= 2.5:  return "Strong sell-the-rip bias"
        if z >= 1.5:  return "Sell-the-rip bias"
        if z <= -2.5: return "Strong buy-the-dip bias"
        if z <= -1.5: return "Buy-the-dip bias"
        return "Neutral/Two-way"

def assign_tier(value, hist, top_cum_pcts, labels):
    h = pd.Series(hist).dropna()
    if len(h) == 0: return labels[len(labels)//2]
    thresholds = [np.nanpercentile(h, 100 - p) for p in top_cum_pcts]
    for label, thr in zip(labels, thresholds):
        if value >= thr: return label
    return labels[-1]

def percentile_rank(hist, value):
    h = pd.Series(hist).dropna().sort_values()
    if len(h) == 0: return np.nan
    return float((h <= value).mean() * 100.0)

def tier_thresholds(hist, top_cum_pcts):
    h = pd.Series(hist).dropna()
    if len(h) == 0: return [np.nan]*len(top_cum_pcts)
    return [float(np.nanpercentile(h, 100 - p)) for p in top_cum_pcts]

# =========================
# Enhanced Explanation System
# =========================
class MarketExplanationSystem:
    """Enhanced explanation system with market compensation logic."""
    
    def __init__(self):
        self.tier_strengths = {"SSS": 9, "SS": 8, "S": 7, "A+": 6, "A": 5, "B+": 4, "B": 3, "C+": 2, "C": 1, "D": 0}
        
    def get_tier_strength(self, tier: str) -> int:
        """Get numerical strength of a tier (higher = stronger)."""
        return self.tier_strengths.get(tier, 5)  # Default to middle if unknown
        
    def get_tier_difference(self, tier1: str, tier2: str) -> int:
        """Calculate tier difference (positive = tier1 stronger)."""
        return self.get_tier_strength(tier1) - self.get_tier_strength(tier2)
        
    def get_yesterday_data(self, conn, today_date: str) -> Tuple[Optional[Dict], Optional[Dict]]:
        """Get yesterday's tier data and price data from both DB and S3 fallback."""
        try:
            # First try to get from database (new format)
            tier_query = """
            SELECT * FROM daily_tiers 
            WHERE as_of_date_today < ? 
            ORDER BY as_of_date_today DESC 
            LIMIT 1
            """
            tier_df = pd.read_sql_query(tier_query, conn, params=[today_date])
            
            yesterday_tiers = None
            if not tier_df.empty:
                yesterday_tiers = tier_df.iloc[0].to_dict()
            else:
                # Fallback: try to get from old S3 JSON format
                try:
                    from datetime import datetime, timedelta
                    yesterday_date = (datetime.strptime(today_date, "%Y-%m-%d") - timedelta(days=1)).strftime("%Y-%m-%d")
                    old_key = f"tiers/{yesterday_date}.json"
                    
                    # Import s3 client (assuming it's available in scope)
                    import boto3
                    s3 = boto3.client("s3", region_name="us-east-1")
                    
                    obj = s3.get_object(Bucket="tradespark-822233328169-us-east-1", Key=old_key)
                    old_data = json.loads(obj["Body"].read())
                    
                    # Convert old format to new format for compatibility
                    yesterday_tiers = {
                        "as_of_date_today": old_data["date"],
                        "long_score": old_data["long"]["score"],
                        "long_tier": old_data["long"]["tier"],
                        "short_score": old_data["short"]["score"],
                        "short_tier": old_data["short"]["tier"],
                        "details_json": json.dumps(old_data, ensure_ascii=False)
                    }
                    print(f"📥 Retrieved yesterday's data from old S3 format: {old_key}")
                    
                except Exception as s3_error:
                    print(f"⚠️ Could not retrieve yesterday's data from S3: {s3_error}")
            
            # Get yesterday's price data (if available)
            price_query = """
            SELECT * FROM price_history 
            WHERE ticker = 'SPY' AND date < ? 
            ORDER BY date DESC 
            LIMIT 1
            """
            price_df = pd.read_sql_query(price_query, conn, params=[today_date])
            yesterday_price = price_df.iloc[0].to_dict() if not price_df.empty else None
            
            return yesterday_tiers, yesterday_price
            
        except Exception as e:
            print(f"Error getting yesterday's data: {e}")
            return None, None
            
    def calculate_price_movement(self, price_data: Dict) -> Dict:
        """Calculate various price movement metrics."""
        if not price_data or not all(k in price_data for k in ['open_price', 'close_price', 'high_price', 'low_price']):
            return {}
            
        open_price = price_data.get('open_price', 0)
        close_price = price_data.get('close_price', 0)
        high_price = price_data.get('high_price', 0)
        low_price = price_data.get('low_price', 0)
        
        if open_price == 0:
            return {}
            
        # Basic movement
        close_open_change = close_price - open_price
        close_open_pct = (close_open_change / open_price) * 100
        
        # Range analysis
        high_open_change = high_price - open_price
        low_open_change = low_price - open_price
        high_open_pct = (high_open_change / open_price) * 100
        low_open_pct = (low_open_change / open_price) * 100
        
        # Intraday range
        intraday_range = high_price - low_price
        intraday_range_pct = (intraday_range / open_price) * 100
        
        return {
            'close_open_change': close_open_change,
            'close_open_pct': close_open_pct,
            'high_open_pct': high_open_pct,
            'low_open_pct': low_open_pct,
            'intraday_range_pct': intraday_range_pct,
            'direction': 'up' if close_open_pct > 0 else 'down' if close_open_pct < 0 else 'flat',
            'strength': 'strong' if abs(close_open_pct) > 2 else 'moderate' if abs(close_open_pct) > 0.5 else 'weak'
        }
        
    def analyze_prediction_accuracy(self, yesterday_tiers: Dict, yesterday_price: Dict) -> Dict:
        """Analyze how well yesterday's tiers predicted the actual price movement."""
        if not yesterday_tiers or not yesterday_price:
            return {'analysis': 'insufficient_data', 'compensation_factor': 0.0}
            
        # Parse yesterday's tiers
        try:
            details = json.loads(yesterday_tiers.get('details_json', '{}'))
            long_tier = details.get('long', {}).get('tier', 'C')
            short_tier = details.get('short', {}).get('tier', 'C')
            long_score = details.get('long', {}).get('score', 0)
            short_score = details.get('short', {}).get('score', 0)
        except:
            return {'analysis': 'parse_error', 'compensation_factor': 0.0}
            
        # Calculate price movement
        price_movement = self.calculate_price_movement(yesterday_price)
        if not price_movement:
            return {'analysis': 'no_price_data', 'compensation_factor': 0.0}
            
        # Determine predicted direction based on tier strength
        tier_diff = self.get_tier_difference(long_tier, short_tier)
        score_diff = long_score - short_score
        
        predicted_direction = 'neutral'
        prediction_strength = 'weak'
        
        # FIXED LOGIC: Positive tier_diff means long is stronger (better tier)
        if abs(tier_diff) >= 2:  # Strong tier difference
            predicted_direction = 'long' if tier_diff > 0 else 'short'
            prediction_strength = 'strong'
        elif abs(tier_diff) == 1:  # Moderate tier difference
            predicted_direction = 'long' if tier_diff > 0 else 'short'
            prediction_strength = 'moderate'
        elif abs(score_diff) > 0.5:  # Use scores if tiers are close
            predicted_direction = 'long' if score_diff > 0 else 'short'
            prediction_strength = 'moderate'
            
        # Compare with actual movement
        actual_direction = price_movement['direction']
        actual_strength = price_movement['strength']
        
        # Calculate compensation factor
        compensation_factor = 0.0
        analysis = 'neutral'
        
        if predicted_direction != 'neutral' and actual_direction != 'flat':
            # FIXED: Long should equal up, short should equal down
            prediction_correct = (
                (predicted_direction == 'long' and actual_direction == 'up') or
                (predicted_direction == 'short' and actual_direction == 'down')
            )
            
            if not prediction_correct:
                # Prediction was wrong - high compensation potential
                if prediction_strength == 'strong' and actual_strength == 'strong':
                    compensation_factor = 0.8  # Strong compensation
                    analysis = 'strong_compensation'
                elif prediction_strength in ['strong', 'moderate'] and actual_strength in ['strong', 'moderate']:
                    compensation_factor = 0.6  # Moderate compensation
                    analysis = 'moderate_compensation'
                else:
                    compensation_factor = 0.3  # Weak compensation
                    analysis = 'weak_compensation'
            else:
                # Prediction was correct - low compensation
                if prediction_strength == 'strong' and actual_strength == 'strong':
                    compensation_factor = 0.1  # Minimal compensation
                    analysis = 'correct_strong'
                else:
                    compensation_factor = 0.2  # Low compensation
                    analysis = 'correct_moderate'
        else:
            analysis = 'neutral_market'
            
        return {
            'analysis': analysis,
            'compensation_factor': compensation_factor,
            'predicted_direction': predicted_direction,
            'prediction_strength': prediction_strength,
            'actual_direction': actual_direction,
            'actual_strength': actual_strength,
            'tier_difference': tier_diff,
            'score_difference': score_diff,
            'price_movement': price_movement
        }
        
    def analyze_tier_relationship(self, long_tier: str, short_tier: str, 
                                long_score: float, short_score: float) -> Dict:
        """Analyze the relationship between long and short tiers."""
        tier_diff = self.get_tier_difference(long_tier, short_tier)
        score_diff = long_score - short_score
        
        # Determine market implications
        if abs(tier_diff) >= 3:  # Very strong difference
            if tier_diff > 0:
                market_type = 'strong_bullish'
                confidence = 'very_high'
            else:
                market_type = 'strong_bearish'
                confidence = 'very_high'
        elif abs(tier_diff) == 2:  # Strong difference
            if tier_diff > 0:
                market_type = 'bullish'
                confidence = 'high'
            else:
                market_type = 'bearish'
                confidence = 'high'
        elif abs(tier_diff) == 1:  # Moderate difference
            if tier_diff > 0:
                market_type = 'slightly_bullish'
                confidence = 'moderate'
            else:
                market_type = 'slightly_bearish'
                confidence = 'moderate'
        else:  # Similar tiers
            if abs(score_diff) > 0.5:
                if score_diff > 0:
                    market_type = 'slightly_bullish'
                    confidence = 'low'
                else:
                    market_type = 'slightly_bearish'
                    confidence = 'low'
            else:
                market_type = 'neutral'
                confidence = 'very_low'
                
        # Determine if both sides are strong (choppy market potential)
        both_strong = (self.get_tier_strength(long_tier) >= 6 and 
                      self.get_tier_strength(short_tier) >= 6)
        
        return {
            'tier_difference': tier_diff,
            'score_difference': score_diff,
            'market_type': market_type,
            'confidence': confidence,
            'both_strong': both_strong,
            'long_strength': self.get_tier_strength(long_tier),
            'short_strength': self.get_tier_strength(short_tier)
        }
        
    def generate_trading_suggestions(self, tier_analysis: Dict, compensation_analysis: Dict) -> List[str]:
        """Generate actionable trading suggestions based on analysis."""
        suggestions = []
        
        # Base suggestions from tier analysis
        market_type = tier_analysis['market_type']
        confidence = tier_analysis['confidence']
        both_strong = tier_analysis['both_strong']
        
        if market_type == 'strong_bullish' and confidence == 'very_high':
            suggestions.append("🚀 STRONG BULLISH SIGNAL: Consider aggressive long positions with high confidence")
        elif market_type == 'strong_bearish' and confidence == 'very_high':
            suggestions.append("📉 STRONG BEARISH SIGNAL: Consider short positions or protective puts with high confidence")
        elif market_type in ['bullish', 'slightly_bullish']:
            if confidence == 'high':
                suggestions.append("📈 BULLISH BIAS: Consider long positions with moderate size - good risk/reward")
            else:
                suggestions.append("📈 BULLISH BIAS: Consider long positions with smaller size - moderate confidence")
        elif market_type in ['bearish', 'slightly_bearish']:
            if confidence == 'high':
                suggestions.append("📉 BEARISH BIAS: Consider short positions or defensive strategies - good opportunity")
            else:
                suggestions.append("📉 BEARISH BIAS: Consider short positions with hedging strategies - moderate confidence")
        else:  # neutral
            suggestions.append("😐 NEUTRAL MARKET: Consider range-bound strategies - both sides balanced, focus on volatility plays")
            
        # Choppy market warning
        if both_strong:
            suggestions.append("⚡ CHOPPY MARKET WARNING: Both sides are strong - expect high volatility, consider shorter timeframes, take profits quickly")
            
        # Compensation-based suggestions
        compensation_factor = compensation_analysis.get('compensation_factor', 0)
        if compensation_factor > 0.6:
            suggestions.append("🔄 STRONG COMPENSATION EXPECTED: Yesterday's prediction was wrong - market likely to move opposite, good contrarian opportunity")
        elif compensation_factor > 0.3:
            suggestions.append("🔄 MODERATE COMPENSATION: Some correction expected from yesterday - consider partial position adjustments")
            
        # Risk management suggestions
        if confidence in ['very_high', 'high']:
            suggestions.append("✅ High confidence signal - consider larger position sizes")
        else:
            suggestions.append("⚠️ Lower confidence - use smaller position sizes and tight stops")
            
        return suggestions
        
    def generate_comprehensive_explanation(self, today_tiers: Dict, yesterday_tiers: Optional[Dict] = None, 
                                         yesterday_price: Optional[Dict] = None) -> Dict:
        """Generate mobile-optimized explanation for today's tier rankings."""
        try:
            # Parse today's data
            details = json.loads(today_tiers.get('details_json', '{}'))
            long_tier = details.get('long', {}).get('tier', 'C')
            short_tier = details.get('short', {}).get('tier', 'C')
            long_score = details.get('long', {}).get('score', 0)
            short_score = details.get('short', {}).get('score', 0)
            long_percentile = details.get('long', {}).get('percentile', 50)
            short_percentile = details.get('short', {}).get('percentile', 50)
            
            # Analyze tier relationship
            tier_analysis = self.analyze_tier_relationship(long_tier, short_tier, long_score, short_score)
            
            # Analyze yesterday's performance if available
            compensation_analysis = {'analysis': 'no_data', 'compensation_factor': 0.0}
            if yesterday_tiers and yesterday_price:
                compensation_analysis = self.analyze_prediction_accuracy(yesterday_tiers, yesterday_price)
                
            # Generate concise trading suggestions for mobile
            suggestions = self._generate_mobile_suggestions(tier_analysis, compensation_analysis)
            
            # Create mobile-optimized explanation
            explanation = {
                'date': today_tiers.get('as_of_date_today', 'Unknown'),
                'summary': self._generate_mobile_summary(long_tier, short_tier, long_score, short_score, 
                                                       tier_analysis, compensation_analysis),
                'long_signal': long_tier,
                'short_signal': short_tier,
                'confidence': tier_analysis['confidence'].replace('_', ' ').title(),
                'risk': self._assess_mobile_risk(tier_analysis, compensation_analysis),
                'outlook': self._generate_mobile_outlook(tier_analysis, compensation_analysis),
                'suggestions': suggestions,
                'disclaimer': "Educational content only - NOT financial advice. Trading involves risk."
            }
            
            return explanation
            
        except Exception as e:
            return {
                'error': f"Failed to generate explanation: {str(e)}",
                'date': today_tiers.get('as_of_date_today', 'Unknown')
            }
            
    def _generate_summary(self, long_tier: str, short_tier: str, long_score: float, 
                         short_score: float, tier_analysis: Dict, compensation_analysis: Dict) -> str:
        """Generate a concise summary of the market situation."""
        
        tier_diff = tier_analysis['tier_difference']
        market_type = tier_analysis['market_type']
        confidence = tier_analysis['confidence']
        compensation_factor = compensation_analysis.get('compensation_factor', 0)
        
        # Base summary
        if abs(tier_diff) >= 2:
            direction = "LONG" if tier_diff > 0 else "SHORT"
            strength = "VERY STRONG" if abs(tier_diff) >= 3 else "STRONG"
            summary = f"🎯 {strength} {direction} SIGNAL: {long_tier} vs {short_tier} tiers"
        elif abs(tier_diff) == 1:
            direction = "LONG" if tier_diff > 0 else "SHORT"
            summary = f"📊 MODERATE {direction} BIAS: {long_tier} vs {short_tier} tiers"
        else:
            summary = f"⚖️ NEUTRAL MARKET: {long_tier} vs {short_tier} tiers (similar strength)"
            
        # Add compensation context
        if compensation_factor > 0.6:
            summary += " | 🔄 STRONG COMPENSATION EXPECTED"
        elif compensation_factor > 0.3:
            summary += " | 🔄 MODERATE COMPENSATION LIKELY"
            
        # Add confidence level
        if confidence == 'very_high':
            summary += " | ✅ VERY HIGH CONFIDENCE"
        elif confidence == 'high':
            summary += " | ✅ HIGH CONFIDENCE"
        elif confidence == 'moderate':
            summary += " | ⚠️ MODERATE CONFIDENCE"
        else:
            summary += " | ⚠️ LOW CONFIDENCE"
            
        return summary
        
    def _assess_risk_level(self, tier_analysis: Dict, compensation_analysis: Dict) -> str:
        """Assess the overall risk level for trading."""
        confidence = tier_analysis['confidence']
        both_strong = tier_analysis['both_strong']
        compensation_factor = compensation_analysis.get('compensation_factor', 0)
        
        if both_strong:
            return "HIGH - Choppy market with high volatility expected"
        elif confidence == 'very_high' and compensation_factor < 0.3:
            return "LOW - Strong signal with low compensation risk"
        elif confidence in ['high', 'moderate'] and compensation_factor < 0.5:
            return "MODERATE - Reasonable signal with manageable risk"
        else:
            return "HIGH - Uncertain conditions with compensation risk"
            
    def _generate_market_outlook(self, tier_analysis: Dict, compensation_analysis: Dict) -> str:
        """Generate market outlook based on analysis."""
        market_type = tier_analysis['market_type']
        confidence = tier_analysis['confidence']
        compensation_factor = compensation_analysis.get('compensation_factor', 0)
        
        outlooks = {
            'strong_bullish': "Market showing strong upward momentum with high confidence",
            'strong_bearish': "Market showing strong downward momentum with high confidence", 
            'bullish': "Market showing upward bias with good confidence",
            'bearish': "Market showing downward bias with good confidence",
            'slightly_bullish': "Market showing slight upward bias with moderate confidence",
            'slightly_bearish': "Market showing slight downward bias with moderate confidence",
            'neutral': "Market showing balanced conditions with low directional bias"
        }
        
        base_outlook = outlooks.get(market_type, "Market conditions unclear")
        
        if compensation_factor > 0.6:
            base_outlook += ". However, yesterday's strong prediction was wrong, suggesting potential market compensation today."
        elif compensation_factor > 0.3:
            base_outlook += ". Some compensation from yesterday's prediction may be expected."
            
        return base_outlook

    def _generate_mobile_summary(self, long_tier: str, short_tier: str, long_score: float, 
                                short_score: float, tier_analysis: Dict, compensation_analysis: Dict) -> str:
        """Generate a concise mobile-friendly summary."""
        tier_diff = tier_analysis['tier_difference']
        market_type = tier_analysis['market_type']
        confidence = tier_analysis['confidence']
        compensation_factor = compensation_analysis.get('compensation_factor', 0)
        
        # Short, punchy summary for mobile
        if abs(tier_diff) >= 2:
            direction = "LONG" if tier_diff > 0 else "SHORT"
            strength = "STRONG" if abs(tier_diff) >= 3 else "MODERATE"
            summary = f"🎯 {strength} {direction}: {long_tier} vs {short_tier}"
        elif abs(tier_diff) == 1:
            direction = "LONG" if tier_diff > 0 else "SHORT"
            summary = f"📊 {direction} BIAS: {long_tier} vs {short_tier}"
        else:
            summary = f"⚖️ NEUTRAL: {long_tier} vs {short_tier}"
            
        # Add compensation context (shorter)
        if compensation_factor > 0.6:
            summary += " | 🔄 REVERSAL"
        elif compensation_factor > 0.3:
            summary += " | 🔄 CORRECTION"
            
        # Add confidence (shorter)
        if confidence == 'very_high':
            summary += " | ✅ HIGH"
        elif confidence == 'high':
            summary += " | ✅ GOOD"
        elif confidence == 'moderate':
            summary += " | ⚠️ MODERATE"
        else:
            summary += " | ⚠️ LOW"
            
        return summary

    def _generate_mobile_suggestions(self, tier_analysis: Dict, compensation_analysis: Dict) -> List[str]:
        """Generate concise mobile-friendly trading suggestions."""
        suggestions = []
        
        market_type = tier_analysis['market_type']
        confidence = tier_analysis['confidence']
        both_strong = tier_analysis['both_strong']
        compensation_factor = compensation_analysis.get('compensation_factor', 0)
        
        # Primary signal (most important)
        if market_type == 'strong_bullish' and confidence == 'very_high':
            suggestions.append("🚀 STRONG LONG: Consider aggressive long positions")
        elif market_type == 'strong_bearish' and confidence == 'very_high':
            suggestions.append("📉 STRONG SHORT: Consider short positions or puts")
        elif market_type in ['bullish', 'slightly_bullish']:
            suggestions.append("📈 BULLISH: Consider long positions with moderate size")
        elif market_type in ['bearish', 'slightly_bearish']:
            suggestions.append("📉 BEARISH: Consider short positions or defensive strategies")
        else:
            suggestions.append("😐 NEUTRAL: Consider range-bound strategies")
            
        # Compensation warning (if significant)
        if compensation_factor > 0.6:
            suggestions.append("🔄 REVERSAL: Yesterday's prediction was wrong - market may reverse today")
        elif compensation_factor > 0.3:
            suggestions.append("🔄 CORRECTION: Market may correct yesterday's move")
            
        # Risk management (concise)
        if both_strong:
            suggestions.append("⚡ CHOPPY: High volatility expected - take profits quickly")
        elif confidence in ['very_high', 'high']:
            suggestions.append("✅ HIGH CONFIDENCE: Consider larger positions")
        else:
            suggestions.append("⚠️ LOWER CONFIDENCE: Use smaller positions")
            
        return suggestions

    def _assess_mobile_risk(self, tier_analysis: Dict, compensation_analysis: Dict) -> str:
        """Assess risk level for mobile display."""
        confidence = tier_analysis['confidence']
        both_strong = tier_analysis['both_strong']
        compensation_factor = compensation_analysis.get('compensation_factor', 0)
        
        if both_strong:
            return "HIGH - Choppy market"
        elif confidence == 'very_high' and compensation_factor < 0.3:
            return "LOW - Strong signal"
        elif confidence in ['high', 'moderate'] and compensation_factor < 0.5:
            return "MODERATE - Reasonable signal"
        else:
            return "HIGH - Uncertain conditions"

    def _generate_mobile_outlook(self, tier_analysis: Dict, compensation_analysis: Dict) -> str:
        """Generate concise market outlook for mobile."""
        market_type = tier_analysis['market_type']
        compensation_factor = compensation_analysis.get('compensation_factor', 0)
        
        outlooks = {
            'strong_bullish': "Strong upward momentum",
            'strong_bearish': "Strong downward momentum", 
            'bullish': "Upward bias with good confidence",
            'bearish': "Downward bias with good confidence",
            'slightly_bullish': "Slight upward bias",
            'slightly_bearish': "Slight downward bias",
            'neutral': "Balanced conditions"
        }
        
        base_outlook = outlooks.get(market_type, "Unclear conditions")
        
        if compensation_factor > 0.6:
            base_outlook += ". Yesterday's prediction was wrong - market may reverse today."
        elif compensation_factor > 0.3:
            base_outlook += ". Market may correct yesterday's move."
            
        return base_outlook

# =========================
# SQLite upserts
# =========================
def upsert_daily_tiers(conn, result):
    import sqlite3 as _sqlite3
    cur = conn.cursor()
    cur.execute("""
    CREATE TABLE IF NOT EXISTS daily_tiers (
      as_of_date_today TEXT PRIMARY KEY,
      long_score REAL,
      long_tier TEXT,
      short_score REAL,
      short_tier TEXT,
      details_json TEXT
    )
    """)
    conn.commit()

    params = (
        result["date"],
        result["long"]["score"], result["long"]["tier"],
        result["short"]["score"], result["short"]["tier"],
        json.dumps(result, ensure_ascii=False),
    )

    ver_tuple = tuple(int(x) for x in _sqlite3.sqlite_version.split("."))
    print(f"ℹ️ SQLite version in Lambda: {_sqlite3.sqlite_version}")

    if ver_tuple >= (3, 24, 0):
        cur.execute("""
        INSERT INTO daily_tiers (as_of_date_today, long_score, long_tier, short_score, short_tier, details_json)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(as_of_date_today) DO UPDATE SET
          long_score=excluded.long_score,
          long_tier=excluded.long_tier,
          short_score=excluded.short_score,
          short_tier=excluded.short_tier,
          details_json=excluded.details_json
        """, params)
    else:
        cur.execute("""
        INSERT OR REPLACE INTO daily_tiers
          (as_of_date_today, long_score, long_tier, short_score, short_tier, details_json)
        VALUES (?, ?, ?, ?, ?, ?)
        """, params)

    conn.commit()
    print("✅ daily_tiers upserted.")

def upsert_model_eval_summary(conn, today_df: pd.DataFrame):
    """
    Upsert per-model results for the target date into model_eval_summary.
    Matches your full schema with rmse + rmse_pct + acc + top_feature_*.
    """
    import sqlite3 as _sqlite3
    cur = conn.cursor()

    # Full schema (matches the one you posted)
    cur.execute("""
    CREATE TABLE IF NOT EXISTS model_eval_summary (
        as_of_date_today TEXT,
        model_name TEXT,
        y1_pred REAL, y1_rmse REAL, y1_rmse_pct REAL, y1_acc REAL,
        y2_pred REAL, y2_rmse REAL, y2_rmse_pct REAL, y2_acc REAL,
        y3_pred REAL, y3_rmse REAL, y3_rmse_pct REAL, y3_acc REAL,
        y4_pred REAL, y4_rmse REAL, y4_rmse_pct REAL, y4_acc REAL,
        y5_pred REAL, y5_rmse REAL, y5_rmse_pct REAL, y5_acc REAL,
        y6_pred REAL, y6_rmse REAL, y6_rmse_pct REAL, y6_acc REAL,
        y7_pred REAL, y7_rmse REAL, y7_rmse_pct REAL, y7_acc REAL,
        y8_pred REAL, y8_rmse REAL, y8_rmse_pct REAL, y8_acc REAL,
        top_feature_1_name TEXT,  top_feature_1_importance REAL,
        top_feature_2_name TEXT,  top_feature_2_importance REAL,
        top_feature_3_name TEXT,  top_feature_3_importance REAL,
        top_feature_4_name TEXT,  top_feature_4_importance REAL,
        top_feature_5_name TEXT,  top_feature_5_importance REAL,
        top_feature_6_name TEXT,  top_feature_6_importance REAL,
        top_feature_7_name TEXT,  top_feature_7_importance REAL,
        top_feature_8_name TEXT,  top_feature_8_importance REAL,
        top_feature_9_name TEXT,  top_feature_9_importance REAL,
        top_feature_10_name TEXT, top_feature_10_importance REAL,
        top_feature_11_name TEXT, top_feature_11_importance REAL,
        top_feature_12_name TEXT, top_feature_12_importance REAL,
        top_feature_13_name TEXT, top_feature_13_importance REAL,
        top_feature_14_name TEXT, top_feature_14_importance REAL,
        top_feature_15_name TEXT, top_feature_15_importance REAL,
        top_feature_16_name TEXT, top_feature_16_importance REAL,
        top_feature_17_name TEXT, top_feature_17_importance REAL,
        top_feature_18_name TEXT, top_feature_18_importance REAL,
        top_feature_19_name TEXT, top_feature_19_importance REAL,
        top_feature_20_name TEXT, top_feature_20_importance REAL,
        PRIMARY KEY (as_of_date_today, model_name)
    )
    """)
    conn.commit()

    # Ensure all expected columns exist in the frame
    base_cols = ["as_of_date_today","model_name"]
    q = []
    for i in range(1,9):
        q += [f"y{i}_pred", f"y{i}_rmse", f"y{i}_rmse_pct", f"y{i}_acc"]
    for i in range(1,21):
        q += [f"top_feature_{i}_name", f"top_feature_{i}_importance"]

    df = today_df.copy()
    for c in base_cols + q:
        if c not in df.columns:
            df[c] = np.nan

    # store date as TEXT (YYYY-MM-DD)
    df["as_of_date_today"] = pd.to_datetime(df["as_of_date_today"]).dt.strftime("%Y-%m-%d")

    cols = base_cols + q
    params = [tuple(None if (pd.isna(r[c])) else r[c] for c in cols) for _, r in df.iterrows()]

    ver_tuple = tuple(int(x) for x in _sqlite3.sqlite_version.split("."))
    if ver_tuple >= (3, 24, 0):
        sql = f"""
        INSERT INTO model_eval_summary ({",".join(cols)})
        VALUES ({",".join(["?"]*len(cols))})
        ON CONFLICT(as_of_date_today, model_name) DO UPDATE SET
          {",".join([f"{c}=excluded.{c}" for c in q])}
        """
    else:
        sql = f"""
        INSERT OR REPLACE INTO model_eval_summary ({",".join(cols)})
        VALUES ({",".join(["?"]*len(cols))})
        """

    cur.executemany(sql, params)
    conn.commit()
    print(f"✅ Upserted {len(params)} row(s) into full model_eval_summary.")


# =========================
# S3 JSON loaders
# =========================
def _latest_as_of_from_s3():
    """Return latest YYYY-MM-DD folder under MODELS_PREFIX/."""
    resp = s3.list_objects_v2(Bucket=DB_BUCKET, Prefix=f"{MODELS_PREFIX.rstrip('/')}/", Delimiter="/")
    prefixes = []
    for cp in resp.get("CommonPrefixes", []):
        p = cp["Prefix"]  # e.g., 'ml_out/2025-09-26/'
        m = re.search(r"(\d{4}-\d{2}-\d{2})/?$", p.rstrip("/"))
        if m:
            prefixes.append(m.group(1))
    return sorted(prefixes)[-1] if prefixes else None

def load_eval_from_s3(as_of_date, model_names):
    """
    Load model JSONs from s3://DB_BUCKET/MODELS_PREFIX/as_of_date/<model>.json
    Build a DataFrame that matches your model_eval_summary schema:
      - y1_pred..y8_pred
      - y1_rmse..y8_rmse (absolute)
      - y1_rmse_pct..y8_rmse_pct
      - y1_acc..y8_acc
      - top_feature_1_name/importance .. top_feature_20_name/importance
    """
    rows = []
    base = f"{MODELS_PREFIX.rstrip('/')}/{as_of_date}/"

    for m in model_names:
        key = f"{base}{m}.json"
        try:
            obj = s3.get_object(Bucket=DB_BUCKET, Key=key)
            data = json.loads(obj["Body"].read())
        except Exception as e:
            print(f"⚠️ Missing or unreadable {key}: {e}")
            continue

        preds = data.get("predictions", {}) or {}
        # v1 schema has metrics.rmse_pct & metrics.acc_pct
        metrics = data.get("metrics", {}) or {}
        rmse_pct = metrics.get("rmse_pct", {}) or {}
        acc_pct  = metrics.get("acc_pct",  {}) or {}
        # legacy absolute RMSE fallback under top-level "rmse"
        rmse_abs = data.get("rmse", {}) or {}

        row = {"as_of_date_today": as_of_date, "model_name": m}

        # predictions
        for i in range(1, 9):
            yk = f"y{i}"
            if yk in preds:
                row[f"{yk}_pred"] = float(preds[yk])

        # rmse absolute + pct + acc (prefer explicit metrics; fallback from legacy rmse)
        for i in range(1, 9):
            yk = f"y{i}"
            # absolute RMSE
            if yk in rmse_abs:
                row[f"{yk}_rmse"] = float(rmse_abs[yk])
            # pct RMSE
            if yk in rmse_pct:
                row[f"{yk}_rmse_pct"] = float(rmse_pct[yk])
            elif yk in rmse_abs:
                # heuristic fallback if only absolute RMSE provided
                row[f"{yk}_rmse_pct"] = float(rmse_abs[yk]) * 100.0
            # acc
            if yk in acc_pct:
                row[f"{yk}_acc"] = float(acc_pct[yk])
            elif yk in rmse_abs:
                # simple fallback consistent with your older code path
                r = float(rmse_abs[yk])
                row[f"{yk}_acc"] = max(0.0, 100.0 - r * 10.0)

        # top_features can be list([{name,importance},...]) OR dict(feature_1={...}, ...)
        tf = data.get("top_features", None)
        top_pairs = []
        if isinstance(tf, list):
            top_pairs = [(str(item.get("name")), float(item.get("importance", 0.0))) for item in tf]
        elif isinstance(tf, dict):
            # sort keys like feature_1, feature_2, ...
            for k in sorted(tf.keys(), key=lambda x: int(re.sub(r"\D+", "", x) or "9999")):
                item = tf[k] or {}
                top_pairs.append((str(item.get("name")), float(item.get("importance", 0.0))))

        # pad/trim to 20
        top_pairs = (top_pairs + [("_pad_", 0.0)]*20)[:20]
        for i, (nm, imp) in enumerate(top_pairs, start=1):
            row[f"top_feature_{i}_name"] = nm
            row[f"top_feature_{i}_importance"] = imp

        rows.append(row)

    df = pd.DataFrame(rows)
    if not df.empty:
        df["as_of_date_today"] = pd.to_datetime(df["as_of_date_today"])
    return df

# =========================
# Core compute
# =========================
def compute_result(event=None):
    """
    Loads TODAY from S3 JSON (race-safe), loads HISTORY from SQLite DB in S3 (for percentiles/tiers),
    then computes signals, weights, long/short scores, tiers, and optional upserts/outputs.
    Enhanced with market explanation system.
    """
    global _cfg

    _cfg = load_config_from_s3()
    artifacts = []  # files to clean from /tmp at end of compute_result

    MODEL_NAMES = [x.strip() for x in (MODEL_NAMES_ENV.split(",")
                    if MODEL_NAMES_ENV else [
                        "Model1_Random_forest_OldFeature4",
                        "Model5_TabNet",
                        "Model3_RandomForest_Oldfeature4_treeandNNBlend",
                    ])]

    TIER_LABELS        = _cfg_get(["tiers","labels"], ["SSS","SS","S","A+","A","B+","B","C+","C","D"])
    LONG_TOP_CUM_PCTS  = _cfg_get(["tiers","long_top_cum_pcts"],  [1,3,7,14,24,52,69,82,93,100])
    SHORT_TOP_CUM_PCTS = _cfg_get(["tiers","short_top_cum_pcts"], [0.1,0.4,1.4,4.4,21.4,49.4,66.4,82.4,93.4,100])

    TEMP   = float(_cfg_get(["weights","TEMP"], 10.0))
    FLOOR  = float(_cfg_get(["weights","FLOOR"], 0.12))
    ALPHA  = float(_cfg_get(["weights","ALPHA"], 1.0))
    PRIOR_LONG  = np.array(_cfg_get(["weights","PRIOR_LONG"],  [0.40,0.40,0.20]), dtype=float)
    PRIOR_SHORT = np.array(_cfg_get(["weights","PRIOR_SHORT"], [0.20,0.20,0.60]), dtype=float)

    ROLL_DAYS_PRIMARY  = int(_cfg_get(["windows","ROLL_DAYS_PRIMARY"], 60))
    ROLL_DAYS_FALLBACK = int(_cfg_get(["windows","ROLL_DAYS_FALLBACK"], 120))
    MIN_HISTORY        = int(_cfg_get(["windows","MIN_HISTORY"], 30))
    DIST_LOOKBACK_DAYS = int(_cfg_get(["windows","DIST_LOOKBACK_DAYS"], 180))

    # event.as_of → AS_OF_OVERRIDE → latest S3
    asof_evt = None
    try:
        if event and isinstance(event, dict):
            asof_evt = event.get("as_of")
    except Exception:
        pass
    asof_str = AS_OF_OVERRIDE or asof_evt

    df = pd.DataFrame()
    conn = None  # main DB connection used for optional upserts

    if SOURCE.lower().startswith("s3"):
        # --- TODAY from S3 JSON (race-safe) ---
        if not asof_str:
            # Safe latest (can swap to paginated variant if you prefer)
            asof_str = _latest_as_of_from_s3()
            if not asof_str:
                raise RuntimeError("No dated folder under S3 prefix for model outputs.")
        print(f"🔎 Using S3 JSONs for as_of={asof_str}")

        df = load_eval_from_s3(asof_str, MODEL_NAMES)

        # If we plan to upsert later, prep DB now (also ensures DB is downloaded)
        if STORE_IN_DB:
            download_db()
            artifacts.append(DB_LOCAL)
            conn = sqlite3.connect(DB_LOCAL)

        # --- HISTORY from SQLite DB in S3 (for percentiles/tiers) ---
        # We read-only from DB even if STORE_IN_DB=0.
        try:
            if conn is None:
                download_db()
                artifacts.append(DB_LOCAL)
                hist_conn = sqlite3.connect(DB_LOCAL)
                close_hist_conn = True
            else:
                hist_conn = conn
                close_hist_conn = False

            # Pull rows strictly before the target as_of_date
            q = f"""
                SELECT *
                FROM model_eval_summary
                WHERE model_name IN ({",".join(["?"]*len(MODEL_NAMES))})
                  AND DATE(as_of_date_today) < DATE(?)
                ORDER BY as_of_date_today ASC
            """
            hist_df = pd.read_sql_query(q, hist_conn, params=MODEL_NAMES + [asof_str])

            if close_hist_conn:
                hist_conn.close()

            if not hist_df.empty:
                hist_df["as_of_date_today"] = pd.to_datetime(hist_df["as_of_date_today"])
                # Keep only the trailing DIST_LOOKBACK_DAYS of distinct dates (like local script)
                min_keep_date = pd.to_datetime(asof_str) - pd.Timedelta(days=DIST_LOOKBACK_DAYS)
                hist_df = hist_df[hist_df["as_of_date_today"] >= min_keep_date]

                # Limit to columns needed downstream (safe if others present)
                need = {"as_of_date_today","model_name"}
                for k in [1,2,3,7,8]:
                    need.update({f"y{k}_pred", f"y{k}_rmse_pct", f"y{k}_acc"})
                keep_cols = [c for c in hist_df.columns if c in need]
                if keep_cols:
                    hist_df = hist_df[keep_cols].copy()

                # Combine HISTORY + TODAY
                df = pd.concat([hist_df, df], ignore_index=True)
            else:
                print("ℹ️ No history found in DB (model_eval_summary). Percentiles may be null.")
        except Exception as e:
            print(f"⚠️ Failed to read history from DB: {e}. Proceeding with today only.")

    else:
        # --- SOURCE == 'sqlite': use DB for both history and today (original behavior) ---
        download_db()
        artifacts.append(DB_LOCAL)
        conn = sqlite3.connect(DB_LOCAL)
        df = pd.read_sql_query(
            f"""
            SELECT *
            FROM model_eval_summary
            WHERE model_name IN ({",".join(["?"]*len(MODEL_NAMES))})
            ORDER BY as_of_date_today ASC
            """,
            conn,
            params=MODEL_NAMES
        )
        if df.empty:
            conn.close()
            raise RuntimeError("No rows found for the specified models.")
        df["as_of_date_today"] = pd.to_datetime(df["as_of_date_today"])
        if not asof_str:
            asof_str = df["as_of_date_today"].max().strftime("%Y-%m-%d")

    if df.empty:
        if conn: conn.close()
        raise RuntimeError("No per-model JSONs/rows found; cannot compute tiers.")

    # --- Slice target date ---
    target_date = pd.to_datetime(asof_str)
    today_rows = df[df["as_of_date_today"] == target_date]
    if today_rows.empty:
        if conn: conn.close()
        raise RuntimeError(f"No rows found for as_of_date_today={target_date.date()}")

    # --- Persist today's per-model rows into DB when SOURCE=s3_json and STORE_IN_DB=1 ---
    if STORE_IN_DB and SOURCE.lower().startswith("s3"):
        try:
            if conn is None:
                download_db()
                artifacts.append(DB_LOCAL)
                conn = sqlite3.connect(DB_LOCAL)
            upsert_model_eval_summary(conn, today_rows)
        except Exception as e:
            print(f"⚠️ model_eval_summary upsert failed: {e}")

    # ===== Signals & weights =====
    signals = []
    for m in MODEL_NAMES:
        sub  = df[df["model_name"] == m].sort_values("as_of_date_today").reset_index(drop=True)
        row  = sub[sub["as_of_date_today"] == target_date]
        if row.empty:
            continue
        row  = row.iloc[0]
        hist = sub[sub["as_of_date_today"] < target_date]

        y1p = _to_float(row.get("y1_pred"), 0.0)
        y2p = _to_float(row.get("y2_pred"), 0.0)
        y7p = _to_float(row.get("y7_pred"), 0.0)
        y8p = _to_float(row.get("y8_pred"), 0.0)

        z_y1 = robust_z(hist["y1_pred"] if "y1_pred" in hist else [], y1p)
        z_y2 = robust_z(hist["y2_pred"] if "y2_pred" in hist else [], y2p)
        z_y7 = robust_z(hist["y7_pred"] if "y7_pred" in hist else [], y7p)
        z_y8 = robust_z(hist["y8_pred"] if "y8_pred" in hist else [], y8p)

        conf_long  = make_conf(row, hist, ["y1_acc","y8_acc"], ["y1_rmse_pct","y8_rmse_pct"])
        conf_short = make_conf(row, hist, ["y2_acc","y7_acc"], ["y2_rmse_pct","y7_rmse_pct"])

        long_signal  = (relu(z_y1) + relu(z_y8)) * conf_long
        short_signal = (relu(-z_y2) + relu(z_y7)) * conf_short

        skl_long  = side_skill(sub, "long",  target_date, ROLL_DAYS_PRIMARY, ROLL_DAYS_FALLBACK, MIN_HISTORY)
        skl_short = side_skill(sub, "short", target_date, ROLL_DAYS_PRIMARY, ROLL_DAYS_FALLBACK, MIN_HISTORY)

        signals.append({
            "model_name": m,
            "long_signal": float(long_signal),
            "short_signal": float(short_signal),
            "skill_long": float(skl_long),
            "skill_short": float(skl_short),
        })

    if not signals:
        if conn: conn.close()
        raise RuntimeError("No per-model rows for target date; cannot compute tiers.")

    sig_df = pd.DataFrame(signals)

    # Re-read (in case config changed) and compute weights
    TEMP   = float(_cfg_get(["weights","TEMP"], 10.0))
    FLOOR  = float(_cfg_get(["weights","FLOOR"], 0.12))
    ALPHA  = float(_cfg_get(["weights","ALPHA"], 1.0))
    PRIOR_LONG  = np.array(_cfg_get(["weights","PRIOR_LONG"],  [0.40,0.40,0.20]), dtype=float)
    PRIOR_SHORT = np.array(_cfg_get(["weights","PRIOR_SHORT"], [0.20,0.20,0.60]), dtype=float)

    w_long  = apply_floor(softmax_temp(sig_df["skill_long"].values,  T=float(TEMP)), floor=float(FLOOR))
    w_short = apply_floor(softmax_temp(sig_df["skill_short"].values, T=float(TEMP)), floor=float(FLOOR))
    if float(ALPHA) < 1.0:
        w_long  = blend_with_prior(w_long,  PRIOR_LONG,  alpha=float(ALPHA))
        w_short = blend_with_prior(w_short, PRIOR_SHORT, alpha=float(ALPHA))

    long_score  = float(np.sum(w_long  * sig_df["long_signal"].values))
    short_score = float(np.sum(w_short * sig_df["short_signal"].values))

    # ===== Historical distributions (build from df which now includes history rows) =====
    start_cut = pd.to_datetime(target_date) - pd.Timedelta(days=365*2)
    hist_dates = df[(df["as_of_date_today"] >= start_cut) & (df["as_of_date_today"] < target_date)] \
                   ["as_of_date_today"].drop_duplicates().sort_values()
    hist_dates = hist_dates.tail(int(_cfg_get(["windows","DIST_LOOKBACK_DAYS"], 180)))

    long_hist, short_hist = [], []
    for d in hist_dates:
        rows = []
        for m in MODEL_NAMES:
            sub = df[df["model_name"] == m].sort_values("as_of_date_today")
            cur = sub[sub["as_of_date_today"] == d]
            if cur.empty: continue
            cur = cur.iloc[0]
            past = sub[sub["as_of_date_today"] < d]

            z1 = robust_z(past["y1_pred"] if "y1_pred" in past else [], _to_float(cur.get("y1_pred"), 0.0))
            z8 = robust_z(past["y8_pred"] if "y8_pred" in past else [], _to_float(cur.get("y8_pred"), 0.0))
            z2 = robust_z(past["y2_pred"] if "y2_pred" in past else [], _to_float(cur.get("y2_pred"), 0.0))
            z7 = robust_z(past["y7_pred"] if "y7_pred" in past else [], _to_float(cur.get("y7_pred"), 0.0))

            conf_l = make_conf(cur, past, ["y1_acc","y8_acc"], ["y1_rmse_pct","y8_rmse_pct"])
            conf_s = make_conf(cur, past, ["y2_acc","y7_acc"], ["y2_rmse_pct","y7_rmse_pct"])

            ls = (relu(z1) + relu(z8)) * conf_l
            ss = (relu(-z2) + relu(z7)) * conf_s

            skl_l = side_skill(sub, "long", d, ROLL_DAYS_PRIMARY, ROLL_DAYS_FALLBACK, MIN_HISTORY)
            skl_s = side_skill(sub, "short", d, ROLL_DAYS_PRIMARY, ROLL_DAYS_FALLBACK, MIN_HISTORY)

            rows.append((ls, ss, skl_l, skl_s))

        if rows:
            rows = np.array(rows, dtype=float)
            wl = apply_floor(softmax_temp(rows[:,2], T=float(TEMP)), floor=float(FLOOR))
            ws = apply_floor(softmax_temp(rows[:,3], T=float(TEMP)), floor=float(FLOOR))
            if float(ALPHA) < 1.0:
                wl = blend_with_prior(wl, PRIOR_LONG,  alpha=float(ALPHA))
                ws = blend_with_prior(ws, PRIOR_SHORT, alpha=float(ALPHA))
            long_hist.append(float(np.sum(wl * rows[:,0])))
            short_hist.append(float(np.sum(ws * rows[:,1])))

    # ===== Tiers & output =====
    TIER_LABELS = list(TIER_LABELS)
    long_tier   = assign_tier(long_score,  long_hist,  LONG_TOP_CUM_PCTS,  TIER_LABELS)
    short_tier  = assign_tier(short_score, short_hist, SHORT_TOP_CUM_PCTS, TIER_LABELS)
    long_pct    = percentile_rank(long_hist,  long_score)
    short_pct   = percentile_rank(short_hist, short_score)

    # Create today's tier data for enhanced analysis
    today_tiers = {
        "as_of_date_today": pd.to_datetime(target_date).strftime("%Y-%m-%d"),
        "long_score": long_score,
        "long_tier": long_tier,
        "short_score": short_score,
        "short_tier": short_tier,
        "details_json": json.dumps({
            "date": pd.to_datetime(target_date).strftime("%Y-%m-%d"),
            "long": {
                "score": round(long_score, 6),
                "percentile": None if np.isnan(long_pct) else round(long_pct, 2),
                "tier": long_tier,
                "bias": bias_tag("long", long_score, long_hist),
                "model_weights": dict(zip(sig_df["model_name"], np.round(w_long, 4))),
                "model_signals": dict(zip(sig_df["model_name"], np.round(sig_df["long_signal"], 4))),
                "cuts_top_cum_pct": LONG_TOP_CUM_PCTS,
            },
            "short": {
                "score": round(short_score, 6),
                "percentile": None if np.isnan(short_pct) else round(short_pct, 2),
                "tier": short_tier,
                "bias": bias_tag("short", short_score, short_hist),
                "model_weights": dict(zip(sig_df["model_name"], np.round(w_short, 4))),
                "model_signals": dict(zip(sig_df["model_name"], np.round(sig_df["short_signal"], 4))),
                "cuts_top_cum_pct": SHORT_TOP_CUM_PCTS,
            },
        }, ensure_ascii=False)
    }

    # Initialize explanation system and generate enhanced analysis
    explanation_system = MarketExplanationSystem()
    
    # Get yesterday's data for compensation analysis
    yesterday_tiers, yesterday_price = None, None
    if conn:
        yesterday_tiers, yesterday_price = explanation_system.get_yesterday_data(conn, today_tiers["as_of_date_today"])

    # Generate comprehensive explanation
    explanation = explanation_system.generate_comprehensive_explanation(
        today_tiers, yesterday_tiers, yesterday_price
    )

    # Optional: write to DB + push back to S3
    if STORE_IN_DB:
        try:
            if conn is None:
                download_db()
                conn = sqlite3.connect(DB_LOCAL)
            upsert_daily_tiers(conn, {
                "date": today_tiers["as_of_date_today"],
                "long": {
                    "score": long_score,
                    "tier": long_tier,
                    "percentile": None if np.isnan(long_pct) else round(long_pct, 2),
                    "bias": bias_tag("long", long_score, long_hist),
                    "model_weights": dict(zip(sig_df["model_name"], np.round(w_long, 4))),
                    "model_signals": dict(zip(sig_df["model_name"], np.round(sig_df["long_signal"], 4))),
                    "cuts_top_cum_pct": LONG_TOP_CUM_PCTS,
                },
                "short": {
                    "score": short_score,
                    "tier": short_tier,
                    "percentile": None if np.isnan(short_pct) else round(short_pct, 2),
                    "bias": bias_tag("short", short_score, short_hist),
                    "model_weights": dict(zip(sig_df["model_name"], np.round(w_short, 4))),
                    "model_signals": dict(zip(sig_df["model_name"], np.round(sig_df["short_signal"], 4))),
                    "cuts_top_cum_pct": SHORT_TOP_CUM_PCTS,
                },
            })
        except Exception as e:
            print(f"⚠️ DB upsert failed: {e}")
        finally:
            if conn:
                conn.commit()
                conn.close()
                try:
                    s3.upload_file(DB_LOCAL, DB_BUCKET, DB_KEY)
                    print(f"📤 Uploaded updated DB to s3://{DB_BUCKET}/{DB_KEY}")
                except Exception as e:
                    print(f"⚠️ Failed to upload DB back to S3: {e}")

    # Write enhanced summary JSON to S3
    if WRITE_TIER_TO_S3:
        out_key = f"summary_json/{explanation['date']}.json"
        s3.put_object(
            Bucket=DB_BUCKET,
            Key=out_key,
            Body=json.dumps(explanation, ensure_ascii=False, separators=(",",":")).encode("utf-8"),
            ContentType="application/json"
        )
        print(f"📤 Wrote enhanced summary to s3://{DB_BUCKET}/{out_key}")

    # Best-effort cleanup to avoid /tmp filling on warm invocations
    try:
        _cleanup_tmp(artifacts)
    except Exception:
        pass

    return explanation


# =========================
# Lambda entry
# =========================
def lambda_handler(event, context):
    try:
        res = compute_result(event or {})
        return {"ok": True, "result": res}
    except Exception as e:
        print(f"❌ Error: {e}")
        return {"ok": False, "error": str(e)}

if __name__ == "__main__":
    out = lambda_handler({}, None)
    print(json.dumps(out, indent=2, ensure_ascii=False))