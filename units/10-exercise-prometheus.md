# 10. 演習：CPU 使用量を表示する

この演習では、`usePrometheusPoll` で VM の CPU 使用量（直近 5 分の平均、コア数）を取り、タブに表示します。

所要時間：約 15 分

## タスク 1：PromQL を確かめる

画面に出す前に、使う PromQL が値を返すことを確かめます。

1. コンソールで **監視 → メトリクス** を開きます。
2. 次の PromQL を入れて実行します（`<namespace>` と `<VM 名>` は、これまでの演習の VM）。

   ```
   sum(rate(kubevirt_vmi_cpu_usage_seconds_total{namespace="<namespace>",name="<VM 名>"}[5m]))
   ```

3. `0.0123` のような値が 1 つ返ることを確かめます。この値を、タブにも出します。

## タスク 2：コンポーネントを書き換える

ユニット 8 のコンポーネントに、次の 3 つを足します。

| 変更 | なぜ |
|---|---|
| ① import に `PrometheusEndpoint` と `usePrometheusPoll` を足す | SDK から Prometheus を読む部品を使うため |
| ② `useK8sWatchResource` の下で `usePrometheusPoll` を呼ぶ | タスク 1 の PromQL を 30 秒ごとに投げる。`namespace` を渡して、管理者でなくても使える窓口を通す |
| ③ `DescriptionList` に CPU の行を足す | 値（文字列）を数にして、小数 2 桁で出す |

1. `src/HandsonTab.tsx` を、次の内容に置き換えます。

```tsx
import {
  PrometheusEndpoint,
  useK8sWatchResource,
  usePrometheusPoll,
  type K8sResourceCommon,
  type PageComponentProps,
} from '@openshift-console/dynamic-plugin-sdk';
import {
  Card,
  CardBody,
  CardTitle,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  PageSection,
} from '@patternfly/react-core';

// VMI（動いている VM の実体）から使うフィールドだけを型にする
type VMI = K8sResourceCommon & {
  status?: {
    phase?: string;
    nodeName?: string;
    guestOSInfo?: { prettyName?: string };
  };
};

const HandsonTab = ({ obj }: PageComponentProps) => {
  const namespace = obj?.metadata?.namespace;
  const name = obj?.metadata?.name;

  // VM と同じ名前の VMI を watch する。値が変われば自動で再描画される
  const [vmi, loaded] = useK8sWatchResource<VMI>({
    groupVersionKind: { group: 'kubevirt.io', version: 'v1', kind: 'VirtualMachineInstance' },
    namespace,
    name,
  });

  // 直近 5 分の CPU 使用量（コア数）を Prometheus に聞く。namespace を渡すと、その namespace を
  // 見られる人なら管理者でなくても使える API（テナンシー）を通る
  const [cpu] = usePrometheusPoll({
    endpoint: PrometheusEndpoint.QUERY,
    query: `sum(rate(kubevirt_vmi_cpu_usage_seconds_total{namespace="${namespace}",name="${name}"}[5m]))`,
    namespace,
    delay: 30000,
  });
  const cores = cpu?.data?.result?.[0]?.value?.[1];

  return (
    <PageSection>
      <Card>
        <CardTitle>ハンズオン</CardTitle>
        <CardBody>
          <DescriptionList isHorizontal>
            <DescriptionListGroup>
              <DescriptionListTerm>VM</DescriptionListTerm>
              <DescriptionListDescription>
                {namespace} / {name}
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>状態</DescriptionListTerm>
              <DescriptionListDescription>
                {!loaded ? '読み込み中' : vmi?.status?.phase ?? '停止中（VMI なし）'}
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>ノード</DescriptionListTerm>
              <DescriptionListDescription>{vmi?.status?.nodeName ?? '-'}</DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>ゲスト OS</DescriptionListTerm>
              <DescriptionListDescription>
                {vmi?.status?.guestOSInfo?.prettyName ?? '-（guest agent の報告なし）'}
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>CPU 使用量（5 分平均）</DescriptionListTerm>
              <DescriptionListDescription>
                {cores === undefined ? '-' : `${Number(cores).toFixed(2)} コア`}
              </DescriptionListDescription>
            </DescriptionListGroup>
          </DescriptionList>
        </CardBody>
      </Card>
    </PageSection>
  );
};

export default HandsonTab;
```

   コードの読み方（ユニット 8 からの差分）：

   | 部分 | 意味 |
   |---|---|
   | `usePrometheusPoll({ endpoint: PrometheusEndpoint.QUERY, … })` | ② 今の値を 1 つ取る |
   | `` query: `sum(rate(…{namespace="${namespace}",name="${name}"}[5m]))` `` | テンプレート文字列（`` ` `` で囲み、`${}` で値を埋め込む）で、この VM の namespace と名前を入れる |
   | `namespace,` | テナンシーの窓口を通る |
   | `delay: 30000` | 30 秒ごとに取り直す |
   | `cpu?.data?.result?.[0]?.value?.[1]` | 応答から値（文字列）を取り出す。結果が 0 件なら `undefined` |
   | `` `${Number(cores).toFixed(2)} コア` `` | ③ 数にして、小数 2 桁で出す |

## タスク 3：手元でビルドして確かめる

1. 新しい端末なら、先に `source ~/handson-plugin/env.sh` を実行します。
2. 手元でビルドします。型の間違いがあれば、ここで数秒で分かります。

   ```bash
   npm run build
   ```

   `compiled successfully` と出れば次へ進みます。

## タスク 4：デプロイする

1. デプロイします。

   ```bash
   ./deploy.sh
   ```

## 結果を確認する

1. コンソールを再読み込みして、「ハンズオン」タブを開きます。
2. 「CPU 使用量（5 分平均）」に `0.01 コア` のような値が出ることを確かめます。
3. タスク 1 の「監視 → メトリクス」の値と、小数 2 桁で一致することを確かめます（30 秒ごとに取り直すので、多少ずれることがあります）。
4. **（任意）** VM の中で負荷をかけると、5 分平均なので、数分かけて値が上がっていくことを確かめられます。

   ```bash
   # VM のコンソール（virtctl console <VM 名>）で
   timeout 300 sh -c 'while :; do :; done' &
   ```

完成したタブは、次のようになります。

| 項目 | 値の例 |
|---|---|
| VM | default / test |
| 状態 | Running |
| ノード | worker-1 |
| ゲスト OS | CentOS Stream 9 |
| CPU 使用量（5 分平均） | 0.01 コア |

## うまくいかないとき

| 症状 | 対処 |
|---|---|
| ずっと「-」 | VM が止まっている（指標が無い）。または PromQL の namespace / name の書き間違い。タスク 1 で値が出るか確かめる |
| 管理者以外で開くと「-」 | `namespace` を渡しているか確かめる。渡さないと、クラスタ全体の指標を見られる人しか使えない |
| どうしても進まない | `cp <このリポジトリ>/console-plugin/handson/solution/step3/HandsonTab.tsx ~/handson-plugin/src/` |

次のユニット：[11. 知識チェック](11-knowledge-check.md)
