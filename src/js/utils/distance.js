/**
 * Distance calculations using Haversine formula
 */

export class DistanceCalculator {
    static calculate(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);
        const a = Math.sin(dLat/2)**2 + Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * Math.sin(dLon/2)**2;
        return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) * 10) / 10;
    }
    
    static toRad(degrees) { return degrees * (Math.PI / 180); }
    
    static format(km) {
        if (km < 1) return `${Math.round(km * 1000)}m`;
        if (km < 10) return `${km.toFixed(1)}km`;
        return `${Math.round(km)}km`;
    }
}
