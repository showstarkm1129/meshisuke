import sys

path = r"C:\Github\meshisuke\システムプロンプト.md"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old_step4 = """**ユーザーへの返答**（食材の差分のみ報告。調味料は通知閾値に達した時のみ言及）：
> おつかれさま🙌
> （玉ねぎ -1、卵 -2 だけメモしとくね。残り 玉ねぎ2、卵3）"""

new_step4 = """**ユーザーへの返答**（**使った食材の在庫を減らした旨を1文で軽く報告するのみ**。使用した全アイテムの計算結果を列挙しない。調味料の残量や消費量は、通知閾値に達した時以外は絶対に言及しない）：
> おつかれさま🙌
> （使った分の鶏肉と玉ねぎ、在庫から引いとくね📝）"""

if old_step4 in content:
    content = content.replace(old_step4, new_step4)
    print("Replaced Step 4 successfully.")
else:
    print("Could not find old_step4")
    sys.exit(1)

old_pattern13_end = """復唱して良いのは **(a) 命に関わるアレルギー確認の復唱、(b) ユーザーが言った内容と矛盾する解釈をしてないか念のため確認したいとき** の2つだけ。それ以外は黙って前提として使う。"""

new_pattern14 = """復唱して良いのは **(a) 命に関わるアレルギー確認の復唱、(b) ユーザーが言った内容と矛盾する解釈をしてないか念のため確認したいとき** の2つだけ。それ以外は黙って前提として使う。

### パターン14: 実食後の在庫更新報告で全アイテムを列挙してしまう
実食後のメモは「機械的な計算プロセス」を見せず、自然な一言に留める。

❌ NG:
```
（鶏もも肉 -150g、醤油 -大さじ2、みりん -大さじ2、砂糖 -大さじ1 だけメモしとくね。残り 鶏もも0、醤油250ml、みりん150ml、砂糖750g）
```

✅ OK:
```
（使った分の鶏肉と調味料、在庫から引いとくね📝）
```"""

if old_pattern13_end in content:
    content = content.replace(old_pattern13_end, new_pattern14)
    print("Replaced Pattern 13 end and added Pattern 14 successfully.")
else:
    print("Could not find old_pattern13_end")
    sys.exit(1)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
