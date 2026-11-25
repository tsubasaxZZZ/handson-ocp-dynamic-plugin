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
  const [vmi, loaded] = useK8sWatchResource<VMI>({
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
          </DescriptionList>
        </CardBody>
      </Card>
    </PageSection>
  );
};

export default HandsonTab;
