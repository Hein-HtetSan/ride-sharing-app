# System Implementation Demo Guide
## Step-by-Step Flow for Presentation with Screenshots

---

# System Implementation Demo Guide
## Detailed Step-by-Step Descriptions for Presentation

---

## 🚗 **RIDER JOURNEY - Complete Process Description**

### **Step 1: Application Access & User Registration**

**What Happens:** The rider opens the web application and begins the registration process to create their account in the distributed system.

**Detailed Process:**
- User navigates to the ride-sharing application homepage
- The React frontend loads and displays the main landing page with two primary options
- User clicks "Book a Ride" which triggers navigation to the rider registration interface
- Registration form appears with fields for username, phone number, password, and automatically sets user type as "RIDER"
- When user submits the form, the frontend validates all required fields locally
- A POST request is sent to the Spring Boot API endpoint `/api/v1/users/register`
- The Spring Boot controller receives the request and performs server-side validation
- The API makes an RMI call to the UserService running on the RMI server (port 1099)
- The RMI UserService hashes the password using BCrypt for security
- A new user record is inserted into the PostgreSQL database with all provided information
- The database generates a unique user ID and returns it to the RMI service
- The RMI service returns the created user object back to the Spring Boot API
- The API generates a JWT token for session management
- A success response with the JWT token is sent back to the React frontend
- The frontend stores the token in localStorage and redirects to the rider dashboard

**Distributed System Interaction:** This step demonstrates the complete three-tier architecture where the presentation layer (React) communicates with the application layer (Spring Boot), which then delegates business logic to the service layer (RMI services) for database operations.

---

### **Step 2: Dashboard Loading & Location Services Initialization**

**What Happens:** The authenticated rider accesses their dashboard and grants location permissions, enabling the core location-based functionality of the distributed system.

**Detailed Process:**
- Upon successful authentication, the React application navigates to the rider dashboard
- The dashboard component initializes and begins the location acquisition process
- Browser's Geolocation API is called to request the user's current position
- A permission dialog appears asking the user to allow location access
- When permission is granted, the browser provides GPS coordinates with high accuracy settings
- The frontend calls a reverse geocoding service to convert coordinates into a human-readable address
- The location data (latitude, longitude, and address) is sent to the Spring Boot API
- The API forwards this location information to the RMI LocationService
- The RMI service updates or inserts the user's location in the user_locations table
- The database operation includes a timestamp for tracking when the location was last updated
- The OpenStreetMap component loads and displays the interactive map
- The user's current location appears as a blue marker on the map
- The map centers on the user's location with appropriate zoom level
- Location tracking is now active and will continue to update the user's position

**Distributed System Interaction:** This step showcases real-time data distribution where location data flows from the client through multiple service layers and is persisted in the distributed database, enabling location-based service discovery.

---

### **Step 3: Pickup Location Configuration**

**What Happens:** The rider specifies their desired pickup location, which can be their current location or any other location they choose through map interaction or address search.

**Detailed Process:**
- The rider dashboard displays a pickup location input section with the current location as the default
- The input field shows the reverse-geocoded address of the user's current GPS position
- If the rider wants to change the pickup location, they can either type a new address or use the map
- Clicking the map pin icon activates "map picking mode" for pickup location selection
- In map picking mode, the map displays an instruction overlay indicating pickup selection is active
- When the rider clicks anywhere on the map, the coordinates are captured
- The selected coordinates are reverse-geocoded to get the corresponding address
- The pickup location state is updated with the new coordinates and address
- The pickup input field reflects the newly selected address
- If both pickup and destination are set, the system automatically calculates the route
- Route calculation involves calling external routing services (OpenRouteService) for accurate pathfinding
- The estimated duration and distance are computed and displayed to the user
- The map updates to show the proposed route as a colored line
- Users can clear the pickup location using the X button, which resets to current location

**Distributed System Interaction:** This step demonstrates the integration of external services with the distributed system, showing how location data flows through various components while maintaining real-time user interface updates.

---

### **Step 4: Destination Selection & Route Planning**

