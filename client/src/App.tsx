import { useEffect, useState } from 'react'
import './App.css'

interface Article {
  id: number
  title: string
  summary: string
  content: string
  url: string
  publishedAt: string
}

function App() {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/articles')
      .then(res => {
        if (!res.ok) {
          throw new Error('Network response was not ok')
        }
        return res.json()
      })
      .then(data => {
        setArticles(data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Error fetching articles:', err)
        setError('Failed to load articles.')
        setLoading(false)
      })
  }, [])

  return (
    <div className="app-container">
      <header className="header">
        <h1>LocuSum News Feed</h1>
      </header>

      <main className="main-content">
        {loading && <p className="loading">Loading articles...</p>}
        {error && <p className="error">{error}</p>}
        
        {!loading && !error && articles.length === 0 && (
          <p className="no-data">No articles found.</p>
        )}

        <div className="article-list">
          {articles.map(article => (
            <article key={article.id} className="article-card">
              <h2><a href={article.url} target="_blank" rel="noopener noreferrer">{article.title}</a></h2>
              <p className="date">{new Date(article.publishedAt).toLocaleDateString()} {new Date(article.publishedAt).toLocaleTimeString()}</p>
              <p className="summary">{article.summary}</p>
            </article>
          ))}
        </div>
      </main>
    </div>
  )
}

export default App
