package com.rsrmi.api.util;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import javax.crypto.SecretKey;

public class JwtUtil {
    private static final String SECRET = "supersecretkeysupersecretkeysupersecretkey123!"; // should be at least 256 bits
    private static final long EXPIRATION_MS = 24 * 60 * 60 * 1000; // 1 day
    private static final SecretKey KEY = Keys.hmacShaKeyFor(SECRET.getBytes());

    public static String generateToken(int userId, String phone, String userType) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", userId);
        claims.put("phone", phone);
        claims.put("userType", userType);
        return Jwts.builder()
                .setClaims(claims)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + EXPIRATION_MS))
                .signWith(KEY)
                .compact();
    }

    public static Jws<Claims> validateToken(String token) {
        return Jwts.parserBuilder().setSigningKey(KEY).build().parseClaimsJws(token);
    }

    public static Claims getClaims(String token) {
        return validateToken(token).getBody();
    }
}
