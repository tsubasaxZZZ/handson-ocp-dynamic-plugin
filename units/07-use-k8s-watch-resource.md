# 7. useK8sWatchResource で Kubernetes のデータを取る

このユニットでは、プラグインから Kubernetes のリソースを読むフック `useK8sWatchResource` が何をしているのか、どう使うのかを学びます。

## VM と VMI

演習で表示する情報は、VirtualMachine（VM）ではなく **VirtualMachineInstance（VMI）** にあります。

| リソース | 何を表すか | いつあるか | 例えるなら |
|---|---|---|---|
| VirtualMachine（VM） | VM の**定義**（CPU、メモリ、ディスク、起動するかどうか） | 常にある | Deployment |
| VirtualMachineInstance（VMI） | **今動いている** VM の実体。状態、載っているノード、guest agent の報告など | 動いている間だけある | Pod |

VMI は VM と**同じ namespace・同じ名前**で作られます。なので、タブに渡される VM の namespace と名前が分かれば、VMI を取れます。

```bash
oc get vmi <VM 名> -n <namespace> -o yaml
```

```yaml
status:
  phase: Running            # 状態
  nodeName: worker-1        # 載っているノード
  guestOSInfo:              # guest agent が報告したゲスト OS（guest agent が入っているときだけ）
    prettyName: CentOS Stream 9
```

## useK8sWatchResource とは

`useK8sWatchResource` は、**Kubernetes のリソースを取ってきて、そのあとも変化を見張り続け、変わったら画面を描き直させる**フックです。

`oc get` に例えると、「`oc get vmi test` を 1 回打つ」のではなく、**「`oc get vmi test --watch` を開きっぱなしにして、変わるたびに画面に反映する」**動きです。

### 裏で起きていること

```
コンポーネント
  │ useK8sWatchResource({ groupVersionKind: VMI, namespace, name })
  ▼
SDK（コンソールのブラウザ側）
  │ ① まず 1 回 GET して現在の値を取る
  │ ② 続けて watch を開き、変更の通知を待つ（WebSocket）
  │ ③ 取った値をコンソール全体で共有するキャッシュに入れる
  ▼
コンソールのサーバー（/api/kubernetes/... を Kubernetes API に中継）
  │ ログインしている人のトークンで呼ぶ
  ▼
Kubernetes API サーバー
```

- **自動で最新になる：** VM を止めたり、別のノードへ移したりすると、watch で通知が来て、コンポーネントが描き直されます。再読み込みは要りません。
- **重複しない：** 同じリソースを別の場所でも watch している場合、SDK はキャッシュを共有するので、API サーバーへの通信は増えません。
- **後片付けが要らない：** コンポーネントが画面から消えると（タブを閉じるなど）、SDK が watch を自動で閉じます。
- **権限はログインしている人のもの：** その人が `get` / `watch` できないリソースは、取れません（エラーが返ります）。

## 使い方

```ts
const [data, loaded, loadError] = useK8sWatchResource<型>(取りたいものの指定);
```

### 引数：取りたいものの指定

| フィールド | 意味 | 例 |
|---|---|---|
| `groupVersionKind` | リソースの種類（group / version / kind） | `{ group: 'kubevirt.io', version: 'v1', kind: 'VirtualMachineInstance' }` |
| `name` | 1 つだけ取るときの名前 | `'test'` |
| `namespace` | namespace。省くと全 namespace | `'default'` |
| `isList` | `true` なら一覧（配列）で取る | 一覧を取るとき `true` |
| `selector` | ラベルで絞る（一覧のとき） | `{ matchLabels: { app: 'web' } }` |
| `fieldSelector` | フィールドで絞る（一覧のとき） | `'status.phase=Running'` |
| `optional` | 取れなくてもエラーにしない | 権限が無いかもしれないとき `true` |

`groupVersionKind` は、`oc api-resources` の APIVERSION 列と KIND 列で確かめられます。

```bash
oc api-resources | grep -i virtualmachineinstance
# virtualmachineinstances   vmi   kubevirt.io/v1   true   VirtualMachineInstance
```

### 戻り値：3 つ組

| 順番 | 名前 | 意味 |
|---|---|---|
| 1 | `data` | 取れたリソース。1 つなら オブジェクト、`isList: true` なら配列。取れるまでは空 |
| 2 | `loaded` | 取り終わったか。`false` の間は「読み込み中」を表示する |
| 3 | `loadError` | エラー（権限が無い、など）。無ければ空 |

### 型を付ける

`<型>` には、受け取るリソースの形を書きます。全フィールドを書く必要はなく、**使うフィールドだけ**で十分です。SDK の `K8sResourceCommon`（`metadata` などの共通部分）に、使う `status` を足すのが定番です。

```ts
type VMI = K8sResourceCommon & {
  status?: {
    phase?: string;
    nodeName?: string;
    guestOSInfo?: { prettyName?: string };
  };
};
```

`&` は「両方の形を合わせた型」という意味です。

### 「無いかもしれない」状態の扱い

| 状況 | `data` | `loaded` | 画面に出すもの |
|---|---|---|---|
| 取っている途中 | 空 | `false` | 「読み込み中」 |
| VM が止まっていて VMI が無い | 空 | `true` | 「停止中」 |
| 取れた | VMI | `true` | 値 |
| 権限が無い | 空 | `true` | エラーの案内（`loadError` を見る） |

## 似たもの

| API | 違い |
|---|---|
| `useK8sWatchResources`（複数形） | 複数のリソースを一度に watch する。`{ vmi: {...}, pods: {...} }` のように名前を付けて渡す |
| `k8sGet` | 1 回だけ取る関数（フックではない）。見張らないので、変化は反映されない |
| `k8sPatch`、`k8sCreate`、`k8sDelete` | リソースを変更する関数。ボタンを押したときの処理などで使う |

画面に表示するデータは、基本的に `useK8sWatchResource` を使います。勝手に最新になり、後片付けも要らないからです。

## このユニットのまとめ

- VM は定義、VMI は動いている実体。状態やノードは VMI の `status` にある。
- `useK8sWatchResource` は「取る＋見張る」フック。変化すると自動で描き直され、後片付けも要らない。
- 引数で種類（`groupVersionKind`）と名前・namespace を指定し、戻り値は `[data, loaded, loadError]`。
- 型は使うフィールドだけ書けばよい。「読み込み中」「無い」「エラー」を区別して表示する。
- アクセスは、ログインしている人の権限で行われる。

次のユニット：[8. 演習：VMI の情報を表示する](08-exercise-k8s.md)
