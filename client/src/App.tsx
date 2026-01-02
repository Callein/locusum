import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, MapPin, Loader2 } from 'lucide-react';
import NewsCard from './components/NewsCard';

// Define base API_URL - could be env var or proxy
const API_URL = import.meta.env.VITE_API_TARGET || 'http://localhost:8080';

function App() {
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [region, setRegion] = useState('');

    useEffect(() => {
        fetchArticles();
    }, []);

    const fetchArticles = async (query = '') => {
        setLoading(true);
        try {
            const endpoint = query 
                ? `${API_URL}/api/articles/search?q=${encodeURIComponent(query)}`
                : `${API_URL}/api/articles`;
            
            const response = await axios.get(endpoint);
            setArticles(response.data);
        } catch (error) {
            console.error("Error fetching articles:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchArticles(searchQuery);
    };

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
            {/* Header */}
            <header className="bg-white shadow-sm sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <span className="text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                                LocuSum
                            </span>
                        </div>
                        
                        {/* Search Bar - Desktop */}
                        <div className="hidden md:flex flex-1 max-w-lg mx-8">
                            <form onSubmit={handleSearch} className="w-full relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Search className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-150 ease-in-out"
                                    placeholder="Search by topic or context..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </form>
                        </div>

                        <div className="flex items-center space-x-4">
                            <button className="flex items-center text-gray-500 hover:text-gray-700">
                                <MapPin className="h-5 w-5 mr-1" />
                                <span className="text-sm font-medium hidden sm:block">{region || 'All Regions'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Mobile Search */}
            <div className="md:hidden bg-white border-b border-gray-200 px-4 py-3">
                 <form onSubmit={handleSearch} className="w-full relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </form>
            </div>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">
                        {searchQuery ? `Results for "${searchQuery}"` : 'Latest Briefings'}
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                        AI-summarized local news, tailored for you.
                    </p>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {articles.map((article: any) => (
                            <NewsCard key={article.articleId} article={article} />
                        ))}
                    </div>
                )}
                
                {!loading && articles.length === 0 && (
                     <div className="text-center py-12">
                        <p className="text-gray-500 text-lg">No articles found.</p>
                     </div>
                )}
            </main>
        </div>
    );
}

export default App;
