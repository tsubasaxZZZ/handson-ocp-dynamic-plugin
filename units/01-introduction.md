# 1. はじめに

## シナリオ

あなたは、社内の仮想化基盤（OpenShift Virtualization）の運用担当です。VM の利用者から「この VM は今どのノードで動いているのか」「CPU はどれくらい使っているのか」とよく聞かれます。

答えはどれも OpenShift の中にありますが、いまは調べるたびに `oc get vmi …` を打ったり、監視画面で PromQL を書いたりしています。利用者が**いつも見ている VM の画面に、その情報を最初から出しておきたい**と考えました。

OpenShift の Web コンソールは、**dynamic plugin** という仕組みで、コンソールを作り直さずに画面を足せます。このモジュールでは、dynamic plugin を一から作って、VM の詳細画面に「ハンズオン」というタブを足し、次の情報を表示します。

| 表示する情報 | どこから取るか | 学ぶもの |
|---|---|---|
| VM の名前 | タブに渡される VM そのもの | 拡張ポイントとコンポーネント |
| 状態・載っているノード・ゲスト OS | Kubernetes（VirtualMachineInstance） | `useK8sWatchResource` |
| CPU 使用量（5 分平均） | Prometheus | `usePrometheusPoll` |

完成すると、VM の詳細画面に次のようなタブができます。

| 項目 | 値の例 |
|---|---|
| VM | default / test |
| 状態 | Running |
| ノード | worker-1 |
| ゲスト OS | CentOS Stream 9 |
| CPU 使用量（5 分平均） | 0.01 コア |

## このモジュールの進め方

- **概念**のユニットで仕組みを理解し、続く**演習**のユニットで手を動かします。
- 演習では、ファイルを書く → `npm run build` で手元で確かめる → `./deploy.sh`（オプション2では `./deploy-local.sh`）でビルド・デプロイ → ブラウザで確認、を繰り返します。
- 1 回のデプロイは、初回が 5〜10 分、2 回目以降は 2〜3 分ほどかかります。待っている間に、次の概念のユニットを読んでおくと効率的です。

次のユニット：[2. dynamic plugin とは](02-what-is-dynamic-plugin.md)
