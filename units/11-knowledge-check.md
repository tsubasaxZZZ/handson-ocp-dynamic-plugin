# 11. 知識チェック

学んだ内容を確かめましょう。各問の答えは、`▶ 答え` を開くと見られます。

---

**1. プラグインの JavaScript は、どこで動きますか。**

- a. コンソールの Pod（openshift-console）
- b. プラグインの Pod（nginx）
- c. 利用者のブラウザ

<details><summary>▶ 答え</summary>

**c. 利用者のブラウザ**

プラグインの Pod は、ビルド済みの JavaScript を配るだけです。コンソールがブラウザに読み込ませ、ブラウザの中でコンソールの一部として動きます。（ユニット 2）
</details>

---

**2. ConsolePlugin リソースを作りました。まだ画面にプラグインが出ません。足りない手順はどれですか。**

- a. Console リソースの `spec.plugins` にプラグインの名前を足す
- b. プラグインの ServiceAccount に cluster-admin を付ける
- c. コンソールの Pod を再起動する

<details><summary>▶ 答え</summary>

**a. Console リソースの `spec.plugins` にプラグインの名前を足す**

ConsolePlugin は「配信元」を教えるだけで、有効にするには `spec.plugins` に足す必要があります。プラグイン専用の権限はありません（b）。足したあとは、ブラウザで再読み込みすれば取り込まれます（c は不要）。（ユニット 2、4）
</details>

---

**3. `console-extensions.json` の `"$codeRef": "HandsonTab"` の `HandsonTab` は、何を指していますか。**

- a. `src/` の中のファイル名
- b. `package.json` の `consolePlugin.exposedModules` に書いた公開名
- c. React のコンポーネントの関数名

<details><summary>▶ 答え</summary>

**b. `exposedModules` に書いた公開名**

`exposedModules` の `"HandsonTab": "./HandsonTab"` で付けた名前を指します。その公開名が `src/HandsonTab.tsx` の default export につながります。ファイル名や関数名とたまたま同じにしているだけです。（ユニット 3）
</details>

---

**4. VM の詳細にタブを足したら、タブを押すたびにタブが増えていきます。考えられる原因はどれですか。**

- a. `export default` を忘れている
- b. `page.name` か `page.href` が、既存のタブと同じになっている
- c. `useK8sWatchResource` が watch を閉じていない

<details><summary>▶ 答え</summary>

**b. 既存のタブと名前か href が重なっている**

kubevirt-plugin はタブ名を内部の識別子として使うので、重なると描き直すたびにタブが増えます。たとえば標準の「診断」タブ（href `diagnostics`）と重ねると起きます。（ユニット 6）
</details>

---

**5. `const [vmi, loaded, loadError] = useK8sWatchResource(...)` で、VM が止まっているとき、各値はどうなりますか。**

- a. `vmi` は空、`loaded` は `false`
- b. `vmi` は空、`loaded` は `true`
- c. `loadError` にエラーが入る

<details><summary>▶ 答え</summary>

**b. `vmi` は空、`loaded` は `true`**

取りに行った結果「VMI が無い」と分かった状態です。`loaded` が `false` なのは取っている途中のとき（a）、`loadError` に入るのは権限が無いなどのとき（c）です。表示を「読み込み中」と「停止中」で分けられるのは、このためです。（ユニット 7）
</details>

---

**6. タブを開いたまま VM を止めました。表示はどうなりますか。**

- a. 再読み込みするまで変わらない
- b. 数秒で自動的に「停止中」に変わる
- c. エラーになる

<details><summary>▶ 答え</summary>

**b. 数秒で自動的に変わる**

`useK8sWatchResource` は、取ったあとも watch で変化を見張り、変わったらコンポーネントを描き直させます。（ユニット 7、8）
</details>

---

**7. 管理者ではない VM の利用者にも、自分の VM の CPU 使用量をタブで見せたいです。`usePrometheusPoll` でどうしますか。**

- a. `namespace` を渡す
- b. `delay` を短くする
- c. プラグインに Prometheus を読む権限を付ける

<details><summary>▶ 答え</summary>

**a. `namespace` を渡す**

`namespace` を渡すと、テナンシーの窓口（`/api/prometheus-tenancy`）を通り、その namespace を見られる人なら使えます。渡さないと、クラスタ全体の指標を見られる人しか使えません。プラグイン専用の権限という考え方はありません（c）。（ユニット 9）
</details>

---

**8. `kubevirt_vmi_cpu_usage_seconds_total` を `rate(…[5m])` で使うのはなぜですか。**

- a. 値が大きすぎるので小さくするため
- b. 累計の値なので、1 秒あたりの増え方（＝使っているコア数）にするため
- c. 5 分ごとにしか値が来ないため

<details><summary>▶ 答え</summary>

**b. 累計を 1 秒あたりにするため**

`_total` の指標は、起動してからの累計です。CPU 時間の累計が 1 秒あたりにどれだけ増えたかが、使っているコア数になります。`[5m]` は「直近 5 分で平均する」という意味です。（ユニット 9）
</details>

---

次のユニット：[12. まとめと片付け](12-summary.md)
