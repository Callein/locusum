package com.locusum.server.repository

import com.locusum.server.domain.Article
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface ArticleRepository : JpaRepository<Article, Long> {
    fun findAllByOrderByPublishedAtDesc(pageable: Pageable): List<Article>
}
