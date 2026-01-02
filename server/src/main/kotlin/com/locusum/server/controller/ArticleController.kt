package com.locusum.server.controller

import com.locusum.server.domain.Article
import com.locusum.server.service.SearchService
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/articles")
@CrossOrigin(originPatterns = ["*"]) // Allow all for dev
class ArticleController(
    private val searchService: SearchService
) {

    @GetMapping
    fun getLatest(): List<Article> {
        return searchService.getLatestArticles()
    }

    @GetMapping("/search")
    fun search(@RequestParam q: String): List<Article> {
        return searchService.search(q)
    }
}
