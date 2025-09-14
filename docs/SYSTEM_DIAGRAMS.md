# Ride-Sharing Application System Diagrams

This document contains comprehensive system diagrams for the ride-sharing application suitable for academic presentation.

## 1. System Architecture Overview

```mermaid
graph TB
    subgraph "Frontend Layer"
        WEB[Web Application<br/>React + TypeScript]
        AUTH[Authentication<br/>Context]
        LOC[Location<br/>Context]
        MAPS[Maps Integration<br/>OpenStreetMap/Leaflet]
    end
    
    subgraph "Backend Layer"
        API[Spring Boot API<br/>Port 8080]
        RMI[RMI Services<br/>Port 1099]
        CTRL[REST Controllers]
        SVC[Business Services]
    end
    
    subgraph "Data Layer"
        DB[(PostgreSQL<br/>Database)]
        REDIS[(Redis Cache<br/>Sessions)]
    end
    
    subgraph "External Services"
        OSM[OpenStreetMap<br/>Geocoding]
        ORS[OpenRouteService<br/>Routing]
        NOTIF[Browser<br/>Notifications]
    end
    
    WEB --> AUTH
    WEB --> LOC
    WEB --> MAPS
    WEB --> API
    API --> RMI
    API --> DB
    API --> REDIS
    MAPS --> OSM
    MAPS --> ORS
    WEB --> NOTIF
    
    style WEB fill:#e1f5fe
    style API fill:#e8f5e8
    style DB fill:#fff3e0
    style RMI fill:#f3e5f5
```

## 2. User Flow Diagram

```mermaid
flowchart TD
    START([User Opens App])
    LOGIN{Already<br/>Logged In?}
    LANDING[Landing Page]
    AUTH_TYPE{User Type?}
    RIDER_LOGIN[Rider Login]
    DRIVER_LOGIN[Driver Login]
    RIDER_DASH[Rider Dashboard]
    DRIVER_DASH[Driver Dashboard]
    
    START --> LOGIN
    LOGIN -->|No| LANDING
    LOGIN -->|Yes| AUTH_TYPE
    LANDING --> AUTH_TYPE
    AUTH_TYPE -->|Rider| RIDER_LOGIN
    AUTH_TYPE -->|Driver| DRIVER_LOGIN
    RIDER_LOGIN --> RIDER_DASH
    DRIVER_LOGIN --> DRIVER_DASH
    
    subgraph "Rider Journey"
        RIDER_DASH --> SET_DEST[Set Destination]
        SET_DEST --> REQ_RIDE[Request Ride]
        REQ_RIDE --> WAIT_DRIVER[Wait for Driver]
        WAIT_DRIVER --> TRACK_DRIVER[Track Driver Location]
        TRACK_DRIVER --> PICKUP[Pickup Complete]
        PICKUP --> IN_TRANSIT[In Transit]
        IN_TRANSIT --> COMPLETE[Ride Complete]
    end
    
    subgraph "Driver Journey"
        DRIVER_DASH --> AVAIL_RIDES[View Available Rides]
        AVAIL_RIDES --> ACCEPT_RIDE[Accept Ride]
        ACCEPT_RIDE --> NAV_PICKUP[Navigate to Pickup]
        NAV_PICKUP --> ARRIVE_PICKUP[Arrive at Pickup]
        ARRIVE_PICKUP --> START_TRIP[Start Trip]
        START_TRIP --> NAV_DEST[Navigate to Destination]
        NAV_DEST --> TRIP_COMPLETE[Complete Trip]
    end
    
    style RIDER_DASH fill:#e3f2fd
    style DRIVER_DASH fill:#e8f5e8
    style COMPLETE fill:#c8e6c9
    style TRIP_COMPLETE fill:#c8e6c9
```

## 3. Ride Request Sequence Diagram

