import type { PageComponentProps } from '@openshift-console/dynamic-plugin-sdk';
import { Card, CardBody, CardTitle, PageSection } from '@patternfly/react-core';

// VM 詳細のタブ。kubevirt-plugin が、開いている VM を props.obj に入れて渡してくれる
const HandsonTab = ({ obj }: PageComponentProps) => (
  <PageSection>
    <Card>
      <CardTitle>ハンズオン</CardTitle>
      <CardBody>
        この VM は {obj?.metadata?.namespace} / {obj?.metadata?.name} です。
      </CardBody>
    </Card>
  </PageSection>
);

export default HandsonTab;
