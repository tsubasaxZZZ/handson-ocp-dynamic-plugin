# 4. 演習：プロジェクトを作ってデプロイする

この演習では、空のディレクトリにプラグインのプロジェクトを一から作り、**まだ何も表示しない空のプラグイン**をクラスタにデプロイして、コンソールに登録します。画面に変化はありませんが、「作る → ビルドする → 配る → 登録する」の道が全部通ったことを確かめます。

所要時間：約 30 分（うちビルドの待ち時間 5〜10 分）

## タスク 1：作業用のディレクトリを作る

1. 端末で、作業用のディレクトリを作って移動します。

   ```bash
   mkdir -p ~/handson-plugin/src ~/handson-plugin/deploy
   cd ~/handson-plugin
   ```

   以降、このモジュールのコマンドはすべて `~/handson-plugin` で実行します。

2. クラスタに cluster-admin でログインしていることを確かめます。

   ```bash
   oc whoami
   oc auth can-i patch console.operator.openshift.io   # yes と出ること
   ```

   **なぜ：** 最後にコンソールの設定（Console リソース）を書き換えてプラグインを有効にするため、cluster-admin の権限が要ります。

## タスク 2：Node をグローバルに入れずに用意する

`package.json` を作ったり、手元でビルドを試したりするのに Node.js（npm）を使います。システムやユーザー全体（グローバル）には入れず、**このハンズオンの作業ディレクトリの中だけ**に置きます。終わったら作業ディレクトリを消せば、何も残りません。

| 置くもの | 場所 | 既定の場所（使わない） |
|---|---|---|
| Node.js 本体 | `~/handson-plugin/.node` | `/usr/local` など |
| npm のキャッシュ | `~/handson-plugin/.npm-cache` | `~/.npm` |

版は、クラスタでのビルドに使うイメージ（`ubi9/nodejs-22`）に合わせて **Node.js 22** にします。

1. 公式の tar 版を、作業ディレクトリの中に展開します（Linux x64 の場合）。

   ```bash
   mkdir -p .node
   curl -fsSL https://nodejs.org/dist/v22.23.3/node-v22.23.3-linux-x64.tar.xz | tar -xJ -C .node --strip-components=1
   ```

   macOS（Apple シリコン）なら `node-v22.23.3-darwin-arm64.tar.gz` を使い、`tar -xJ` を `tar -xz` に読み替えてください。版は 22 系なら、新しいものでかまいません。

2. この作業ディレクトリでだけ有効にする設定を、`env.sh` に書きます。

   ```bash
   cat > env.sh <<'ENV'
   # このハンズオンの Node と npm のキャッシュを使う（グローバルには入れない）
   export PATH="$HOME/handson-plugin/.node/bin:$PATH"
   export npm_config_cache="$HOME/handson-plugin/.npm-cache"
   ENV
   source env.sh
   ```

   **端末を開き直したら、毎回 `source ~/handson-plugin/env.sh` を実行します。**

3. 使えることを確かめます。

   ```bash
   which node        # ~/handson-plugin/.node/bin/node
   node --version    # v22.x.x
   npm --version
   ```

## タスク 3：package.json を作る

`package.json` は、Node.js のプロジェクトの設定ファイルです。このプロジェクトでは 3 つの役割があります。手では書かず、npm のコマンドで作ります。

| 部分 | 役割 |
|---|---|
| `scripts.build` | ビルドのコマンド。まず `tsc --noEmit` で型を調べ、通ったら `webpack` でビルドする。型の間違いがあればここで止まる |
| `devDependencies` | ビルドに使うパッケージ。`npm i` で入れると自動で書き込まれる |
| `consolePlugin` | プラグインの定義。`name` と `exposedModules`（外に公開するモジュール） |

1. ひな形を作り、名前とビルドのコマンドを設定します。

   ```bash
   npm init -y
   npm pkg set name=handson-plugin version=0.1.0 'scripts.build=tsc --noEmit && webpack'
   npm pkg set private=true --json
   npm pkg delete main scripts.test keywords author license description
   ```

   | コマンド | やっていること |
   |---|---|
   | `npm init -y` | 既定の値で `package.json` を作る |
   | `npm pkg set …` | 値を書き込む。`--json` を付けると、値を文字列ではなく JSON（ここでは `true`）として書く |
   | `npm pkg delete …` | ひな形が入れる、今回は使わない項目を消す |

   `private: true` は、間違って npm の公開リポジトリに公開しないための印です。

