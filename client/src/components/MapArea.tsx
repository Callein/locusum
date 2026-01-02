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
    'Dallas': {
        center: [32.7767, -96.7970],
        color: '#3B82F6', // Blue-500
        polygon: [
            [32.990, -96.938], [33.018, -96.772], [32.915, -96.650], [32.840, -96.640],
            [32.664, -96.592], [32.553, -96.795], [32.660, -97.039], [32.890, -96.980],
            [32.990, -96.938]
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
    },
    'Fort Worth': {
        center: [32.7555, -97.3308],
        color: '#EF4444', // Red-500
        polygon: [
            [33.029, -97.525], [32.999, -97.199], [32.793, -97.085], 
            [32.618, -97.234], [32.605, -97.532], [32.723, -97.635], [33.029, -97.525]
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

    // Aggregate articles by Region
    const regionCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        articles.forEach(article => {
            const r = article.regionCode;
            if (r) {
                // Normalize slightly if needed, assuming exact match for now
                if (r === 'Dallas - Fort Worth') { // Handle composite if any
                   counts['Dallas'] = (counts['Dallas'] || 0) + 1; // Simplification
                } else {
                   counts[r] = (counts[r] || 0) + 1;
                }
            }
        });
        return counts;
    }, [articles]);

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
                    const count = regionCounts[regionName] || 0;
                    const isActive = activeRegion === regionName;
                    const isHovered = hoveredRegion === regionName;
                    
                    // Style for Polygon
                    const pathOptions = {
                        color: data.color,
                        fillColor: data.color,
                        fillOpacity: isActive ? 0.4 : (isHovered ? 0.2 : 0.05),
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
                                     </div>
                                </Tooltip>
                            </Polygon>

                            {/* Count Marker (Cluster) */}
                            {count > 0 && (
                                <Marker 
                                    position={data.center} 
                                    icon={createClusterIcon(count, data.color)}
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
            
            {/* Legend / Tip */}
            <div className="absolute bottom-4 left-4 z-[400] bg-white/90 backdrop-blur px-3 py-2 rounded-lg shadow text-xs text-gray-600 border border-gray-100">
                Click a region or pin to filter news
            </div>
        </div>
    );
};

export default MapArea;
