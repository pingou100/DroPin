/**
 * GeoStatsCalculator - Calculate geographic statistics from check-ins
 */

import { DistanceCalculator } from '../utils/distance.js';

export class GeoStatsCalculator {
    constructor(checkins) {
        this.checkins = checkins;
        this.homeLocation = { lat: 50.8503, lng: 4.3517 }; // Brussels, Belgium — change to your home city
    }
    
    calculate() {
        const start = performance.now();
        const stats = {
            overview: this.calculateOverview(),
            countries: this.calculateCountryStats(),
            cities: this.calculateCityStats(),
            distances: this.calculateDistances()
        };
        console.log(`[GeoStats] Calculated in ${(performance.now() - start).toFixed(2)}ms`);
        return stats;
    }
    
    calculateOverview() {
        const countries = new Set();
        const cities = new Set();
        this.checkins.forEach(c => {
            if (c.country) countries.add(c.country);
            if (c.city && c.country) cities.add(`${c.city},${c.country}`);
        });
        return {
            totalCountries: countries.size,
            totalCities: cities.size,
            totalCheckins: this.checkins.length
        };
    }
    
    calculateCountryStats() {
        const countryMap = new Map();
        this.checkins.forEach(c => {
            if (!c.country) return;
            if (!countryMap.has(c.country)) {
                countryMap.set(c.country, { name: c.country, count: 0, cities: new Set() });
            }
            const stats = countryMap.get(c.country);
            stats.count++;
            if (c.city) stats.cities.add(c.city);
        });
        const countries = Array.from(countryMap.values()).map(c => ({
            name: c.name,
            count: c.count,
            cities: c.cities.size,
            percentage: (c.count / this.checkins.length * 100).toFixed(1)
        })).sort((a, b) => b.count - a.count);
        return { all: countries, top10: countries.slice(0, 10) };
    }
    
    calculateCityStats() {
        const cityMap = new Map();
        this.checkins.forEach(c => {
            if (!c.city || !c.country) return;
            const key = `${c.city},${c.country}`;
            if (!cityMap.has(key)) {
                cityMap.set(key, { city: c.city, country: c.country, count: 0, lat: parseFloat(c.latitude), lng: parseFloat(c.longitude) });
            }
            cityMap.get(key).count++;
        });
        const cities = Array.from(cityMap.values()).sort((a, b) => b.count - a.count);
        return { all: cities, top20: cities.slice(0, 20) };
    }
    
    calculateDistances() {
        if (this.checkins.length === 0) return { furthestFromHome: null, averageDistance: 0, longestJourney: null };
        
        let furthest = null, maxDistance = 0;
        this.checkins.forEach(c => {
            const lat = parseFloat(c.latitude), lng = parseFloat(c.longitude);
            if (isNaN(lat) || isNaN(lng)) return;
            const distance = DistanceCalculator.calculate(this.homeLocation.lat, this.homeLocation.lng, lat, lng);
            if (distance > maxDistance) {
                maxDistance = distance;
                furthest = { venue: c.venue_name, city: c.city, country: c.country, distance, distanceFormatted: DistanceCalculator.format(distance) };
            }
        });
        
        let totalDistance = 0, journeyCount = 0, longestJourney = null, maxJourneyDistance = 0;
        const sorted = [...this.checkins].sort((a, b) => new Date(`${a.date} ${a.time||'00:00:00'}`) - new Date(`${b.date} ${b.time||'00:00:00'}`));
        
        for (let i = 1; i < sorted.length; i++) {
            const prev = sorted[i-1], curr = sorted[i];
            const lat1 = parseFloat(prev.latitude), lng1 = parseFloat(prev.longitude);
            const lat2 = parseFloat(curr.latitude), lng2 = parseFloat(curr.longitude);
            if (isNaN(lat1) || isNaN(lng1) || isNaN(lat2) || isNaN(lng2)) continue;
            const distance = DistanceCalculator.calculate(lat1, lng1, lat2, lng2);
            totalDistance += distance; journeyCount++;
            if (prev.date === curr.date && distance > maxJourneyDistance) {
                maxJourneyDistance = distance;
                longestJourney = { from: { venue: prev.venue_name, city: prev.city, country: prev.country }, to: { venue: curr.venue_name, city: curr.city, country: curr.country }, distance, distanceFormatted: DistanceCalculator.format(distance), date: curr.date };
            }
        }
        
        const averageDistance = journeyCount > 0 ? Math.round(totalDistance / journeyCount) : 0;
        return { furthestFromHome: furthest, averageDistance, averageDistanceFormatted: DistanceCalculator.format(averageDistance), longestJourney };
    }
}
