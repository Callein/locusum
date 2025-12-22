package com.locusum.server.domain

import jakarta.persistence.*
import java.time.LocalDateTime

@Entity
@Table(name = "articles")
data class Article(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long? = null,

    val title: String,

    @Column(columnDefinition = "TEXT")
    val summary: String,

    @Column(columnDefinition = "TEXT")
    val content: String,

    val url: String,

    val publishedAt: LocalDateTime
)