2. ビルドに使うパッケージを入れます。

   ```bash
   npm i -D --save-exact \
     @openshift-console/dynamic-plugin-sdk@4.22.0 \
     @openshift-console/dynamic-plugin-sdk-webpack@4.22.0 \
     @patternfly/react-core@6.6.2 \
     react@18.3.1 react-dom@18.3.1 @types/react@18.3.31 \
     react-router@7.13.2 react-i18next@16.5.8 i18next@25.10.10 \
     typescript@5.9.3 @swc/core@1.15.40 swc-loader@0.2.7 \
     webpack@5.111.1 webpack-cli@7.2.3
   ```

   | オプション | 意味 |
   |---|---|
   | `-D` | `devDependencies` に入れる。プラグインは、ビルドしたものだけを配るので、全部ビルド用の扱いでよい |
   | `--save-exact` | `^4.22.0` のような幅を持たせず、`4.22.0` と固定して書く。コンソールと組み合わせて動くことを確かめた版から動かないようにする |
   | `<名前>@<版>` | 入れる版を指定する |

   | パッケージ | 何に使うか |
   |---|---|
   | `@openshift-console/dynamic-plugin-sdk` | コンソールの機能と型（`useK8sWatchResource` など） |
   | `@openshift-console/dynamic-plugin-sdk-webpack` | `ConsoleRemotePlugin`（プラグインの形にまとめる webpack のプラグイン） |
   | `@patternfly/react-core` | コンソールと同じ見た目の部品 |
   | `react`、`react-dom`、`@types/react` | 画面を書く。実行時はコンソールのものが使われる |
   | `react-router`、`react-i18next`、`i18next` | コンソールと共有するライブラリ。直接は使わないが、共有する版を合わせるために入れる |
   | `typescript` | 型チェック |
   | `@swc/core`、`swc-loader` | TypeScript / JSX を JavaScript に変換する。`@swc/core` は 1.15.40 に固定（1.16 系はビルドに使う UBI9 のイメージで動かなかった） |
   | `webpack`、`webpack-cli` | ビルド |

   `node_modules/`（パッケージの実体）と `package-lock.json`（入った版の一覧。依存の依存まで固定される）ができます。

3. プラグインの定義を書き込みます。

   ```bash
   npm pkg set \
     consolePlugin.name=handson-plugin \
     consolePlugin.version=0.1.0 \
     'consolePlugin.displayName=Handson Plugin' \
     'consolePlugin.dependencies[@console/pluginAPI]=>=4.22.0-0'
   npm pkg set 'consolePlugin.exposedModules={}' --json
   ```

   | 項目 | 意味 |
   |---|---|
   | `exposedModules={}` | 外に公開するモジュールの一覧。**この演習ではまだ空**にしておき、ユニット 6 で拡張ポイントと一緒に足す（理由はタスク 6）。`--json` は「値を文字列ではなく JSON の `{}` として書く」 |
   | `dependencies[@console/pluginAPI]` | 「コンソール 4.22 以降で動く」という宣言。名前に `/` を含むので `[ ]` で囲む |

4. できた `package.json` を確かめます。

   ```bash
   cat package.json
   ```

   次と同じになっていれば成功です（項目の並び順は違ってもかまいません）。

```json
{
  "name": "handson-plugin",
  "version": "0.1.0",
  "scripts": {
    "build": "tsc --noEmit && webpack"
  },
  "private": true,
  "devDependencies": {
    "@openshift-console/dynamic-plugin-sdk": "4.22.0",
    "@openshift-console/dynamic-plugin-sdk-webpack": "4.22.0",
    "@patternfly/react-core": "6.6.2",
    "@swc/core": "1.15.40",
    "@types/react": "18.3.31",
    "i18next": "25.10.10",
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "react-i18next": "16.5.8",
    "react-router": "7.13.2",
    "swc-loader": "0.2.7",
    "typescript": "5.9.3",
    "webpack": "5.111.1",
    "webpack-cli": "7.2.3"
  },
  "consolePlugin": {
    "name": "handson-plugin",
    "version": "0.1.0",
    "displayName": "Handson Plugin",
    "dependencies": {
      "@console/pluginAPI": ">=4.22.0-0"
    },
    "exposedModules": {}
  }
}
```

