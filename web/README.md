# RideShare Platform - Frontend

A modern, responsive ride-sharing platform built with React, TypeScript, and Tailwind CSS. This frontend application connects with a Java Spring Boot backend via REST APIs.

## Features

### For Riders
- User registration and authentication
- Location-based ride booking
- Real-time driver tracking
- Fare estimation
- Ride history
- Live ride updates

### For Drivers
- Driver registration with vehicle details
- Online/offline status management
- Real-time location updates
- Ride request notifications
- Navigation integration ready
- Earnings tracking

## Tech Stack

- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Axios** for API communication
- **Context API** for state management
- **Lucide React** for icons

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Java Spring Boot backend running on port 8080

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment file:
   ```bash
   cp .env.example .env
   ```

4. Update the `.env` file with your configuration:
   ```
   REACT_APP_API_URL=http://localhost:8080/api
   REACT_APP_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
   ```

## Development

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Backend API Integration

The frontend expects the following REST API endpoints:

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout

### Rides
- `POST /api/rides/request` - Request a ride
- `GET /api/rides/current` - Get current active ride
- `POST /api/rides/{id}/accept` - Accept a ride (driver)
- `PUT /api/rides/{id}/status` - Update ride status
- `GET /api/rides/history` - Get ride history

### Drivers
- `GET /api/drivers/nearby` - Get nearby drivers
- `PUT /api/users/location` - Update user location
- `GET /api/users/{id}/location` - Get user location

## Production Build

Build the application for production:
```bash
npm run build
```

The build files will be generated in the `dist` directory.

## Deployment

The application can be deployed to any static hosting service:

- **Netlify**: Connect your repository and deploy automatically
- **Vercel**: Import your project and deploy
- **AWS S3 + CloudFront**: Upload build files to S3 bucket

## Features for Production

### Ready for Integration
- Google Maps API integration points
- WebSocket support for real-time updates
- Push notification setup
- Payment gateway integration ready
- Driver background check integration
- SMS verification system

### Security Features
- JWT token management
- Protected routes
- Input validation
- Error handling
- CORS configuration

### Performance
- Code splitting
- Lazy loading
- Optimized images
- Caching strategies
- Bundle optimization

## API Configuration

Configure your Spring Boot backend to allow CORS for the frontend domain:

```java
@CrossOrigin(origins = {"http://localhost:5173", "https://your-domain.com"})
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.