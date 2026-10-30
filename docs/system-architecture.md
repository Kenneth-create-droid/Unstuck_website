# Keneca Engine - System Architecture

## 1. Overview

Keneca Engine is a real-time geospatial matching and sequential dispatch system designed to connect users based on geographic proximity.

The engine uses H3 spatial indexing to efficiently locate nearby users and a ranking system to determine the most suitable candidate for a request.

Instead of broadcasting requests to every nearby user, Keneca uses sequential dispatching where candidates are contacted one at a time until a successful match is found.


## 2. System Goals

The Keneca Engine is designed with the following goals:

### Efficient Geographic Discovery

The system should quickly identify nearby users without searching through the entire user database.

This is achieved through H3 spatial indexing, which organizes users into geographic cells.

### Intelligent Matching

The system should rank potential candidates based on relevant factors.

The initial MVP focuses on:

- Geographic proximity

Future versions will incorporate:

- User availability
- Reliability score
- Response history
- User preferences


### Sequential Dispatch

The system should avoid broadcasting requests to many users at the same time.

Instead, candidates are contacted in ranked order:

1. Highest-ranked candidate receives the request.
2. If the request is rejected or expires, the next candidate is contacted.
3. The process continues until a match is found or candidates are exhausted.


### Scalability

The architecture should support future expansion from a university campus environment to larger geographic regions.

The system should eventually support:

- Larger user populations
- Distributed backend services
- Real-time communication
- Advanced matching algorithms

## 3. High-Level Architecture

```text
                    User Application
                           |
                           |
                           v

                    Backend API Layer

                           |
        -----------------------------------------
        |                  |                    |
        v                  v                    v

 Location Service    Matching Engine       User Service

        |                  |                    |
        v                  v                    v

 H3 Spatial Index   Ranking System       User Database

                           |
                           v

                 Sequential Dispatcher

                           |
                           v

                 Notification Service
                 
                 


Then add:

```md id="ym5xk6"
The Keneca Engine follows a modular backend architecture where each component has a specific responsibility.

The system separates geographic discovery, candidate ranking, user management, and request dispatching into independent components.

This allows individual parts of the system to be improved, scaled, or replaced without affecting the entire application.

## 4. Core Components

### User Application

The user application provides the interface for interacting with the Keneca Engine.

Responsibilities:

- Creating requests
- Providing user location
- Receiving match responses
- Accepting or rejecting requests


### Backend API Layer

The backend API acts as the communication layer between the client application and the matching engine.

Responsibilities:

- Receiving user requests
- Validating request data
- Triggering the matching process
- Returning match results


### Location Service

The Location Service converts geographic coordinates into H3 spatial indexes.

Input:

Latitude + Longitude


Output:


H3 Cell Identifier


Example:


43.945, -78.896

    |

    v

892b986616bffff



### H3 Spatial Index

The H3 spatial index organizes users geographically.

Instead of searching through every user, the system searches relevant geographic cells.

Responsibilities:

- Store users by H3 cell
- Retrieve nearby users
- Expand search using H3 rings

Example:
Ring 0
Current cell

Ring 1
Immediate neighbors

Ring 2+
Further geographic expansion



### Matching Engine

The Matching Engine is the core decision-making component.

Responsibilities:

- Retrieve nearby candidates
- Apply matching rules
- Calculate candidate scores
- Rank users


Current MVP ranking:

Geographic proximity


Future ranking factors:


Availability
Reliability
Response history
User preferences



### Ranking System

The ranking system determines the order candidates are contacted.

Example:


Candidate A
Distance: 100m
Score: 0.95

Candidate B
Distance: 500m
Score: 0.75

Candidate C
Distance: 1200m
Score: 0.40


Higher-ranked candidates are dispatched first.


### Sequential Dispatcher

The dispatcher controls the request delivery process.

Responsibilities:

- Send request to highest-ranked candidate
- Wait for response
- Move to next candidate if rejected or expired
- Complete matching when accepted


Example:

Request

|
v

Candidate 1

|
Reject

v

Candidate 2

|
Accept

v

Match Complete



### User Database

The database stores persistent information.

Examples:

- User profiles
- Locations
- Request history
- Match history
- Ratings (future)


### Notification Service

The notification service communicates events between users.

Examples:

- New request available
- Request accepted
- Match completed

## 5. Data Flow

The Keneca Engine follows a request-based data flow where a user request is transformed into a geographic matching problem and processed through multiple backend components.


### Request Creation

A user creates a request through the application.

Example:

"I need help understanding a database concept"


The request contains:

- User information
- Request details
- Geographic location
- Timestamp


### Location Processing

The backend receives the geographic coordinates.

Example:


Latitude: 43.945
Longitude: -78.896


The Location Service converts these coordinates into an H3 cell identifier.

Latitude + Longitude

    |

    v

H3 Cell



### Candidate Discovery

