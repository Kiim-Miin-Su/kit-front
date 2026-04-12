#!/usr/bin/env bash
set -euo pipefail

require_env() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "Missing required env: $name" >&2
    exit 1
  fi
}

to_lower() {
  echo "$1" | tr '[:upper:]' '[:lower:]'
}

slugify() {
  echo "$1" \
    | tr '[:upper:]' '[:lower:]' \
    | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//; s/--+/-/g'
}

require_env "AZURE_RESOURCE_GROUP"
require_env "AZURE_ACR_NAME"
require_env "AZURE_CONTAINERAPPS_ENV"
require_env "DOMAIN_NAME"
require_env "DEPLOY_ENV"
require_env "IMAGE_TAG"

PROJECT_NAME="$(to_lower "${PROJECT_NAME:-ai-edu}")"
DEPLOY_ENV="$(to_lower "$DEPLOY_ENV")"
BASE_SLUG="$(slugify "${PROJECT_NAME}-${DEPLOY_ENV}")"
AZURE_CONTAINER_APP_FRONT="${AZURE_CONTAINER_APP_FRONT:-${BASE_SLUG}-front}"

az extension add --name containerapp --upgrade --yes >/dev/null

az acr build \
  --registry "$AZURE_ACR_NAME" \
  --image "front:${IMAGE_TAG}" \
  --file Dockerfile \
  . \
  --output none

ACR_LOGIN_SERVER="$(
  az acr show \
    --name "$AZURE_ACR_NAME" \
    --resource-group "$AZURE_RESOURCE_GROUP" \
    --query loginServer \
    --output tsv
)"
ACR_USERNAME="$(
  az acr credential show \
    --name "$AZURE_ACR_NAME" \
    --query username \
    --output tsv
)"
ACR_PASSWORD="$(
  az acr credential show \
    --name "$AZURE_ACR_NAME" \
    --query passwords[0].value \
    --output tsv
)"

FRONT_IMAGE="${ACR_LOGIN_SERVER}/front:${IMAGE_TAG}"
API_HOST="api.${DOMAIN_NAME}"

if az containerapp show \
  --name "$AZURE_CONTAINER_APP_FRONT" \
  --resource-group "$AZURE_RESOURCE_GROUP" >/dev/null 2>&1; then
  az containerapp registry set \
    --name "$AZURE_CONTAINER_APP_FRONT" \
    --resource-group "$AZURE_RESOURCE_GROUP" \
    --server "$ACR_LOGIN_SERVER" \
    --username "$ACR_USERNAME" \
    --password "$ACR_PASSWORD" \
    --output none

  az containerapp update \
    --name "$AZURE_CONTAINER_APP_FRONT" \
    --resource-group "$AZURE_RESOURCE_GROUP" \
    --image "$FRONT_IMAGE" \
    --set-env-vars \
      NODE_ENV=production \
      NEXT_PUBLIC_API_BASE_URL="https://${API_HOST}" \
      NEXT_PUBLIC_DEV_ROLE_BYPASS=false \
    --output none
else
  az containerapp create \
    --name "$AZURE_CONTAINER_APP_FRONT" \
    --resource-group "$AZURE_RESOURCE_GROUP" \
    --environment "$AZURE_CONTAINERAPPS_ENV" \
    --image "$FRONT_IMAGE" \
    --ingress external \
    --target-port 3000 \
    --registry-server "$ACR_LOGIN_SERVER" \
    --registry-username "$ACR_USERNAME" \
    --registry-password "$ACR_PASSWORD" \
    --cpu 0.5 \
    --memory 1.0Gi \
    --min-replicas 1 \
    --max-replicas 2 \
    --env-vars \
      NODE_ENV=production \
      NEXT_PUBLIC_API_BASE_URL="https://${API_HOST}" \
      NEXT_PUBLIC_DEV_ROLE_BYPASS=false \
    --output none
fi

az containerapp revision set-mode \
  --name "$AZURE_CONTAINER_APP_FRONT" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --mode Single \
  --output none
