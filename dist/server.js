"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
require("tsconfig-paths/register"); //Use this for sortcut path inside tsconfig.json
const fastify_1 = __importDefault(require("fastify"));
const jwt_1 = __importDefault(require("@fastify/jwt"));
const fastifyCookie = require("@fastify/cookie");
const ajv_errors_1 = __importDefault(require("ajv-errors"));
const http_proxy_1 = __importDefault(require("@fastify/http-proxy"));
const axios_1 = __importDefault(require("axios"));
const fastify = (0, fastify_1.default)({
    logger: false, // Enables logging
    ajv: {
        customOptions: { allErrors: true },
        plugins: [ajv_errors_1.default], // Use ajv-errors plugin for custom messages
    }
});
// Register JWT plugin
fastify.register(jwt_1.default, {
    secret: 'fliztecorb99@Fliz_Tecorb12', // Change this to a strong secret key
});
// Global Authentication Hook (Runs before every route)
fastify.addHook("preHandler", async (req, reply) => {
    // Allow unauthenticated routes
    const publicRoutes = [
        '/user/api/v1/admin/auth/signUp',
        '/user/api/v1/admin/auth/login',
        '/about',
        '/home',
        '/user/health',
        '/subject/health',
        '/class/health'
    ];
    if (publicRoutes.includes(req.url)) {
        return;
    }
    const decoded = await req.jwtVerify(); // Verify token for protected routes
    req.user = decoded.id;
    req.role = decoded.role;
});
// Global error handler
fastify.setErrorHandler((error, request, reply) => {
    // Log the error
    request.log.error(error);
    // Custom error response
    reply.status(error.statusCode || 500).send({
        success: false,
        message: error.message,
        error: error.message,
        code: error.code,
        statusCode: error.statusCode
    });
});
// Service URLs
const SERVICES = {
    auth: "https://user-auth-microservice-using-fastify.onrender.com",
    class: "https://class-microservice-using-fastify.onrender.com",
    subject: "http://localhost:4003",
};
fastify.get('/', (req, reply) => {
    reply.send({ message: "Hello", code: 200 });
});
// Proxy to Auth Service
fastify.register(http_proxy_1.default, {
    upstream: SERVICES.auth,
    prefix: "/user", // All /auth requests go to the auth service
    replyOptions: {
        rewriteRequestHeaders: (req, headers) => {
            return {
                ...headers,
                'x-user-id': req.user,
                'x-user-role': req.role
            };
        }
    }
});
// Proxy to Orders Service
fastify.register(http_proxy_1.default, {
    upstream: SERVICES.class,
    prefix: "/class", // All /orders requests go to the orders service
    replyOptions: {
        rewriteRequestHeaders: (req, headers) => {
            return {
                ...headers,
                'x-user-id': req.user,
                'x-user-role': req.role
            };
        }
    }
});
// Proxy to Products Service
fastify.register(http_proxy_1.default, {
    upstream: SERVICES.subject,
    prefix: "/subject", // All /products requests go to the products service
    replyOptions: {
        rewriteRequestHeaders: (req, headers) => {
            return {
                ...headers,
                'x-user-id': req.user,
                'x-user-role': req.role
            };
        }
    }
});
setInterval(async () => {
    for (const [serviceName, url] of Object.entries(SERVICES)) {
        try {
            console.log(serviceName, "serviceName", url);
            await axios_1.default.get(`${url}/health`);
            console.log(`✅ ${serviceName} Service is UP`);
        }
        catch (error) {
            console.error(`❌ ${serviceName} Service is DOWN`);
        }
    }
}, 30000); // Runs every 30 seconds
module.exports = fastify;
