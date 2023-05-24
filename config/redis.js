import { createClient } from "redis";

const redis = createClient({
    password: process.env.REDIS_PASSWORD,
    socket: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
    },
    legacyMode: true,
});

redis.connect();
export default redis;
