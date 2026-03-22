/**
 * EventBus - Simple pub/sub system for real-time updates
 * 
 * Enables communication between storage backend and UI components
 * without tight coupling.
 * 
 * Events:
 * - checkin:added - New checkin saved
 * - checkin:updated - Checkin modified
 * - checkin:deleted - Checkin removed
 * - data:imported - Bulk import completed
 * - storage:mode-changed - Storage mode switched
 */

class EventBus {
    constructor() {
        this.events = {};
    }
    
    /**
     * Subscribe to an event
     * @param {string} event - Event name
     * @param {Function} callback - Event handler
     */
    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    }
    
    /**
     * Unsubscribe from an event
     * @param {string} event - Event name
     * @param {Function} callback - Event handler to remove
     */
    off(event, callback) {
        if (!this.events[event]) return;
        
        this.events[event] = this.events[event].filter(cb => cb !== callback);
    }
    
    /**
     * Emit an event
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    emit(event, data) {
        if (!this.events[event]) return;
        
        this.events[event].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`[EventBus] Error in ${event} handler:`, error);
            }
        });
    }
    
    /**
     * Clear all event listeners
     */
    clear() {
        this.events = {};
    }
}

export default EventBus;
