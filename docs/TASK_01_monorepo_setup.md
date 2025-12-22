# Role Definition
You are a Lead Full-Stack Architect.
We have initialized a Monorepo with the following structure:
```text
locusum/ (Root)
├── server/ (Spring Boot 3 + Kotlin + Gradle) - initialized
└── client/ (React + Vite + TypeScript) - initialized
```

## Task Implementation & Orchestration
## 1. Root Configuration
Create a `docker-compose.yml` in the root `locusum/` directory to orchestrate the entire stack.
- **Service `db`**:
    - Image: `pgvector/pgvector:pg16`
    - Ports: `"5432:5432"` (Exposed to host so external Python scripts can connect)
    - Environment:
        - `POSTGRES_DB=locusum`
        - `POSTGRES_USER=locusum`
        - `POSTGRES_PASSWORD=locusum_pass`
    - Volume: `./pg_data:/var/lib/postgresql/data`
- **Service `server`**:
    - Build context: `./server`
    - Ports: `"8080:8080"`
    - Depends on: `db`
    - Environment:
        - `SPRING_DATASOURCE_URL=jdbc:postgresql://db:5432/locusum`
        - `SPRING_DATASOURCE_USERNAME=locusum`
        - `SPRING_DATASOURCE_PASSWORD=locusum_pass`
- **Service `client`**:
    - Build context: `./client`
    - Ports: `"5173:5173"`
    - Depends on: `server`

## 2. Server Module Implementation (`server/`)
- **Dockerfile**: Create a multi-stage Dockerfile (Build with Gradle -> Run with OpenJDK 21).
- **Configuration**: Create `src/main/resources/application.yml`.
    - Configure JPA/Hibernate.
    - **Important:** Set `spring.jpa.hibernate.ddl-auto=validate` (Because the DB schema is managed by an external Python ingestor, Spring should NOT create tables).
- **Domain**: Create `Article` entity (Kotlin Data Class).
    - Map to table `articles`.
    - Fields: `id` (Long), `title` (String), `summary` (String), `content` (String), `url` (String), `publishedAt` (LocalDateTime).
    - *Note: Ignore the `embedding` vector column for now to avoid JPA type errors.*
- **API**: Create `ArticleController`.
    - Endpoint: `GET /api/articles`
    - Logic: Return top 20 most recent articles sorted by `publishedAt` descending.
- **CORS**: Allow requests from `http://localhost:5173` (Local Dev) and `http://localhost:3000`.

## 3. Client Module Implementation (`client/`)
- **Dockerfile**: Create a Dockerfile (Node environment).
- **Proxy**: Update `vite.config.ts`.
    - Configure proxy `/api` -> `http://localhost:8080` (This allows local development without CORS issues).
- **UI**: Replace `src/App.tsx` with a clean news feed UI.
    - Fetch data from `/api/articles` on mount using `useEffect`.
    - Display a list of articles (Title, Date, Summary).
    - Use basic CSS or Tailwind (if available) for readability.

# Output Request
Please provide the code for the following files:

1.  **`docker-compose.yml`** (Root)
2.  **`server/Dockerfile`**
3.  **`server/src/main/resources/application.yml`**
4.  **`server/src/main/kotlin/.../Article.kt`** (Entity)
5.  **`server/src/main/kotlin/.../ArticleController.kt`** (Controller)
6.  **`client/Dockerfile`**
7.  **`client/vite.config.ts`**
8.  **`client/src/App.tsx`**