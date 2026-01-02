import React from 'react';
import { Newspaper, Share2, ExternalLink, Sparkles } from 'lucide-react';

interface Article {
    articleId: number;
    title: string;
    summary: string;
    originalUrl: string;
    regionCode: string;
    publishedAt: string;
    category?: string;
    sentimentScore?: number;
}

interface NewsCardProps {
    article: Article;
    onHover: (id: number | null) => void;
}

const NewsCard: React.FC<NewsCardProps> = ({ article, onHover }) => {
    // Simple HTML decode helper
    const decodeHtml = (html: string) => {
        const txt = document.createElement("textarea");
        txt.innerHTML = html;
        return txt.value;
    };

    // Parse summary into bullet points
    const summaryPoints = article.summary 
        ? article.summary.split('\n').filter(line => line.trim().length > 0)
        : ["No summary available."];

    return (
        <div 
            className="group bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-200 flex flex-col h-full transform hover:-translate-y-1"
            onMouseEnter={() => onHover(article.articleId)}
            onMouseLeave={() => onHover(null)}
        >
            <div className="p-5 flex-grow">
                {/* Header: Category & Date */}
                <div className="flex justify-between items-start mb-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                        {article.category || 'General'}
                    </span>
                    <span className="text-xs text-gray-400 font-mono">
                        {new Date(article.publishedAt).toLocaleDateString()}
                    </span>
                </div>
                
                {/* Title */}
                <h3 className="text-lg font-bold text-gray-900 mb-4 leading-snug group-hover:text-blue-600 transition-colors">
                    <a href={article.originalUrl} target="_blank" rel="noopener noreferrer">
                        {decodeHtml(article.title)}
                    </a>
                </h3>

                {/* AI Summary Section */}
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-100 relative">
                    <div className="absolute -top-3 left-3 bg-white px-2 py-0.5 rounded-full border border-gray-100 shadow-sm flex items-center space-x-1">
                        <Sparkles className="w-3 h-3 text-purple-500" />
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">AI BRIEF</span>
                    </div>
                    
                    <div className="space-y-2 mt-1">
                        {summaryPoints.slice(0, 3).map((point, index) => (
                            <div key={index} className="flex items-start">
                                <span className="text-purple-400 font-bold mr-2 text-xs mt-1">{index + 1}.</span>
                                <p className="text-gray-700 text-sm leading-relaxed font-medium">
                                    {point.replace(/^[*•-]\s*/, '').trim()}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div className="flex items-center text-xs text-gray-500 font-medium">
                    <Newspaper className="h-3.5 w-3.5 mr-1.5" />
                    {article.regionCode || 'Global'}
                </div>
                
                <div className="flex space-x-2">
                    <a 
                        href={article.originalUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800 font-semibold transition-colors"
                    >
                        Read Original <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                </div>
            </div>
        </div>
    );
};

export default NewsCard;