**What Happens:** The rider sets their destination address, triggering comprehensive route planning and fare estimation through the distributed system's integration with external mapping services.

**Detailed Process:**
- The rider focuses on the destination input field and begins typing their desired destination
- The location search component provides autocomplete suggestions based on address matching
- Suggestions appear in real-time as the user types, utilizing geocoding services
- When a destination is selected, the coordinates are extracted and validated
- The system now has both pickup and destination coordinates for route calculation
- A request is made to the OpenRouteService API for optimal route planning
- The routing service calculates the most efficient path considering traffic and road conditions
- Route metadata including distance, estimated duration, and turn-by-turn directions are returned
- The frontend displays the estimated travel time (e.g., "15 min") and distance (e.g., "8.2 km")
- The map visualization updates to show the complete route from pickup to destination
- The route appears as a colored polyline connecting the two points
- Intermediate waypoints and navigation instructions are processed but not displayed to avoid complexity
- If route calculation fails, the system falls back to straight-line distance estimation
- The user interface updates to show they are ready to proceed with booking the ride

**Distributed System Interaction:** This step showcases the integration between the distributed ride-sharing system and external mapping APIs, demonstrating how modern distributed systems rely on third-party services while maintaining fault tolerance through fallback mechanisms.

---

### **Step 5: Ride Request Creation & Submission**

**What Happens:** The rider initiates the actual ride request, which creates a new ride record in the distributed database and makes it available for driver discovery and acceptance.

**Detailed Process:**
- The rider reviews their trip details including pickup location, destination, and estimated metrics
- Clicking "Book Your Ride" triggers the ride creation process in the distributed system
- The frontend validates that both pickup and destination locations are properly set
- A comprehensive ride request object is constructed containing all necessary trip information
- The request includes rider ID, pickup coordinates, destination coordinates, addresses, and timestamp
- A POST request is sent to the Spring Boot API's ride creation endpoint
- The API controller performs business rule validation on the incoming request
- The validated request is forwarded to the RMI RideService for processing
- The RMI service initiates a database transaction to ensure data consistency
- A new ride record is inserted into the rides table with status "PENDING"
- The database generates a unique ride ID and returns it to confirm successful creation
- The RMI service commits the transaction and returns the ride ID to the API
- The API responds to the frontend with success confirmation and the new ride ID
- The user interface immediately updates to show "Booking Your Ride..." status
- The system transitions into waiting mode where it will poll for driver acceptance
- A cancel option becomes available in case the rider changes their mind

**Distributed System Interaction:** This step demonstrates transactional integrity in a distributed system, showing how data consistency is maintained across multiple service layers while providing immediate user feedback.

---

### **Step 6: Driver Discovery & Ride Status Monitoring**

**What Happens:** The system enters a real-time monitoring phase where it continuously checks for driver acceptance while providing visual feedback to the rider about the request status.

**Detailed Process:**
- The ride request is now stored in the database with "PENDING" status, making it discoverable by drivers
- The rider's interface transitions to a waiting state with visual indicators
- The pickup location on the map begins displaying a pulsing/radiating animation to show active status
- A prominent notification appears stating "Waiting for driver to accept your ride..."
- The system initiates automatic polling every 3 seconds to check for ride status updates
- Each poll makes an API call to retrieve the current ride information
- The Spring Boot API queries the RMI service to get the latest ride status from the database
- If the status remains "PENDING", the polling continues and the waiting animation persists
- The rider sees encouraging messages about their pickup location being visible to nearby drivers
- A cancel booking option remains available, allowing the rider to abort the request if needed
- Network requests are visible in browser developer tools, showing the polling mechanism
- The system handles network failures gracefully, retrying failed polling attempts
- If no driver accepts within a reasonable timeframe, timeout mechanisms may activate
- Throughout this phase, the rider's location continues to be updated in the background
- The interface remains responsive and provides clear feedback about the current status

**Distributed System Interaction:** This step showcases real-time communication patterns in distributed systems, demonstrating polling mechanisms, fault tolerance, and the coordination between multiple clients and services.

