const cypress = require("cypress")
const fse = require("fs-extra")
const serveIndex = require("serve-index");
const express = require("express");
const promBundle = require("express-prom-bundle");

const client = require("prom-client");
const { merge } = require("mochawesome-merge")
const generator = require("mochawesome-report-generator")

const SLEEP_MINS = process.env.SLEEP_MINS || 5
const SPECS_REGEX = process.env.SPECS_REGEX || "/cypress/integration/*-spec.js"
const PORT = process.env.PORT || 3000;
console.log("config", { SLEEP_MINS, SPECS_REGEX, PORT });



// Prometheus client to track scenario status - this can be replaced by other 3rd party metric tool
const scenarioStatusGauge = new client.Gauge({
    name: "scenario_status",
    help: "Indicates if the tests are passing(1), failing(-1) or not run(0)",
    labelNames: ["scenario"],
});

const scenarioTimingGauge = new client.Gauge({
    name: "scenario_timing",
    help: "How long a scenario took to run in seconds",
    labelNames: ["scenario"],
});


const app = express()
const metricsMiddleware = promBundle({ includeMethod: true })
app.use(metricsMiddleware)

let currentSummary = {runs: []}

// Express end points
app.get("/", (req, res) => {
    res.setHeader("content-type", "application/json")
    const baseUrl = req.protocol + "://" + req.get("Host")
    const result = summaryAsJson(currentSummary, baseUrl)
    res.send(JSON.stringify(result, null, 4))
})

app.get("/debug", (req, res) => {
    res.setHeader("content-type", "application/json");
    res.send(JSON.stringify(currentSummary, null, 4));
});

app.use("/health", require("express-healthcheck")());

app.listen(PORT, () => {
    console.log(`Synthetic Cypress listening at http://localhost:${PORT}`);
});

// Enable directory lists of videos, screenshots and the test report
app.use("/videos", serveIndex(__dirname + "/cypress/videos"));
app.use("/videos", express.static(__dirname + "/cypress/videos"));
app.use("/screenshots", serveIndex(__dirname + "/cypress/screenshots"));
app.use("/screenshots", express.static(__dirname + "/cypress/screenshots"));
app.use("/status", serveIndex(__dirname + "/mochawesome-report"));
app.use("/status", express.static(__dirname + "/mochawesome-report"));


const runTests = () => {
    return cypress.run({
        config: {
            video: true,
        },
        spec: __dirname + SPECS_REGEX,
    })
}

// Update Prometheus gauges for monitoring
const updateGauges = (results) => {
    let allPassing = true

    results.runs.forEach((run) => {
        run.tests.forEach((test) => {
            const title = test.title.join(" | ")
            const duration = test.attempts[0].duration
            let state = 0
            if (test.state === "passed") state = 1
            if (test.state === "failed") {
                state = -1
                allPassing = false
            }


            scenarioStatusGauge.set({ scenario: title }, state)
            scenarioStatusGauge.set({ scenario: title }, duration)
        })
    })
    scenarioStatusGauge.set({ scenario: "rollup" }, allPassing ? 1 : -1);
}

const summaryAsJson = (results, baseUrl) => {
    const tests = [];
    if (results.runs) {
        results.runs.forEach((run) => {
            const videoLink =
                baseUrl + "/videos/" + run.video.split("/").slice(-1)[0];

            run.tests.forEach((test) => {
                const title = test.title.join(" | ");
                const state = test.state;
                tests.push({title, state, videoLink});
            });
        });
    }

    // Derived from Cypress run results object
    return {
        lastRun: {
            startedTestsAt: currentSummary.startedTestsAt,
            endedTestsAt: currentSummary.endedTestsAt,
            totalDuration: currentSummary.totalDuration,
            totalSuites: currentSummary.totalSuites,
            totalTests: currentSummary.totalTests,
            totalFailed: currentSummary.totalFailed,
            totalPassed: currentSummary.totalPassed,
            totalPending: currentSummary.totalPending,
            totalSkipped: currentSummary.totalSkipped,
            tests,
        },
        statusPageLink: baseUrl + "/status/mochawesome.html",
        videosLink: baseUrl + "/videos",
        screenshotsLink: baseUrl + "/screenshots",
        metricsLink: baseUrl + "/metrics",
    };
}


const generateHTMLReport = () => {
    return fse
        .remove("mochawesome-report")
        .then(() => merge({ files: [__dirname + "/cypress/results/*.json"]}))
        .then((r) => generator.create(r))
        // .then(() => updateGauges(currentSummary))
}

const sleep = (mins) => {
    return new Promise((resolve) => {
        setTimeout(resolve, 1000 * 60 * mins)
    })
}

async function init() {
    while(true) {
        console.log("Running tests...")

        await fse
            .remove(__dirname + "/cypress/results")
            .then(() => runTests())
            .then((summary) => (currentSummary = summary))
            .then(() => generateHTMLReport())
            // .then(() => updateGauges(currentSummary))

        // Additional notifications like Slack etc could be added here for alerting

        await sleep(SLEEP_MINS)
    }
}

// kick it all off
init()