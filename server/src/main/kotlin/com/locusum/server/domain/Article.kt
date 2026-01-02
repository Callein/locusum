package com.locusum.server.domain


import jakarta.persistence.*
import java.time.LocalDateTime


@Entity
@Table(name = "articles")
class Article(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "article_id")
    var articleId: Long? = null,

    @Column(nullable = false)
    val title: String,

    @Column(columnDefinition = "TEXT")
    val summary: String? = null,

    @Column(name = "content_text", columnDefinition = "TEXT")
    val contentText: String? = null,

    @Column(name = "original_url", nullable = false)
    val originalUrl: String,

    @Column(name = "region_code")
    val regionCode: String? = null,

    @Column(name = "published_at")
    val publishedAt: LocalDateTime? = null,

    val category: String? = null,

    @Column(name = "sentiment_score")
    val sentimentScore: Double? = null,

    @Column(name = "embedding", columnDefinition = "vector(768)")
    @Convert(converter = VectorConverter::class)
    var embedding: List<Double>? = null, // Using List<Double> for cleaner JSON mapping

    @Column(name = "created_at")
    val createdAt: LocalDateTime = LocalDateTime.now()
)
