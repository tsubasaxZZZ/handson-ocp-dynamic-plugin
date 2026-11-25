#!/usr/bin/env bash
# マニフェストを適用し、手元でビルドしたイメージをクラスタの内部レジストリへ push して、
# コンソールにプラグインを登録する（オプション2。クラスタの中ではビルドしない）。
# 別の kubeconfig を使うときは KUBECONFIG=<パス> ./deploy-local.sh のように指定する。
# 証明書エラーで止まる場合は TLS_VERIFY=false ./deploy-local.sh と実行する（podman のみ）。
set -euo pipefail

cd "$(dirname "$0")"
NS=handson-plugin
PLUGIN=handson-plugin

# コンテナランタイム（podman があれば podman、無ければ docker を使う）
if command -v podman >/dev/null 2>&1; then
  RT=podman
elif command -v docker >/dev/null 2>&1; then
  RT=docker
else
  echo "podman か docker が必要です" >&2
  exit 1
fi

# 内部レジストリの公開ルートを先に確かめる（マニフェストを適用する前に止まるため）
if ! REGISTRY=$(oc get route default-route -n openshift-image-registry -o jsonpath='{.spec.host}'); then
  echo "内部レジストリの公開ルートが有効になっていません。タスク 11 の手順で有効にしてください" >&2
  exit 1
fi
IMAGE="$REGISTRY/$NS/$PLUGIN:latest"

# push の認証に使うトークン（証明書だけの kubeconfig では取れない。その場合は oc login し直す）
TOKEN=$(oc whoami -t 2>/dev/null || true)
if [ -z "$TOKEN" ]; then
  echo "oc whoami -t でトークンが取れませんでした。oc login し直してください" >&2
  exit 1
fi

oc apply -f deploy/handson-plugin-local.yaml

# 手元でビルドして push する（クラスタは amd64 なので、Apple シリコンでもプラットフォームを合わせる）
TLS_OPT=""
if [ "$RT" = podman ] && [ "${TLS_VERIFY:-true}" = "false" ]; then
  TLS_OPT="--tls-verify=false"
fi
$RT build --platform linux/amd64 -t "$IMAGE" .
echo "$TOKEN" | $RT login -u unused --password-stdin $TLS_OPT "$REGISTRY"
$RT push $TLS_OPT "$IMAGE"

oc -n "$NS" rollout status deploy/"$PLUGIN" --timeout=5m

# コンソールで有効にする（もう入っていれば何もしない）
if ! oc get console.operator cluster -o jsonpath='{.spec.plugins}' | grep -q "\"$PLUGIN\""; then
  oc patch console.operator cluster --type=json \
    -p "[{\"op\":\"add\",\"path\":\"/spec/plugins/-\",\"value\":\"$PLUGIN\"}]"
fi
