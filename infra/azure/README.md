# Frontend Azure Deploy

이 디렉터리는 `front` 레포 기준 Azure 배포 자산이다.

## 파일
- `deploy-front.sh`
  - 프론트 이미지 빌드
  - Azure Container App `front` 생성/업데이트

## 워크플로
- `.github/workflows/azure-deploy-staging.yml`
- `.github/workflows/azure-deploy-production.yml`
