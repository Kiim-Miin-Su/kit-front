.PHONY: dev dev-d logs stop clean test shell build

# ── 개발 환경 ──────────────────────────────────────────
dev:          ## 개발 서버 실행 (foreground, 핫 리로드)
	docker compose up

dev-d:        ## 개발 서버 백그라운드 실행
	docker compose up -d

logs:         ## front 컨테이너 로그 스트리밍
	docker compose logs -f front

stop:         ## 컨테이너 중지
	docker compose down

clean:        ## 컨테이너 + node_modules 볼륨 삭제
	docker compose down -v

# ── 테스트 ──────────────────────────────────────────────
test:         ## 단위 테스트 실행
	docker compose exec front npm test

# ── 빌드 ────────────────────────────────────────────────
build:        ## 프로덕션 이미지 빌드
	docker compose -f docker-compose.prod.yml build

# ── 유틸 ────────────────────────────────────────────────
shell:        ## front 컨테이너 쉘 진입
	docker compose exec front sh

help:         ## 사용 가능한 명령어 목록
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
	  awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'