The Matching Engine uses the H3 spatial index to locate nearby users.

The search begins at the user's current cell and expands outward using H3 rings.

Example:


Ring 0
Current cell

↓

Ring 1
Nearby cells

↓

Ring 2+
Further cells



### Candidate Ranking

Retrieved users are evaluated by the ranking system.

The current MVP uses proximity-based scoring.

Example:

User A
Distance: 100m
Score: 0.95

User B
Distance: 600m
Score: 0.70

User C
Distance: 1500m
Score: 0.30


Candidates are sorted from highest score to lowest score.


### Sequential Dispatch

The dispatcher sends the request to candidates one at a time.

Process:

Ranked Candidate List

    |

    v

Candidate 1

    |

Accept?
|
|--- Yes ---> Match Created
|
|--- No ---> Candidate 2

Candidate 2

    |

Continue until match found


### Match Completion

When a candidate accepts:

- The match is created
- Users are connected
- The request state is updated

The final result is returned to the requesting user.

## 6. Matching and Dispatch Pipeline

The Matching and Dispatch Pipeline is the core workflow of the Keneca Engine.

It combines geographic discovery, candidate ranking, and sequential request delivery to efficiently find a suitable match.


### Step 1: Request Initialization

A user creates a request containing:

- Request details
- User location
- Timestamp
- Matching requirements


The request is converted into an H3 spatial cell.


### Step 2: Spatial Candidate Discovery

The Matching Engine searches for nearby users.

The search expands progressively:

Ring 0
Current H3 cell

    ↓

Ring 1
Immediate neighbors

    ↓

Ring 2+

Further surrounding cells



The system stops expanding when:

- A suitable candidate is found
- Maximum search distance is reached
- Maximum ring limit is reached


### Step 3: Candidate Ranking

Users discovered from the spatial search are ranked.

Current MVP:

Ranking Factor:

Geographic proximity

Example:


Candidate A
Score: 0.95

Candidate B
Score: 0.80

Candidate C
Score: 0.65

The dispatcher receives the ordered candidate list.


### Step 4: Sequential Dispatch

The dispatcher contacts candidates one at a time.

Example:


Ranked Candidates:

[
User A,
User B,
User C
]

Send request to User A

    |

    v

Wait for response



Each candidate has a response window.


### Step 5: Response Handling

The dispatcher handles three possible outcomes.


#### Accept

If the user accepts:

User A

Accept

↓

Match Created

↓

Dispatch Complete



#### Reject

If the user rejects:


User A

Reject

↓

Move to User B


#### Timeout

If the user does not respond within the configured time window:

Example:


5 minutes without response


The system automatically treats the request as rejected.

The dispatcher continues:


User A

No response after 5 minutes

↓

User B receives request



### Step 6: Match Completion

The process continues until:

- A user accepts the request
- All candidates are exhausted
- Maximum search limits are reached


Successful matches are stored for future analytics and reliability scoring.

## 7. Spatial Indexing Architecture

Keneca uses H3 spatial indexing as the geographic foundation of the matching engine.

The spatial indexing layer converts user coordinates into H3 cells and enables efficient nearby-user discovery through hierarchical hexagonal grid searches.

The spatial indexing system is responsible for:

- Converting latitude and longitude into H3 cells
- Indexing users by geographic location
- Searching nearby cells using ring expansion
- Providing candidate users to the Matching Engine

Detailed design is documented in:

spatial-indexing-architecture.md

## 8. Matching Engine Architecture

The Matching Engine is responsible for finding and ranking suitable candidates for a request.

It combines:

- Spatial candidates from the H3 layer
- Matching rules
- Ranking algorithms

The current MVP focuses on geographic proximity scoring.

Detailed design is documented in:

matching-engine-design.md

## 9. Sequential Dispatch Architecture

The Sequential Dispatcher manages the communication process between requesters and candidates.

Instead of broadcasting requests, Keneca contacts candidates in ranked order.

The dispatcher handles:

- Candidate selection
- Response tracking
- Accept/reject handling
- Timeout expiration
- Moving to the next candidate

Detailed design is documented in:

sequential-dispatch-design.md

## 10. Data Storage Architecture

The storage layer maintains persistent system information.

The system stores:

- Users
- Requests
- Matches
- Historical interactions

The MVP uses simple data structures for simulation.

Future versions will use:

- PostgreSQL
- PostGIS
- Redis caching

## 11. Future Scalability Architecture

The current MVP is designed for campus-scale deployment.

Future versions may introduce:

- Distributed backend services
- Geographic partitioning
- Database sharding
- Regional matching servers
- Real-time messaging infrastructure

## 12. Technology Stack

Backend:
- Node.js
- Express.js

Geospatial:
- H3-js

Database:
- PostgreSQL
- PostGIS

Caching:
- Redis

Frontend:
- React / React Native

Deployment:
- Docker
- AWS Cloud infrastructure


