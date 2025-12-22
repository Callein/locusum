package com.locusum.server.controller

import com.locusum.server.domain.Article
import com.locusum.server.repository.ArticleRepository
import org.springframework.data.domain.PageRequest
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/articles")
class ArticleController(
    private val articleRepository: ArticleRepository
) {

    @GetMapping
    fun getRecentArticles(): List<Article> {
        val top20 = PageRequest.of(0, 20)
        return articleRepository.findAllByOrderByPublishedAtDesc(top20)
    }
}
