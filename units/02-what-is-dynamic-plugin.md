# 2. dynamic plugin とは

このユニットでは、dynamic plugin がどういうもので、コンソールにどうやって読み込まれるのかを学びます。

## dynamic plugin とは

dynamic plugin は、**OpenShift の Web コンソールに、あとから画面を足すための仕組み**です。

コンソール本体は Red Hat が作って配布しているので、利用者が中身を書き換えることはできません。そこで、コンソールは「外から部品を受け取って、決められた場所に差し込む」口を用意しています。この口を **拡張ポイント**（extension point）と呼び、差し込む部品の集まりを **dynamic plugin** と呼びます。

身近な例として、次の画面はどれも dynamic plugin です。

| 画面 | プラグイン |
|---|---|
| 仮想化（VM 一覧、VM 詳細、テンプレートなど） | `kubevirt-plugin`（OpenShift Virtualization） |
| 仮想化の移行 | `forklift-console-plugin`（MTV） |
| 監視（アラート、ダッシュボード） | `monitoring-plugin` |

つまり、Red Hat 自身も、製品の画面をこの仕組みで足しています。自分のプラグインも、これらと同じ扱いでコンソールに並びます。

## 何ができるか

| 拡張ポイントの例 | できること |
|---|---|
| `console.page/route` | 新しいページを足す |
| `console.navigation/href` | 左のメニューに項目を足す |
| `console.tab/horizontalNav` | リソースの詳細画面にタブを足す（**このモジュールで使う**） |
| `console.action/provider` | リソースの「アクション」メニューに操作を足す |
| `console.dashboards/card` | 概要ダッシュボードにカードを足す |

拡張ポイントは 100 種類近くあります。一覧は、SDK の[拡張ポイントのドキュメント](https://github.com/openshift/console/blob/main/frontend/packages/console-dynamic-plugin-sdk/docs/console-extensions.md)にあります。

## どうやって読み込まれるか

```
① ブラウザでコンソールを開く
        │
        ▼
② コンソールが「有効なプラグインの一覧」を見る
   （Console リソースの spec.plugins: [..., handson-plugin]）
        │
        ▼
③ 各プラグインの ConsolePlugin リソースを見て、配信元の Service を知る
   （ConsolePlugin handson-plugin → Service handson-plugin:9443）
        │
        ▼
④ コンソールが Service から plugin-manifest.json を取り、ブラウザに渡す
   （「どの拡張ポイントに、どのモジュールを差し込むか」が書いてある）
        │
        ▼
⑤ 差し込む場所が表示されたとき、ブラウザがプラグインの JavaScript を取ってきて動かす
```

ここから分かる大事な点が 3 つあります。

1. **プラグインのコードはブラウザで動きます。** プラグインの Pod（nginx）は、ビルド済みのファイルを配るだけです。サーバー側で処理をするわけではありません。
2. **プラグインは、コンソールに登録して初めて読み込まれます。** ConsolePlugin リソースを作り、さらに Console リソースの `spec.plugins` に名前を足す、の 2 段階が必要です。
3. **ページを読み込み直したときに取り込まれます。** プラグインを更新したら、ブラウザでコンソールを再読み込みします。

## 部品の共有（Module Federation）

プラグインは React で書きますが、React そのものはプラグインに同梱しません。**コンソールが持っている React や PatternFly を共有して使います。** この仕組みを webpack の **Module Federation** と呼びます。

| 共有するもの | 理由 |
|---|---|
| React、React DOM | 1 つの画面に React が 2 つあると、正しく動かない |
| PatternFly | コンソールと見た目を揃える |
| SDK（`@openshift-console/dynamic-plugin-sdk`） | コンソールの機能（API へのアクセスなど）を使う |

このため、プラグインで使う部品の版は、コンソールの版（ここでは 4.22）に合わせる必要があります。

## 権限

プラグインが Kubernetes や Prometheus にアクセスするとき、**コンソール経由で、ログインしている人の権限**を使います。

- プラグイン専用の ServiceAccount や権限はありません。
- 管理者が開けば全部見え、一般のユーザーが開けば、その人が見られる範囲だけが見えます。
- つまり、プラグインを足しても、見られる範囲が勝手に広がることはありません。

## このユニットのまとめ

- dynamic plugin は、コンソールの拡張ポイントに部品を差し込む仕組みで、Red Hat の製品の画面もこれで作られている。
- プラグインのコードはブラウザで動き、Pod は静的ファイルを配るだけ。
- 読み込ませるには、ConsolePlugin リソースと Console の `spec.plugins` への登録が要る。
- React などはコンソールと共有し、データへのアクセスはログインしている人の権限で行う。

次のユニット：[3. プラグインを構成するもの](03-plugin-anatomy.md)
