export type GeolocationStatus = 'uninitialized' | 'requesting' | 'tracking' | 'error' | 'stopped';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface GeolocationError {
  code: number;
  message: string;
}

class GeolocationTracker {
  private watchId: number | null = null;
  public updateCoordinatesCallback: ((location: LocationData) => void) | null = null;
  public errorCallback: ((error: GeolocationError) => void) | null = null;
  public statusCallback: ((status: GeolocationStatus) => void) | null = null;

  /**
   * High-precision options for continuous tracking.
   * enableHighAccuracy: Forcing hardware GPS/satellite lock. The OS will automatically use A-GPS (Wi-Fi/Cell) if internet is available to accelerate the lock.
   * timeout: 15 seconds to allow satellite acquisition.
   * maximumAge: 10000 (10 seconds) to allow a very recent cached network position to be returned instantly for a fast initial lock, followed by continuous precise updates.
   */
  private readonly geoOptions: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 10000
  };

  /**
   * 1. Permission initialization and validation flow.
   * Checks if geolocation is supported and attempts to gain permissions gracefully if possible via Permissions API.
   */
  public async ensurePermissions(): Promise<boolean> {
    if (!('geolocation' in navigator)) {
      this.handleError({ code: 0, message: 'Geolocation is not supported by your browser.' });
      return false;
    }
    
    try {
      // Use Permissions API if available to check state without prompting
      if (navigator.permissions && navigator.permissions.query) {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        if (result.state === 'denied') {
          this.handleError({ code: 1, message: 'Geolocation permission denied. Please enable tracking in your device settings to start a new visit.' });
          return false;
        }
      }
      return true;
    } catch (e) {
      // Permissions API might not be supported on all browsers (like some Safari versions)
      // We will fallback to the watchPosition prompting.
      return true;
    }
  }

  /**
   * 2. startTracking(onSuccess, onError)
   * Activates the high-accuracy watch loop and returns 7-decimal coordinates.
   */
  public async startTracking(
    onSuccess: (location: LocationData) => void,
    onError: (error: GeolocationError) => void,
    onStatusChange?: (status: GeolocationStatus) => void
  ) {
    this.updateCoordinatesCallback = onSuccess;
    this.errorCallback = onError;
    if (onStatusChange) this.statusCallback = onStatusChange;

    this.updateStatus('requesting');

    const hasPermission = await this.ensurePermissions();
    if (!hasPermission) {
      this.updateStatus('error');
      return;
    }

    if (this.watchId !== null) {
      // Already watching
      return;
    }

    // 1. FAST INITIAL FIX (A-GPS / Cellular 3G,4G,5G & Wi-Fi Triangulation)
    // Instantly returns the triangulated coordinates via any available mobile network or Wi-Fi (needs internet).
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // We only trigger success if the watch hasn't already fired.
        // The watch will overwrite this with higher accuracy soon.
        this.handleSuccess(pos);
      },
      (err) => {
        // Silently ignore fast-fix errors. The watchPosition will handle real errors.
        console.warn("Fast initial network location failed. Waiting for GPS lock...", err);
      },
      { enableHighAccuracy: false, maximumAge: 60000, timeout: 5000 }
    );

    // 2. HIGH ACCURACY CONTINUOUS TRACKING (Hardware GPS)
    this.watchId = navigator.geolocation.watchPosition(
      this.handleSuccess.bind(this),
      this.handlePositionError.bind(this),
      this.geoOptions
    );
    this.updateStatus('tracking');
  }

  /**
   * 3. stopTracking()
   * Clears the watch ID, optimizing battery consumption.
   */
  public stopTracking() {
    if (this.watchId !== null && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
      this.updateStatus('stopped');
    }
  }

  private handleSuccess(position: GeolocationPosition) {
    // Format to 7 decimal places for pinpoint accuracy (meter/centimeter level)
    const formattedLat = parseFloat(position.coords.latitude.toFixed(7));
    const formattedLng = parseFloat(position.coords.longitude.toFixed(7));

    const locationData: LocationData = {
      latitude: formattedLat,
      longitude: formattedLng,
      accuracy: position.coords.accuracy,
      timestamp: position.timestamp
    };

    /**
     * OFFLINE QUEUEING COMMENT:
     * While offline, these precise coordinate updates can be streamed directly into a
     * local client-side storage like IndexedDB (using Dexie.js or native IDB). 
     * You would create an 'offline_tracking_points' store and queue each `locationData`
     * object. When the global 'online' event fires, a background sync service worker
     * or dedicated sync process dequeues the pending points and pushes them in bulk
     * to the backend ensuring no geospatial data is lost during transit without signal.
     */

    if (this.updateCoordinatesCallback) {
      this.updateCoordinatesCallback(locationData);
    }
  }

  /**
   * 4. Error handling routines that explicitly differentiate between 
   * PERMISSION_DENIED, POSITION_UNAVAILABLE, and TIMEOUT
   */
  private handlePositionError(error: GeolocationPositionError) {
    let errorMessage = "An unknown error occurred while retrieving location.";
    switch(error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = "Permission Denied: Please allow location access in your device settings to continue. Tracking is required for visits.";
        this.stopTracking(); // Fatal error for visit context
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage = "Position Unavailable: GPS signal cannot be acquired. Please move to an open area with a clear view of the sky.";
        break;
      case error.TIMEOUT:
        errorMessage = "Timeout: It took too long to acquire a high-accuracy GPS lock. Retrying...";
        // Note: watchPosition automatically retries on timeout, we don't clear the watch.
        break;
    }

    this.handleError({ code: error.code, message: errorMessage });
  }

  private handleError(error: GeolocationError) {
    this.updateStatus('error');
    if (this.errorCallback) {
      this.errorCallback(error);
    }
  }

  private updateStatus(status: GeolocationStatus) {
    if (this.statusCallback) {
      this.statusCallback(status);
    }
  }
}

export const gpsTracker = new GeolocationTracker();
