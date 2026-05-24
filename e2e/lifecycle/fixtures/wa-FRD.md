# Feature Requirements Document

## Feature: Weather Lookup — Full-Stack

**Feature ID:** WA-1
**Status:** Approved

## Problem Statement

Users need a simple web interface to look up weather conditions by city name without relying on external weather APIs.

## Solution

A full-stack Node.js application with:

- Express.js REST API backend serving weather data from mock/stub data
- Simple HTML frontend that calls the API and displays results
- Health check endpoint for production readiness
- Node.js built-in test runner tests

## Acceptance Criteria

### AC-01: Weather API endpoint

**Verification:** Unit test

**Given** a client sends GET /api/weather/:city
**When** a valid city name is provided (london, miami, tokyo)
**Then** the API returns JSON with fields: city, temperature, description, and humidity

### AC-02: Health check endpoint

**Verification:** Unit test

**Given** a client sends GET /health
**When** the server is running
**Then** the API returns `{ "status": "ok" }` with HTTP 200

### AC-03: Error handling

**Verification:** Unit test

**Given** a client sends GET /api/weather/:city
**When** the city is not found in the data source
**Then** the API returns HTTP 404 with `{ "error": "City not found" }`

### AC-04: HTML frontend

**Verification:** Manual inspection

**Given** a user navigates to the root URL (/)
**When** the page loads
**Then** an HTML page is served with a city input field and a results display area

### AC-05: Test suite passes

**Verification:** Unit test

**Given** the test suite is run with `npm test`
**When** all tests execute
**Then** all tests pass covering: weather API responses, 404 for unknown cities, and health check

## Out of Scope

- Real weather API integration (use mock/stub data only)
- CSS styling beyond basic functionality
- User authentication or authorization
- Database persistence
- Multi-day forecasts or historical data
- Weather alerts or notifications
