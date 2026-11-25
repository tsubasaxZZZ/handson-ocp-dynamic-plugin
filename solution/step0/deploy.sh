#!/usr/bin/env bash
# マニフェストを適用し、クラスタ内でイメージをビルドしてコンソールにプラグインを登録する。
# raptor から: KUBECONFIG=~/cluster/auth/kubeconfig ./deploy.sh
set -euo pipefail

cd "$(dirname "$0")"
NS=handson-plugin
PLUGIN=handson-plugin

oc apply -f deploy/handson-plugin.yaml

# ビルドに要るものだけを送る（node_modules / dist は送らない）
archive=$(mktemp --suffix=.tar.gz)
trap 'rm -f "$archive"' EXIT
tar -czf "$archive" Dockerfile package.json package-lock.json tsconfig.json .swcrc webpack.config.js \
  console-extensions.json src
oc -n "$NS" start-build "$PLUGIN" --from-archive="$archive" --follow --wait

oc -n "$NS" rollout status deploy/"$PLUGIN" --timeout=5m

# コンソールで有効にする（もう入っていれば何もしない）
if ! oc get console.operator cluster -o jsonpath='{.spec.plugins}' | grep -q "\"$PLUGIN\""; then
  oc patch console.operator cluster --type=json \
    -p "[{\"op\":\"add\",\"path\":\"/spec/plugins/-\",\"value\":\"$PLUGIN\"}]"
fi
