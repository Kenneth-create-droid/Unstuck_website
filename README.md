# Keneca Social Matching Engine

A real-time social matching engine using H3 spatial indexing, geographic propagation, and score-based sequential dispatch to connect people based on location.

---

# Overview

Keneca is a real-time geospatial matching platform designed to connect people, resources, and requests through intelligent location-based matching.

The system explores a new approach to social connectivity by moving away from traditional broadcast-based platforms and instead creating an efficient matching architecture that discovers, ranks, and dispatches nearby users based on geographic relevance.

The core idea behind Keneca is:

When a user creates a request, the system should intelligently find the most suitable nearby person, contact them sequentially, and complete a successful connection as quickly and efficiently as possible.

Potential applications include:

- Peer-to-peer learning
- Campus assistance
- Local service matching
- Community support networks
- Event coordination
- Emergency assistance systems

---

# Problem

Many existing social platforms rely on:

- Feeds
- Notifications
- Search systems
- Manual discovery

These approaches create challenges when users need immediate help or when the most relevant person is nearby but difficult to discover.

Keneca addresses this problem by creating a location-aware matching system that can:

- Understand geographic relationships
- Efficiently search nearby users
- Rank candidates based on relevance
- Dispatch requests intelligently
- Reduce unnecessary notifications

---

# System Concept

The Keneca system follows a real-time matching pipeline:
User Creates Request

    ↓

Location Processing

    ↓

H3 Spatial Indexing

    ↓

Geographic Propagation

    ↓

Candidate Discovery

    ↓

Scoring Engine

    ↓

Sequential Dispatch

    ↓

Successful Match

    ↓

Communication Begins


---

# Core Architecture

## Keneca Engine

The Keneca Engine is the core intelligence behind the platform.

It is responsible for:

- H3 spatial indexing
- Geographic search
- Cell propagation
- Candidate matching
- Ranking algorithms
- Sequential dispatch decisions

The engine separates matching logic from the application layer, allowing it to be reused across different location-based systems.

---

## H3 Spatial Layer

Keneca uses H3 hierarchical hexagonal spatial indexing to organize geographic information.

Instead of searching through every user in the system, locations are converted into H3 cells.

This allows the system to:

- Quickly identify nearby users
- Expand searches geographically
- Reduce unnecessary computation
- Scale location-based matching

---

## Geographic Propagation Engine

The propagation engine controls how far the system searches for potential matches.

The search begins at the user's current H3 cell and expands outward through neighboring cells.

Example:
Ring 0
Current Location

    ↓

Ring 1
Immediate Neighbours

    ↓

Ring 2
Expanded Search Area

    ↓

Ring N
Maximum Search Boundary


This allows Keneca to balance:

- Search speed
- Geographic coverage
- System efficiency

---

## Scoring Engine

After discovering nearby candidates, the scoring engine ranks users based on matching criteria.

Current MVP scoring:

- Geographic proximity

Future scoring improvements:

- Availability
- Response history
- Reliability
- Reputation
- User preferences

---

## Sequential Dispatch Engine

Unlike traditional broadcasting systems, Keneca does not send requests to every nearby user simultaneously.

Instead, the system dispatches requests sequentially.

Example:

equest Created

    ↓

Candidate 1
Request Sent

    ↓

Rejected / Timeout

    ↓

Candidate 2
Request Sent

    ↓

Accepted

    ↓

Match Completed


Benefits:

- Reduces unnecessary notifications
- Improves resource allocation
- Creates a controlled matching process
- Allows response-time evaluation

---

# Simulation Environment

The Keneca simulation environment provides a visual demonstration of the matching engine.

The simulation allows developers and evaluators to observe:

- User locations
- Request locations
- Geographic cells
- Propagation expansion
- Candidate ranking
- Dispatch progress
- Successful matches

The goal is to create a live visualization where the internal matching process can be observed.

Example:
Users displayed on map

    ↓

Request appears

    ↓

Search expands through H3 cells

    ↓

Candidates are contacted

    ↓

Successful user accepts

    ↓

Chat session begins


---

# Project Structure

keneca-social-matching-engine/

│
├── keneca-engine/
│ └── Core matching algorithms and geospatial logic
│
├── backend/
│ └── API services, database communication, and application logic
│
├── frontend/
│ └── User interface and system interaction
│
├── simulation/
│ └── Real-time visualization and testing environment
│
├── docs/
│ └── Technical architecture documentation
│
└── README.md


---

# Technology Stack

## Backend

- Node.js
- Express

## Geospatial Processing

- H3 Spatial Indexing
- Geographic algorithms

## Database

- PostgreSQL
- PostGIS

## State Management

- Redis

## Frontend

- React

## Simulation

- Real-time visualization tools

---

# Development Objectives

The goal of Keneca is to explore scalable solutions for real-time geographic matching systems.

The project focuses on:

- Efficient spatial search
- Location-based recommendation
- Real-time dispatch systems
- Algorithmic ranking
- Performance evaluation
- Scalable backend architecture

---

# Documentation

Detailed technical documentation is available in the `/docs` directory.

Documentation includes:

- System architecture
- Matching engine design
- H3 spatial layer
- Geographic propagation
- Scoring system
- Dispatch engine
- Database architecture
- API design
- Testing and evaluation

---

# Capstone Project

Keneca is being developed as a Software Engineering Capstone project focused on designing and evaluating a real-time geospatial matching architecture.

The project combines:

- Software engineering principles
- Backend system design
- Geographic computing
- Algorithm development
- Real-time simulation
