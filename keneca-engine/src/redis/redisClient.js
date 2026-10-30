import * as redis from "redis";

const client = redis.createClient();

client.on("ready", () => {
    console.log("Our Redis live database connection is connected");
});

client.on("error", (error) => {
    console.error("Redis connection error:", error);
});

export { client };