---

## 🚖 **DRIVER JOURNEY - Complete Process Description**

### **Step 1: Driver Registration & Vehicle Information Setup**

**What Happens:** A driver joins the platform by registering their account and providing vehicle-specific information required for ride-sharing services.

**Detailed Process:**
The driver selects "Drive with Us" on the homepage, accessing a registration form with standard fields (username, phone, password) plus vehicle type and license plate. The form sets user type to "DRIVER" and validates all inputs. On submission, the data flows through the API, which applies extra checks for vehicle info. The RMI UserService creates the driver record with default availability and rating, storing vehicle details for future matching. A JWT token is issued, and the driver is redirected to their dashboard.

**Distributed System Interaction:** This step demonstrates how the same distributed architecture supports different user types with specialized business logic while maintaining consistent data flow patterns.

---

### **Step 2: Driver Dashboard Initialization & Availability Management**

**What Happens:** The authenticated driver accesses their operational dashboard and configures their availability status to begin receiving ride requests.

Upon accessing the driver dashboard, the interface loads with real-time updates and location services enabled for accurate positioning. The driver's availability can be toggled on or off, directly affecting ride matching and location tracking. When available, the system continuously updates the driver's location in the distributed database and displays their position on the map. The dashboard polls for pending ride requests, provides operational status feedback, and monitors network connectivity to ensure reliable communication. If the driver sets themselves as unavailable, ride notifications and location tracking are paused.

**Distributed System Interaction:** This step shows how distributed systems manage real-time state synchronization, with driver availability and location being continuously updated across multiple service components.

---

### **Step 3: Ride Discovery & Request Evaluation**

**What Happens:** Available drivers can view and evaluate pending ride requests in real-time, seeing detailed information about each potential trip to make informed acceptance decisions.

The driver dashboard polls for new ride requests, displaying available rides with key details such as pickup and destination addresses, estimated distance, and rider info. Each ride is shown as a card or list item, sorted by proximity or request time. The map highlights pickup locations, and real-time updates ensure accepted rides are removed instantly. Drivers can quickly compare options and select rides that best match their preferences.

**Distributed System Interaction:** This step demonstrates real-time data distribution and concurrent access management in distributed systems, where multiple drivers simultaneously access shared ride data.

---

### **Step 4: Ride Acceptance & Assignment Process**

**What Happens:** The driver selects and accepts a specific ride request, which immediately updates the ride status across the entire distributed system and notifies the waiting rider.

**Detailed Process:**
The driver reviews available rides and selects one to accept. Upon clicking "Accept Ride," the frontend sends the ride and driver IDs to the Spring Boot API, which forwards the request to the RMI RideService. The RMI service uses a database transaction with row-level locking to ensure the ride is still "PENDING" before updating it to "ACCEPTED" and assigning the driver. This change is committed, instantly removing the ride from other drivers' lists and updating both driver and rider interfaces. The rider is notified immediately, and both parties transition to active ride management with real-time location sharing.

**Distributed System Interaction:** This step showcases critical distributed system concepts including transaction management, concurrent access control, and real-time state propagation across multiple clients.

---

### **Step 5: Navigation to Pickup Location**

**What Happens:** The driver begins traveling to the rider's pickup location while the system provides real-time navigation and location tracking for both parties.

**Detailed Process:**
The driver's interface switches to navigation mode, displaying an optimized route from their current location to the pickup point. Real-time GPS tracking begins, with location updates sent every 5 seconds to the distributed system via API and RMI services. The rider's interface polls for these updates, showing the driver's position on the map and continuously updating distance and ETA. Both parties see live progress as the driver approaches, with turn-by-turn directions provided. The system manages GPS accuracy, network interruptions, and maintains location history for analytics.

**Distributed System Interaction:** This step demonstrates real-time data streaming in distributed systems, showing how location data flows continuously between multiple clients through the service infrastructure.

---

### **Step 6: Pickup Arrival & Passenger Coordination**

