package com.rsrmi.api.service;

import com.rsrmi.api.model.User;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.rmi.registry.LocateRegistry;
import java.rmi.registry.Registry;
import java.lang.reflect.Method;

@Service
public class UserServiceRmiClient {
    private Object userService;

    @Value("${rmi.host:rmi-server}")
    private String rmiHost;

    @Value("${rmi.port:1099}")
    private int rmiPort;

    @PostConstruct
    public void init() {
        try {
            Registry registry = LocateRegistry.getRegistry(rmiHost, rmiPort);
            userService = registry.lookup("UserService");
        } catch (Exception e) {
            throw new RuntimeException("Failed to connect to RMI server", e);
        }
    }

    public boolean registerUser(User user) throws Exception {
        // Dynamically map API User to RMI User using reflection
        Class<?> rmiUserClass = userService.getClass().getMethod("registerUser", Object.class).getParameterTypes()[0];
        Object rmiUser = rmiUserClass.getDeclaredConstructor().newInstance();
        // Set fields reflectively
        rmiUserClass.getMethod("setId", int.class).invoke(rmiUser, user.getId());
        rmiUserClass.getMethod("setUsername", String.class).invoke(rmiUser, user.getUsername());
        rmiUserClass.getMethod("setPassword", String.class).invoke(rmiUser, user.getPassword());
        rmiUserClass.getMethod("setName", String.class).invoke(rmiUser, user.getName());
        rmiUserClass.getMethod("setEmail", String.class).invoke(rmiUser, user.getEmail());
        rmiUserClass.getMethod("setPhone", String.class).invoke(rmiUser, user.getPhone());
        if (user.getUserType() != null) {
            Class<?> userTypeClass = rmiUserClass.getMethod("getUserType").getReturnType();
            Object rmiUserType = Enum.valueOf((Class<Enum>)userTypeClass, user.getUserType().name());
            rmiUserClass.getMethod("setUserType", userTypeClass).invoke(rmiUser, rmiUserType);
        }
        Method registerUserMethod = userService.getClass().getMethod("registerUser", rmiUserClass);
        Object result = registerUserMethod.invoke(userService, rmiUser);
        return (Boolean) result;
    }
}
