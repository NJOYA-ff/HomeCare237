import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { vi } from "vitest";
import SpecialtiesPage from "../Specialties";

// Mock firebase/firestore used in Specialties.tsx
vi.mock("firebase/firestore", async () => {
  const actual = await vi.importActual<typeof import("firebase/firestore")>("firebase/firestore");
  return {
    ...actual,
    collection: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    getDocs: vi.fn(async () => ({ docs: [], forEach: () => {} })),
  };
});

describe("SpecialtiesPage", () => {
  it("renders no doctors message when none exist", async () => {
    const { container } = render(
      <MemoryRouter
        initialEntries={["/patient/specialties?specialty=Cardiologist"]}
      >
        <SpecialtiesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(
        screen.getByText(/No doctors found for this specialty/i)
      ).toBeInTheDocument();
    });

    expect(
      container.querySelector(".specialties-dashboard-page")
    ).toBeInTheDocument();
  });
});
