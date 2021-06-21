/// <reference types="cypress" />
import "@testing-library/cypress/add-commands";

Cypress.Commands.add("urlShouldInclude", (text) => {
  cy.location("pathname").should("include", text);
});

describe("Goose Sighting", () => {
  it("Record a goose sighting", () => {
    cy.visit("https://record-a-goose-sighting.herokuapp.com/steps/start");
    cy.findByRole("button", { name: /Start now/i}).click()
    cy.findByLabelText("Yes").click()
    cy.findByRole("button", { name: /Continue/i}).click()

    cy.urlShouldInclude("steps/goose-type");
    cy.findAllByText(
      "What type of goose did you see?"
    ).should("exist");
  });
});
