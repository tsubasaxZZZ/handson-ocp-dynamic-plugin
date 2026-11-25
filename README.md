# OpenShift コンソールを dynamic plugin で拡張する

OpenShift の Web コンソールに、自分の画面を足す方法を学びます。空のディレクトリからプラグインを作り、仮想マシン（VM）の詳細画面にタブを 1 つ足して、Kubernetes と Prometheus から取った値を表示するところまでを、手を動かしながら進めます。

- **レベル：** 初級（OpenShift の基本操作ができる人向け。React の経験は不要）
- **所要時間：** 約 2 時間（ビルドの待ち時間を含む）
- **製品：** Red Hat OpenShift Container Platform 4.22、OpenShift Virtualization

## 学習目標

このモジュールを終えると、次のことができるようになります。

- dynamic plugin がコンソールに読み込まれる仕組みを説明できる
- プラグインのプロジェクト（`package.json`、TypeScript、webpack、Dockerfile）を一から作れる
- 拡張ポイントを使って、リソースの詳細画面にタブを足せる
- `useK8sWatchResource` で Kubernetes のリソースを取り、画面に出せる
- `usePrometheusPoll` で Prometheus の指標を取り、画面に出せる
- プラグインのイメージを作り（クラスタの中、または手元で）、コンソールに登録・削除できる

## 前提条件

- OpenShift 4.22 のクラスタと、cluster-admin のアカウント（プラグインの登録に必要）
- OpenShift Virtualization が入っていて、動いている VM が 1 台以上あること
- 手元の端末（Linux か macOS）に `oc`、`curl`、`tar`、`python3`（片付けで使う）、テキストエディタ
- Node.js 22 を使います。**システムやユーザー全体には入れず**、ユニット 4 で作業ディレクトリの中にだけ置きます（終わったらディレクトリごと消せる）
- ディスクの空き 1 GB ほど（Node 本体と依存パッケージ）
- イメージの作り方は 2 通りから選べます（ユニット 4）。オプション2（手元でビルドして push する）を使う場合は、手元に `podman` か `docker` が必要です

## ユニット

| # | ユニット | 種類 | 目安 |
|---|---|---|---|
| 1 | [はじめに](units/01-introduction.md) | はじめに | 3 分 |
| 2 | [dynamic plugin とは](units/02-what-is-dynamic-plugin.md) | 概念 | 10 分 |
| 3 | [プラグインを構成するもの](units/03-plugin-anatomy.md) | 概念 | 10 分 |
| 4 | [演習：プロジェクトを作ってデプロイする](units/04-exercise-setup.md) | 演習 | 30 分 |
| 5 | [React・TypeScript・SDK の基礎](units/05-react-and-sdk.md) | 概念 | 10 分 |
| 6 | [演習：VM の詳細にタブを足す](units/06-exercise-tab.md) | 演習 | 15 分 |
| 7 | [useK8sWatchResource で Kubernetes のデータを取る](units/07-use-k8s-watch-resource.md) | 概念 | 10 分 |
| 8 | [演習：VMI の情報を表示する](units/08-exercise-k8s.md) | 演習 | 15 分 |
| 9 | [usePrometheusPoll で指標を取る](units/09-use-prometheus-poll.md) | 概念 | 10 分 |
| 10 | [演習：CPU 使用量を表示する](units/10-exercise-prometheus.md) | 演習 | 15 分 |
| 11 | [知識チェック](units/11-knowledge-check.md) | 知識チェック | 5 分 |
| 12 | [まとめと片付け](units/12-summary.md) | まとめ | 5 分 |

`solution/` に、各演習の完成形があります。詰まったときは、そこからコピーしてください。

```
README.md      このページ
units/         各ユニット
solution/
  step0/       ユニット 4 の完成形（プロジェクト一式）
  step1/       ユニット 6 で変える 3 ファイル（package.json / console-extensions.json / HandsonTab.tsx）
  step2/       ユニット 8 の src/HandsonTab.tsx
  step3/       ユニット 10 の src/HandsonTab.tsx
```
