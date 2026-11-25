# 6. 演習：VM の詳細にタブを足す

この演習では、拡張ポイント `console.tab/horizontalNav` を使って、VM の詳細画面に「ハンズオン」タブを足します。タブには、開いている VM の namespace と名前を表示します。

所要時間：約 15 分

## タスク 1：コンポーネントを公開する

ユニット 4 では `exposedModules` を空にしていました。ここで、`src/HandsonTab.tsx` を `HandsonTab` という名前で公開します。

1. `package.json` に書き込みます（新しい端末なら、先に `source ~/handson-plugin/env.sh`）。

   ```bash
   npm pkg set consolePlugin.exposedModules.HandsonTab=./HandsonTab
   npm pkg get consolePlugin.exposedModules
   ```

   `{ "HandsonTab": "./HandsonTab" }` と出れば成功です。`./HandsonTab` は `src` からの相対パスで、拡張子は書きません（`webpack.config.js` の `context` と `resolve.extensions` で決まる）。

   公開しただけで拡張ポイントから使わないと、ビルドがエラーになります。続くタスク 2 で、拡張ポイントから参照します。

## タスク 2：拡張ポイントを宣言する

`console.tab/horizontalNav` は、**リソースの詳細画面にタブを足す**拡張ポイントです。

| プロパティ | 意味 | この演習の値 |
|---|---|---|
| `model` | どのリソースの詳細画面に足すか（group / version / kind） | `kubevirt.io` / `v1` / `VirtualMachine` |
| `page.name` | タブに出す名前 | `ハンズオン` |
| `page.href` | タブの URL の末尾（`…/VirtualMachine/<VM 名>/<href>`） | `handson` |
| `component.$codeRef` | タブの中身。`package.json` の `exposedModules` の公開名 | `HandsonTab` |

> **注意：** `page.name` と `page.href` は、既にあるタブと重ならないようにします。たとえば VM の詳細には標準の「診断」タブ（href `diagnostics`）があります。重なると、タブをクリックするたびにタブが増えていく不具合が起きます（kubevirt-plugin がタブ名を内部の識別子に使っているため）。

1. `console-extensions.json` を、次の内容に置き換えます。

```json
[
  {
    "type": "console.tab/horizontalNav",
    "properties": {
      "model": { "group": "kubevirt.io", "version": "v1", "kind": "VirtualMachine" },
      "page": { "name": "ハンズオン", "href": "handson" },
      "component": { "$codeRef": "HandsonTab" }
    }
  }
]
```

## タスク 3：タブの中身を書く

タブのコンポーネントには、kubevirt-plugin が開いている VM を **props の `obj`** に入れて渡してくれます。`obj` は VirtualMachine リソースそのもので、`oc get vm <名前> -o yaml` で見えるのと同じ形です。

1. `src/HandsonTab.tsx` を、次の内容に置き換えます。

```tsx
import type { PageComponentProps } from '@openshift-console/dynamic-plugin-sdk';
import { Card, CardBody, CardTitle, PageSection } from '@patternfly/react-core';

// VM 詳細のタブ。kubevirt-plugin が、開いている VM を props.obj に入れて渡してくれる
const HandsonTab = ({ obj }: PageComponentProps) => (
  <PageSection>
    <Card>
      <CardTitle>ハンズオン</CardTitle>
      <CardBody>
        この VM は {obj?.metadata?.namespace} / {obj?.metadata?.name} です。
      </CardBody>
    </Card>
  </PageSection>
);

export default HandsonTab;
```

   コードの読み方：

   | 行 | 意味 |
   |---|---|
   | `import type { PageComponentProps } …` | タブのコンポーネントの props の型を SDK から読む |
   | `import { Card, … } from '@patternfly/react-core'` | PatternFly の部品を読む |
   | `({ obj }: PageComponentProps) =>` | props から `obj`（VM）を取り出す |
   | `obj?.metadata?.namespace` | VM の namespace。`strict` の型チェックで「`obj` は無いかもしれない」と扱われるので `?.` を付ける |
   | `export default HandsonTab` | コンソールが使うのは default export |

## タスク 4：手元でビルドして確かめる

1. 新しい端末なら、先に `source ~/handson-plugin/env.sh` を実行します。
2. 手元でビルドします。型の間違いがあれば、ここで数秒で分かります。

   ```bash
   npm run build
   ```

   `compiled successfully` と出れば次へ進みます。

   `dist/plugin-manifest.json` を開くと、`extensions` に、今書いたタブの差し込みが入っていることも確かめられます。

   ```bash
   cat dist/plugin-manifest.json
   ```

## タスク 5：デプロイする

1. デプロイします。2 回目以降は、ビルドのキャッシュが効くので 2〜3 分です。

   ```bash
   ./deploy.sh
   ```

## 結果を確認する

1. ブラウザでコンソールを開き、**ページを再読み込み**します。プラグインは、ページを読み込むときに取り込まれます。
2. **仮想化 → VirtualMachines** を開き、任意の VM をクリックします。
3. 詳細画面のタブの列に「**ハンズオン**」が増えていることを確かめます。
4. 「ハンズオン」タブを開き、「この VM は `<namespace>` / `<VM 名>` です。」と表示されることを確かめます。
5. URL の末尾が `/handson` になっていることも確かめます（`page.href` の値です）。

> 画面の幅が狭いと、タブの列の右端からはみ出して「ハンズオン」が見えないことがあります。左のプロジェクトのツリーを「<」で閉じるか、URL の末尾を直接 `/handson` にしてください。

## うまくいかないとき

| 症状 | 対処 |
|---|---|
| タブが出ない | ページを再読み込みしたか確かめる。`oc get console.operator cluster -o jsonpath='{.spec.plugins}'` に `handson-plugin` があるか確かめる |
| タブを押すと真っ白 | ブラウザの開発者ツールのコンソールにエラーが出る。`export default` を忘れていないか、`$codeRef` と `exposedModules` の名前が一致しているか確かめる |
| ビルドが `error TS2532: Object is possibly 'undefined'` で止まる | `?.` の付け忘れ |
| ビルドが `Exposed module 'HandsonTab' is not referenced by any extension` で止まる | `console-extensions.json` の `$codeRef` と `exposedModules` の名前が一致しているか確かめる |
| どうしても進まない | `solution/step1/` の `package.json` と `console-extensions.json` を `~/handson-plugin/` に、`HandsonTab.tsx` を `~/handson-plugin/src/` にコピーする |

次のユニット：[7. useK8sWatchResource で Kubernetes のデータを取る](07-use-k8s-watch-resource.md)
