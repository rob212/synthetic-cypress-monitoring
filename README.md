# Synthetic Monitoring with Cypress

> Continuously run Cypress against a real environment

Run with `npm start` which starts a service on port 3000 (or try it with Docker).

The tests depend on two environment variables being configured:

- CYPRESS_ESERVICES_USER
- CYPRESS_ESERVICES_PASSWORD

You can play with the Cypress tests directly via `npm run cy:open`

## What does this do?

It runs a Cypress test suite every minute and records the results to http://localhost:3000

If you visit that URL it will give you links to other options.

- Videos are saved for the test run
- A fancy status page
- Prometheus endpoints for monitoring via Grafana
- Inspect what Cypress is doing at: http://localhost:3000/debug

## Environment Variables

You can configure how the server runs:

- `SLEEP_MINS`: How long to wait in minutes between a test run finishing before starting a new run (default: 5 minutes)
- `SPECS_REGEX`: Select which specs to run (default all: "/cypress/integration/\*-spec.js")
- `PORT`: What HTTP port to run the server on (default: 3000)

## Example Instance

Running against dev: https://synthetic-cypress-ocp-community-dev.apps.live.ocp.ros.local/
