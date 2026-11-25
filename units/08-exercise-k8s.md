# 8. 演習：VMI の情報を表示する

この演習では、`useK8sWatchResource` で VMI を取り、タブに「状態・ノード・ゲスト OS」を表示します。

所要時間：約 15 分

## タスク 1：表示する値を確かめる

画面に出す前に、取りたい値が実際にどこにあるかを `oc` で見ておきます。

1. 任意の VM の VMI を見ます（`<VM 名>` と `<namespace>` は、ユニット 6 でタブを開いた VM）。

   ```bash
   oc get vmi <VM 名> -n <namespace> -o jsonpath='{.status.phase}{"  "}{.status.nodeName}{"  "}{.status.guestOSInfo.prettyName}{"\n"}'
   ```

   例：`Running  worker-1  CentOS Stream 9`

   この 3 つ（`status.phase`、`status.nodeName`、`status.guestOSInfo.prettyName`）を、タブに出します。

## タスク 2：コンポーネントを書き換える

ユニット 6 のコンポーネントに、次の 3 つを足します。

| 変更 | なぜ |
|---|---|
| ① 使うフィールドだけの型 `VMI` を作る | `useK8sWatchResource<VMI>` に渡して、`vmi.status.phase` などを型付きで扱うため |
| ② `useK8sWatchResource` で VMI を取る | VM と同じ namespace・名前で取る。watch なので、変化が自動で反映される |
| ③ `DescriptionList` で値を並べる | 「項目名：値」を、コンソールと同じ見た目で並べる |

1. `src/HandsonTab.tsx` を、次の内容に置き換えます。

```tsx
import { useK8sWatchResource, type K8sResourceCommon, type PageComponentProps } from '@openshift-console/dynamic-plugin-sdk';
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
  const [vmi, loaded, loadError] = useK8sWatchResource<VMI>({
    groupVersionKind: { group: 'kubevirt.io', version: 'v1', kind: 'VirtualMachineInstance' },
    namespace,
    name,
  });

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
                {loadError
                  ? '読み込めません（権限がない可能性があります）'
                  : !loaded
                    ? '読み込み中'
                    : (vmi?.status?.phase ?? '停止中（VMI なし）')}
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
          </DescriptionList>
        </CardBody>
      </Card>
    </PageSection>
  );
};

export default HandsonTab;
```

   コードの読み方：

   | 部分 | 意味 |
   |---|---|
   | `type VMI = K8sResourceCommon & { status?: … }` | ① 使うフィールドだけの型 |
   | `const [vmi, loaded, loadError] = useK8sWatchResource<VMI>({ … })` | ② VMI を取る。3 つ目の戻り値（`loadError`）も受け取る |
   | `loadError ? '読み込めません…' : !loaded ? '読み込み中' : …` | 権限が無いなどで取れなければその案内、取り終わる前は「読み込み中」、取れたのに VMI が無ければ「停止中」 |
   | `vmi?.status?.guestOSInfo?.prettyName ?? '…'` | guest agent が報告していなければ、代わりの文字を出す |
   | `<DescriptionList isHorizontal>` | ③ 項目名と値を横に並べる |

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

1. コンソールを再読み込みして、ユニット 6 と同じ VM の「ハンズオン」タブを開きます。
2. 表示が、タスク 1 で `oc` で見た値と同じであることを確かめます。

   | 項目 | 期待する値 |
   |---|---|
   | VM | `<namespace>` / `<VM 名>` |
   | 状態 | `Running` |
   | ノード | タスク 1 のノード名 |
   | ゲスト OS | タスク 1 の OS 名（guest agent が無い VM は「-（guest agent の報告なし）」） |

3. **watch の動きを確かめます。** タブを開いたまま、別の端末で VM を止めます。

   ```bash
   virtctl stop <VM 名> -n <namespace>
   # virtctl が無ければ：
   oc patch vm <VM 名> -n <namespace> --type=merge -p '{"spec":{"runStrategy":"Halted"}}'
   ```

   **再読み込みしなくても**、数秒で状態が「停止中（VMI なし）」、ノードとゲスト OS が「-」に変わることを確かめます。

4. VM を起動し直し、表示が戻ることを確かめます（ゲスト OS は、guest agent が起動して報告するまで少しかかります）。

   ```bash
   virtctl start <VM 名> -n <namespace>
   # または：
   oc patch vm <VM 名> -n <namespace> --type=merge -p '{"spec":{"runStrategy":"Always"}}'
   ```

   > `runStrategy` を変えた場合は、終わったら元の値に戻してください（`oc get vm <VM 名> -n <namespace> -o jsonpath='{.spec.runStrategy}'` で、変える前に控えておく）。

## うまくいかないとき

| 症状 | 対処 |
|---|---|
| ずっと「読み込み中」 | `groupVersionKind` の書き間違い（`kubevirt.io` / `v1` / `VirtualMachineInstance`）。ブラウザの開発者ツールのネットワークで、`/api/kubernetes/...` へのリクエストがエラーになっていないか確かめる |
| 動いているのに「停止中」 | `namespace` か `name` を取り違えている |
| どうしても進まない | `cp <このリポジトリ>/solution/step2/HandsonTab.tsx ~/handson-plugin/src/` |

次のユニット：[9. usePrometheusPoll で指標を取る](09-use-prometheus-poll.md)
