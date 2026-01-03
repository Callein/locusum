package com.locusum.server.service

import com.fasterxml.jackson.annotation.JsonProperty
import com.locusum.server.domain.Article
import com.locusum.server.repository.ArticleRepository
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import org.springframework.web.client.RestClient

@Service
class SearchService(
    private val articleRepository: ArticleRepository,
    @Value("\${ollama.base-url:http://localhost:11434}") private val ollamaBaseUrl: String,
    @Value("\${ollama.model:nomic-embed-text}") private val ollamaModel: String
) {
    private val restClient = RestClient.builder()
        .baseUrl(ollamaBaseUrl)
        .build()

    fun search(query: String, aiEnabled: Boolean = true): List<Article> {
        val aiResults = if (aiEnabled) {
            try {
                // 1. Get Embedding from Ollama
                val embeddingVector = getEmbedding(query)
                
                // 2. Search in DB using pure vector similarity (Cosine Distance)
                val embeddingString = embeddingVector.joinToString(prefix = "[", postfix = "]", separator = ",")
                
                val results = articleRepository.findSimilarWithScore(embeddingString)
                
                results.map { tuple ->
                    val article = mapTupleToArticle(tuple)
                    val score = tuple.get("score", Number::class.java).toDouble()
                    article.searchScore = score
                    
                    // Assign Relevance Label
                    article.relevanceLabel = when {
                        score >= 0.70 -> "Highly Relevant"
                        score >= 0.50 -> "Related"
                        else -> "General"
                    }
                    
                    article
                }.filter { (it.searchScore ?: 0.0) >= 0.50 } // Filter out low relevance
            } catch (e: Exception) {
                println("AI Search failed: ${e.message}")
                emptyList()
            }
        } else {
            emptyList()
        }

        // 3. Keyword Search
        val keywordResults = articleRepository.findByTitleContainingIgnoreCaseOrContentTextContainingIgnoreCase(query, query)
        
        // 4. Merge Results: AI matches first, then Keyword matches (preventing duplicates)
        // If AI is disabled, aiResults is empty, so only keywordResults are returned.
        val combined = (aiResults + keywordResults).distinctBy { it.articleId }
        
        return combined
    }

    private fun mapTupleToArticle(tuple: jakarta.persistence.Tuple): Article {
        // Since we selected *, we need to carefully map back to Article. 
        // Automatic mapping from native query Tuple to Entity is not standard JPA without extra work.
        // A safer standard approach is to use an Interface Projection or just select the ID and fetch,
        // OR simpler: Use SqlResultSetMapping if we want to be pure.
        // BUT, for speed in this agent context:
        // We will manually construct the Article from the Tuple.
        // CHECK: Does Tuple.get(0, Article::class.java) work if the query was SELECT *? 
        // No, native query returns scalar values.
        // 
        // ALTERNATIVE: Use the existing findSimilar (returning Entity) and a PARALLEL query for scores? No, race cond.
        //
        // BETTER ALTERNATIVE: 
        // Change the Repository method to return `List<Article>` but assume we can't get the score easily into the entity directly via SQL.
        //
        // WAIT, actually typical strict JPA separation suggests:
        // Just return List<Object[]> where [0] is Article (if query is SELECT a, score FROM Article a...)
        // But native query `SELECT *` returns columns.
        // 
        // Let's change strategy slightly to be robust:
        // Use JPQL if pgvector supports it? No, pgvector needs native.
        //
        // Strategy:
        // SELECT a.*, ... returns scalars.
        //
        // Let's do this: 
        // We will manually map the critical fields we need for the frontend Card, 
        // OR better: use Spring Data's mapping capabilities.
        // 
        // Let's Try: `SELECT a.* FROM articles a ...` and `requesting` it be mapped to Article?
        // 
        // Re-thinking: The easiest way to get an Entity + Score in Spring Data JPA native query:
        // Interface Projection!
        // interface ArticleWithScore { fun getArticle(): Article; fun getScore(): Double }
        // query: "SELECT a AS article, (1-...) AS score FROM Article a" (Only works in JPQL)
        //
        // Since we MUST us Native Query for pgvector:
        // We have to map manually.
        // 
        // Let's just map the fields we use in the backend/frontend.
        //
        return Article(
            articleId = tuple.get("article_id", Number::class.java).toLong(),
            title = tuple.get("title", String::class.java),
            summary = tuple.get("summary", String::class.java),
            originalUrl = tuple.get("original_url", String::class.java),
            regionCode = tuple.get("region_code", String::class.java),
            publishedAt = tuple.get("published_at", java.time.LocalDateTime::class.java),
            category = tuple.get("category", String::class.java),
            // Map other fields as necessary or nullable
            contentText = tuple.get("content_text", String::class.java) 
        )
    }
    
    fun getLatestArticles(): List<Article> {
        return articleRepository.findAllByOrderByPublishedAtDesc()
    }

    fun getArticlesInBounds(minLat: Double, maxLat: Double, minLon: Double, maxLon: Double): List<Article> {
        return articleRepository.findByLatitudeBetweenAndLongitudeBetween(minLat, maxLat, minLon, maxLon)
    }

    private fun getEmbedding(text: String): List<Double> {
        val request = OllamaEmbeddingRequest(model = ollamaModel, prompt = text)
        
        val response = restClient.post()
            .uri("/api/embeddings")
            .body(request)
            .retrieve()
            .body(OllamaEmbeddingResponse::class.java)
            
        return response?.embedding ?: throw RuntimeException("Failed to get embedding from Ollama")
    }

    data class OllamaEmbeddingRequest(
        val model: String,
        val prompt: String
    )

    data class OllamaEmbeddingResponse(
        val embedding: List<Double>
    )
}
