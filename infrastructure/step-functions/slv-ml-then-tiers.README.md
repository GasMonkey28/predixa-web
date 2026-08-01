# Predixa-SLV-ML-Then-Tiers

Per-ticker equity pipeline (SLV pilot). Tiers write ratings + detail description
into `db/tickers/SLV/features.db`.

## Flow

1. **Features** — `equity_v1` → `features.db`
2. **ML1** — RandomForest → `Model1_RandomForest_equity_v1`
3. **ML2** — RF+MLP fixed 50/50 blend → `Model2_RandomForest_NN_blend_equity_v1`
4. **ML3** — TabNet → `Model3_TabNet_equity_v1`
5. **RateTiers** — dynamic skill softmax across the 3 models → `daily_tiers`

### Mixing reminder

| Layer | Mix type |
|-------|----------|
| Inside ML2 (RF vs MLP) | **Fixed** `BLEND_ALPHA` (default 0.5) |
| Across ML1/ML2/ML3 in tiers | **Dynamic** softmax of rolling skill (`TEMP=10`, `FLOOR=0.12`); priors unused while `ALPHA=1.0` |

## Lambda names (deploy first)

| State | Function |
|-------|----------|
| Features | `predixa-features-SLV` |
| ML1 | `predixa-ml1-SLV` |
| ML2 | `predixa-ml2-SLV` |
| ML3 | `predixa-ml3-SLV` |
| Tiers | `predixa-tiers-SLV` |

Handlers: `tradespark/ticker-handlers/SLV/ml/model_3mix/{features,model1,model2,model3,tiers}/`.

> Product “Model2” (y1 / y2y3) is separate: `ml/model_y2y3/`.  
> `model_3mix/model2` is only the RF+MLP member of the tiers ensemble.

## Create / update state machine

```bash
aws stepfunctions create-state-machine \
  --name Predixa-SLV-ML-Then-Tiers \
  --definition file://infrastructure/step-functions/slv-ml-then-tiers.asl.json \
  --role-arn arn:aws:iam::822233328169:role/TradesparkStepFunctionsRole \
  --type STANDARD
```