**What Happens:** The driver reaches the pickup location and coordinates with the rider for the actual pickup, with the system facilitating communication and status updates.

**Detailed Process:**
- As the driver approaches the pickup location, proximity detection may trigger automatic notifications
- The driver manually confirms arrival by clicking an "I've Arrived" button in their interface
- This action sends a status update request to the distributed system
- The RMI service updates the ride status from "ACCEPTED" to "ARRIVED" in the database
- An arrival timestamp is recorded for accurate trip tracking and billing purposes
- The rider immediately receives notification that their driver has arrived at the pickup location
- Both interfaces update to reflect the new status with appropriate visual indicators
- The rider's map may center on the pickup location to help them locate the driver
- Driver and rider can coordinate through the app's interface or direct communication
- The driver waits for the rider to approach and enter the vehicle
- During this phase, the driver's location continues to be tracked but remains relatively stationary
- The system may provide proximity-based matching to ensure the right driver and rider connect
- Visual indicators help both parties identify each other (vehicle details, user information)
- Once the rider is in the vehicle, the driver can proceed to start the actual trip

**Distributed System Interaction:** This step shows how distributed systems coordinate real-world interactions through digital status management and real-time communication between multiple parties.

---

### **Step 7: Trip Initiation & Route Management**

**What Happens:** The driver starts the actual trip with the passenger on board, causing the system to reconfigure routing and tracking for the journey to the destination.

**Detailed Process:**
With the rider on board, the driver clicks "Start Trip," updating the ride status to "IN_PROGRESS" and recording the trip start time. The system recalculates the route from pickup to destination, replacing previous navigation. Both driver and rider interfaces display real-time trip progress, including distance remaining and estimated arrival time, with location updates every 5 seconds. The actual route taken is tracked for billing and analytics, and navigation assistance continues throughout the journey. Trip data is logged for service optimization, while the rider's interface focuses on progress and arrival details.

**Distributed System Interaction:** This step demonstrates dynamic system reconfiguration in distributed architectures, where the same infrastructure adapts to different phases of the service lifecycle.

---

### **Step 8: Trip Completion & System Reset**

**What Happens:** The driver and rider reach the final destination, completing the service transaction and resetting the distributed system for future ride requests.

**Detailed Process:**
Upon reaching the destination, the driver clicks "Complete Trip," updating the ride status to "COMPLETED" and recording the completion timestamp. The system calculates the fare based on distance, time, and base rates, finalizes the ride record in the database, and confirms completion to both driver and rider interfaces. The rider's dashboard resets for future bookings, while the driver becomes available for new requests unless set to unavailable. Location tracking between the driver and rider ends, trip history is stored for both accounts, and analytics data is processed to enhance service quality. Both parties can rate each other and provide feedback, preparing the system for new ride requests.

**Distributed System Interaction:** This final step shows the complete lifecycle management in distributed systems, demonstrating how complex multi-party interactions are coordinated, completed, and properly cleaned up to maintain system state consistency.

---

## 📊 **DEMONSTRATION CHECKLIST**

### **Before Presentation:**
- [ ] Start all services: `./scripts/start-dev.sh`
- [ ] Clear browser data/localStorage
- [ ] Prepare two browser windows (Rider + Driver)
- [ ] Test location permissions
- [ ] Verify database connectivity
- [ ] Check RMI service status

### **During Demo:**
- [ ] Show both screens simultaneously
- [ ] Explain each RMI service call
- [ ] Highlight real-time updates
- [ ] Demonstrate error handling
- [ ] Show database state changes
- [ ] Monitor network requests

### **Key Technical Points to Emphasize:**
1. **RMI Service Discovery** - Registry lookup and binding
2. **Distributed State Management** - Cross-service data consistency
3. **Real-time Communication** - Polling + SSE hybrid approach
4. **Database Transactions** - ACID properties in distributed system
5. **Error Handling** - Graceful degradation and retry mechanisms
6. **Scalability** - Service separation and independent deployment

This comprehensive guide should give you everything you need for a compelling technical demonstration that showcases both the user experience and the underlying distributed systems architecture!