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
  const [vmi, loaded, loadError] = useK8sWatchResource<VMI>({
    groupVersionKind: { group: 'kubevirt.io', version: 'v1', kind: 'VirtualMachineInstance' },
    namespace,
    name,
  });

  // 直近 5 分の CPU 使用量（コア数）を Prometheus に聞く。namespace を渡すと、その namespace を
  // 見られる人なら管理者でなくても使える API（テナンシー）を通る。
  // namespace と name が取れるまでは、空の query にして問い合わせない（ユニット 9）
  const [cpu] = usePrometheusPoll({
    endpoint: PrometheusEndpoint.QUERY,
    query:
      namespace && name
        ? `sum(rate(kubevirt_vmi_cpu_usage_seconds_total{namespace="${namespace}",name="${name}"}[5m]))`
        : '',
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
