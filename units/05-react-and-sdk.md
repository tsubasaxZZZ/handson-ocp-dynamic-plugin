# 5. React・TypeScript・SDK の基礎

このユニットでは、プラグインの画面を書くのに必要な、React・TypeScript・PatternFly・コンソールの SDK の最低限を学びます。React を使ったことがなくても、このユニットの内容で演習は進められます。

## React のコンポーネント

React では、画面の部品を**コンポーネント**という関数で書きます。コンポーネントは「受け取った値（props）から、表示する内容（JSX）を返す関数」です。

```tsx
// 名前を受け取って、あいさつを表示するコンポーネント
const Hello = ({ name }: { name: string }) => <p>こんにちは、{name} さん</p>;

// 使う側
<Hello name="tsubasa" />
```

| 用語 | 意味 |
|---|---|
| **コンポーネント** | 画面の部品を返す関数。名前は大文字で始める |
| **props** | コンポーネントが受け取る値。上の例では `{ name }` |
| **JSX** | JavaScript の中に HTML のように書ける記法。`{ }` の中に JavaScript の式を書ける |

プラグインのタブも、このコンポーネントの 1 つです。コンソール（正確には VM の詳細画面を作っている kubevirt-plugin）が、タブを表示するときにコンポーネントを呼び出し、props に**今開いている VM**（`obj`）を入れて渡してくれます。

## フック（hooks）

コンポーネントは、表示するたびに呼び直される関数です。その中で「データを取ってくる」「値を覚えておく」といった処理をするための仕組みが**フック**です。名前が `use` で始まる関数がフックです。

```tsx
const Counter = () => {
  const [count, setCount] = useState(0); // 値を覚えておくフック
  return <button onClick={() => setCount(count + 1)}>{count} 回押した</button>;
};
```

フックの大事な性質：

- **フックが返す値が変わると、コンポーネントが自動で呼び直され、画面が描き直されます。**
- データを取るフックは、最初は「まだ取れていない」状態の値を返し、取れたら新しい値で描き直させます。そのため、コンポーネントは「まだ無いかもしれない」前提で書きます。
- フックは、コンポーネントの先頭で、毎回同じ順番で呼びます（`if` の中で呼ばない）。

このモジュールで使う `useK8sWatchResource` と `usePrometheusPoll` も、SDK が用意しているフックです。

## TypeScript の最低限

TypeScript は、JavaScript に**型**を足した言語です。値の形を宣言しておくと、書き間違いをビルドの時点で見つけられます。

```ts
type VMI = {
  status?: { phase?: string };   // ? は「無いかもしれない」
};

const vmi: VMI = {};
vmi.status.phase;    // エラー：status は無いかもしれない
vmi.status?.phase;   // OK：status が無ければ undefined になる（?. はオプショナルチェーン）
vmi.status?.phase ?? '不明';  // ?? は「左が undefined / null なら右を使う」
```

| 記法 | 意味 |
|---|---|
| `type 名前 = { ... }` | 値の形に名前を付ける |
| `プロパティ?:` | 無いかもしれないプロパティ |
| `a?.b` | `a` が無ければ `undefined`、あれば `a.b` |
| `a ?? b` | `a` が `undefined` / `null` なら `b` |
| `<T>` | 型を引数として渡す（例：`useK8sWatchResource<VMI>(...)` は「VMI の形の値を返して」） |

Kubernetes のリソースは、どのフィールドも「無いかもしれない」ものが多いので、`?.` と `??` をよく使います。

## PatternFly

PatternFly は、Red Hat の製品で共通に使われている画面の部品集（デザインシステム）です。コンソールもこれで作られているので、プラグインでも使うと、見た目がコンソールと揃います。

このモジュールで使う部品：

| 部品 | 見た目 |
|---|---|
| `PageSection` | ページの中の 1 区画。余白を整える |
| `Card`、`CardTitle`、`CardBody` | 枠で囲んだカード |
| `DescriptionList` と `DescriptionListGroup` / `Term` / `Description` | 「項目名：値」を並べたリスト |

部品の見本と使い方は、[PatternFly の公式サイト](https://www.patternfly.org/)にあります（バージョン 6）。このモジュールで使う部品は [Card](https://www.patternfly.org/components/card) と [Description list](https://www.patternfly.org/components/description-list) です。

## コンソールの SDK

`@openshift-console/dynamic-plugin-sdk` は、プラグインからコンソールの機能を使うための部品集です。

| 種類 | 例 | 使うユニット |
|---|---|---|
| 型 | `PageComponentProps`（タブのコンポーネントの props）、`K8sResourceCommon`（Kubernetes のリソース共通の形） | 6、8 |
| Kubernetes を読むフック | `useK8sWatchResource`、`useK8sWatchResources` | 8 |
| Kubernetes を操作する関数 | `k8sGet`、`k8sCreate`、`k8sPatch`、`k8sDelete` | （使わない） |
| Prometheus を読むフック | `usePrometheusPoll` | 10 |
| コンソールの部品 | `ResourceLink`（リソースへのリンク）、`Timestamp`、`QueryBrowser`（グラフ） | （使わない） |

SDK の API の一覧は、[API のドキュメント](https://github.com/openshift/console/blob/main/frontend/packages/console-dynamic-plugin-sdk/docs/api.md)にあります。

## タブのコンポーネントの形

ここまでをまとめると、タブのコンポーネントは次の形になります。

```tsx
import type { PageComponentProps } from '@openshift-console/dynamic-plugin-sdk';

const HandsonTab = ({ obj }: PageComponentProps) => {
  // ここでフックを呼んでデータを取る（ユニット 8、10）
  return <div>{obj?.metadata?.name}</div>;   // 表示する内容を返す
};

export default HandsonTab;   // コンソールは default export を使う
```

## このユニットのまとめ

- コンポーネントは「props を受け取り、JSX を返す関数」。タブには、開いている VM が `obj` として渡される。
- フックは `use` で始まる関数で、返す値が変わると画面が描き直される。
- Kubernetes のリソースは「無いかもしれない」値が多いので、`?.` と `??` を使う。
- 見た目は PatternFly の部品、コンソールの機能は SDK の部品を使う。

次のユニット：[6. 演習：VM の詳細にタブを足す](06-exercise-tab.md)
