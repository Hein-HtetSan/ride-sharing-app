package com.rsrmi.api.filter;

import com.rsrmi.api.util.JwtUtil;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;

@Component
public class JwtWebFilter implements WebFilter {
    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        String path = exchange.getRequest().getPath().value();
        String method = exchange.getRequest().getMethod().name();
        
        // Allow OPTIONS requests (CORS preflight) to pass through without authentication
        if ("OPTIONS".equals(method)) {
            return chain.filter(exchange);
        }
        
        // Protect /api/v1/users/get and /api/v1/users/update (expand as needed)
        if (
            path.startsWith("/api/v1/users/get") ||
            path.startsWith("/api/v1/users/update") ||
            path.startsWith("/api/v1/users/location") ||
            path.startsWith("/api/v1/users/{userId}/location") ||

            path.startsWith("/api/v1/rides/current") ||
            path.startsWith("/api/v1/rides/request") ||
            path.startsWith("/api/v1/rides/{rideId}/accept") ||
            path.startsWith("/api/v1/rides/{rideId}/status") ||
            path.startsWith("/api/v1/rides/{rideId}/cancel") ||
            path.startsWith("/api/v1/rides/driver/{rideId}/location") ||
            path.startsWith("/api/v1/rides/history") ||
            path.startsWith("/api/v1/rides/pending") ||

            path.startsWith("/api/v1/drivers/get") ||
            path.startsWith("api/v1/drivers/update")
        ) {
            String authHeader = exchange.getRequest().getHeaders().getFirst("Authorization");
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
                exchange.getResponse().getHeaders().setContentType(MediaType.APPLICATION_JSON);
                byte[] bytes = "{\"success\":false,\"message\":\"Missing or invalid Authorization header\"}".getBytes();
                return exchange.getResponse().writeWith(Mono.just(exchange.getResponse().bufferFactory().wrap(bytes)));
            }
            String token = authHeader.substring(7);
            try {
                JwtUtil.validateToken(token);
            } catch (Exception ex) {
                exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
                exchange.getResponse().getHeaders().setContentType(MediaType.APPLICATION_JSON);
                byte[] bytes = "{\"success\":false,\"message\":\"Invalid or expired token\"}".getBytes();
                return exchange.getResponse().writeWith(Mono.just(exchange.getResponse().bufferFactory().wrap(bytes)));
            }
        }
        return chain.filter(exchange);
    }
}
