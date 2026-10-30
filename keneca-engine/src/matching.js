// Import the function responsible for generating the H3 cells
// around the post location for the current propagation ring
import { cellsAtCurrentRing } from "./propagation.js";

// Import the function that calculates the distance between the post
// and each nearby user, then attaches that distance information
import { addDistanceToUsers } from "./distance.js";

// Import the Redis read functions from our manager
// Replacing the old in-memory getSpatialIndex
import { getUsersInCells, getCandidatesData } from "./spatialIndexManager.js";


// This function is responsible for finding possible users for a post
// It searches users only in the cells belonging to the current propagation ring
// It fetches their data from Redis and calculates their distance from the post
async function findUsersForPostWithDistance(startingCell, current_Ring, post){

    // 1. First, we find all H3 cells that belong to this propagation ring
    const cells = cellsAtCurrentRing(
        startingCell,
        current_Ring
    );


    // 2. Query Redis Sets to get all user IDs sitting in those H3 cells
    const userIds = await getUsersInCells(cells);


    // If no users were found in this ring, stop early and return an empty array
    if (!userIds || userIds.length === 0) {
        return [];
    }


    // 3. Query Redis Hashes to fetch the coordinates (lat/lng) for those user IDs
    const user_List = await getCandidatesData(userIds);


    // 4. Calculate each candidate's physical distance from the post
    const usersWithDistance = addDistanceToUsers(
        user_List,
        post
    );


    // 5. Return the final list of users with their distance information
    return usersWithDistance;

}


// Export the function so other files,
// such as the dispatcher or matching engine,
// can use it
export {
    findUsersForPostWithDistance
};