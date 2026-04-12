# Frontend Azure Deploy

> 이 문서는 `front` GitHub 레포 기준이다.

## 이 레포가 맡는 역할
- 프론트 이미지 빌드
- Azure Container App `front` 배포

## 권장 분리 원칙
- 인프라 생성은 `back` 레포가 맡는 편이 맞다.
- `front` 레포는 앱 배포만 맡고, DB/Key Vault/PostgreSQL/migration은 다루지 않는다.

## 이 레포에 두는 것이 맞는 파일
- `infra/azure/deploy-front.sh`
- `infra/azure/README.md`
- `.github/workflows/azure-deploy-staging.yml`
- `.github/workflows/azure-deploy-production.yml`

## GitHub Environment 위치
- `front` 레포
- `Settings -> Environments`
- `staging`, `production` 각각 생성

## GitHub Variables
- `PROJECT_NAME`
- `AZURE_SUBSCRIPTION_ID`
- `AZURE_TENANT_ID`
- `AZURE_CLIENT_ID`
- `AZURE_LOCATION`
- `DOMAIN_NAME`
- `AZURE_RESOURCE_GROUP`
- `AZURE_ACR_NAME`
- `AZURE_CONTAINERAPPS_ENV`
- `AZURE_CONTAINER_APP_FRONT`

## GitHub Secrets
- 기본적으로 없음
- 필요 시 추가

## 권장 예시값
- `PROJECT_NAME=ai-edu`
- `AZURE_LOCATION=koreacentral`
- `AZURE_RESOURCE_GROUP=ai-edu-staging-rg`
- `AZURE_ACR_NAME=aiedustagingacr`
- `AZURE_CONTAINERAPPS_ENV=ai-edu-staging-env`
- `AZURE_CONTAINER_APP_FRONT=ai-edu-staging-front`

## 프론트 런타임 기준
- `NODE_ENV=production`
- `NEXT_PUBLIC_API_BASE_URL=https://api.<domain>`
- `NEXT_PUBLIC_DEV_ROLE_BYPASS=false`

## 실행 순서
1. `front` 레포의 `staging` environment 변수 입력
2. 프론트 배포 workflow 실행
3. `https://app.<domain>` 확인
4. 동일 구조로 `production`도 입력 후 실행

## 사용자가 직접 해야 하는 일
- DNS `app.<domain>` 연결
- GitHub Environment 값 입력
- 프론트 배포 workflow 실행 승인

## 참고
- 루트 총괄 문서: [`../AZURE_DEPLOY_HANDOFF.md`](../AZURE_DEPLOY_HANDOFF.md)
- 실제 인프라/백엔드 기준: [`../back/AZURE_DEPLOY.md`](../back/AZURE_DEPLOY.md)
