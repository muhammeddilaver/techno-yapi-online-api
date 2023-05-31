import redis from "./config/redis.js";


const user_token = await redis.get('646a53c683afd616b6f6d345', function (err, reply) {
    return reply;
});

console.log(user_token);