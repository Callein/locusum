import React, { useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// --- Region Data Configuration ---
// Coordinates are approximate boundaries for visualization
const REGION_DATA: Record<string, { center: [number, number], color: string, polygon: [number, number][] }> = {
    'Dallas - Fort Worth': {
        center: [32.7661, -97.0620], // Midpoint
        color: '#3B82F6', // Blue-500
        polygon: [
            // Simplified Combined Polygon roughly covering DFW area
            [33.029, -97.525], [32.999, -97.199], [33.018, -96.772], [32.915, -96.650], 
            [32.840, -96.640], [32.664, -96.592], [32.553, -96.795], [32.605, -97.532], 
            [33.029, -97.525]
        ]
    },
    'Houston': {
        center: [29.7604, -95.3698],
        color: '#10B981', // Emerald-500
        polygon: [
            [30.126, -95.580], [30.150, -95.334], [30.065, -95.093], 
            [29.789, -95.068], [29.544, -95.062], [29.477, -95.275],
            [29.497, -95.660], [29.680, -95.823], [29.980, -95.680], [30.126, -95.580]
        ]
    },
    'Austin': {
        center: [30.2672, -97.7431],
        color: '#8B5CF6', // Violet-500
        polygon: [
            [30.518, -97.873], [30.513, -97.620], [30.419, -97.534], 
            [30.211, -97.590], [30.121, -97.771], [30.197, -97.942], 
            [30.347, -97.930], [30.518, -97.873]
        ]
    },
    'San Antonio': {
        center: [29.4241, -98.4936],
        color: '#F59E0B', // Amber-500
        polygon: [
            [29.691, -98.665], [29.670, -98.349], [29.510, -98.271], 
            [29.300, -98.242], [29.199, -98.537], [29.317, -98.810], 
            [29.529, -98.805], [29.691, -98.665]
        ]
    }
};

interface MapAreaProps {
    articles: any[];
    onRegionSelect: (region: string) => void;
    activeRegion?: string;
}

// Custom Cluster Icon Generator
const createClusterIcon = (count: number, color: string) => {
    return L.divIcon({
        html: `<div style="background-color: ${color}; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 50%; color: white; font-weight: bold; border: 2px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">${count}</div>`,
        className: 'custom-cluster-icon',
        iconSize: [32, 32],
        iconAnchor: [16, 16] 
    });
};

const MapArea: React.FC<MapAreaProps> = ({ articles, onRegionSelect, activeRegion }) => {
    const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);

    // Aggregate articles by Region (Count & Avg Sentiment)
    const regionStats = useMemo(() => {
        const stats: Record<string, { count: number, totalSentiment: number }> = {};
        
        articles.forEach(article => {
            const r = article.regionCode;
            if (r) {
                // Normalize Dallas or Fort Worth to the combined key
                let regionName = r;
                if (r === 'Dallas' || r === 'Fort Worth' || r === 'Dallas - Fort Worth') {
                    regionName = 'Dallas - Fort Worth';
                }
                
                if (!stats[regionName]) {
                    stats[regionName] = { count: 0, totalSentiment: 0 };
                }
                
                stats[regionName].count += 1;
                // Default to 0.5 (Neutral) if score is missing
                stats[regionName].totalSentiment += (article.sentimentScore ?? 0.5); 
            }
        });
        
        return stats;
    }, [articles]);

    // get color based on average sentiment
    const getSentimentColor = (avgSentiment: number) => {
        if (avgSentiment >= 0.7) return '#10B981'; // Green (Positive)
        if (avgSentiment <= 0.3) return '#EF4444'; // Red (Negative)
        return '#3B82F6'; // Blue (Neutral)
    };

    return (
        <div className="h-full w-full rounded-xl overflow-hidden shadow-md border border-gray-200 relative bg-slate-100">
            <MapContainer 
                center={[31.1, -97.5]} // Center between major cities
                zoom={6} 
                style={{ height: '100%', width: '100%' }}
                className="z-0"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                />
                
                {Object.entries(REGION_DATA).map(([regionName, data]) => {
                    const stat = regionStats[regionName] || { count: 0, totalSentiment: 0.5 };
                    const count = stat.count;
                    const avgSentiment = count > 0 ? stat.totalSentiment / count : 0.5;
                    const sentimentColor = getSentimentColor(avgSentiment);

                    const isActive = activeRegion === regionName;
                    const isHovered = hoveredRegion === regionName;
                    
                    // Style for Polygon - Use sentiment color ONLY if active/hovered to avoid clutter? 
                    // Or keep region fixed color and only color markers? 
                    // Per user request: "Change marker color dynamically"
                    // Let's keep polygon fixed region color for identity, but update Marker color.

                    const pathOptions = {
                        color: data.color,
                        fillColor: data.color,
                        fillOpacity: isActive ? 0.3 : (isHovered ? 0.1 : 0.05),
                        weight: isActive ? 3 : (isHovered ? 2 : 1),
                        dashArray: isActive ? undefined : '5, 5'
                    };

                    return (
                        <React.Fragment key={regionName}>
                            {/* Region Boundary */}
                            <Polygon 
                                positions={data.polygon} 
                                pathOptions={pathOptions}
                                eventHandlers={{
                                    click: () => onRegionSelect(regionName),
                                    mouseover: () => setHoveredRegion(regionName),
                                    mouseout: () => setHoveredRegion(null)
                                }}
                            >
                                <Tooltip sticky direction="top" offset={[0, -10]} opacity={0.9}>
                                     <div className="text-center">
                                        <div className="font-bold">{regionName}</div>
                                        <div className="text-xs">{count} News Stories</div>
                                        <div className="text-[10px] mt-1 text-gray-500">
                                            Avg Sentiment: {(avgSentiment * 100).toFixed(0)}%
                                        </div>
                                     </div>
                                </Tooltip>
                            </Polygon>

                            {/* Count Marker (Cluster) - Colored by Sentiment */}
                            {count > 0 && (
                                <Marker 
                                    position={data.center} 
                                    icon={createClusterIcon(count, sentimentColor)}
                                    eventHandlers={{
                                        click: () => onRegionSelect(regionName)
                                    }}
                                >
                                </Marker>
                            )}
                        </React.Fragment>
                    );
                })}


            </MapContainer>
            
            {/* Legend */}
            <div className="absolute bottom-4 left-4 z-[400] bg-white/95 backdrop-blur px-4 py-3 rounded-xl shadow-lg border border-gray-100 flex flex-col gap-2">
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">Sentiment Map</span>
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#10B981]"></span>
                    <span className="text-xs text-gray-600 font-medium">Positive (Happy)</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#3B82F6]"></span>
                    <span className="text-xs text-gray-600 font-medium">Neutral (Info)</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#EF4444]"></span>
                    <span className="text-xs text-gray-600 font-medium">Negative (Alert)</span>
                </div>
            </div>
        </div>
    );
};

export default MapArea;
