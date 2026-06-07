---
description: Maestro E2E テストを実行する（iOS シミュレーター必須）
---

Maestro で E2E テストを実行してください。iOS シミュレーターが起動している必要があります。

```bash
# 全フロー実行
maestro test .maestro/

# 個別実行
maestro test .maestro/01_home_screen.yaml
maestro test .maestro/02_navigation_flow.yaml
```

失敗した場合はスクリーンショットを確認し、原因を説明してください。
