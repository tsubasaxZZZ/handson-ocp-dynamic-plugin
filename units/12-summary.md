# 12. まとめと片付け

## まとめ

このモジュールでは、OpenShift の Web コンソールを dynamic plugin で拡張し、VM の詳細画面に自分のタブを足しました。

最初のシナリオでは、「この VM はどのノードで動いているか」「CPU をどれくらい使っているか」を調べるたびに、`oc` や監視画面で調べていました。今は、利用者がいつも見ている VM の画面に、その情報が最初から出ています。しかも、VM の状態が変わればすぐに反映され、管理者でない利用者にも、自分の VM の分だけが見えます。

学んだこと：

- dynamic plugin は、コンソールの**拡張ポイント**に部品を差し込む仕組み。コードはブラウザで動き、Pod は静的ファイルを配るだけ。
- プラグインの中身は、`package.json` の `exposedModules`、`console-extensions.json` の `$codeRef`、コンポーネントの 3 つが**公開名**でつながってできている。
- ビルドは「tsc で型チェック → swc で変換 → webpack と ConsoleRemotePlugin でまとめる」。手元で確かめ、配るイメージは `package-lock.json` どおりに作る（作る場所はオプションで選ぶ）。
- 配置は「ImageStream → Deployment（nginx）→ Service（HTTPS）→ ConsolePlugin → Console の `spec.plugins`」。イメージの作り方は 2 通りある（オプション1：BuildConfig でクラスタ内ビルド／オプション2：手元でビルドして内部レジストリへ push）。
- `useK8sWatchResource` は、Kubernetes のリソースを「取る＋見張る」フック。
- `usePrometheusPoll` は、PromQL を定期的に投げるフック。`namespace` を渡すと、管理者でなくても使える。
- どちらも、ログインしている人の権限でアクセスする。

## 片付け

このモジュールで作ったものを削除します。

1. コンソールの有効化を外します（`spec.plugins` から `handson-plugin` を消す）。

   ```bash
   idx=$(oc get console.operator cluster -o json | python3 -c 'import json,sys;print(json.load(sys.stdin)["spec"]["plugins"].index("handson-plugin"))') &&
   oc patch console.operator cluster --type=json -p "[{\"op\":\"remove\",\"path\":\"/spec/plugins/$idx\"}]"
   ```

   **なぜ先にこれをするか：** ConsolePlugin を先に消すと、コンソールが存在しないプラグインを読み込もうとして、エラーを出し続けます。

2. ConsolePlugin と namespace を消します。namespace を消すと、イメージ、Deployment、Service もまとめて消えます（オプション1の BuildConfig も）。

   ```bash
   oc delete consoleplugin handson-plugin
   oc delete ns handson-plugin
   ```

3. 確かめます。

   ```bash
   oc get console.operator cluster -o jsonpath='{.spec.plugins}'   # handson-plugin が無い
   oc get consoleplugin handson-plugin                             # NotFound
   ```

4. コンソールを再読み込みすると、「ハンズオン」タブが消えます。

手元の `~/handson-plugin` を消せば、Node 本体と npm のキャッシュ（`.node/`、`.npm-cache/`）も一緒に消え、端末には何も残りません。

```bash
rm -rf ~/handson-plugin
```

## 次のステップ

| やりたいこと | 方法 |
|---|---|
| 日本語と英語を切り替える | 表示文字列を `useTranslation('plugin__handson-plugin')` の `t()` で包み、`locales/ja`・`locales/en` に訳を書く。webpack で `locales/` を `dist/` にコピーし、ConsolePlugin に `spec.i18n.loadType: Preload` を付ける。`page.name` は `%plugin__handson-plugin~ハンズオン%` の形で翻訳キーにできる |
| 独立したページとメニューを作る | `console.page/route` と `console.navigation/href` を使う。メニューの href は、`namespaced` ではなく `prefixNamespaced: true` にする（`namespaced` だと、今いるページからの相対 URL になってしまう） |
| 指標をグラフにする | SDK の `QueryBrowser` に PromQL を渡す。コンソールの「監視 → メトリクス」と同じグラフが出る |
| 一覧の画面を作る | `useK8sWatchResource` に `isList: true` を付け、PatternFly の `Table` で並べる |
| デプロイせずに画面で試す | `webpack serve` でプラグインを手元から配り、手元で動かしたコンソールにつなぐ（[console-plugin-template](https://github.com/openshift/console-plugin-template) の README） |

実際、このモジュールで使った部品だけでも、全 VM の一覧画面と VM 詳細のタブを備えた、実運用向けのプラグインが作れます。

## 参考リンク

- [OpenShift Container Platform 4.22 ドキュメント：Web console → Dynamic plugins](https://docs.redhat.com/en/documentation/openshift_container_platform/4.22/html-single/web_console/index)
- [console-plugin-template（release-4.22 ブランチ）](https://github.com/openshift/console-plugin-template/tree/release-4.22)
- [SDK：拡張ポイントの一覧](https://github.com/openshift/console/blob/main/frontend/packages/console-dynamic-plugin-sdk/docs/console-extensions.md)
- [SDK：API の一覧](https://github.com/openshift/console/blob/main/frontend/packages/console-dynamic-plugin-sdk/docs/api.md)
- [PatternFly 6](https://www.patternfly.org/)（[Card](https://www.patternfly.org/components/card)、[Description list](https://www.patternfly.org/components/description-list)）
