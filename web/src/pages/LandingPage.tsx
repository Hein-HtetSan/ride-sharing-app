import React from 'react';
import { Car, Users, MapPin, Shield, Clock, DollarSign } from 'lucide-react';

interface LandingPageProps {
  onRiderSignup: () => void;
  onDriverSignup: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onRiderSignup, onDriverSignup }) => {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="pt-20 pb-16 text-center">
            <div className="flex justify-center mb-8">
              <div className="h-20 w-20 bg-white rounded-full flex items-center justify-center">
                <Car className="h-10 w-10 text-blue-600" />
              </div>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Your Ride,
              <span className="text-blue-200"> Your Way</span>
            </h1>

            <p className="text-xl md:text-2xl text-blue-100 mb-12 max-w-3xl mx-auto">
              Connect with nearby drivers for safe, reliable, and affordable rides. 
              Join thousands of riders and drivers in your city.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={onRiderSignup}
                className="bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-50 transition-colors duration-200 flex items-center justify-center space-x-2"
              >
                <Users className="h-6 w-6" />
                <span>Get a Ride</span>
              </button>
              
              <button
                onClick={onDriverSignup}
                className="bg-blue-500 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-400 transition-colors duration-200 flex items-center justify-center space-x-2 border-2 border-blue-400"
              >
                <Car className="h-6 w-6" />
                <span>Drive & Earn</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Choose RideShare?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Experience the future of transportation with our cutting-edge platform
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
                <MapPin className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Real-time Tracking</h3>
              <p className="text-gray-600">
                Track your ride in real-time with live GPS updates. Know exactly where your driver is and when they'll arrive.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center mb-6">
                <Shield className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Safe & Secure</h3>
              <p className="text-gray-600">
                All drivers are verified and background-checked. Your safety is our top priority with 24/7 support.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center mb-6">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Quick Pickup</h3>
              <p className="text-gray-600">
                Find nearby drivers instantly. Average pickup time is under 5 minutes in most areas.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-6">
                <DollarSign className="h-6 w-6 text-yellow-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Fair Pricing</h3>
              <p className="text-gray-600">
                Transparent, upfront pricing with no hidden fees. Know your fare before you book your ride.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center mb-6">
                <Users className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Community Driven</h3>
              <p className="text-gray-600">
                Join a community of riders and drivers. Rate your experience and help improve the service.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className="h-12 w-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-6">
                <Car className="h-6 w-6 text-indigo-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Flexible Options</h3>
              <p className="text-gray-600">
                Choose from various vehicle types and ride options that fit your needs and budget.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-blue-600 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of satisfied riders and drivers today
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={onRiderSignup}
              className="bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-50 transition-colors duration-200"
            >
              Start Riding
            </button>
            
            <button
              onClick={onDriverSignup}
              className="bg-blue-500 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-400 transition-colors duration-200 border-2 border-blue-400"
            >
              Start Driving
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center space-x-2 text-white">
            <Car className="h-6 w-6" />
            <span className="text-lg font-semibold">RideShare</span>
          </div>
          <p className="text-center text-gray-400 mt-4">
            © 2025 RideShare. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;