import * as redis from "redis";

const client = redis.createClient({
    url: process.env.REDIS_URL || "redis://localhost:6379"
});

client.on("ready", () => {
    console.log("Our Redis live database connection is connected");
});

client.on("error", (error) => {
    console.error("Redis connection error:", error);
});

export { client };
