import React from 'react';
import { Newspaper, Share2, ExternalLink } from 'lucide-react';

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
}

const NewsCard: React.FC<NewsCardProps> = ({ article }) => {
    // Parse summary into bullet points if it's a string, or split by newlines
    // Using a heuristic: if user wants 3 bullet points, we assume the summary string might be formatted.
    // If it's a raw block, we split by sentences or newlines.
    const summaryPoints = article.summary 
        ? article.summary.split('\n').filter(line => line.trim().length > 0).slice(0, 3) 
        : ["No summary available."];

    return (
        <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 border border-gray-100 flex flex-col h-full">
            <div className="p-6 flex-grow">
                <div className="flex justify-between items-start mb-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {article.category || 'News'}
                    </span>
                    <span className="text-xs text-gray-400">
                        {new Date(article.publishedAt).toLocaleDateString()}
                    </span>
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 mb-3 leading-tight hover:text-blue-600 transition-colors">
                    <a href={article.originalUrl} target="_blank" rel="noopener noreferrer">
                        {article.title}
                    </a>
                </h3>

                <div className="space-y-2 mb-4">
                    {summaryPoints.map((point, index) => (
                        <div key={index} className="flex items-start">
                            <span className="text-blue-500 mr-2 mt-1">•</span>
                            <p className="text-gray-600 text-sm leading-relaxed font-medium">
                                {point.replace(/^- /, '')}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 flex justify-between items-center sm:px-6">
                <div className="flex items-center text-xs text-gray-500">
                    <Newspaper className="h-4 w-4 mr-1" />
                    {article.regionCode || 'Global'}
                </div>
                <div className="flex space-x-3">
                    <button className="text-gray-400 hover:text-gray-600">
                        <Share2 className="h-4 w-4" />
                    </button>
                    <a href={article.originalUrl} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-600">
                        <ExternalLink className="h-4 w-4" />
                    </a>
                </div>
            </div>
        </div>
    );
};

export default NewsCard;
