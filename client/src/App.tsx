import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, MapPin, Loader2, RefreshCw } from 'lucide-react';
import NewsCard from './components/NewsCard';
import MapArea from './components/MapArea';

// Define base API_URL - could be env var or proxy
const API_URL = import.meta.env.VITE_API_TARGET || 'http://localhost:8080';

// Supported Regions for Filters
const REGIONS = ['All', 'Dallas - Fort Worth', 'Houston', 'Austin', 'San Antonio'];

interface Bounds {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
}

function App() {
    const [allArticles, setAllArticles] = useState([]); 
    const [displayedArticles, setDisplayedArticles] = useState([]); 
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeRegion, setActiveRegion] = useState('All');
    const [hoveredArticleId, setHoveredArticleId] = useState<number | null>(null);
    const [lastUpdated, setLastUpdated] = useState<string | null>(null);
    const [aiEnabled, setAiEnabled] = useState(true);
    
    // Resizable Map State
    const [mapWidth, setMapWidth] = useState(40); // default 40%
    const [isResizing, setIsResizing] = useState(false);

    const startResizing = React.useCallback(() => {
        setIsResizing(true);
    }, []);

    const stopResizing = React.useCallback(() => {
        setIsResizing(false);
    }, []);

    const resize = React.useCallback(
        (mouseMoveEvent: MouseEvent) => {
            if (isResizing) {
                const newWidth = (mouseMoveEvent.clientX / window.innerWidth) * 100;
                if (newWidth > 20 && newWidth < 70) { // Min 20%, Max 70% (Prevent gray area)
                    setMapWidth(newWidth);
                }
            }
        },
        [isResizing]
    );

    useEffect(() => {
        window.addEventListener("mousemove", resize);
        window.addEventListener("mouseup", stopResizing);
        return () => {
            window.removeEventListener("mousemove", resize);
            window.removeEventListener("mouseup", stopResizing);
        };
    }, [resize, stopResizing]);

    // Initial Fetch
    useEffect(() => {
        fetchArticles();
    }, []);

    // Filter displayed articles whenever allArticles or activeRegion changes
    useEffect(() => {
        if (activeRegion === 'All') {
            setDisplayedArticles(allArticles);
        } else if (activeRegion === 'Dallas - Fort Worth') {
            setDisplayedArticles(allArticles.filter((a: any) => 
                a.regionCode === 'Dallas' || a.regionCode === 'Fort Worth' || a.regionCode === 'Dallas - Fort Worth'
            ));
        } else {
            setDisplayedArticles(allArticles.filter((a: any) => a.regionCode === activeRegion));
        }
    }, [allArticles, activeRegion]);

    const fetchArticles = async (query = '') => {
        setLoading(true);
        try {
            let endpoint = `${API_URL}/api/articles`;
            
            if (query) {
                endpoint = `${API_URL}/api/articles/search?q=${encodeURIComponent(query)}&aiEnabled=${aiEnabled}`;
            }
            
            // Fetch ALL data matching the query (regardless of region)
            const response = await axios.get(endpoint);
            const data = response.data;

            setAllArticles(data);
            if (data.length > 0) {
                setLastUpdated(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
            }
        } catch (error) {
            console.error("Error fetching articles:", error);
        } finally {
            setLoading(false);
        }
    };

    // Auto-search when AI Toggle changes, if there is a query
    useEffect(() => {
        if (searchQuery) {
            fetchArticles(searchQuery);
        }
    }, [aiEnabled]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchArticles(searchQuery);
    };

    const handleRegionClick = (region: string) => {
        setActiveRegion(region);
    };

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
                    <div className="flex items-center justify-between relative">
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
                        
                        {/* Search Bar & Toggle - Centered */}
                        <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-xl px-4 hidden md:block">
                            <form onSubmit={handleSearch} className="w-full relative flex items-center">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                                    <Search className="h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                </div>
                                <input
                                    type="text"
                                    className="block w-full pl-10 pr-32 py-2.5 border border-gray-200 rounded-full leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all shadow-sm hover:bg-white"
                                    placeholder="Search with AI..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                
                                {/* AI Toggle Inside Search Bar */}
                                <div className="absolute right-2 flex items-center">
                                    <label className="inline-flex items-center cursor-pointer bg-white px-2 py-1 rounded-full border border-gray-100 shadow-sm hover:bg-gray-50 transition-colors">
                                        <span className={`mr-2 text-[10px] font-bold tracking-wide uppercase ${aiEnabled ? 'text-indigo-600' : 'text-gray-400'}`}>
                                            AI Match
                                        </span>
                                        <div className="relative">
                                            <input 
                                                type="checkbox" 
                                                className="sr-only peer" 
                                                checked={aiEnabled}
                                                onChange={() => setAiEnabled(!aiEnabled)}
                                            />
                                            <div className="w-8 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-[16px] rtl:peer-checked:after:-translate-x-[16px] peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600"></div>
                                        </div>
                                    </label>
                                </div>
                            </form>
                        </div>

                        {/* Mobile Search - Visible only on small screens */}
                         <div className="flex-1 max-w-xl mx-4 relative group md:hidden">
                            <form onSubmit={handleSearch} className="w-full relative flex items-center">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                                    <Search className="h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                </div>
                                <input
                                    type="text"
                                    className="block w-full pl-10 pr-10 py-2 border border-gray-200 rounded-full text-sm"
                                    placeholder="Search..."
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
                
                {/* Map Area (Resizable) */}
                <div 
                    className="hidden lg:block h-full relative border-r border-gray-200 z-0 shadow-[4px_0_24px_rgba(0,0,0,0.02)] flex-shrink-0"
                    style={{ width: `${mapWidth}%` }}
                >
                    <MapArea 
                        articles={allArticles} 
                        onRegionSelect={handleRegionClick}
                        activeRegion={activeRegion}
                    />
                </div>

                {/* Resizer Handle */}
                <div
                    className="hidden lg:flex w-2 items-center justify-center cursor-col-resize hover:bg-blue-100 transition-colors z-10 -ml-1 h-full"
                    onMouseDown={startResizing}
                >
                    <div className="w-0.5 h-8 bg-gray-300 rounded-full"></div>
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
