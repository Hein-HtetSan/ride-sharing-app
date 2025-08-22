package com.rsrmi.api.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.reactive.CorsWebFilter;
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
public class CorsConfig {

    // Disable Spring Boot CORS - nginx will handle CORS headers
    // This prevents duplicate CORS headers that cause browser errors
    
    // @Bean
    // @Order(Ordered.HIGHEST_PRECEDENCE)
    // public CorsWebFilter corsWebFilter() {
    //     CorsConfiguration config = new CorsConfiguration();
    //     
    //     // Allow credentials
    //     config.setAllowCredentials(true);
    //     
    //     // Allow all origins for testing (remove in production)
    //     config.addAllowedOriginPattern("*");
    //     
    //     // Allow all headers
    //     config.addAllowedHeader("*");
    //     
    //     // Allow all HTTP methods explicitly
    //     config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"));
    //     
    //     // Expose headers
    //     config.setExposedHeaders(List.of("*"));
    //     
    //     // Max age for preflight
    //     config.setMaxAge(3600L);
    //     
    //     // Apply CORS to all paths
    //     UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    //     source.registerCorsConfiguration("/**", config);
    //     
    //     return new CorsWebFilter(source);
    // }
}
