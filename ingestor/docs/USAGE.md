# 사용 방법 (Usage Guide)

## 1. 개별 사이트 크롤링 (Crawling Individual Sites)
터미널에서 다음 명령어를 실행하여 특정 사이트의 최신 뉴스를 수집할 수 있습니다.

```bash
# Texas Tribune
scrapy crawl texas_tribune

# Dallas News
scrapy crawl dallas_news

# Houston Chronicle (Playwright 필요)
scrapy crawl houston_chronicle

# Community Impact
scrapy crawl community_impact
```

## 1.1 일괄 크롤링 (Batch Crawling)
모든 크롤러를 순차적으로 실행하려면 `runner.py`를 사용하거나 다음 스크립트를 사용합니다.

```bash
# Docker 환경에서의 권장 실행 방식
python -m locusum_ingestor.runner --mode crawler
```

## 2. AI Configuration (Gemini vs Ollama)

LocuSum Ingestor supports both Google Gemini and Ollama for AI enrichment (Summarization & Embeddings).

### 2.1 Gemini (Default)
Ensure `GOOGLE_API_KEY` is set in `.env`.
```bash
LLM_PROVIDER=gemini
GOOGLE_API_KEY=your_key_here
```

### 2.2 Ollama
To use a local Ollama instance:
1.  Set `LLM_PROVIDER=ollama` in `.env`.
2.  Configure the URL and Model:
    ```bash
    OLLAMA_BASE_URL=http://host.docker.internal:11434
    OLLAMA_MODEL=llama3
    ```
3.  **Important**: You must pull the models in Ollama first:
    ```bash
    ollama pull llama3
    ollama pull nomic-embed-text
    ```

## 3. 워커 실행 (Running Workers)
수집된 데이터를 처리하고 AI 요약을 수행하려면 다음 워커들을 실행해야 합니다. (Docker Compose 사용 시 자동 실행됨)

### 3.1 데이터 처리 워커 (Ingestion Worker)
수집된 Raw Data(PostgreSQL `raw_articles` 테이블)를 정제하여 메인 테이블(`articles`)로 이동시킵니다.
```bash
python3 -m locusum_ingestor.runner --mode processor
```

### 3.2 AI 요약 워커 (AI Worker)
Google Gemini 또는 Ollama를 사용하여 기사 요약 및 임베딩을 생성합니다.
```bash
python3 -m locusum_ingestor.runner --mode ai
```

## 4. 자동화 및 운영 (Automation & Operations)

### 4.1 모닝 태스크 스케줄링 (Morning Cron Job)
매일 아침 자동으로 인제스터 서비스를 실행하고 데이터를 수집한 뒤 종료하려면 `cron`을 설정합니다.

1.  **Crontab 편집**:
    ```bash
    crontab -e
    ```

2.  **스케줄 등록** (매일 07:00 시작, 08:00 자동 종료):
    > **주의:** 스크립트 경로는 실제 프로젝트 위치에 맞게 수정해야 할 수 있습니다. 아래는 예시입니다.
    ```cron
    0 7 * * * /home/call3in/Dev/Project/LocuSum/locusum/scripts/morning_task.sh
    ```

3.  **로그 확인**:
    작업 결과는 프로젝트 루트의 `task_log.txt` 파일에 기록됩니다.
    ```bash
    tail -f /home/call3in/Dev/Project/LocuSum/locusum/task_log.txt
    ```
