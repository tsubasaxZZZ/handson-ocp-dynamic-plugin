# 9. usePrometheusPoll で指標を取る

このユニットでは、プラグインから Prometheus の指標を読むフック `usePrometheusPoll` と、そのために必要な PromQL の最低限を学びます。

## OpenShift の監視の仕組み

OpenShift には、最初から監視の仕組み（Prometheus）が入っています。各コンポーネントが出す**指標**（メトリクス）を数十秒ごとに集め、時系列として貯めています。

OpenShift Virtualization も、VM ごとの指標を出しています（`kubevirt_vmi_` で始まる名前）。

| 指標 | 中身 |
|---|---|
| `kubevirt_vmi_cpu_usage_seconds_total` | VM が使った CPU 時間の累計（秒） |
| `kubevirt_vmi_memory_used_bytes` | ゲストが使っているメモリ |
| `kubevirt_vmi_storage_iops_read_total` | ディスクの読み取り回数の累計 |
| `kubevirt_vmi_network_receive_bytes_total` | NIC の受信量の累計 |

コンソールの **監視 → メトリクス** で、名前を入れると中身を見られます。

## PromQL の最低限

指標は **PromQL** という問い合わせ言語で取り出します。演習で使うのは、次の 1 本です。

```
sum(rate(kubevirt_vmi_cpu_usage_seconds_total{namespace="default",name="test"}[5m]))
```

内側から読みます。

| 部分 | 意味 |
|---|---|
| `kubevirt_vmi_cpu_usage_seconds_total` | 指標の名前 |
| `{namespace="default",name="test"}` | ラベルで絞る。この VM の分だけ |
| `[5m]` | 直近 5 分の値の並び |
| `rate(…)` | 1 秒あたりの増え方。CPU 時間の累計の増え方 ＝ **使っているコア数** |
| `sum(…)` | 複数の系列（vCPU ごとなど）を足して 1 つの値にする |

`_total` で終わる指標は「累計」なので、そのままでは意味が無く、`rate()` で「1 秒あたり」にして使います。

## usePrometheusPoll とは

`usePrometheusPoll` は、**PromQL を Prometheus に投げ、決まった間隔で取り直す**フックです。取り直すたびに、コンポーネントが新しい値で描き直されます。

`useK8sWatchResource` との違いは、変化を「通知してもらう」（watch）か、「定期的に聞きに行く」（poll）かです。Prometheus には watch の仕組みが無いので、poll になります。

### 裏で起きていること

```
コンポーネント
  │ usePrometheusPoll({ query, namespace, delay: 30000 })
  ▼
SDK ── delay ごとに繰り返す
  │
  ▼
コンソールのサーバー
  │ namespace を渡したとき：/api/prometheus-tenancy/…?namespace=<ns>
  │ 渡さないとき：        /api/prometheus/…
  ▼
Thanos Querier（openshift-monitoring。Prometheus をまとめて問い合わせる窓口）
```

`namespace` を渡すかどうかで、通る窓口が変わります。これが権限に関わる大事な点です。

| `namespace` | 通る窓口 | 誰が使えるか | 見られる範囲 |
|---|---|---|---|
| 渡す | テナンシー（`prometheus-tenancy`） | **その namespace を見られる人**（管理者でなくてよい） | その namespace の指標だけ（クエリに namespace の条件が自動で付く） |
| 渡さない | クラスタ全体（`prometheus`） | **クラスタ全体の指標を見られる人**（管理者など） | 全部 |

VM の利用者にも見せたいタブなので、演習では `namespace` を渡します。

## 使い方

```ts
const [response, loaded, error] = usePrometheusPoll({
  endpoint: PrometheusEndpoint.QUERY,
  query: 'PromQL',
  namespace: 'default',
  delay: 30000,
});
```

### 引数

| フィールド | 意味 |
|---|---|
| `endpoint` | `PrometheusEndpoint.QUERY`（今の値を 1 つ）か `PrometheusEndpoint.QUERY_RANGE`（時系列。グラフ用） |
| `query` | PromQL。空にすると問い合わせない |
| `namespace` | 上の表のとおり。渡すとテナンシーの窓口を通る |
| `delay` | 取り直す間隔（ミリ秒）。30000 なら 30 秒ごと |
| `timespan`、`samples` | `QUERY_RANGE` のとき、どれだけ前から何点取るか |

### 戻り値

| 順番 | 意味 |
|---|---|
| 1 | Prometheus の API の応答そのもの（下の形） |
| 2 | 取り終わったか |
| 3 | エラー |

```json
{
  "status": "success",
  "data": {
    "resultType": "vector",
    "result": [
      { "metric": {}, "value": [1791873472.123, "0.0123"] }
    ]
  }
}
```

値は `data.result[0].value[1]` にあります。**文字列**なので、計算や桁数の調整をするときは `Number()` で数にします。結果が 0 件（VM が止まっていて指標が無い、など）のときは、`result` が空の配列になります。

```ts
const cores = response?.data?.result?.[0]?.value?.[1];   // "0.0123" か undefined
```

## グラフにしたいとき

時系列をグラフにするなら、SDK の `QueryBrowser` コンポーネントが使えます。コンソールの「監視 → メトリクス」と同じグラフが出ます。このモジュールでは扱いませんが、「次のステップ」で紹介します。

## このユニットのまとめ

- OpenShift Virtualization は、`kubevirt_vmi_` で始まる VM ごとの指標を出している。
- `_total` の指標は累計なので、`rate()` で 1 秒あたりにして使う。CPU 時間なら、それがコア数になる。
- `usePrometheusPoll` は、PromQL を定期的に投げて描き直すフック。
- `namespace` を渡すと、その namespace を見られる人なら管理者でなくても使える。
- 値は `data.result[0].value[1]` に文字列で入っている。

次のユニット：[10. 演習：CPU 使用量を表示する](10-exercise-prometheus.md)
