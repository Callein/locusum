import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, MapPin, Loader2, RefreshCw } from 'lucide-react';
import NewsCard from './components/NewsCard';
import MapArea from './components/MapArea';

// Define base API_URL - could be env var or proxy
const API_URL = import.meta.env.VITE_API_TARGET || 'http://localhost:8080';

// Supported Regions for Filters
const REGIONS = ['All', 'Dallas', 'Houston', 'Austin', 'San Antonio', 'Fort Worth'];

interface Bounds {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
}

function App() {
    const [allArticles, setAllArticles] = useState([]); // Store all fetched data
    const [displayedArticles, setDisplayedArticles] = useState([]); // Filtered data for List view
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeRegion, setActiveRegion] = useState('All');
    const [hoveredArticleId, setHoveredArticleId] = useState<number | null>(null);
    const [lastUpdated, setLastUpdated] = useState<string | null>(null);

    // Initial Fetch
    useEffect(() => {
        fetchArticles();
    }, []);

    // Filter displayed articles whenever allArticles or activeRegion changes
    useEffect(() => {
        if (activeRegion === 'All') {
            setDisplayedArticles(allArticles);
        } else {
            setDisplayedArticles(allArticles.filter((a: any) => a.regionCode === activeRegion));
        }
    }, [allArticles, activeRegion]);

    const fetchArticles = async (query = '') => {
        setLoading(true);
        try {
            let endpoint = `${API_URL}/api/articles`;
            
            if (query) {
                endpoint = `${API_URL}/api/articles/search?q=${encodeURIComponent(query)}`;
            }
            
            // Fetch ALL data matching the query (regardless of region)
            const response = await axios.get(endpoint);
            const data = response.data;

            setAllArticles(data);
            if (data.length > 0) {
                setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
            }
        } catch (error) {
            console.error("Error fetching articles:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        // Reset region to All on new search to show full context, or keep it. 
        // Let's keep it to verify if user wants to search within region.
        // But fetchArticles(query) fetches everything matching query. Filtering happens in useEffect.
        fetchArticles(searchQuery);
    };

    const handleRegionClick = (region: string) => {
        setActiveRegion(region);
        // No need to re-fetch if we already have data, unless we want to refresh.
        // For now, let's assuming we just filter client side.
    };

    // Handler for map bounds change (future optimization: fetch stats or localized news)
    const handleBoundsChange = async (bounds: Bounds) => {
        console.log("Map bounds changed:", bounds);
        // Implement bound-based fetching if needed:
        // const response = await axios.get(`${API_URL}/api/articles/bounds?...`);
        // setArticles(response.data);
    };

    const handleMarkerClick = (articleId: number) => {
        const element = document.getElementById(`article-${articleId}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setHoveredArticleId(articleId); // Highlight card temporarily
        }
    };

    return (
        <div className="h-screen flex flex-col bg-gray-50 text-gray-900 font-sans overflow-hidden">
            {/* Header */}
            <header className="bg-white shadow-sm z-20 flex-shrink-0">
                <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-3">
                    <div className="flex items-center justify-between">
                        {/* Logo & Region Chips */}
                        <div className="flex items-center space-x-6">
                            <span className="text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 cursor-pointer" onClick={() => window.location.reload()}>
                                LocuSum
                            </span>
                            
                            {/* Desktop Region Chips */}
                            <div className="hidden lg:flex items-center space-x-2">
                                {REGIONS.map((r) => (
                                    <button
                                        key={r}
                                        onClick={() => handleRegionClick(r)}
                                        className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
                                            activeRegion === r
                                                ? 'bg-blue-600 text-white shadow-md'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                    >
                                        {r}
                                    </button>
                                ))}
                            </div>
                        </div>
                        
                        {/* Search Bar */}
                        <div className="flex-1 max-w-md mx-4">
                            <form onSubmit={handleSearch} className="w-full relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Search className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition transition-all"
                                    placeholder="Search topic (e.g., 'Traffic', 'Sports')..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </form>
                        </div>

                        {/* Status */}
                        <div className="flex items-center space-x-4 text-xs text-gray-400">
                             {lastUpdated && (
                                <span className="hidden sm:flex items-center">
                                    <RefreshCw className="h-3 w-3 mr-1" />
                                    Updated: {lastUpdated}
                                </span>
                             )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Split View Content */}
            <div className="flex-1 flex overflow-hidden relative">
                
                {/* Map Area (Desktop: Left 40%, Mobile: Hidden or Toggled) */}
                <div className="hidden lg:block w-[40%] h-full relative border-r border-gray-200 z-0">
                    <MapArea 
                        articles={allArticles} 
                        onRegionSelect={handleRegionClick}
                        activeRegion={activeRegion}
                    />
                </div>

                {/* List Area */}
                <main className="flex-1 h-full overflow-y-auto bg-gray-50 p-4 sm:p-6 scroll-smooth" id="article-list">
                    <div className="max-w-4xl mx-auto">
                        <div className="mb-4 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-800">
                                {activeRegion !== 'All' ? `${activeRegion} News` : 'Latest Briefings'}
                            </h2>
                            <span className="text-sm text-gray-500">{displayedArticles.length} stories found</span>
                        </div>

                        {loading ? (
                            <div className="grid grid-cols-1 gap-6">
                                {[1, 2, 3].map((n) => (
                                    <div key={n} className="h-48 bg-gray-200 rounded-xl animate-pulse"></div>
                                ))}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-6 pb-20">
                                {displayedArticles.map((article: any) => (
                                    <div 
                                        key={article.articleId} 
                                        id={`article-${article.articleId}`}
                                        className={`transition-all duration-300 ${hoveredArticleId === article.articleId ? 'transform scale-[1.02] ring-2 ring-blue-400 rounded-xl' : ''}`}
                                    >
                                        <NewsCard 
                                            article={article} 
                                            onHover={setHoveredArticleId}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                        
                        {!loading && displayedArticles.length === 0 && (
                             <div className="text-center py-20">
                                <p className="text-gray-400 text-lg">No stories found in this area.</p>
                             </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}

export default App;
