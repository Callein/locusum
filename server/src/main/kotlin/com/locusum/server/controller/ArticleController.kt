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
    fun search(@RequestParam q: String, @RequestParam(defaultValue = "true") aiEnabled: Boolean): List<Article> {
        return searchService.search(q, aiEnabled)
    }

    @GetMapping("/bounds")
    fun getInBounds(
        @RequestParam minLat: Double,
        @RequestParam maxLat: Double,
        @RequestParam minLon: Double,
        @RequestParam maxLon: Double
    ): List<Article> {
        return searchService.getArticlesInBounds(minLat, maxLat, minLon, maxLon)
    }
}