## タスク 4：TypeScript と swc の設定を作る

`tsconfig.json` は**型チェック**の設定、`.swcrc` は**変換**の設定です（ユニット 3 の「ビルドの流れ」）。

| `tsconfig.json` の設定 | 意味 |
|---|---|
| `jsx: react-jsx` | JSX を、React 17 以降の書き方（`import React` が要らない）で扱う |
| `strict: true` | 厳しい型チェック。「無いかもしれない値」をそのまま使うとエラーになる |
| `skipLibCheck: true` | 依存パッケージの中の型までは調べない（時間短縮） |
| `types: []` | 不要な型定義（Node.js など）を読まない |
| `include: ["src"]` | `src` だけを対象にする |

1. 次の内容で `tsconfig.json` を作ります。

```json
{
  "compilerOptions": {
    "target": "es2021",
    "module": "esnext",
    "moduleResolution": "node",
    "jsx": "react-jsx",
    "strict": true,
    "skipLibCheck": true,
    "types": []
  },
  "include": ["src"]
}
```

2. 次の内容で `.swcrc` を作ります（ファイル名は先頭がドット）。TypeScript と JSX を読み（`parser`）、JSX を React 17 以降の形に変換し（`transform.react.runtime: automatic`）、ES2021 の JavaScript を出します。

```json
{
  "$schema": "https://swc.rs/schema.json",
  "jsc": {
    "parser": {
      "syntax": "typescript",
      "jsx": true,
      "tsx": true
    },
    "transform": {
      "react": {
        "runtime": "automatic"
      }
    },
    "target": "es2021",
    "baseUrl": "."
  },
  "module": {
    "type": "es6"
  },
  "sourceMaps": true,
  "minify": true
}
```

## タスク 5：webpack の設定を作る

普通の webpack の設定とほぼ同じです。違うのは、プラグインの欄に `ConsoleRemotePlugin` を入れているところだけです。

| 設定 | 意味 |
|---|---|
| `context: src` | パスの基準を `src` にする。`exposedModules` の `./HandsonTab` は `src/HandsonTab.tsx` を指す |
| `entry: {}` | 入口は空でよい。公開するモジュールは `ConsoleRemotePlugin` が `exposedModules` から作る |
| `output` | `dist/` に出す。ファイル名にハッシュを付け、ブラウザのキャッシュで古い版が使われないようにする |
| 1 つ目の `rules` | `.ts` / `.tsx` を swc-loader で変換する |
| 2 つ目の `rules` | 依存パッケージの ES Modules を、拡張子なしの import で読めるようにする |
| `plugins` | `ConsoleRemotePlugin` |

1. 次の内容で `webpack.config.js` を作ります。

```js
// プラグインをビルドする設定。ConsoleRemotePlugin が package.json の consolePlugin と
// console-extensions.json を読み、コンソールが読み込める形（plugin-manifest.json と
// モジュールに分けた JavaScript）を dist/ に出す
const path = require('path');
const { ConsoleRemotePlugin } = require('@openshift-console/dynamic-plugin-sdk-webpack');

module.exports = {
  mode: 'production',
  context: path.resolve(__dirname, 'src'),
  entry: {},
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name]-bundle-[contenthash].min.js',
    chunkFilename: '[name]-chunk-[chunkhash].min.js',
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },
  module: {
    rules: [
      // TypeScript / JSX を JavaScript にする（型チェックはしない。型チェックは npm run build の tsc）
      { test: /\.(jsx?|tsx?)$/, exclude: /node_modules/, use: 'swc-loader' },
      // 依存パッケージの ESM を拡張子なしの import で読めるようにする
      { test: /\.m?js$/, resolve: { fullySpecified: false } },
    ],
  },
  plugins: [new ConsoleRemotePlugin()],
  devtool: 'source-map',
};
```

## タスク 6：空の拡張ポイントとコンポーネントを置く

この演習では、まだ何も差し込みません。