```mermaid
sequenceDiagram
    participant R as Rider
    participant RUI as Rider UI
    participant API as Spring Boot API
    participant RMI as RMI Service
    participant DB as Database
    participant DUI as Driver UI
    participant D as Driver
    
    R->>RUI: Set pickup & destination
    RUI->>API: POST /api/v1/rides/request
    API->>RMI: Create ride request
    RMI->>DB: INSERT ride (status: PENDING)
    DB-->>RMI: Ride created
    RMI-->>API: Ride ID returned
    API-->>RUI: 201 Created
    RUI->>RUI: Start polling for updates
    
    Note over DUI: Driver sees available rides
    DUI->>API: GET /api/v1/rides/available
    API->>RMI: Get pending rides
    RMI->>DB: SELECT rides WHERE status=PENDING
    DB-->>RMI: Available rides
    RMI-->>API: Ride list
    API-->>DUI: Available rides
    
    D->>DUI: Accept ride
    DUI->>API: POST /api/v1/rides/{id}/accept
    API->>RMI: Accept ride
    RMI->>DB: UPDATE ride SET status=ACCEPTED, driverId=?
    DB-->>RMI: Ride updated
    RMI-->>API: Success
    API-->>DUI: 200 OK
    
    Note over RUI: Polling detects change
    RUI->>API: GET /api/v1/rides/current
    API->>RMI: Get current ride
    RMI->>DB: SELECT ride WHERE riderId=?
    DB-->>RMI: Ride data
    RMI-->>API: Current ride
    API-->>RUI: Ride with ACCEPTED status
    RUI->>RUI: Show "Driver Found!"
    RUI->>RUI: Start tracking driver location
```

## 4. Real-time Location Tracking Flow

```mermaid
flowchart TD
    subgraph "Driver Side"
        DRIVER_APP[Driver Dashboard]
        GPS_UPDATE[GPS Location Update]
        SEND_LOC[Send Location to Server]
        LOC_API[Location API Endpoint]
    end
    
    subgraph "Server Side"
        LOC_STORE[Store Driver Location]
        DATABASE[(Database)]
        LOC_ENDPOINT[GET Location Endpoint]
    end
    
    subgraph "Rider Side"
        RIDER_APP[Rider Dashboard]
        POLL_LOC[Poll Driver Location]
        UPDATE_MAP[Update Map Markers]
        SHOW_DISTANCE[Show Distance]
    end
    
    DRIVER_APP --> GPS_UPDATE
    GPS_UPDATE --> SEND_LOC
    SEND_LOC --> LOC_API
    LOC_API --> LOC_STORE
    LOC_STORE --> DATABASE
    
    RIDER_APP --> POLL_LOC
    POLL_LOC --> LOC_ENDPOINT
    LOC_ENDPOINT --> DATABASE
    DATABASE --> LOC_ENDPOINT
    LOC_ENDPOINT --> RIDER_APP
    RIDER_APP --> UPDATE_MAP
    RIDER_APP --> SHOW_DISTANCE
    
    style GPS_UPDATE fill:#ffecb3
    style POLL_LOC fill:#e1f5fe
    style DATABASE fill:#f3e5f5
```

## 5. Database Entity Relationship Diagram

```mermaid
erDiagram
    USER ||--o{ RIDE : creates
    USER ||--o{ USER_LOCATION : has
    RIDE ||--|| RIDE_STATUS : has
    
    USER {
        bigint id PK
        varchar username
        varchar phone UK
        varchar password
        enum user_type "RIDER, DRIVER"
        boolean is_available
        decimal rating
        varchar vehicle_type
        varchar vehicle_number
        timestamp created_at
        timestamp updated_at
    }
    
    RIDE {
        bigint id PK
        bigint rider_id FK
        bigint driver_id FK
        decimal pickup_latitude
        decimal pickup_longitude
        varchar pickup_address
        decimal destination_latitude
        decimal destination_longitude
        varchar destination_address
        enum status "PENDING, ACCEPTED, DRIVER_EN_ROUTE, ARRIVED, IN_PROGRESS, COMPLETED, CANCELLED"
        decimal estimated_fare
        decimal actual_fare
        timestamp created_at
        timestamp updated_at
        timestamp completed_at
    }
    
    USER_LOCATION {
        bigint id PK
        bigint user_id FK
        decimal latitude
        decimal longitude
        varchar address
        boolean is_online
        timestamp last_updated
    }
    
    RIDE_STATUS {
        varchar status PK
        varchar description
        boolean is_active
    }
```

## 6. Component Architecture Diagram

