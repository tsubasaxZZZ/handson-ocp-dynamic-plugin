# 3. プラグインを構成するもの

このユニットでは、プラグインのプロジェクトを構成するファイルと、ソースコードがコンソールに出るまでの流れを学びます。次のユニットで、これらを一つずつ作ります。

## ファイルの全体像

```
handson-plugin/
  ── プラグインの中身 ──────────────────────────────
  package.json             依存パッケージ / ビルドのコマンド / プラグインの定義
  console-extensions.json  どの拡張ポイントに、何を差し込むか
  src/HandsonTab.tsx       差し込む画面（React のコンポーネント）
  ── ビルドの設定 ──────────────────────────────────
  tsconfig.json            TypeScript の型チェックの設定
  .swcrc                   TypeScript / JSX を JavaScript にする swc の設定
  webpack.config.js        プラグインの形にまとめる webpack の設定
  ── クラスタへの配置 ────────────────────────────────
  Dockerfile               ビルドして nginx のイメージに詰める
  deploy/handson-plugin.yaml  Namespace / BuildConfig / Deployment / Service / ConsolePlugin など
  deploy.sh                ビルドから登録までを 1 回で流す
```

大きく 3 つのグループに分かれます。**中身**（何を差し込むか）、**ビルド**（どう JavaScript にするか）、**配置**（どうクラスタに置くか）です。

## プラグインの中身を決める 3 つのファイル

3 つのファイルは、名前でつながっています。

```
package.json                          console-extensions.json
  consolePlugin:                        [{
    name: handson-plugin                  type: console.tab/horizontalNav,
    exposedModules:                       properties: {
      HandsonTab: ./HandsonTab  ◀───────────  component: { $codeRef: HandsonTab }
              │                           }
              ▼                         }]
  src/HandsonTab.tsx
    export default HandsonTab
```

| ファイル | 決めていること |
|---|---|
| `package.json` の `consolePlugin` | プラグインの名前。そして「`src/HandsonTab.tsx` を `HandsonTab` という名前で外に公開する」（`exposedModules`）。公開したモジュールは、どれかの拡張ポイントから `$codeRef` で使われていないとビルドがエラーになる |
| `console-extensions.json` | 「VM の詳細画面にタブを足し、中身は `HandsonTab` を使う」（`$codeRef` で公開名を指す） |
| `src/HandsonTab.tsx` | タブの中身。`export default` したものが使われる |

## ビルドの流れ

```
src/HandsonTab.tsx ── tsc（型チェックだけ）─────┐ 型エラーがあればここで止まる
                                                 │
src/HandsonTab.tsx ── swc（TS/JSX → JS に変換）──┤
console-extensions.json ─────────────────────────┤── webpack + ConsoleRemotePlugin
package.json の consolePlugin ───────────────────┘          │
                                                            ▼
                                       dist/
                                         plugin-manifest.json   拡張ポイントの一覧
                                         plugin-entry.js        入口
                                         exposed-HandsonTab-chunk-….js  公開したモジュール
```

| 道具 | 役割 |
|---|---|
| **TypeScript（tsc）** | 型を調べる。JavaScript への変換はしない |
| **swc** | TypeScript と JSX を、ブラウザで動く JavaScript に変換する。速いが型は調べない |
| **webpack** | ファイルをまとめて、配れる形にする |
| **ConsoleRemotePlugin** | webpack のプラグイン（SDK の一部）。`consolePlugin` と `console-extensions.json` を読んで、コンソールが読み込める形（manifest と、Module Federation の形の JavaScript）を作る |

型チェックと変換を別の道具に分けているのは、テンプレート（[console-plugin-template](https://github.com/openshift/console-plugin-template)）と同じ考え方です。変換は速い swc に任せ、型の正しさは tsc で確かめます。

このビルドは、**手元**（`npm run build`。数秒で型の間違いが分かる）と、**配るイメージを作る場所**（Dockerfile）の 2 か所で同じものを流します。イメージを作る場所は、ユニット 4 で選ぶオプションで変わります（クラスタの中か、手元か）。両方で入る版が揃うのは、`package-lock.json` があるからです。

## クラスタに置くまでの流れ

```
手元のソース
   │ deploy.sh が tar にまとめて送る（oc start-build --from-archive）
   ▼
BuildConfig ── Dockerfile でビルド ──▶ ImageStream（内部レジストリのイメージ）
                                            │ 新しいイメージができると自動で入れ替え（image trigger）
                                            ▼
                                       Deployment（nginx。dist/ を 9443 で HTTPS 配信）
                                            ▲
Service（9443。証明書は OpenShift が自動で発行）
   ▲
ConsolePlugin（「handson-plugin は、この Service から配っている」）
   ▲
Console の spec.plugins に handson-plugin を足す（有効化）
```

上の図はオプション1（クラスタ内ビルド）の流れです。オプション2では、BuildConfig の代わりに手元でビルドして ImageStream へ push します（ユニット 4）。

| リソース | 役割 |
|---|---|
| BuildConfig | オプション1で、クラスタの中でビルドする設定。ソースは手元から送る（Binary ビルド）。オプション2では使わず、手元でビルドして ImageStream へ push する |
| ImageStream | できたイメージの置き場所 |
| Deployment | nginx の Pod。イメージが更新されると自動で入れ替わる |
| Service | コンソールはプラグインを **HTTPS でしか取りに来ない**。annotation で証明書を自動発行させる |
| ConsolePlugin | コンソールに配信元を教える |
| Console（`spec.plugins`） | プラグインを有効にする |

## このユニットのまとめ

- プラグインの中身は `package.json`（`exposedModules`）、`console-extensions.json`（`$codeRef`）、コンポーネントの 3 つで、**公開名**でつながっている。
- ビルドは「tsc で型チェック → swc で変換 → webpack と ConsoleRemotePlugin でまとめる」。
- 配置は「ImageStream → Deployment（nginx）→ Service → ConsolePlugin → Console に有効化」。イメージは BuildConfig で作る（オプション1）か、手元で作って push する（オプション2）。

次のユニット：[4. 演習：プロジェクトを作ってデプロイする](04-exercise-setup.md)