- `console-extensions.json` は空の配列にします。
- `src/HandsonTab.tsx` には、中身の無いコンポーネントを置きます。tsc は、`src` に TypeScript のファイルが 1 つも無いとエラーになるためです。
- このコンポーネントは、**まだ公開しません**（`exposedModules` は空）。ConsoleRemotePlugin は、「公開したのに、どの拡張ポイントからも使われていないモジュール」をエラーにします（`Exposed module '…' is not referenced by any extension`）。公開は、拡張ポイントを書くユニット 6 で一緒に行います。

1. `console-extensions.json` を作ります（空の配列）。

```json
[]
```

2. `src/HandsonTab.tsx` を作ります。`null` を返すコンポーネントは、何も表示しません。

```tsx
// ユニット 6 でここにタブの中身を書く
const HandsonTab = () => null;

export default HandsonTab;
```

## タスク 7：手元でビルドしてみる

クラスタに送る前に、手元でビルドが通ることを確かめます。数秒で終わるので、以降の演習でも、コードを書いたらまずここで確かめます。

1. ビルドします。

   ```bash
   npm run build
   ```

   最後に `webpack 5.111.1 compiled with 1 warning` と出れば成功です。警告の中身は `Plugin has no extensions`（差し込みが 1 つも無い）で、今は空のプラグインなので正しい状態です。型の間違いがあると、その前の `tsc --noEmit` で止まり、ファイル名と行番号が出ます。

2. できたものを見ます。ConsoleRemotePlugin が作った、コンソールが読み込む形です。

   ```bash
   ls dist/
   cat dist/plugin-manifest.json
   ```

   | ファイル | 中身 |
   |---|---|
   | `plugin-manifest.json` | プラグインの名前、版、そして `extensions`（差し込みの一覧）。今は `console-extensions.json` が空なので `"extensions":[]` |
   | `plugin-entry.js` | コンソールが最初に読み込む入口（Module Federation の入口） |

   ユニット 6 でモジュールを公開すると、`exposed-HandsonTab-chunk-….js`（公開した `HandsonTab` の中身）などがここに増えます。

   この `dist/` を nginx で配るのが、次のタスクからの仕事です。

## タスク 8：Dockerfile を作る

2 段構えのビルドです。1 段目で node を使って `dist/` を作り、2 段目でその `dist/` だけを nginx のイメージに入れます。最終的なイメージには、node も node_modules も入りません。

`npm ci` は、`package-lock.json` に書かれた版を**そのまま**入れるコマンドです。手元で入れたのとまったく同じ版で、クラスタでもビルドされます。`package.json` と `package-lock.json` だけを先にコピーして入れているのは、ソースだけを変えたときに、パッケージのインストールをやり直さずに済ませる（ビルドのキャッシュを効かせる）ためです。

1. 次の内容で `Dockerfile` を作ります。

```dockerfile
# 1 段目: node でビルドする
FROM registry.access.redhat.com/ubi9/nodejs-22:latest AS build
USER root
WORKDIR /usr/src/app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

# 2 段目: できた dist/ を nginx で配る
FROM registry.access.redhat.com/ubi9/nginx-124:latest
COPY --from=build /usr/src/app/dist /usr/share/nginx/html
USER 1001
ENTRYPOINT ["nginx", "-g", "daemon off;"]
```

## タスク 9：クラスタに置くもののマニフェストを作る

ユニット 3 の「クラスタに置くまでの流れ」の 7 つのリソースを、1 つのファイルに書きます。

| リソース | ポイント |
|---|---|
| Namespace | `handson-plugin` |
| ImageStream | ビルドしたイメージの置き場所 |
| BuildConfig | `source.type: Binary`（ソースは手元から送る）、`strategy: Docker`（Dockerfile でビルド）、出力先は ImageStream |
| ConfigMap | nginx の設定。9443 で HTTPS を受け、`/usr/share/nginx/html`（= `dist/`）を配る |
| Deployment | annotation `image.openshift.io/triggers` で、ImageStream が更新されたら自動で新しいイメージに入れ替える。証明書と nginx の設定をマウントする |
| Service | annotation `service.beta.openshift.io/serving-cert-secret-name` で、OpenShift に HTTPS の証明書（Secret `plugin-serving-cert`）を発行させる |
| ConsolePlugin | `backend.service` で、配信元の Service と port を教える |

1. 次の内容で `deploy/handson-plugin.yaml` を作ります。