```mermaid
graph TB
    subgraph "React Frontend"
        subgraph "Pages"
            LANDING[Landing Page]
            LOGIN[Login/Register]
        end
        
        subgraph "Contexts"
            AUTH_CTX[Auth Context]
            LOC_CTX[Location Context]
        end
        
        subgraph "Components"
            RIDER_COMP[Rider Dashboard]
            DRIVER_COMP[Driver Dashboard]
            MAP_COMP[OpenStreetMap]
            HEADER[Header Layout]
        end
        
        subgraph "Services"
            API_SVC[API Service]
            LOC_SVC[Location Service]
            ROUTE_SVC[Routing Service]
            ADDR_SVC[Address Service]
        end
    end
    
    subgraph "Spring Boot Backend"
        subgraph "Controllers"
            USER_CTRL[User Controller]
            RIDE_CTRL[Ride Controller]
            LOC_CTRL[Location Controller]
        end
        
        subgraph "Services"
            USER_SVC[User Service]
            RIDE_SVC[Ride Service]
            LOC_BIZ_SVC[Location Service]
        end
        
        subgraph "RMI Layer"
            USER_RMI[User RMI Service]
            RIDE_RMI[Ride RMI Service]
            LOC_RMI[Location RMI Service]
        end
    end
    
    RIDER_COMP --> AUTH_CTX
    DRIVER_COMP --> AUTH_CTX
    RIDER_COMP --> LOC_CTX
    DRIVER_COMP --> LOC_CTX
    MAP_COMP --> LOC_CTX
    
    API_SVC --> USER_CTRL
    API_SVC --> RIDE_CTRL
    API_SVC --> LOC_CTRL
    
    USER_CTRL --> USER_SVC
    RIDE_CTRL --> RIDE_SVC
    LOC_CTRL --> LOC_BIZ_SVC
    
    USER_SVC --> USER_RMI
    RIDE_SVC --> RIDE_RMI
    LOC_BIZ_SVC --> LOC_RMI
    
    style AUTH_CTX fill:#e3f2fd
    style LOC_CTX fill:#e8f5e8
    style USER_RMI fill:#fff3e0
    style RIDE_RMI fill:#fff3e0
    style LOC_RMI fill:#fff3e0
```

## 7. API Endpoint Overview

```mermaid
mindmap
  root((REST API Endpoints))
    Authentication
      POST /api/v1/users/login
      POST /api/v1/users/register
      POST /api/v1/users/logout
    User Management
      GET /api/v1/users/get
      PUT /api/v1/users/update
      PUT /api/v1/users/update/location
      GET /api/v1/users/{id}/get/location
    Ride Management
      POST /api/v1/rides/request
      GET /api/v1/rides/current
      GET /api/v1/rides/available
      POST /api/v1/rides/{id}/accept
      PUT /api/v1/rides/{id}/status
      DELETE /api/v1/rides/{id}
      POST /api/v1/rides/driver/{id}/location
    Location Services
      GET /api/v1/location/reverse-geocode
      GET /api/v1/location/search
```

## 8. Technology Stack Diagram

```mermaid
graph LR
    subgraph "Frontend Technologies"
        REACT[React 18]
        TS[TypeScript]
        VITE[Vite Build Tool]
        TAILWIND[Tailwind CSS]
        LEAFLET[Leaflet Maps]
    end
    
    subgraph "Backend Technologies"
        SPRING[Spring Boot 3]
        JAVA[Java 17]
        WEBFLUX[Spring WebFlux]
        JPA[Spring Data JPA]
        RMI_TECH[Java RMI]
    end
    
    subgraph "Database & Storage"
        POSTGRES[PostgreSQL 15]
        HIKARI[HikariCP Pool]
    end
    
    subgraph "External APIs"
        OSM_API[OpenStreetMap API]
        ORS_API[OpenRouteService API]
        NOMINATIM[Nominatim Geocoding]
    end
    
    subgraph "DevOps & Deployment"
        DOCKER[Docker Compose]
        NGINX[Nginx Proxy]
        NPM[NPM Package Manager]
        MAVEN[Maven Build Tool]
    end
    
    REACT --> TS
    REACT --> TAILWIND
    REACT --> LEAFLET
    SPRING --> JAVA
    SPRING --> WEBFLUX
    SPRING --> JPA
    SPRING --> RMI_TECH
    JPA --> POSTGRES
    POSTGRES --> HIKARI
    LEAFLET --> OSM_API
    LEAFLET --> ORS_API
    LEAFLET --> NOMINATIM
    
    style REACT fill:#61dafb
    style SPRING fill:#6db33f
    style POSTGRES fill:#336791
    style DOCKER fill:#2496ed
```

