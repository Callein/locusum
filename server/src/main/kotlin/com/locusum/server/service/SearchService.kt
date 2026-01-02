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
    @Value("\${ollama.base-url:http://host.docker.internal:11434}") private val ollamaBaseUrl: String,
    @Value("\${ollama.model:nomic-embed-text}") private val ollamaModel: String
) {
    private val restClient = RestClient.builder()
        .baseUrl(ollamaBaseUrl)
        .build()

    fun search(query: String): List<Article> {
        // 1. Get Embedding from Ollama
        val embeddingVector = getEmbedding(query)
        
        // 2. Search in DB
        // Convert List<Double> to String format "[0.1,0.2,...]" for PGvector
        val embeddingString = embeddingVector.joinToString(prefix = "[", postfix = "]", separator = ",")
        
        return articleRepository.searchHybrid(query, embeddingString)
    }
    
    fun getLatestArticles(): List<Article> {
        return articleRepository.findTop10ByOrderByPublishedAtDesc()
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