```yaml
# ハンズオン用のコンソールプラグイン。
# イメージはクラスタ内でビルドする（BuildConfig、バイナリ入力）。手順は README.md
---
apiVersion: v1
kind: Namespace
metadata:
  name: handson-plugin
---
apiVersion: image.openshift.io/v1
kind: ImageStream
metadata:
  name: handson-plugin
  namespace: handson-plugin
---
apiVersion: build.openshift.io/v1
kind: BuildConfig
metadata:
  name: handson-plugin
  namespace: handson-plugin
spec:
  source:
    type: Binary
  strategy:
    type: Docker
    dockerStrategy:
      dockerfilePath: Dockerfile
  output:
    to:
      kind: ImageStreamTag
      name: handson-plugin:latest
  resources:
    limits:
      memory: 4Gi
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: handson-plugin
  namespace: handson-plugin
data:
  nginx.conf: |
    error_log /dev/stdout info;
    events {}
    http {
      access_log         /dev/stdout;
      include            /etc/nginx/mime.types;
      default_type       application/octet-stream;
      keepalive_timeout  65;
      server {
        listen              9443 ssl;
        listen              [::]:9443 ssl;
        ssl_certificate     /var/cert/tls.crt;
        ssl_certificate_key /var/cert/tls.key;
        root                /usr/share/nginx/html;
      }
    }
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: handson-plugin
  namespace: handson-plugin
  annotations:
    # ImageStream が更新されたら（ビルドが終わったら）自動でロールアウトする
    image.openshift.io/triggers: >-
      [{"from":{"kind":"ImageStreamTag","name":"handson-plugin:latest"},"fieldPath":"spec.template.spec.containers[?(@.name==\"handson-plugin\")].image"}]
spec:
  replicas: 1
  selector:
    matchLabels:
      app: handson-plugin
  template:
    metadata:
      labels:
        app: handson-plugin
    spec:
      containers:
        - name: handson-plugin
          image: image-registry.openshift-image-registry.svc:5000/handson-plugin/handson-plugin:latest
          ports:
            - containerPort: 9443
              protocol: TCP
          securityContext:
            allowPrivilegeEscalation: false
            capabilities:
              drop: ["ALL"]
          resources:
            requests:
              cpu: 10m
              memory: 50Mi
          volumeMounts:
            - name: plugin-serving-cert
              readOnly: true
              mountPath: /var/cert
            - name: nginx-conf
              readOnly: true
              mountPath: /etc/nginx/nginx.conf
              subPath: nginx.conf
      securityContext:
        runAsNonRoot: true
        seccompProfile:
          type: RuntimeDefault
      volumes:
        - name: plugin-serving-cert
          secret:
            secretName: plugin-serving-cert
            defaultMode: 420
        - name: nginx-conf
          configMap:
            name: handson-plugin
            defaultMode: 420
---
apiVersion: v1
kind: Service
metadata:
  name: handson-plugin
  namespace: handson-plugin
  annotations:
    service.beta.openshift.io/serving-cert-secret-name: plugin-serving-cert
spec:
  selector:
    app: handson-plugin
  ports:
    - name: 9443-tcp
      protocol: TCP
      port: 9443
      targetPort: 9443
---
apiVersion: console.openshift.io/v1
kind: ConsolePlugin
metadata:
  name: handson-plugin
spec:
  displayName: Handson Plugin
  backend:
    type: Service
    service:
      name: handson-plugin
      namespace: handson-plugin
      port: 9443
      basePath: /
```

## タスク 10：デプロイのスクリプトを作る

`deploy.sh` は、次の 4 つを順に行います。

1. マニフェストを適用する（`oc apply`）
2. ビルドに要るファイルだけを tar にまとめ、クラスタに送ってビルドする（`oc start-build --from-archive --follow --wait`。ログが端末に流れる）。`node_modules/`、`dist/`、`.node/` は送らない（クラスタで入れ直す）
3. 新しい Pod に入れ替わるのを待つ（`oc rollout status`）
4. Console の `spec.plugins` に `handson-plugin` を足す（もう入っていれば何もしない）

1. 次の内容で `deploy.sh` を作り、実行できるようにします。