## 9. Deployment Architecture

```mermaid
graph TB
    subgraph "Docker Compose Environment"
        subgraph "Web Container"
            WEB_APP[React App<br/>Port 3000]
            NGINX_WEB[Nginx<br/>Static Files]
        end
        
        subgraph "API Container"
            API_APP[Spring Boot API<br/>Port 8080]
            RMI_SERVER[RMI Registry<br/>Port 1099]
        end
        
        subgraph "Database Container"
            DB_SERVER[PostgreSQL<br/>Port 5432]
            DB_INIT[Init Scripts]
        end
        
        subgraph "Proxy Container"
            NGINX_PROXY[Nginx Proxy<br/>Port 80/443]
            SSL_CERTS[SSL Certificates]
        end
    end
    
    NGINX_PROXY --> WEB_APP
    NGINX_PROXY --> API_APP
    WEB_APP --> API_APP
    API_APP --> RMI_SERVER
    API_APP --> DB_SERVER
    
    subgraph "External Access"
        BROWSER[Web Browser]
        MOBILE[Mobile Browser]
    end
    
    BROWSER --> NGINX_PROXY
    MOBILE --> NGINX_PROXY
    
    style WEB_APP fill:#e1f5fe
    style API_APP fill:#e8f5e8
    style DB_SERVER fill:#fff3e0
    style NGINX_PROXY fill:#f3e5f5
```

## 10. Security Architecture

```mermaid
graph TB
    subgraph "Security Layers"
        subgraph "Frontend Security"
            TOKEN_STORAGE[Token Storage<br/>localStorage]
            AUTH_GUARD[Route Guards]
            INPUT_VALID[Input Validation]
        end
        
        subgraph "API Security"
            CORS[CORS Policy]
            AUTH_INTERCEPTOR[Auth Interceptor]
            JWT_VALIDATION[JWT Validation]
            RATE_LIMIT[Rate Limiting]
        end
        
        subgraph "Backend Security"
            AUTH_FILTER[Authentication Filter]
            ROLE_CHECK[Role-based Access]
            SQL_INJECTION[SQL Injection Prevention]
            DATA_VALIDATION[Data Validation]
        end
        
        subgraph "Database Security"
            DB_ENCRYPT[Data Encryption]
            CONN_POOL[Connection Pooling]
            PREPARED_STMT[Prepared Statements]
        end
    end
    
    TOKEN_STORAGE --> AUTH_INTERCEPTOR
    AUTH_GUARD --> JWT_VALIDATION
    INPUT_VALID --> DATA_VALIDATION
    CORS --> AUTH_FILTER
    AUTH_INTERCEPTOR --> ROLE_CHECK
    JWT_VALIDATION --> SQL_INJECTION
    RATE_LIMIT --> DB_ENCRYPT
    
    style TOKEN_STORAGE fill:#ffebee
    style JWT_VALIDATION fill:#e8f5e8
    style DB_ENCRYPT fill:#fff3e0
```

---

## Presentation Notes

### Key Points to Highlight:

1. **Modern Tech Stack**: React + Spring Boot with microservices architecture
2. **Real-time Features**: Live location tracking and ride updates
3. **Scalable Design**: RMI services for distributed computing
4. **Security**: JWT authentication and role-based access control
5. **User Experience**: Responsive design with real-time notifications
6. **External Integration**: Maps, geocoding, and routing services

### Technical Achievements:

- **Full-stack Development**: Frontend, backend, and database integration
- **Real-time Communication**: Location polling and status updates
- **Geographic Information Systems**: Map integration and routing
- **Distributed Systems**: RMI-based service architecture
- **Modern Development Practices**: Docker containerization, CI/CD ready

### Demo Flow Suggestions:

1. Show user registration and authentication
2. Demonstrate ride request process
3. Show real-time driver tracking
4. Highlight map integration and routing
5. Display responsive design across devices