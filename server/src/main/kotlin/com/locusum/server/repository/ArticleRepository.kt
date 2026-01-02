package com.locusum.server.repository

import com.locusum.server.domain.Article
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.stereotype.Repository

@Repository
interface ArticleRepository : JpaRepository<Article, Long> {

    // Hybrid Search: (1 - CosineDistance) * 0.7  +  Recall/Rank * 0.3
    // Note: This relies on pgvector extension operators (<=> for cosine distance)
    // and ts_rank for Lexical search.
    // CAST(:embedding AS vector) might be needed depending on how the parameter is passed.
    
    @Query(value = """
        SELECT * FROM articles 
        ORDER BY 
          ((1 - (embedding <=> cast(:embedding as vector))) * 0.7 + 
           ts_rank(to_tsvector('english', title || ' ' || COALESCE(content_text, '')), plainto_tsquery('english', :query)) * 0.3) DESC
        LIMIT 20
    """, nativeQuery = true)
    fun searchHybrid(query: String, embedding: String): List<Article>
    
    // Geo-Spatial Search
    fun findByLatitudeBetweenAndLongitudeBetween(
        minLat: Double, maxLat: Double,
        minLon: Double, maxLon: Double
    ): List<Article>

    // Simple verification method
    fun findTop10ByOrderByPublishedAtDesc(): List<Article>
}
