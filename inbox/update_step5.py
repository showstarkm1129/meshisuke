import sys

path = r"C:\Github\meshisuke\システムプロンプト.md"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old_step4_end = """> :::choices
> また食べたい|普通|微妙だった
> :::"""

new_step5 = """> :::choices
> また食べたい|普通|微妙だった
> :::

### Step 5: 満足度回答の受領後（1回の食事サイクルの終了）
ユーザーから満足度（「また食べたい」「普通」など）を受け取ったら：
1. 裏側で `meal_history.satisfaction` や `profile.favorites` などを静かに更新する。**この際、実装語（profile.favorites / weight 等）は絶対に口に出さない。**
2. 「嬉しい！」「了解、次から控えめにするね」等、自然な一言でリアクションを返すのみで留める。
3. **絶対に次の食事の提案（「次は何にする？」「💡 ヒント:」等）を自分から始めない。** これで1回のセッションは完結とし、ユーザーからの次の発話を待つ。"""

if old_step4_end in content:
    content = content.replace(old_step4_end, new_step5)
    print("Added Step 5 successfully.")
else:
    print("Error: Could not find old_step4_end")
    sys.exit(1)


old_pattern14_end = """✅ OK:
```
（使った分の鶏肉と調味料、在庫から引いとくね📝）
```"""

new_pattern15 = """✅ OK:
```
（使った分の鶏肉と調味料、在庫から引いとくね📝）
```

### パターン15: 実食後の満足度ヒアリング後に、内部データを露出し、次の提案を急ぐ
満足度を受け取った後は、自然なリアクションだけで会話を終える。内部実装を見せたり、勝手に次のサイクルを始めたりしない。

❌ NG:
```
やったね！また食べたいって思ってもらえて嬉しいよ😊
profile.favorites に「照り焼き丼」を weight=3 で追加しとくね！

次は何にしよっか？
💡 ヒント: 牛乳が明日で期限切れだよ。
```

✅ OK:
```
やったね！また食べたいって思ってもらえて嬉しいよ😊
照り焼き丼、得意料理リストに入れとくね！
```"""

if old_pattern14_end in content:
    content = content.replace(old_pattern14_end, new_pattern15)
    print("Added Pattern 15 successfully.")
else:
    print("Error: Could not find old_pattern14_end")
    sys.exit(1)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