```bash
#!/usr/bin/env bash
# マニフェストを適用し、クラスタ内でイメージをビルドしてコンソールにプラグインを登録する。
# 別の kubeconfig を使うときは KUBECONFIG=<パス> ./deploy.sh のように指定する。
set -euo pipefail

cd "$(dirname "$0")"
NS=handson-plugin
PLUGIN=handson-plugin

oc apply -f deploy/handson-plugin.yaml

# ビルドに要るものだけを送る（node_modules / dist は送らない）
tmpdir=$(mktemp -d)
trap 'rm -rf "$tmpdir"' EXIT
archive="$tmpdir/src.tar.gz"
tar -czf "$archive" Dockerfile package.json package-lock.json tsconfig.json .swcrc webpack.config.js \
  console-extensions.json src
oc -n "$NS" start-build "$PLUGIN" --from-archive="$archive" --follow --wait

oc -n "$NS" rollout status deploy/"$PLUGIN" --timeout=5m

# コンソールで有効にする（もう入っていれば何もしない）
if ! oc get console.operator cluster -o jsonpath='{.spec.plugins}' | grep -q "\"$PLUGIN\""; then
  oc patch console.operator cluster --type=json \
    -p "[{\"op\":\"add\",\"path\":\"/spec/plugins/-\",\"value\":\"$PLUGIN\"}]"
fi
```

   ```bash
   chmod +x deploy.sh
   ```

## タスク 11：デプロイする

1. ファイルが揃っていることを確かめます。

   ```bash
   find . -path ./node_modules -prune -o -path ./.node -prune -o -path ./.npm-cache -prune -o -path ./dist -prune -o -type f -print | sort
   ```

   次の 11 個が出れば揃っています。

   ```
   ./.swcrc
   ./Dockerfile
   ./console-extensions.json
   ./deploy.sh
   ./deploy/handson-plugin.yaml
   ./env.sh
   ./package-lock.json
   ./package.json
   ./src/HandsonTab.tsx
   ./tsconfig.json
   ./webpack.config.js
   ```

2. デプロイします。

   ```bash
   ./deploy.sh
   ```

   初回は、ビルド用のイメージの取得と `npm ci` で 5〜10 分かかります。ビルドのログが端末に流れます。`npm warn deprecated …` という警告は、依存パッケージの中で使われている古いライブラリについてのもので、無視してかまいません。

## 結果を確認する

1. ログの終わりの方に、次の 3 行があることを確かめます。

   ```
   webpack 5.111.1 compiled with 1 warning in ...
   Push successful
   deployment "handson-plugin" successfully rolled out
   ```

2. リソースができていることを確かめます。

   ```bash
   oc get consoleplugin handson-plugin                           # 表示される
   oc get console.operator cluster -o jsonpath='{.spec.plugins}' # handson-plugin が含まれる
   oc -n handson-plugin get pod                                  # handson-plugin-… が Running
   ```

3. プラグインの manifest が配られていることを確かめます（コンソールが取りに行くのと同じものです）。

   ```bash
   oc -n handson-plugin exec deploy/handson-plugin -- curl -sk https://localhost:9443/plugin-manifest.json
   ```

   `"name":"handson-plugin"` と `"extensions":[]` が見えれば、空のプラグインとして正しく配られています。

この時点では、まだ画面に変化はありません。次のユニットからは、`console-extensions.json` と `src/HandsonTab.tsx` を書き換えて `./deploy.sh` を流す、を繰り返します。

## うまくいかないとき

| 症状 | 対処 |
|---|---|
| `npm ci` で止まる | `package.json` と `package-lock.json` の食い違い。`npm i` をやり直してから、もう一度 `./deploy.sh` |
| `npm run build` で止まる | `which node` が `~/handson-plugin/.node/bin/node` か（`source env.sh` を忘れていないか）確かめる |
| `error TS…` で止まる | 型エラー。ファイル名と行番号がログに出る |
| `oc start-build` が `Forbidden` | cluster-admin でログインしているか確かめる |
| どうしても進まない | 完成形をコピーし、`npm ci` で入れ直す：`cp -r <このリポジトリ>/solution/step0/. ~/handson-plugin/ && cd ~/handson-plugin && source env.sh && npm ci` |

次のユニット：[5. React・TypeScript・SDK の基礎](05-react-and-sdk.md)
